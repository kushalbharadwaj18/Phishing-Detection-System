const axios = require('axios');
const cheerio = require('cheerio');
const UserAgents = require('user-agents');
const dns = require('dns').promises;
const tldjs = require('tldjs');

/**
 * PHISHING DETECTION ML MODEL
 * 
 * This implements the complete pipeline:
 * 1. URL-Based Features
 * 2. Domain/Network Features
 * 3. Webpage Content Features
 * 4. ML-Based Risk Scoring
 * 5. Final Risk Classification
 */

class PhishingDetectionService {
  constructor() {
    this.openaiApiKey = process.env.OPENAI_API_KEY;
    this.huggingfaceApiKey = process.env.HUGGINGFACE_API_KEY;
    
    // Feature weights for ML scoring (trained weights)
    this.featureWeights = {
      // URL-Based Features (most important)
      noHttps: 0.15,
      urlLength: 0.08,
      domainLength: 0.07,
      numDots: 0.06,
      containsHyphen: 0.09,
      numSubdomains: 0.10,
      ipAddress: 0.20, // CRITICAL
      encodedChars: 0.12,
      suspiciousTLD: 0.11,
      suspiciousKeywords: 0.10,
      
      // Domain Features
      domainAge: 0.08,
      dnsReputationScore: 0.07,
      
      // Content Features
      formExternalSubmit: 0.12,
      credentialForm: 0.14,
      externalLinks: 0.06,
      javascriptRedirects: 0.11,
      urgencyLanguage: 0.08,
      hiddenElements: 0.07,
    };
  }

  /**
   * 1️⃣ EXTRACT URL-BASED FEATURES (Fast & Accurate)
   * These include domain structure, URL patterns, and common phishing indicators
   */
  extractURLFeatures(url) {
    try {
      const urlObj = new URL(url);
      const domain = urlObj.hostname;
      const path = urlObj.pathname;

      // Parse domain into parts
      const domainParts = domain.split('.');
      const baseDomain = domainParts.slice(-2).join('.');
      
      return {
        // Basic URL structure
        url,
        domain,
        baseDomain,
        path,
        protocol: urlObj.protocol,
        
        // URL-Level Features
        hasHttps: urlObj.protocol === 'https:',
        urlLength: url.length,
        domainLength: domain.length,
        pathLength: path.length,
        
        // Domain structure
        numDots: (domain.match(/\./g) || []).length,
        numSubdomains: domainParts.length - 2,
        hasWWW: domain.startsWith('www.'),
        subdomainCount: domain.split('.').length - 1,
        
        // Character analysis
        numHyphens: (domain.match(/-/g) || []).length,
        numDigits: (domain.match(/\d/g) || []).length,
        numUnderscores: (domain.match(/_/g) || []).length,
        
        // IP address detection
        isIPAddress: /^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(domain),
        ipv6Address: domain.includes('::'),
        
        // Encoding detection
        hasEncodedChars: /%2e|%3a|%2f|%3f/.test(url),
        
        // TLD analysis
        tld: domainParts[domainParts.length - 1].toLowerCase(),
        
        // Extract common phishing keywords
        hasPhishingKeywords: this.containsPhishingKeywords(domain),
        
        // Domain characteristics for ML
        consecutiveNumbers: /\d{3,}/.test(domain),
        consonantHeavy: this.isConsonantHeavy(domain),
        randomLooking: this.looksRandomlyGenerated(domain),
      };
    } catch (error) {
      throw new Error(`Invalid URL format: ${error.message}`);
    }
  }

  /**
   * 2️⃣ EXTRACT DOMAIN & NETWORK FEATURES
   * Uses WHOIS, DNS lookups, and reputation data
   */
  async extractDomainFeatures(url) {
    try {
      const urlObj = new URL(url);
      const domain = urlObj.hostname;
      
      const domainFeatures = {
        domain,
        dnsRecordExists: false,
        dnsLookupTime: 0,
        nameservers: [],
        mxRecords: [],
        spfRecord: false,
        dkimRecord: false,
        dmarcRecord: false,
        suspiciousNameserver: false,
      };

      try {
        // DNS lookup - check if domain resolves
        const startDns = Date.now();
        const addresses = await dns.resolve4(domain).catch(() => []);
        domainFeatures.dnsLookupTime = Date.now() - startDns;
        domainFeatures.dnsRecordExists = addresses.length > 0;
        
        // Check for MX records (legitimate sites typically have these)
        const mxRecords = await dns.resolveMx(domain).catch(() => []);
        domainFeatures.mxRecords = mxRecords.map(mx => mx.exchange);
        
        // Check for SPF record
        const txtRecords = await dns.resolveTxt(domain).catch(() => []);
        domainFeatures.spfRecord = txtRecords.some(record => 
          record.join('').includes('v=spf1')
        );
        domainFeatures.dkimRecord = txtRecords.some(record =>
          record.some(r => r.includes('v=DKIM1'))
        );
        domainFeatures.dmarcRecord = await this.checkDmarcRecord(domain);
        
      } catch (dnsError) {
        console.log(`DNS lookup failed for ${domain}: ${dnsError.message}`);
      }

      return domainFeatures;
    } catch (error) {
      console.error(`Domain feature extraction error: ${error.message}`);
      return {
        domain: '',
        dnsRecordExists: false,
        dnsLookupTime: 0,
        nameservers: [],
        mxRecords: [],
        spfRecord: false,
        dkimRecord: false,
        dmarcRecord: false,
      };
    }
  }

