import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  AlertCircle,
  CheckCircle,
  AlertTriangle,
  Copy,
  Download,
} from 'lucide-react';
import api from '../services/api';
import './LinkReview.css';

const LinkReview = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [analysis, setAnalysis] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [copied, setCopied] = useState(false);

  const fetchAnalysisDetails = async () => {
    try {
      setLoading(true);
      const response = await api.get(`/detection/${id}`);
      setAnalysis(response.data);
      setError(null);
    } catch (err) {
      console.error('Error fetching analysis:', err);
      setError(err.response?.data?.message || 'Failed to load analysis details');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalysisDetails();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const downloadReport = () => {
    const report = `
PHISHING DETECTION ANALYSIS REPORT
====================================

URL: ${analysis.url}
Analysis Date: ${new Date(analysis.analysisTimestamp).toLocaleString()}

SAFETY ASSESSMENT
-----------------
Safe Score: ${analysis.safeScore}%
Risk Score: ${analysis.riskScore}%
Is Safe: ${analysis.isSafe ? 'YES' : 'NO'}

THREAT ANALYSIS
---------------
Phishing Likelihood: ${analysis.phishingLikelihood?.toUpperCase()}
Trust Level: ${analysis.trustLevel?.toUpperCase()}
Analysis Method: ${analysis.analysisMethod?.toUpperCase()}

EXPLANATION
-----------
${analysis.explanation}

RECOMMENDATIONS
---------------
${analysis.recommendations || 'No specific recommendations'}

DETAILED ANALYSIS
-----------------
URL Structure: ${analysis.detailedAnalysis?.urlStructure}
SSL Certificate Status: ${analysis.detailedAnalysis?.sslCertificateStatus}
Domain Pattern: ${analysis.detailedAnalysis?.domainPattern || 'N/A'}

${
  analysis.detailedAnalysis?.suspiciousDomainPatterns?.length > 0
    ? `Suspicious Indicators:
${analysis.detailedAnalysis.suspiciousDomainPatterns.map((p) => `- ${p}`).join('\n')}`
    : ''
}

Processing Time: ${analysis.processingTime}ms
`;

    const element = document.createElement('a');
    element.setAttribute('href', 'data:text/plain;charset=utf-8,' + encodeURIComponent(report));
    element.setAttribute('download', `phishing-report-${new Date().getTime()}.txt`);
    element.style.display = 'none';
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  if (loading) {
    return (
      <div className="link-review-container loading">
        <div className="spinner">Loading analysis details...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="link-review-container error">
        <div className="error-message">
          <AlertCircle size={32} />
          <p>{error}</p>
          <button onClick={() => navigate('/analytics')}>Back to Analytics</button>
        </div>
      </div>
    );
  }

  if (!analysis) {
    return (
      <div className="link-review-container empty">
        <p>Analysis not found</p>
        <button onClick={() => navigate('/analytics')}>Back to Analytics</button>
      </div>
    );
  }

  const getSafeColor = () => {
    if (analysis.safeScore >= 70) return '#10b981';
    if (analysis.safeScore >= 50) return '#f59e0b';
    if (analysis.safeScore >= 30) return '#ef4444';
    return '#dc2626';
  };

  const getRiskColor = () => {
    if (analysis.riskScore < 30) return '#10b981';
    if (analysis.riskScore < 60) return '#f59e0b';
    if (analysis.riskScore < 80) return '#ef4444';
    return '#dc2626';
  };

  const getPhishingColor = () => {
    const likelihood = analysis.phishingLikelihood?.toLowerCase();
    if (likelihood === 'very high' || likelihood === 'high') return '#dc2626';
    if (likelihood === 'moderate') return '#f59e0b';
    return '#10b981';
  };

  return (
    <div className="link-review-container">
      <button className="back-btn" onClick={() => navigate('/analytics')}>
        <ArrowLeft size={20} /> Back to Analytics
      </button>

      <div className="review-header">
        <div className="header-icon">
          {analysis.isSafe ? (
            <CheckCircle size={56} color="#10b981" />
          ) : (
            <AlertCircle size={56} color="#ef4444" />
          )}
        </div>
        <div className="header-info">
          <h1>{analysis.isSafe ? '✓ Safe Link' : '⚠️ Dangerous Link'}</h1>
          <p className="analysis-date">
            Analyzed on {new Date(analysis.analysisTimestamp).toLocaleString()}
          </p>
        </div>
        <div className="header-actions">
          <button className="action-btn" onClick={() => copyToClipboard(analysis.url)}>
            <Copy size={18} />
            {copied ? 'Copied!' : 'Copy URL'}
          </button>
          <button className="action-btn" onClick={downloadReport}>
            <Download size={18} />
            Report
          </button>
        </div>
      </div>

      {/* URL Section */}
      <div className="info-section">
        <h2 className="section-title">🔗 URL Information</h2>
        <div className="url-display">
          <input
            type="text"
            value={analysis.url}
            readOnly
            className="url-input"
            onClick={() => copyToClipboard(analysis.url)}
          />
          <button className="copy-btn" onClick={() => copyToClipboard(analysis.url)}>
            <Copy size={16} />
          </button>
        </div>
      </div>

      {/* Safety Scores Section */}
      <div className="scores-grid">
        <div className="score-card safe-score">
          <div className="score-header">
            <span className="score-label">🟢 Safe Score</span>
            <span className="score-value" style={{ color: getSafeColor() }}>
              {Math.round(analysis.safeScore)}%
            </span>
          </div>
          <div className="score-bar">
            <div
              className="score-fill"
              style={{
                width: `${analysis.safeScore}%`,
                backgroundColor: getSafeColor(),
              }}
            />
          </div>
          <div className="score-description">
            {analysis.safeScore >= 70
              ? 'This link appears to be safe'
              : analysis.safeScore >= 50
              ? 'Use caution when visiting'
              : 'Likely phishing attempt detected'}
          </div>
        </div>

        <div className="score-card risk-score">
          <div className="score-header">
            <span className="score-label">🔴 Risk Score</span>
            <span className="score-value" style={{ color: getRiskColor() }}>
              {analysis.riskScore}%
            </span>
          </div>
          <div className="score-bar">
            <div
              className="score-fill"
              style={{
                width: `${analysis.riskScore}%`,
                backgroundColor: getRiskColor(),
              }}
            />
          </div>
          <div className="score-description">
            {analysis.riskScore < 30
              ? 'Low risk detected'
              : analysis.riskScore < 60
              ? 'Moderate risk present'
              : analysis.riskScore < 80
              ? 'High risk detected'
              : 'Critical risk level'}
          </div>
        </div>
      </div>

      {/* Threat Assessment Section */}
      <div className="threat-grid">
        <div className="threat-card">
          <span className="threat-label">🎯 Phishing Likelihood</span>
          <span
            className="threat-value"
            style={{
              color: getPhishingColor(),
              backgroundColor: getPhishingColor() + '20',
            }}
          >
            {(analysis.phishingLikelihood || 'Unknown').toUpperCase()}
          </span>
        </div>

        <div className="threat-card">
          <span className="threat-label">🛡️ Trust Level</span>
          <span className="threat-value">
            {(analysis.trustLevel || 'Unknown').toUpperCase()}
          </span>
        </div>

        <div className="threat-card">
          <span className="threat-label">🔬 Analysis Method</span>
          <span className="threat-value">
            {(analysis.analysisMethod || 'Unknown').toUpperCase()}
          </span>
        </div>

        <div className="threat-card">
          <span className="threat-label">⏱️ Processing Time</span>
          <span className="threat-value">{analysis.processingTime}ms</span>
        </div>
      </div>

      {/* Explanation Section */}
      <div className="info-section">
        <h2 className="section-title">📋 Analysis Explanation</h2>
        <p className="explanation-text">{analysis.explanation}</p>
      </div>

      {/* Recommendations Section */}
      {analysis.recommendations && (
        <div className="info-section">
          <h2 className="section-title">💡 Recommendations</h2>
          <div className="recommendation-box">
            <p>{analysis.recommendations}</p>
          </div>
        </div>
      )}

      {/* Detailed Analysis Section */}
      <div className="info-section">
        <h2 className="section-title">🔍 Detailed Analysis</h2>

        <div className="detail-item">
          <span className="detail-label">URL Structure</span>
          <p className="detail-value monospace">
            {analysis.detailedAnalysis?.urlStructure}
          </p>
        </div>

        <div className="detail-item">
          <span className="detail-label">SSL/TLS Certificate</span>
          <p className="detail-value">
            {analysis.detailedAnalysis?.sslCertificateStatus}
          </p>
        </div>

        {analysis.detailedAnalysis?.domainPattern && (
          <div className="detail-item">
            <span className="detail-label">Domain Pattern</span>
            <p className="detail-value monospace">
              {analysis.detailedAnalysis.domainPattern}
            </p>
          </div>
        )}

        {analysis.detailedAnalysis?.suspiciousDomainPatterns?.length > 0 && (
          <div className="detail-item">
            <span className="detail-label">⚠️ Suspicious Indicators</span>
            <ul className="indicators-list">
              {analysis.detailedAnalysis.suspiciousDomainPatterns.map(
                (indicator, idx) => (
                  <li key={idx}>
                    <AlertTriangle size={16} />
                    {indicator}
                  </li>
                )
              )}
            </ul>
          </div>
        )}

        {analysis.detailedAnalysis?.securityAssessment && (
          <div className="detail-item">
            <span className="detail-label">Security Assessment</span>
            <p className="detail-value">{analysis.detailedAnalysis.securityAssessment}</p>
          </div>
        )}
      </div>

      {/* Final Recommendation Box */}
      <div className="final-recommendation">
        {analysis.isSafe ? (
          <div className="recommendation-safe">
            <CheckCircle size={24} />
            <div>
              <h3>✓ Safe to Visit</h3>
              <p>
                This link has passed security checks. However, always be cautious and verify
                before entering sensitive information.
              </p>
            </div>
          </div>
        ) : (
          <div className="recommendation-unsafe">
            <AlertCircle size={24} />
            <div>
              <h3>⚠️ Not Recommended</h3>
              <p>
                This link shows signs of phishing or malicious activity. Do not visit this link
                or enter any credentials or personal information.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default LinkReview;
