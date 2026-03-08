import React from 'react';
import { AlertCircle, CheckCircle, AlertTriangle } from 'lucide-react';
import './AnalysisResult.css';

const AnalysisResult = ({ result }) => {
  const isSafe = result.isSafe;
  const riskScore = result.riskScore || 0;
  const safeScore = result.safeScore || (100 - riskScore);

  const getRiskLevel = () => {
    if (riskScore < 30) return 'LOW RISK';
    if (riskScore < 60) return 'MEDIUM RISK';
    if (riskScore < 80) return 'HIGH RISK';
    return 'CRITICAL RISK';
  };

  const getRiskColor = () => {
    if (riskScore < 30) return '#10b981';
    if (riskScore < 60) return '#f59e0b';
    if (riskScore < 80) return '#ef4444';
    return '#dc2626';
  };

  const getSafeColor = () => {
    if (safeScore >= 70) return '#10b981';
    if (safeScore >= 50) return '#f59e0b';
    if (safeScore >= 30) return '#ef4444';
    return '#dc2626';
  };

  const getPhishingLikelihoodColor = () => {
    const likelihood = result.phishingLikelihood || 'moderate';
    if (likelihood === 'very high' || likelihood === 'high') return '#dc2626';
    if (likelihood === 'moderate') return '#f59e0b';
    return '#10b981';
  };

  return (
    <div className={`analysis-result ${isSafe ? 'safe' : 'unsafe'}`}>
      <div className="result-header">
        <div className="result-icon">
          {isSafe ? (
            <CheckCircle size={48} color="#10b981" />
          ) : (
            <AlertCircle size={48} color="#ef4444" />
          )}
        </div>
        <div>
          <h2>{isSafe ? '✓ Safe to Visit' : '⚠️ Potentially Dangerous'}</h2>
          <p>{result.explanation}</p>
        </div>
      </div>

      <div className="result-details">
        {/* Risk Score */}
        <div className="detail-item">
          <span className="detail-label">🔴 Risk Score</span>
          <div className="risk-indicator">
            <div className="risk-bar">
              <div
                className="risk-fill"
                style={{
                  width: `${riskScore}%`,
                  backgroundColor: getRiskColor(),
                }}
              />
            </div>
            <span className="risk-number">{riskScore}%</span>
            <span className="risk-level">{getRiskLevel()}</span>
          </div>
        </div>

        {/* Safe Score */}
        <div className="detail-item">
          <span className="detail-label">🟢 Safe Score</span>
          <div className="risk-indicator">
            <div className="risk-bar">
              <div
                className="risk-fill"
                style={{
                  width: `${safeScore}%`,
                  backgroundColor: getSafeColor(),
                }}
              />
            </div>
            <span className="risk-number">{Math.round(safeScore)}%</span>
            <span className="risk-level" style={{ color: getSafeColor() }}>
              {safeScore >= 70 ? 'HIGH SAFE' : safeScore >= 50 ? 'MODERATE' : 'LOW SAFE'}
            </span>
          </div>
        </div>

        {/* Phishing Likelihood */}
        {result.phishingLikelihood && (
          <div className="detail-item">
            <span className="detail-label">🎯 Phishing Likelihood</span>
            <p className="likelihood-badge" style={{ color: getPhishingLikelihoodColor() }}>
              {result.phishingLikelihood?.toUpperCase()}
            </p>
          </div>
        )}

        {/* Trust Level */}
        {result.trustLevel && (
          <div className="detail-item">
            <span className="detail-label">🛡️ Trust Level</span>
            <p className="trust-badge">{result.trustLevel?.toUpperCase()}</p>
          </div>
        )}

        <div className="detail-item">
          <span className="detail-label">URL Structure</span>
          <p className="monospace">{result.detailedAnalysis?.urlStructure}</p>
        </div>

        <div className="detail-item">
          <span className="detail-label">SSL/TLS Certificate</span>
          <p>{result.detailedAnalysis?.sslCertificateStatus}</p>
        </div>

        {/* Suspicious Indicators */}
        {result.detailedAnalysis?.suspiciousDomainPatterns?.length > 0 && (
          <div className="detail-item">
            <span className="detail-label">⚠️ Suspicious Indicators</span>
            <ul className="indicator-list">
              {result.detailedAnalysis.suspiciousDomainPatterns.map((indicator, idx) => (
                <li key={idx}>
                  <AlertTriangle size={16} />
                  {indicator}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Recommendations */}
        {result.recommendations && (
          <div className="detail-item">
            <span className="detail-label">💡 Recommendations</span>
            <p className="recommendation-text">{result.recommendations}</p>
          </div>
        )}

        <div className="detail-item">
          <span className="detail-label">⏱️ Processing Time</span>
          <p>{result.processingTime}ms</p>
        </div>

        <div className="detail-item">
          <span className="detail-label">🔬 Analysis Method</span>
          <p className="method-badge">{result.analysisMethod?.toUpperCase() || 'AI Analysis'}</p>
        </div>
      </div>

      <div className="result-recommendation">
        {isSafe ? (
          <div className="recommendation-safe">
            <CheckCircle size={20} />
            <div>
              <strong>This link appears to be legitimate</strong>
              <p>It passed our security checks. However, always stay cautious online and verify before entering sensitive information.</p>
            </div>
          </div>
        ) : (
          <div className="recommendation-unsafe">
            <AlertCircle size={20} />
            <div>
              <strong>We recommend not visiting this link</strong>
              <p>This link shows signs of phishing. Do not enter credentials, personal information, or make transactions.</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AnalysisResult;
