const axios = require('axios');

class PhishingDetectionService {
  constructor() {
    this.openaiApiKey = process.env.OPENAI_API_KEY;
    this.huggingfaceApiKey = process.env.HUGGINGFACE_API_KEY;
  }

  /**
   * Extract features from URL for analysis
   */
  extractURLFeatures(url) {
    try {
      const urlObj = new URL(url);
      const domain = urlObj.hostname;
      const path = urlObj.pathname;

      return {
        url,
        domain,
        path,
        protocol: urlObj.protocol,
        hasHttps: urlObj.protocol === 'https:',
        hasWWW: domain.startsWith('www.'),
        domainLength: domain.length,
        specialCharInDomain: /[-._]/.test(domain),
        digitCount: (domain.match(/\d/g) || []).length,
        urlLength: url.length,
        subddomainCount: domain.split('.').length - 1,
      };
    } catch (error) {
      throw new Error('Invalid URL format');
    }
  }

  /**
   * Analyze URL using basic heuristics
   */
  heuristicAnalysis(features) {
    let suspiciousIndicators = [];
    let riskScore = 0;

    // Check HTTPS
    if (!features.hasHttps) {
      suspiciousIndicators.push('Not using HTTPS protocol');
      riskScore += 15;
    }

    // Check domain length
    if (features.domainLength > 30) {
      suspiciousIndicators.push('Unusually long domain name');
      riskScore += 10;
    }

    // Check for multiple special characters
    if (features.specialCharInDomain && features.digitCount > 2) {
      suspiciousIndicators.push('Domain contains unusual pattern of numbers and symbols');
      riskScore += 15;
    }

    // Check for excessive subdomains
    if (features.subddomainCount > 3) {
      suspiciousIndicators.push('Multiple subdomains detected');
      riskScore += 12;
    }

    // Check URL length
    if (features.urlLength > 75) {
      suspiciousIndicators.push('Unusually long URL');
      riskScore += 8;
    }

    // Check for IP address
    if (/\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}/.test(features.domain)) {
      suspiciousIndicators.push('Domain is an IP address instead of proper domain');
      riskScore += 25;
    }

    // Common phishing patterns
    const commonPatterns = [
      'paypal', 'amazon', 'apple', 'google', 'microsoft', 'bank',
      'verify', 'confirm', 'update', 'action', 'account', 'security',
    ];

    for (const pattern of commonPatterns) {
      if (features.domain.toLowerCase().includes(pattern)) {
        suspiciousIndicators.push(`Contains common phishing keyword: "${pattern}"`);
        riskScore += 5;
      }
    }

    return {
      suspiciousIndicators,
      riskScore: Math.min(100, riskScore),
    };
  }

  /**
   * Use LLM for enhanced detection (with fallback to heuristic analysis)
   */
  async analyzeLLM(url, features) {
    try {
      // If OpenAI API key is not configured, use heuristic analysis
      if (!this.openaiApiKey) {
        const heuristic = this.heuristicAnalysis(features);
        return {
          method: 'heuristic',
          ...heuristic,
        };
      }

      const prompt = `You are an expert cybersecurity analyst specializing in phishing detection and URL analysis. Perform a thorough security assessment of this URL.

URL: ${url}

Analyze the following factors:
1. Domain reputation and legitimacy
2. URL structure, length, and encoding
3. Suspicious patterns (typosquatting, homograph attacks, etc.)
4. Common phishing tactics and tactics
5. Protocol security (HTTP vs HTTPS, SSL/TLS status)
6. Known phishing indicators and red flags
7. Overall threat level

Provide ONLY a JSON response in this exact format (no additional text):
{
  "isSuspicious": boolean,
  "riskScore": number (0-100, where 100 is most dangerous),
  "safeScore": number (0-100, where 100 is most safe),
  "explanation": "Clear, concise explanation of the threat level",
  "indicators": ["specific phishing indicators found"],
  "recommendations": "What user should do",
  "trustLevel": "critical" | "high" | "medium" | "low" | "safe",
  "phishingLikelihood": "very high" | "high" | "moderate" | "low" | "very low"
}`;

      const response = await axios.post(
        'https://api.openai.com/v1/chat/completions',
        {
          model: 'gpt-3.5-turbo',
          messages: [{ role: 'user', content: prompt }],
          max_tokens: 500,
          temperature: 0.3, // Lower temperature for more consistent results
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
        riskScore: analysis.riskScore || 0,
        safeScore: analysis.safeScore || (100 - (analysis.riskScore || 0)),
        explanation: analysis.explanation,
        indicators: analysis.indicators || [],
        recommendations: analysis.recommendations || 'Proceed with caution',
        trustLevel: analysis.trustLevel || 'medium',
        phishingLikelihood: analysis.phishingLikelihood || 'moderate',
      };
    } catch (error) {
      console.error('LLM Analysis error:', error.message);
      // Fallback to heuristic analysis
      const heuristic = this.heuristicAnalysis(features);
      const safeScore = 100 - Math.min(100, heuristic.riskScore);
      return {
        method: 'heuristic_fallback',
        isSuspicious: heuristic.riskScore >= 50,
        riskScore: heuristic.riskScore,
        safeScore: safeScore,
        ...heuristic,
        explanation: 'Analysis performed using pattern matching (LLM unavailable)',
        recommendations: 'Be cautious with this URL',
      };
    }
  }

  /**
   * Main detection method
   */
  async detectPhishing(url) {
    const startTime = Date.now();

    try {
      // Validate URL
      if (!url || typeof url !== 'string') {
        throw new Error('URL must be a non-empty string');
      }

      // Extract features
      const features = this.extractURLFeatures(url);

      // Perform LLM analysis
      const analysis = await this.analyzeLLM(url, features);

      const processingTime = Date.now() - startTime;

      const safeScore = analysis.safeScore || (100 - Math.min(100, analysis.riskScore));
      const isSafe = safeScore >= 50;

      return {
        isSafe: isSafe,
        riskScore: analysis.riskScore || 0,
        safeScore: Math.max(0, Math.min(100, safeScore)), // Ensure 0-100 range
        explanation: analysis.explanation || 'Unable to determine risk level',
        recommendations: analysis.recommendations || 'Verify before proceeding',
        phishingLikelihood: analysis.phishingLikelihood || 'moderate',
        trustLevel: analysis.trustLevel || 'medium',
        detailedAnalysis: {
          suspiciousDomainPatterns: analysis.indicators || [],
          urlStructure: `${features.protocol}//${features.domain}${features.path}`,
          domainAge: 'Analysis not available in this version',
          sslCertificateStatus: features.hasHttps ? 'HTTPS Enabled ✓' : 'HTTP Only (Not Secure) ✗',
          commonPhishingIndicators: analysis.indicators || [],
          trustScore: safeScore,
          securityAssessment: analysis.recommendations || 'Proceed with caution',
        },
        analysisMethod: analysis.method,
        processingTime,
      };
    } catch (error) {
      console.error('Phishing detection error:', error);
      throw error;
    }
  }
}

module.exports = new PhishingDetectionService();
