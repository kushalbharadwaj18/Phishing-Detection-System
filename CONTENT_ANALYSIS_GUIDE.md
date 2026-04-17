# Advanced Phishing Detection System - Content Analysis Enhancement

## Overview

The phishing detection system has been enhanced with multi-layer analysis that combines:
1. **URL Feature Analysis** - Domain structure, protocol, encoding
2. **Website Content Analysis** - HTML structure, forms, links, scripts
3. **LLM-based Threat Assessment** - AI-powered evaluation with conservative scoring
4. **Heuristic Fallback** - Pattern-based detection when LLM unavailable

---

## Architecture

### 1. URL Feature Extraction

Analyzes URL structure for suspicious patterns:
- **Domain Analysis**: Length, special characters, subdomain count, TLD reputation
- **Protocol Check**: HTTPS presence (CRITICAL)
- **Encoding Detection**: Obfuscation attempts
- **IP Address Detection**: Direct IP usage instead of domain

```javascript
Features extracted:
- protocol (http/https)
- domain name & structure
- path parameters
- special characters
- digit patterns
- subdomain count
```

### 2. Website Content Extraction & Analysis

**Fetches actual webpage content** using:
- Realistic User-Agent headers (avoid detection)
- Proper error handling for unreachable sites
- 10-second timeout to prevent hangs

**Analyzes HTML for 7 major red flags:**

#### A. Login Forms Detection
- Forms requesting passwords, SSN, credit cards
- Form submissions to external domains
- Hidden credential fields

#### B. Suspicious Link Analysis
- JavaScript-based links (`javascript:` protocol)
- External domain redirects
- Urgent/action-oriented link text patterns:
  - "verify", "confirm", "update"
  - "click now", "act immediately"

#### C. Page Title & Meta Tags
- Phishing keywords: "verify", "urgent", "account", "security"
- Suspicious descriptions and titles

#### D. Malicious Scripts
- Redirect scripts (document.location, window.location)
- Non-analytics JavaScript that isn't from trusted sources

#### E. Urgency & Verification Text
- "Verify account immediately"
- "Limited time access"
- "Re-enter password"
- "Confirm payment"

#### F. Hidden Elements
- Elements with `display:none` or `visibility:hidden`
- Content hidden from normal view

#### G. Page Analysis Scoring
```
Each red flag: +8-25 points
Final content score: 0-100
```

---

## 3. LLM Analysis (OpenAI GPT-3.5-turbo)

### Prompt Strategy: **Conservative & Critical**

**Key Features:**
- **Default to suspicion** - Assume danger unless proven safe
- **Low temperature** (0.2) - Consistent, critical analysis
- **Combines URL + Content data** - Context-aware assessment
- **Context-aware scoring** - Different weightings for different flags

### Scoring Guidelines in Prompt:
```
- Form requesting credentials = HIGH RISK (always)
- Multiple external links/redirects = MEDIUM-HIGH
- Urgent/threatening language = INCREASE RISK
- JavaScript redirects = HIGH RISK (automatic)
- Form to external domain = CRITICAL RISK (automatic)
- Missing HTTPS = INCREASE RISK
- Suspicious content patterns = PROPORTIONAL INCREASE
```

### LLM Response Format:
```json
{
  "isSuspicious": boolean,
  "riskScore": 0-100 (default 50+ unless proven safe),
  "safeScore": 0-100 (be conservative),
  "explanation": "Detailed threat explanation",
  "indicators": ["red flag 1", "red flag 2", ...],
  "recommendations": "Clear action for user",
  "trustLevel": "critical|high|medium|low|safe",
  "phishingLikelihood": "very high|high|moderate|low|very low",
  "contentRedFlags": 0-100
}
```

---

## 4. Heuristic Analysis (Fallback)

**Used when:**
- LLM API unavailable
- Network errors occur
- Rate limits exceeded

**Strict Baseline Scoring:**
- Starts with 10 points (conservative base)
- Progressively increases for red flags
- Cap at 100

**Major Risk Factors:**

| Factor | Risk Points | Notes |
|--------|------------|-------|
| Missing HTTPS | +25 | Critical for security |
| IP Address Domain | +30 | Very suspicious |
| Encoded URL Characters | +22 | Evasion attempt |
| Suspicious TLD (.tk, .ml, .cf) | +15 | Commonly abused |
| High-risk Keywords | +12 | verify, confirm, update, secure |
| Multiple Subdomains | +18 | Obfuscation |
| Long Domain (>30 chars) | +15 | Obfuscation |
| Domain Hyphens (2+) | +18 | Typosquatting |
| Long URL (>75 chars) | +12 | Parameter injection |

---

## Analysis Flow

