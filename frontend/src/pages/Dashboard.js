import React, { useState, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { detectionAPI } from '../services/api';
import AnalysisResult from '../components/AnalysisResult';
import { Shield, Link as LinkIcon, Zap } from 'lucide-react';
import './Dashboard.css';

const Dashboard = () => {
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [stats, setStats] = useState(null);
  const { user, logout } = useContext(AuthContext);
  const navigate = useNavigate();

  React.useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const response = await detectionAPI.getStats();
      setStats(response.data);
    } catch (err) {
      console.error('Failed to fetch stats:', err);
    }
  };

  const handleAnalyze = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setResult(null);

    try {
      if (!url.match(/^https?:\/\/.+/)) {
        setError('Please enter a valid URL starting with http:// or https://');
        setLoading(false);
        return;
      }

      const response = await detectionAPI.analyze(url);
      setResult(response.data);
      setUrl('');
      fetchStats();
    } catch (err) {
      setError(err.response?.data?.message || 'Analysis failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="dashboard-container">
      <nav className="navbar">
        <div className="nav-brand">
          <Shield className="logo-icon" />
          <span>PhishShield</span>
        </div>
        <div className="nav-links">
          <button className="nav-link" onClick={() => navigate('/dashboard')}>
            Dashboard
          </button>
          <button className="nav-link" onClick={() => navigate('/analytics')}>
            📊 Analytics
          </button>
        </div>
        <div className="nav-info">
          <span className="user-name">Welcome, {user?.name}</span>
          <button className="logout-btn" onClick={handleLogout}>
            Logout
          </button>
        </div>
      </nav>

      <main className="dashboard-main">
        <div className="hero-section">
          <h1>AI Phishing Website Detector</h1>
          <p>Paste a link to check if it's safe or potentially phishing</p>
        </div>

        {stats && (
          <div className="stats-grid">
            <div className="stat-card">
              <Zap size={24} />
              <div>
                <h3>{stats.total}</h3>
                <p>Total Analyses</p>
              </div>
            </div>
            <div className="stat-card">
              <Shield size={24} />
              <div>
                <h3>{stats.safe}</h3>
                <p>Safe Links</p>
              </div>
            </div>
            <div className="stat-card">
              <Zap size={24} />
              <div>
                <h3>{stats.unsafe}</h3>
                <p>Unsafe Links</p>
              </div>
            </div>
          </div>
        )}

        <div className="analysis-section">
          <form onSubmit={handleAnalyze} className="analysis-form">
            <div className="input-group">
              <LinkIcon className="input-icon" />
              <input
                type="text"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="Paste a URL here (e.g., https://example.com)"
                disabled={loading}
              />
              <button type="submit" disabled={loading} className="analyze-btn">
                {loading ? 'Analyzing...' : 'Analyze'}
              </button>
            </div>
          </form>

          {error && <div className="error-alert">{error}</div>}

          {result && <AnalysisResult result={result} />}
        </div>

          {/* 
        <div className="info-section">
          <h2>How It Works</h2>
          <div className="info-grid">
            <div className="info-card">
              <h3>🔍 Smart Detection</h3>
              <p>Our AI analyzes URL patterns, domain structure, and known phishing indicators</p>
            </div>
            <div className="info-card">
              <h3>⚡ Instant Results</h3>
              <p>Get results in milliseconds with our optimized detection engine</p>
            </div>
            <div className="info-card">
              <h3>🛡️ Stay Protected</h3>
              <p>Check before you click - avoid malicious links and protect your data</p>
            </div>
          </div>
        </div>
          */}
      </main>
    </div>
  );
};

export default Dashboard;
