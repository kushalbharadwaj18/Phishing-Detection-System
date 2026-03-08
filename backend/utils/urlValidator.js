/**
 * URL Validator and Extractor
 */

const URL_REGEX = /^(https?:\/\/)?([\da-z\.-]+)\.([a-z\.]{2,6})([\/\w \.-]*)*\/?$/;

/**
 * Validate if string is a valid URL
 */
function validateURL(url) {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

/**
 * Extract domain from URL
 */
function extractDomain(url) {
  try {
    const urlObj = new URL(url.startsWith('http') ? url : `https://${url}`);
    return urlObj.hostname;
  } catch {
    return null;
  }
}

/**
 * Check if URL is suspicious based on patterns
 */
function isSuspiciousURL(url) {
  const suspiciousPatterns = [
    /\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}/, // IP address
    /bit\.ly|tinyurl|short\.link/i, // URL shorteners
    /login|signin|verify|confirm|update|account|security/i, // Common phishing keywords
    /paypal|amazon|apple|microsoft|google|bank/i, // Impersonation targets
  ];

  return suspiciousPatterns.some(pattern => pattern.test(url));
}

/**
 * Calculate domain age (basic estimation)
 */
function estimateDomainAge(domain) {
  // This is a placeholder - real implementation would check WHOIS data
  return 'Unknown (requires WHOIS lookup)';
}

module.exports = {
  validateURL,
  extractDomain,
  isSuspiciousURL,
  estimateDomainAge,
  URL_REGEX,
};