```
┌─────────────────────────────────────────┐
│ User submits URL for analysis           │
└────────────────┬────────────────────────┘
                 ↓
┌─────────────────────────────────────────┐
│ 1. Extract URL Features                 │
│    - Domain structure                   │
│    - Protocol, TLD                      │
│    - Encoding, special chars            │
└────────────────┬────────────────────────┘
                 ↓
         ┌───────┴──────────┐
         ↓                  ↓
    ┌────────────┐   ┌────────────────┐
    │ URL        │   │ Fetch Website  │
    │ Heuristic  │   │ Content        │
    │ Analysis   │   │ (async)        │
    └────┬───────┘   └────────┬───────┘
         │                    ↓
         │            ┌─────────────────┐
         │            │ Analyze HTML    │
         │            │ for 7 red flags │
         │            └────────┬────────┘
         │                     ↓
         │            Content Risk Score
         │                  (0-100)
         │                     │
         └──────────────┬──────┘
                        ↓
            ┌───────────────────────┐
            │ LLM Analysis          │
            │ (with all context)    │
            │ OR Heuristic Fallback │
            └──────────┬────────────┘
                       ↓
        ┌──────────────────────────────┐
        │ Final Risk Assessment         │
        │ - Risk Score (0-100)          │
        │ - Safe Score (0-100)          │
        │ - Phishing Likelihood         │
        │ - Trust Level                 │
        │ - Recommendations             │
        └──────────┬───────────────────┘
                   ↓
        Save to database with full details
        Return to user
```

---

## Data Stored

### LinkAnalysis Database Fields

```javascript
{
  userId: ObjectId,
  url: String,
  
  // Scores
  isSafe: Boolean,
  riskScore: 0-100,
  safeScore: 0-100,
  
  // Analysis Results
  explanation: String,
  recommendations: String,
  phishingLikelihood: enum,
  trustLevel: enum,
  analysisMethod: enum,
  
  // Content Information
  contentAnalyzed: Boolean,
  
  detailedAnalysis: {
    urlStructure: String,
    suspiciousDomainPatterns: [String],
    websiteContentAnalysis: String,
    websiteRedFlags: [String],
    contentRiskScore: Number,
    sslCertificateStatus: String,
    commonPhishingIndicators: [String],
    trustScore: Number,
    securityAssessment: String
  },
  
  processingTime: Number (ms),
  analysisTimestamp: Date
}
```

---

## Conservative Scoring Examples

### Example 1: Legitimate Bank Site
```
URL: https://www.bank.com/login
- HTTPS: Yes (-0)
- Domain: Clear, well-known (+0)
- Content: Professional, no forms submitting externally (+0)
- LLM Analysis: Safe design, trusted domain
→ LLM Risk: 15%
→ Safe Score: 85%
→ Result: SAFE ✓
```

### Example 2: Phishing Site
```
URL: http://paypa1-verify.tk/login?id=123abc
- HTTPS: No (+25)
- Domain: Typo "paypa1", suspicious TLD (.tk) (+15+15)
- Special chars in URL (+22)
- Content: Form submitting to external domain, urgent language (+30+25)
→ Content Score: 75%
→ LLM Risk: 88%
→ Safe Score: 12%
→ Result: DANGEROUS ✗
```

### Example 3: Ambiguous Site
```
URL: https://secure-banking-auth.com/verify
- HTTPS: Yes (+0)
- Domain: Contains "verify" (+8)
- Content: Login form (normal for banks) but has urgent text (+15)
→ Content Score: 45%
→ Default Risk: 50% (conservative default)
→ LLM Risk: 62%
→ Safe Score: 38%
→ Result: RISKY - DON'T TRUST ⚠️
```

---

## Implementation Details

### Dependencies Added
```javascript
- cheerio: HTML parsing
- user-agents: Realistic browser headers
- axios: HTTP requests with proper headers
```

### Error Handling
- **Website unreachable**: Continue with URL analysis only
- **LLM API failure**: Fallback to heuristic + content scores
- **Invalid HTML**: Graceful degradation
- **Timeout handling**: 10s timeout per fetch

### Performance
- **Parallel processing**: URL + content analysis simultaneously
- **Caching**: 24-hour cache for recent analyses
- **Processing time**: Typically 2-5 seconds with content analysis

---

## Usage

### API Endpoint
```
POST /api/detection/analyze
Content-Type: application/json

{
  "url": "https://example.com"
}

Response:
{
  "isSafe": false,
  "riskScore": 72,
  "safeScore": 28,
  "phishingLikelihood": "high",
  "trustLevel": "high",
  "explanation": "...",
  "recommendations": "...",
  "contentAnalyzed": true,
  "detailedAnalysis": { ... }
}
```

---

## Security Considerations

1. **No Credentials Sent**: Never sends actual login data
2. **User-Agent Rotation**: Uses realistic browser headers
3. **Timeout Protection**: 10s max per website fetch
4. **Content Size Limits**: Limits HTML parsing to prevent DoS
5. **Conservative Defaults**: Assumes danger unless proven safe

---

## Future Enhancements

- [ ] Machine learning model for content classification
- [ ] Real-time domain reputation API integration
- [ ] SSL certificate validity checking
- [ ] Historical phishing pattern database
- [ ] Computer vision for logo detection spoofing
- [ ] JavaScript execution analysis (for redirect detection)