  /**
   * 3️⃣ MACHINE LEARNING FEATURE SCORING
   * Converts extracted features into ML-ready scores
   */
  calculateMLFeatureScores(urlFeatures, domainFeatures, contentAnalysis) {
    const scores = {};

    // URL-Based Feature Scoring (0-1 scale)
    scores.noHttpsScore = urlFeatures.hasHttps ? 0 : 1.0;
    scores.urlLengthScore = Math.min(1.0, (urlFeatures.urlLength - 30) / 100);
    scores.domainLengthScore = Math.min(1.0, Math.max(0, (urlFeatures.domainLength - 20) / 30));
    scores.numDotsScore = Math.min(1.0, (urlFeatures.numDots - 1) / 4);
    scores.hyphenScore = urlFeatures.numHyphens >= 2 ? 1.0 : (urlFeatures.numHyphens > 0 ? 0.5 : 0);
    scores.subdomainScore = Math.min(1.0, urlFeatures.numSubdomains / 5);
    scores.ipAddressScore = urlFeatures.isIPAddress ? 1.0 : 0;
    scores.encodedCharsScore = urlFeatures.hasEncodedChars ? 1.0 : 0;
    
    // TLD Analysis
    const suspiciousTLDs = ['tk', 'ml', 'cf', 'ga', 'online', 'site', 'space', 'download', 'xyz', 'store', 'shop', 'bank', 'info', 'click', 'work', 'bid', 'racing', 'cricket', 'accountant'];
    scores.suspiciousTLDScore = suspiciousTLDs.includes(urlFeatures.tld) ? 1.0 : 0;
    
    // Phishing Keywords
    scores.phishingKeywordsScore = urlFeatures.hasPhishingKeywords ? 1.0 : 0;
    
    // Character Pattern Analysis
    scores.consecutiveNumbersScore = urlFeatures.consecutiveNumbers ? 0.6 : 0;
    scores.consonantHeavyScore = urlFeatures.consonantHeavy ? 0.4 : 0;
    scores.randomLookingScore = urlFeatures.randomLooking ? 0.7 : 0;
    
    // Domain Features Scoring
    scores.dnsExistsScore = domainFeatures.dnsRecordExists ? 0 : 0.6; // Missing DNS = suspicious
    scores.mxRecordsScore = domainFeatures.mxRecords.length > 0 ? 0 : 0.3; // Missing MX = suspicious
    scores.spfRecordScore = domainFeatures.spfRecord ? 0 : 0.4; // Missing SPF = suspicious
    scores.dkimRecordScore = domainFeatures.dkimRecord ? 0 : 0.3; // Missing DKIM = suspicious
    scores.dmarcRecordScore = domainFeatures.dmarcRecord ? 0 : 0.3; // Missing DMARC = suspicious
    
    // Content Analysis Scoring
    scores.contentSuspiciousScore = contentAnalysis ? 
      Math.min(1.0, contentAnalysis.contentScore / 100) : 0;

    return scores;
  }

  /**
   * 4️⃣ ML MODEL SCORING - Weighted Ensemble Approach
   * Combines all features using weighted scoring
   */
  scoreUsingMLModel(featureScores) {
    let totalScore = 0;
    let totalWeight = 0;

    // URL-based features
    totalScore += featureScores.noHttpsScore * this.featureWeights.noHttps;
    totalScore += featureScores.urlLengthScore * this.featureWeights.urlLength;
    totalScore += featureScores.domainLengthScore * this.featureWeights.domainLength;
    totalScore += featureScores.numDotsScore * this.featureWeights.numDots;
    totalScore += featureScores.hyphenScore * this.featureWeights.containsHyphen;
    totalScore += featureScores.subdomainScore * this.featureWeights.numSubdomains;
    totalScore += featureScores.ipAddressScore * this.featureWeights.ipAddress;
    totalScore += featureScores.encodedCharsScore * this.featureWeights.encodedChars;
    totalScore += featureScores.suspiciousTLDScore * this.featureWeights.suspiciousTLD;
    totalScore += featureScores.phishingKeywordsScore * this.featureWeights.suspiciousKeywords;
    
    // Domain features
    totalScore += featureScores.dnsExistsScore * this.featureWeights.domainAge;
    totalScore += featureScores.spfRecordScore * this.featureWeights.dnsReputationScore;
    
    // Content features
    totalScore += featureScores.contentSuspiciousScore * 0.15;

    return Math.min(100, totalScore * 100); // Convert to 0-100 scale
  }

  /**
   * Helper: Check if domain contains phishing keywords
   */
  containsPhishingKeywords(domain) {
    const highRiskKeywords = [
      'verify', 'confirm', 'update', 'action', 'secure', 'alert',
      'support', 'login', 'account', 'password', 'auth',
    ];
    
    const domainLower = domain.toLowerCase();
    return highRiskKeywords.some(keyword => domainLower.includes(keyword));
  }

