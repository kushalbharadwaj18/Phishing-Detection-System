import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  PieChart,
  Pie,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import { AlertCircle } from 'lucide-react';
import api from '../services/api';
import './Analytics.css';

const Analytics = () => {
  const navigate = useNavigate();
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const COLORS = {
    safe: '#10b981',
    unsafe: '#ef4444',
    moderate: '#f59e0b',
    high: '#dc2626',
    low: '#059669',
  };

  const PHISHING_COLORS = {
    'very high': '#7f1d1d',
    high: '#dc2626',
    moderate: '#f59e0b',
    low: '#38a169',
    'very low': '#10b981',
  };

  const TRUST_COLORS = {
    critical: '#7f1d1d',
    high: '#dc2626',
    medium: '#f59e0b',
    low: '#38a169',
    safe: '#10b981',
  };

  useEffect(() => {
    fetchAnalytics();
  }, []);

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      const response = await api.get('/detection/analytics/dashboard');
      setAnalytics(response.data);
      setError(null);
    } catch (err) {
      console.error('Error fetching analytics:', err);
      setError(err.response?.data?.message || 'Failed to load analytics');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="analytics-container loading">
        <div className="spinner">Loading analytics...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="analytics-container error">
        <div className="error-message">
          <AlertCircle size={24} />
          <p>{error}</p>
          <button onClick={fetchAnalytics}>Retry</button>
        </div>
      </div>
    );
  }

  if (!analytics) {
    return (
      <div className="analytics-container empty">
        <p>No analytics data available yet. Start analyzing links to see statistics.</p>
      </div>
    );
  }

  return (
    <div className="analytics-container">
      <div className="analytics-header">
        <h1>📊 Analytics Dashboard</h1>
        <button className="refresh-btn" onClick={fetchAnalytics}>
          🔄 Refresh
        </button>
      </div>

      {/* Summary Cards */}
      <div className="summary-cards">
        <div className="card total">
          <div className="card-content">
            <div className="card-label">Total Analyses</div>
            <div className="card-value">{analytics.summary.total}</div>
            <div className="card-subtext">links analyzed</div>
          </div>
        </div>

        <div className="card safe">
          <div className="card-content">
            <div className="card-label">✓ Safe Links</div>
            <div className="card-value">{analytics.summary.safe}</div>
            <div className="card-subtext">{analytics.summary.safePercentage}%</div>
          </div>
        </div>

        <div className="card unsafe">
          <div className="card-content">
            <div className="card-label">⚠️ Unsafe Links</div>
            <div className="card-value">{analytics.summary.unsafe}</div>
            <div className="card-subtext">{analytics.summary.unsafePercentage}%</div>
          </div>
        </div>

        <div className="card average">
          <div className="card-content">
            <div className="card-label">Avg Risk Score</div>
            <div className="card-value">{Math.round(analytics.scores.avgRisk)}%</div>
            <div className="card-subtext">
              Safe: {Math.round(analytics.scores.avgSafe)}%
            </div>
          </div>
        </div>
      </div>

      {/* Charts Grid */}
      <div className="charts-grid">
        {/* Safe vs Unsafe Pie Chart */}
        <div className="chart-box">
          <h3>🥧 Safety Distribution</h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={[
                  { name: 'Safe', value: analytics.summary.safe },
                  { name: 'Unsafe', value: analytics.summary.unsafe },
                ]}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                outerRadius={100}
                fill="#8884d8"
                dataKey="value"
              >
                <Cell fill={COLORS.safe} />
                <Cell fill={COLORS.unsafe} />
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Phishing Likelihood Pie Chart */}
        <div className="chart-box">
          <h3>🎯 Phishing Likelihood</h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={analytics.phishingBreakdown}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) =>
                  `${name || 'Unknown'} ${(percent * 100).toFixed(0)}%`
                }
                outerRadius={100}
                fill="#8884d8"
                dataKey="value"
              >
                {analytics.phishingBreakdown.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={PHISHING_COLORS[entry.name] || '#999'} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Trust Level Pie Chart */}
        <div className="chart-box">
          <h3>🛡️ Trust Level Distribution</h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={analytics.trustBreakdown}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) =>
                  `${name || 'Unknown'} ${(percent * 100).toFixed(0)}%`
                }
                outerRadius={100}
                fill="#8884d8"
                dataKey="value"
              >
                {analytics.trustBreakdown.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={TRUST_COLORS[entry.name] || '#999'} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Analysis Method Pie Chart */}
        <div className="chart-box">
          <h3>🔬 Analysis Method Used</h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={analytics.methodBreakdown}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) =>
                  `${(name || 'Unknown').toUpperCase()} ${(percent * 100).toFixed(0)}%`
                }
                outerRadius={100}
                fill="#8884d8"
                dataKey="value"
              >
                <Cell fill="#3b82f6" />
                <Cell fill="#8b5cf6" />
                <Cell fill="#ec4899" />
                <Cell fill="#14b8a6" />
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Bar Charts */}
      <div className="charts-full-width">
        {/* Risk Score Distribution */}
        <div className="chart-box full-width">
          <h3>📊 Risk Score Distribution</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={analytics.riskDistribution}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="range" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="count" fill="#ef4444" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Safe Score Distribution */}
        <div className="chart-box full-width">
          <h3>📈 Safe Score Distribution</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={analytics.safeDistribution}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="range" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="count" fill="#10b981" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Recent Analyses Table */}
      <div className="recent-analyses">
        <h2>📝 Recent Analyses</h2>
        <div className="table-container">
          <table className="analyses-table">
            <thead>
              <tr>
                <th>URL</th>
                <th>Safe Score</th>
                <th>Risk Score</th>
                <th>Phishing Likelihood</th>
                <th>Trust Level</th>
                <th>Date</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {analytics.recentAnalyses.length > 0 ? (
                analytics.recentAnalyses.map((analysis) => (
                  <tr key={analysis._id}>
                    <td className="url-cell" title={analysis.url}>
                      {analysis.url.length > 50
                        ? analysis.url.substring(0, 50) + '...'
                        : analysis.url}
                    </td>
                    <td>
                      <span
                        className="score-badge"
                        style={{
                          backgroundColor:
                            analysis.safeScore >= 70
                              ? '#10b981'
                              : analysis.safeScore >= 50
                              ? '#f59e0b'
                              : '#ef4444',
                        }}
                      >
                        {Math.round(analysis.safeScore)}%
                      </span>
                    </td>
                    <td>
                      <span
                        className="score-badge"
                        style={{
                          backgroundColor:
                            analysis.riskScore < 30
                              ? '#10b981'
                              : analysis.riskScore < 60
                              ? '#f59e0b'
                              : analysis.riskScore < 80
                              ? '#ef4444'
                              : '#dc2626',
                        }}
                      >
                        {analysis.riskScore}%
                      </span>
                    </td>
                    <td>
                      <span
                        className="badge"
                        style={{
                          color: PHISHING_COLORS[analysis.phishingLikelihood] || '#666',
                        }}
                      >
                        {(analysis.phishingLikelihood || 'Unknown').toUpperCase()}
                      </span>
                    </td>
                    <td>
                      <span
                        className="badge"
                        style={{
                          color: TRUST_COLORS[analysis.trustLevel] || '#666',
                        }}
                      >
                        {(analysis.trustLevel || 'Unknown').toUpperCase()}
                      </span>
                    </td>
                    <td>
                      {new Date(analysis.analysisTimestamp).toLocaleDateString()}
                    </td>
                    <td>
                      <button
                        className="review-btn"
                        onClick={() => navigate(`/link-review/${analysis._id}`)}
                      >
                        View Details
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="7" className="no-data">
                    No analyses found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default Analytics;