  /**
   * Helper: Check if domain is consonant-heavy (random looking)
   */
  isConsonantHeavy(domain) {
    const consonants = (domain.match(/[bcdfghjklmnprstvwxyz]/gi) || []).length;
    const vowels = (domain.match(/[aeiou]/gi) || []).length;
    return vowels === 0 || consonants / (consonants + vowels) > 0.8;
  }

  /**
   * Helper: Check if domain looks randomly generated
   */
  looksRandomlyGenerated(domain) {
    const cleanDomain = domain.replace(/\d|-|\./g, '');
    if (cleanDomain.length < 6) return false;
    
    // High consonant ratio
    const consonants = (cleanDomain.match(/[bcdfghjklmnprstvwxyz]/gi) || []).length;
    const vowels = (cleanDomain.match(/[aeiou]/gi) || []).length;
    
    // Calculate vowel ratio
    const vowelRatio = (vowels / cleanDomain.length);
    
    // Randomly generated domains typically have low vowel ratio
    return vowelRatio < 0.25;
  }

  /**
   * Helper: Check DMARC record
   */
  async checkDmarcRecord(domain) {
    try {
      const dmarcDomain = `_dmarc.${domain}`;
      const txtRecords = await dns.resolveTxt(dmarcDomain).catch(() => []);
      return txtRecords.some(record => 
        record.join('').includes('v=DMARC1')
      );
    } catch {
      return false;
    }
  }

  /**
   * Analyze URL using basic heuristics - CONSERVATIVE/STRICT approach
   */
  heuristicAnalysis(features) {
    let suspiciousIndicators = [];
    let riskScore = 15; // Start with base risk of 15 - be more conservative

    // Check HTTPS - CRITICAL for security
    if (!features.hasHttps) {
      suspiciousIndicators.push('Not using HTTPS protocol - No encryption');
      riskScore += 25; // Increased from 15
    }

    // Check domain length
    if (features.domainLength > 30) {
      suspiciousIndicators.push('Unusually long domain name (obfuscation attempt)');
      riskScore += 15;
    }

    // Check for unusual domain patterns
    if (features.specialCharInDomain) {
      if (features.digitCount > 2) {
        suspiciousIndicators.push('Domain contains unusual pattern of numbers and symbols');
        riskScore += 20; // Increased from 15
      } else if (/-/.test(features.domain)) {
        // Hyphens in domain might indicate phishing
        const hyphenCount = (features.domain.match(/-/g) || []).length;
        if (hyphenCount >= 2) {
          suspiciousIndicators.push('Multiple hyphens in domain (typosquatting indicator)');
          riskScore += 18;
        }
      }
    }

    // Check for excessive subdomains
    if (features.subddomainCount > 3) {
      suspiciousIndicators.push('Multiple subdomains detected (obfuscation)');
      riskScore += 18;
    } else if (features.subddomainCount > 1) {
      // Even 2+ subdomains can be suspicious
      suspiciousIndicators.push('Multiple subdomains present');
      riskScore += 10;
    }

    // Check URL length
    if (features.urlLength > 75) {
      suspiciousIndicators.push('Unusually long URL (parameter injection)');
      riskScore += 12;
    } else if (features.urlLength > 50) {
      riskScore += 5;
    }

    // Check for IP address
    if (/\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}/.test(features.domain)) {
      suspiciousIndicators.push('Domain is an IP address (not standard practice)');
      riskScore += 30; // Increased from 25
    }

    // Check if domain looks like it might be randomly generated
    const consecutiveNumbers = /\d{3,}/.test(features.domain);
    const consonantDomains = /[bcdfghjklmnprstvwxyz]{5,}/.test(features.domain.replace(/[aeiou-]/g, ''));
    
    if (consecutiveNumbers) {
      suspiciousIndicators.push('Domain contains long sequence of numbers');
      riskScore += 15;
    }

    // Common phishing patterns - STRICT scoring
    const highRiskPatterns = [
      'verify', 'confirm', 'update', 'action', 'secure', 'alert',
      'support', 'login', 'account', 'password', 'auth',
    ];

    const mediumRiskPatterns = [
      'paypal', 'amazon', 'apple', 'google', 'microsoft', 'bank',
      'service', 'security', 'check', 'claim', 'resolve',
    ];

    for (const pattern of highRiskPatterns) {
      if (features.domain.toLowerCase().includes(pattern)) {
        suspiciousIndicators.push(`Contains high-risk phishing keyword: "${pattern}"`);
        riskScore += 16; // Increased - high-risk keywords
      }
    }

    // CRITICAL: Multiple hyphens combined with suspicious keywords = PHISHING
    if (features.numHyphens >= 2) {
      const hasKeywords = highRiskPatterns.some(k => features.domain.toLowerCase().includes(k));
      if (hasKeywords) {
        suspiciousIndicators.push('Multiple hyphens + suspicious keywords = HIGH PHISHING RISK');
        riskScore += 25; // CRITICAL combination
      }
    }

    for (const pattern of mediumRiskPatterns) {
      if (features.domain.toLowerCase().includes(pattern)) {
        suspiciousIndicators.push(`Contains common brand/phishing keyword: "${pattern}"`);
        riskScore += 8;
      }
    }

    // Check for very short domains (often suspicious or redirects)
    if (features.domainLength < 6) {
      suspiciousIndicators.push('Very short domain name (may be redirect/shortener)');
      riskScore += 8;
    }

    // Check for encoding attempts
    if (/%2e|%3a|%2f/.test(features.url)) {
      suspiciousIndicators.push('URL contains encoded characters (evasion attempt)');
      riskScore += 22;
    }

    // New top-level domains often associated with abuse
    const tld = features.domain.split('.').pop().toLowerCase();
    const suspiciousTLDs = ['tk', 'ml', 'cf', 'ga', 'online', 'site', 'space', 'download', 'xyz', 'store', 'shop', 'bank', 'info', 'click', 'work', 'bid', 'racing', 'cricket', 'accountant'];
    if (suspiciousTLDs.includes(tld)) {
      suspiciousIndicators.push(`Suspicious TLD detected: .${tld} (commonly abused)`);
      riskScore += 20;
    }

    return {
      suspiciousIndicators,
      riskScore: Math.min(100, riskScore), // Cap at 100
    };
  }

  /**
   * Log analysis results for debugging
   */
  logAnalysisResults(url, features, contentAnalysis, llmAnalysis, finalResult) {
    console.log('\n========== PHISHING DETECTION ANALYSIS ==========');
    console.log(`URL: ${url}`);
    console.log(`Domain: ${features.domain}`);
    console.log(`Has HTTPS: ${features.hasHttps}`);
    console.log(`\n--- URL Features ---`);
    console.log(`Domain Length: ${features.domainLength}`);
    console.log(`URL Length: ${features.urlLength}`);
    console.log(`Subdomains: ${features.subddomainCount}`);
    console.log(`\n--- Content Analysis ---`);
    if (contentAnalysis) {
      console.log(`Content Risk Score: ${contentAnalysis.contentScore}/100`);
      console.log(`Red Flags Found: ${contentAnalysis.suspiciousElements.length}`);
      if (contentAnalysis.suspiciousElements.length > 0) {
        contentAnalysis.suspiciousElements.forEach(flag => {
          console.log(`  • ${flag}`);
        });
      }
    } else {
      console.log('Content: Not analyzed');
    }
    console.log(`\n--- LLM Analysis ---`);
    console.log(`Risk Score: ${llmAnalysis.riskScore}/100`);
    console.log(`Safe Score: ${llmAnalysis.safeScore}/100`);
    console.log(`Phishing Likelihood: ${llmAnalysis.phishingLikelihood}`);
    console.log(`Trust Level: ${llmAnalysis.trustLevel}`);
    console.log(`Analysis Method: ${llmAnalysis.method}`);
    console.log(`\n--- Final Result ---`);
    console.log(`Is Safe: ${finalResult.isSafe}`);
    console.log(`Overall Risk: ${finalResult.riskScore}%`);
    console.log(`Processing Time: ${finalResult.processingTime}ms`);
    console.log(`Content Analyzed: ${finalResult.contentAnalyzed}`);
    console.log('===============================================\n');
  }
  async fetchWebsiteContent(url) {
    try {
      const userAgent = new UserAgents().random().toString();
      
      const response = await axios.get(url, {
        headers: {
          'User-Agent': userAgent,
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.5',
        },
        timeout: 10000,
        maxRedirects: 5,
        validateStatus: (status) => status < 400, // Accept any status < 400
      });

      return response.data;
    } catch (error) {
      console.log(`Could not fetch website content for ${url}: ${error.message}`);
      return null;
    }
  }

  /**
   * Analyze website content for phishing red flags
   */
  analyzeWebsiteContent(htmlContent, url) {
    const contentAnalysis = {
      suspiciousElements: [],
      contentScore: 0,
      contentAnalysis: '',
    };

    if (!htmlContent) {
      contentAnalysis.contentAnalysis = 'Could not access website content';
      return contentAnalysis;
    }

    try {
      const $ = cheerio.load(htmlContent);
      const urlObj = new URL(url);
      const domain = urlObj.hostname;

      // 1. Check for login forms requesting sensitive info
      const forms = $('form');
      forms.each((i, form) => {
        const action = $(form).attr('action') || '';
        const inputs = $(form).find('input');
        let hasSuspiciousFields = false;
        let fieldTypes = [];

        inputs.each((j, input) => {
          const name = $(input).attr('name') || '';
          const type = $(input).attr('type') || '';
          fieldTypes.push(type);

          if (name.toLowerCase().includes('password') || 
              name.toLowerCase().includes('credit') ||
              name.toLowerCase().includes('ssn') ||
              name.toLowerCase().includes('account') ||
              name.toLowerCase().includes('pin')) {
            hasSuspiciousFields = true;
          }
        });

        // Check if form action points to different domain
        if (action && !action.startsWith('javascript:') && !action.includes(domain)) {
          contentAnalysis.suspiciousElements.push('Form submits to external domain');
          contentAnalysis.contentScore += 20;
        }

        if (hasSuspiciousFields) {
          contentAnalysis.suspiciousElements.push('Form contains fields requesting sensitive information');
          contentAnalysis.contentScore += 25;
        }
      });

      // 2. Check for suspicious links
      const links = $('a');
      let externalLinkCount = 0;
      let javascriptLinks = 0;
      let suspiciousLinkText = 0;

      links.each((i, link) => {
        const href = $(link).attr('href') || '';
        const text = $(link).text().toLowerCase();

        if (href.startsWith('javascript:')) {
          javascriptLinks++;
        }

        if (href && !href.includes(domain) && href.startsWith('http')) {
          externalLinkCount++;
        }

        // Check for urgent language
        if (/urgent|verify|confirm|update|click.*now|act.*now|secure.*account|confirm.*identity/.test(text)) {
          suspiciousLinkText++;
        }
      });

      if (javascriptLinks > 0) {
        contentAnalysis.suspiciousElements.push(`Found ${javascriptLinks} JavaScript links`);
        contentAnalysis.contentScore += 15;
      }

      if (externalLinkCount > links.length * 0.5) {
        contentAnalysis.suspiciousElements.push('High percentage of links point to external domains');
        contentAnalysis.contentScore += 12;
      }

      if (suspiciousLinkText > links.length * 0.3) {
        contentAnalysis.suspiciousElements.push('Multiple links with urgent/action-oriented text');
        contentAnalysis.contentScore += 15;
      }

      // 3. Check page title and meta tags
      const title = $('title').text().toLowerCase();
      const metaDescription = $('meta[name="description"]').attr('content') || '';

      // Common phishing titles
      const phishingKeywords = [
        'verify', 'confirm', 'update', 'urgent', 'action required',
        'account', 'security', 'alert', 'suspended', 'expired',
      ];

      for (const keyword of phishingKeywords) {
        if (title.includes(keyword) || metaDescription.toLowerCase().includes(keyword)) {
          contentAnalysis.suspiciousElements.push(`Page title/description contains phishing keyword: "${keyword}"`);
          contentAnalysis.contentScore += 8;
          break;
        }
      }

      // 4. Check for suspicious meta tags or scripts
      const scripts = $('script');
      let suspiciousScripts = 0;

      scripts.each((i, script) => {
        const content = $(script).html() || '';
        
        if (/document\.location|window\.location|window\.open/.test(content) && 
            !/analytics|tracking|google/.test(content.toLowerCase())) {
          suspiciousScripts++;
        }
      });

      if (suspiciousScripts > 0) {
        contentAnalysis.suspiciousElements.push(`Found ${suspiciousScripts} suspicious redirect scripts`);
        contentAnalysis.contentScore += 18;
      }

      // 5. Check for missing security headers indicators in page
      const hasSSL = $('meta[http-equiv*="refresh"]').length === 0 ||
                     !$('meta[http-equiv*="refresh"]').attr('content')?.includes('http://');

      // 6. Check for suspicious text patterns
      const bodyText = $('body').text();
      const suspiciousPatterns = [
        /verify.*account|confirm.*identity/i,
        /click.*here.*immediately/i,
        /update.*payment|add.*card/i,
        /re-enter.*password|confirm.*password/i,
        /temporary.*access|limited.*time/i,
      ];

      for (const pattern of suspiciousPatterns) {
        if (pattern.test(bodyText)) {
          contentAnalysis.suspiciousElements.push('Page contains suspicious urgency/verification text');
          contentAnalysis.contentScore += 10;
          break;
        }
      }

      // 7. Check for hidden elements (display:none, visibility:hidden)
      const hiddenElements = $('[style*="display:none"], [style*="visibility:hidden"]');
      if (hiddenElements.length > 0) {
        contentAnalysis.suspiciousElements.push('Page contains hidden elements');
        contentAnalysis.contentScore += 8;
      }

      contentAnalysis.contentScore = Math.min(100, contentAnalysis.contentScore);
      contentAnalysis.contentAnalysis = contentAnalysis.suspiciousElements.length > 0 
        ? contentAnalysis.suspiciousElements.join('; ')
        : 'No obvious suspicious content patterns detected';

      return contentAnalysis;
    } catch (error) {
      console.error('Content analysis error:', error.message);
      return {
        ...contentAnalysis,
        contentAnalysis: 'Error analyzing page content',
      };
    }
  }

  /**
   * Use LLM for enhanced detection (with fallback to heuristic analysis)
   */
  async analyzeLLM(url, features, contentAnalysis = null) {
    try {
      // If OpenAI API key is not configured, use heuristic analysis
      if (!this.openaiApiKey) {
        const heuristic = this.heuristicAnalysis(features);
        return {
          method: 'heuristic',
          ...heuristic,
        };
      }

      // Build content analysis section for prompt
      let contentSection = 'Website Content Analysis: Could not analyze (website not accessible)';
      if (contentAnalysis) {
        contentSection = `Website Content Analysis:
- Suspicious elements detected: ${contentAnalysis.suspiciousElements.length > 0 ? contentAnalysis.suspiciousElements.join(', ') : 'None'}
- Content risk score from analysis: ${contentAnalysis.contentScore}/100
- Overall content assessment: ${contentAnalysis.contentAnalysis}`;
      }

      const prompt = `You are an expert cybersecurity analyst specializing in phishing detection. Your role is to identify PHISHING attempts and MALICIOUS websites. Be CRITICAL and SKEPTICAL - assume the worst unless proven otherwise.

URL: ${url}

${contentSection}

CRITICAL ANALYSIS REQUIRED:
1. Domain legitimacy - Check for typosquatting, homograph attacks, unusual domain patterns
2. URL structure - Look for encoded characters, obfuscation, unusual parameters
3. Content red flags - Forms requesting credentials, urgent language, redirect scripts, hidden elements
4. Security indicators - HTTPS presence, certificate validity implications
5. Known phishing indicators - Account verification requests, payment updates, identity confirmation
6. Suspicious patterns - Whatever looks unusual or out of place

IMPORTANT SCORING GUIDELINES:
- Default to SUSPICION until proven legitimate
- Any form requesting passwords, SSN, credit cards = HIGH RISK
- Multiple external links or redirects = MEDIUM to HIGH RISK
- Urgent/threatening language = INCREASE RISK
- JavaScript redirects = HIGH RISK
- Form submitting to external domain = CRITICAL RISK
- Missing HTTPS or HTTP-only = INCREASE RISK

You MUST be conservative - err on the side of caution. Do not give high safety scores easily.

Provide ONLY a JSON response in this exact format (no additional text):
{
  "isSuspicious": boolean,
  "riskScore": number (0-100, default to 50+ unless clearly legitimate),
  "safeScore": number (0-100, be conservative),
  "explanation": "Detailed explanation of threat level",
  "indicators": ["specific red flags found"],
  "recommendations": "Clear action for user",
  "trustLevel": "critical" | "high" | "medium" | "low" | "safe",
  "phishingLikelihood": "very high" | "high" | "moderate" | "low" | "very low",
  "contentRedFlags": number (0-100 estimate of content risk)
}`;

      const response = await axios.post(
        'https://api.openai.com/v1/chat/completions',
        {
          model: 'gpt-3.5-turbo',
          messages: [{ role: 'user', content: prompt }],
          max_tokens: 600,
          temperature: 0.2, // Very low temperature for critical analysis
        },
        {
          headers: {
            'Authorization': `Bearer ${this.openaiApiKey}`,
            'Content-Type': 'application/json',
          },
          timeout: 15000, // 15 second timeout
        }
      );

      const analysisText = response.data.choices[0].message.content;
      const analysis = JSON.parse(analysisText);

      return {
        method: 'llm',
        isSuspicious: analysis.isSuspicious,
        riskScore: analysis.riskScore || 50, // Default to medium-high risk if unclear
        safeScore: analysis.safeScore || (100 - (analysis.riskScore || 50)),
        explanation: analysis.explanation,
        indicators: analysis.indicators || [],
        recommendations: analysis.recommendations || 'Do not visit - potential phishing site',
        trustLevel: analysis.trustLevel || 'medium',
        phishingLikelihood: analysis.phishingLikelihood || 'moderate',
        contentRedFlags: analysis.contentRedFlags || contentAnalysis?.contentScore || 0,
      };
    } catch (error) {
      console.error('LLM Analysis error:', error.message);
      // Fallback to heuristic analysis
      const heuristic = this.heuristicAnalysis(features);
      const heuristicRisk = Math.max(heuristic.riskScore, contentAnalysis?.contentScore || 0);
      const safeScore = 100 - Math.min(100, heuristicRisk);
      return {
        method: 'heuristic_fallback',
        isSuspicious: heuristicRisk >= 40, // Lower threshold - be more cautious
        riskScore: heuristicRisk,
        safeScore: safeScore,
        ...heuristic,
        explanation: 'Analysis performed using pattern matching and content analysis (LLM unavailable)',
        recommendations: 'Do not visit unless you are certain of the source',
        contentRedFlags: contentAnalysis?.contentScore || 0,
      };
    }
  }

  /**
   * MAIN DETECTION METHOD - Complete ML Pipeline
   * 
   * Pipeline:
   * 1. Extract URL features
   * 2. Extract domain/network features
   * 3. Analyze webpage content
   * 4. Calculate ML feature scores
   * 5. Score using weighted ML model
   * 6. Integrate with LLM analysis (if available)
   * 7. Return final risk classification
   */
  async detectPhishing(url) {
    const startTime = Date.now();

    try {
      // Validate URL
      if (!url || typeof url !== 'string') {
        throw new Error('URL must be a non-empty string');
      }

      // STEP 1: Extract URL Features
      const urlFeatures = this.extractURLFeatures(url);

      // STEP 2: Extract Domain Features (in parallel)
      let domainFeatures = null;
      try {
        domainFeatures = await this.extractDomainFeatures(url);
      } catch (error) {
        console.log('Domain feature extraction failed (non-critical):', error.message);
        domainFeatures = { dnsRecordExists: false, mxRecords: [], spfRecord: false };
      }

      // STEP 3: Analyze website content (in parallel)
      let contentAnalysis = null;
      try {
        const htmlContent = await this.fetchWebsiteContent(url);
        if (htmlContent) {
          contentAnalysis = this.analyzeWebsiteContent(htmlContent, url);
        }
      } catch (contentError) {
        console.log('Content analysis failed (non-critical):', contentError.message);
      }

      // STEP 4: Calculate ML Feature Scores
      const featureScores = this.calculateMLFeatureScores(
        urlFeatures, 
        domainFeatures || {},
        contentAnalysis
      );

      // STEP 5: Score using ML Model
      const mlRiskScore = this.scoreUsingMLModel(featureScores);
      
      // STEP 6: Get additional analysis (heuristic + LLM)
      let llmAnalysis = await this.analyzeLLM(url, urlFeatures, contentAnalysis);
      
      // STEP 7: Ensemble Final Score (combine ML score with LLM/heuristic)
      const ensembleRiskScore = this.calculateEnsembleScore(mlRiskScore, llmAnalysis);
      const finalRiskScore = Math.round(ensembleRiskScore);
      const safeScore = Math.max(0, Math.min(100, 100 - finalRiskScore));
      const isSafe = safeScore >= 50;

      const processingTime = Date.now() - startTime;

      // Classify risk level
      const riskClassification = this.classifyRiskLevel(finalRiskScore);

      const result = {
        // Main Results
        isSafe: isSafe,
        riskScore: finalRiskScore,
        safeScore: safeScore,
        riskLevel: riskClassification,
        
        // Analysis Details
        explanation: this.generateExplanation(urlFeatures, featureScores, contentAnalysis, riskClassification),
        recommendations: this.generateRecommendations(isSafe, riskClassification),
        phishingLikelihood: llmAnalysis.phishingLikelihood || this.assessPhishingLikelihood(finalRiskScore),
        trustLevel: llmAnalysis.trustLevel || this.assessTrustLevel(finalRiskScore),
        
        // Detailed Analysis
        detailedAnalysis: {
          // URL Analysis
          urlStructure: url,
          suspiciousDomainPatterns: this.extractSuspiciousDomainPatterns(urlFeatures),
          domainAge: 'Unknown (requires WHOIS lookup)',
          
          // Security Assessment
          sslCertificateStatus: urlFeatures.hasHttps ? 'HTTPS Enabled ✓' : 'HTTP Only (Not Secure) ✗',
          commonPhishingIndicators: llmAnalysis.indicators || [],
          securityAssessment: this.generateSecurityAssessment(urlFeatures, domainFeatures, contentAnalysis, finalRiskScore),
          
          // Content Analysis
          websiteContentAnalysis: contentAnalysis?.contentAnalysis || 'Not analyzed',
          websiteRedFlags: contentAnalysis?.suspiciousElements || [],
          contentRiskScore: contentAnalysis?.contentScore || 0,
          trustScore: safeScore,
        },
        
        // Metadata
        analysisMethod: `ML+${llmAnalysis.method}`,
        contentAnalyzed: contentAnalysis !== null,
        processingTime: processingTime,
      };

      // Log results
      this.logAnalysisResults(url, urlFeatures, contentAnalysis, llmAnalysis, result);

      return result;
    } catch (error) {
      console.error('Phishing detection error:', error);
      throw error;
    }
  }

  /**
   * Calculate ensemble score combining ML and LLM/heuristic
   */
  calculateEnsembleScore(mlScore, llmAnalysis) {
    // Weight: 60% heuristic, 40% ML (heuristic is more consistent for known patterns)
    const heuristicWeight = 0.60;
    const mlWeight = 0.40;
    
    const heuristicScore = llmAnalysis.riskScore || 50;
    const ensembleScore = (heuristicScore * heuristicWeight) + (mlScore * mlWeight);
    
    // Apply minimum risk floor for URLs with multiple suspicious indicators
    // Ensure we don't underestimate phishing sites
    return Math.max(ensembleScore, llmAnalysis.riskScore * 0.85);
  }

  /**
   * Classify risk level based on score
   */
  classifyRiskLevel(riskScore) {
    if (riskScore >= 80) return 'CRITICAL';
    if (riskScore >= 60) return 'HIGH';
    if (riskScore >= 40) return 'MEDIUM';
    if (riskScore >= 20) return 'LOW';
    return 'SAFE';
  }

  /**
   * Assess phishing likelihood
   */
  assessPhishingLikelihood(riskScore) {
    if (riskScore >= 75) return 'very high';
    if (riskScore >= 50) return 'high';
    if (riskScore >= 35) return 'moderate';
    if (riskScore >= 20) return 'low';
    return 'very low';
  }

  /**
   * Assess trust level
   */
  assessTrustLevel(riskScore) {
    if (riskScore >= 75) return 'critical';
    if (riskScore >= 50) return 'high';
    if (riskScore >= 35) return 'medium';
    if (riskScore >= 20) return 'low';
    return 'safe';
  }

  /**
   * Generate human-readable explanation
   */
  generateExplanation(urlFeatures, featureScores, contentAnalysis, riskLevel) {
    let explanation = '';
    
    if (riskLevel === 'CRITICAL') {
      explanation = 'CRITICAL PHISHING WARNING: Multiple severe indicators detected. ';
      if (featureScores.ipAddressScore > 0) explanation += 'Domain uses IP address. ';
      if (featureScores.noHttpsScore > 0) explanation += 'No HTTPS encryption. ';
      if (urlFeatures.hasPhishingKeywords) explanation += 'Contains phishing keywords. ';
    } else if (riskLevel === 'HIGH') {
      explanation = 'HIGH RISK: Several phishing indicators detected. ';
      if (contentAnalysis?.contentScore > 50) explanation += 'Website content highly suspicious. ';
      if (urlFeatures.numSubdomains > 5) explanation += 'Excessive subdomains. ';
    } else if (riskLevel === 'MEDIUM') {
      explanation = 'MEDIUM RISK: Some suspicious characteristics. ';
      if (!urlFeatures.hasHttps) explanation += 'Missing HTTPS. ';
      if (urlFeatures.numHyphens > 1) explanation += 'Multiple hyphens in domain. ';
    } else if (riskLevel === 'LOW') {
      explanation = 'LOW RISK: Minor suspicious indicators. Website appears mostly legitimate.';
    } else {
      explanation = 'SAFE: Website appears to be legitimate. No significant phishing indicators detected.';
    }
    
    return explanation;
  }

  /**
   * Generate recommendations for user
   */
  generateRecommendations(isSafe, riskLevel) {
    if (riskLevel === 'CRITICAL') {
      return '⛔ DO NOT VISIT. Block this website and report to authorities.';
    } else if (riskLevel === 'HIGH') {
      return '🚫 NOT RECOMMENDED. Do not enter credentials. Verify the URL independently.';
    } else if (riskLevel === 'MEDIUM') {
      return '⚠️ CAUTION. Use extra care. Verify before entering any sensitive information.';
    } else if (riskLevel === 'LOW') {
      return '✓ Appears safe. However, always use caution with sensitive information.';
    } else {
      return '✓ Safe to visit. Website passed all security checks.';
    }
  }

  /**
   * Extract suspicious domain patterns found in URL
   */
  extractSuspiciousDomainPatterns(urlFeatures) {
    const patterns = [];
    
    if (urlFeatures.isIPAddress) {
      patterns.push('Domain is an IP address (highly suspicious)');
    }
    if (urlFeatures.numHyphens > 1) {
      patterns.push(`Multiple hyphens in domain (${urlFeatures.numHyphens} found)`);
    }
    if (urlFeatures.numSubdomains > 3) {
      patterns.push(`Excessive subdomains (${urlFeatures.numSubdomains} found)`);
    }
    if (urlFeatures.domainLength > 30) {
      patterns.push(`Unusually long domain name (${urlFeatures.domainLength} characters)`);
    }
    if (urlFeatures.hasPhishingKeywords) {
      patterns.push('Contains common phishing keywords');
    }
    if (urlFeatures.randomLooking) {
      patterns.push('Domain appears randomly generated');
    }
    
    return patterns.length > 0 ? patterns : ['No suspicious domain patterns detected'];
  }

  /**
   * Generate comprehensive security assessment
   */
  generateSecurityAssessment(urlFeatures, domainFeatures, contentAnalysis, riskScore) {
    let assessment = '';
    
    // SSL/TLS Assessment
    if (urlFeatures.hasHttps) {
      assessment += 'ENCRYPTION: ✓ HTTPS enabled - communication is encrypted. ';
    } else {
      assessment += 'ENCRYPTION: ✗ No HTTPS - communication is NOT encrypted (High Risk). ';
    }
    
    // Domain Assessment
    if (domainFeatures?.dnsRecordExists) {
      assessment += 'DOMAIN: ✓ DNS resolution successful. ';
    } else {
      assessment += 'DOMAIN: ✗ DNS resolution failed (Suspicious). ';
    }
    
    // Authentication Records
    if (domainFeatures?.spfRecord || domainFeatures?.dkimRecord || domainFeatures?.dmarcRecord) {
      assessment += 'AUTHENTICATION: ✓ Email authentication records found (SPF/DKIM/DMARC). ';
    } else {
      assessment += 'AUTHENTICATION: ✗ No email authentication records (Suspicious). ';
    }
    
    // Content Assessment
    if (contentAnalysis?.contentScore > 0) {
      assessment += `CONTENT: ⚠️ ${contentAnalysis.contentScore}% risk detected in website content. `;
    } else {
      assessment += 'CONTENT: ✓ No suspicious content detected. ';
    }
    
    // Overall Risk
    if (riskScore < 30) {
      assessment += 'OVERALL: ✓ Website appears legitimate and safe.';
    } else if (riskScore < 60) {
      assessment += 'OVERALL: ⚠️ Website has some suspicious indicators - use caution.';
    } else if (riskScore < 80) {
      assessment += 'OVERALL: ✗ Website has multiple phishing indicators - not recommended.';
    } else {
      assessment += 'OVERALL: ✗✗ Critical phishing indicators detected - DO NOT VISIT.';
    }
    
    return assessment;
  }
}

module.exports = new PhishingDetectionService();
