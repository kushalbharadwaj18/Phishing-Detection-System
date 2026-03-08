import React from 'react';
import { Shield, Lock, Zap, Eye } from 'lucide-react';

const Welcome = () => {
  return (
    <div className="welcome-container">
      <header className="welcome-header">
        <div className="header-content">
          <Shield size={48} />
          <h1>PhishShield</h1>
        </div>
        <p>AI-Powered Phishing Website Detection</p>
      </header>

      <main className="welcome-main">
        <section className="features-section">
          <h2>Key Features</h2>
          <div className="features-grid">
            <div className="feature-card">
              <Zap size={32} />
              <h3>Instant Detection</h3>
              <p>Get analysis results in milliseconds using advanced AI algorithms</p>
            </div>
            <div className="feature-card">
              <Lock size={32} />
              <h3>Secure & Private</h3>
              <p>Your data is encrypted and never shared with third parties</p>
            </div>
            <div className="feature-card">
              <Eye size={32} />
              <h3>Smart Analysis</h3>
              <p>Detailed explanations of why a link is safe or potentially phishing</p>
            </div>
            <div className="feature-card">
              <Shield size={32} />
              <h3>Always Evolving</h3>
              <p>Regular updates with latest phishing patterns and threats</p>
            </div>
          </div>
        </section>

        <section className="how-it-works">
          <h2>How It Works</h2>
          <div className="steps">
            <div className="step">
              <div className="step-number">1</div>
              <h3>Paste URL</h3>
              <p>Enter any URL you want to verify</p>
            </div>
            <div className="step">
              <div className="step-number">2</div>
              <h3>AI Analysis</h3>
              <p>Our AI examines the URL structure and patterns</p>
            </div>
            <div className="step">
              <div className="step-number">3</div>
              <h3>Get Results</h3>
              <p>Instantly receive a detailed safety report</p>
            </div>
            <div className="step">
              <div className="step-number">4</div>
              <h3>Stay Safe</h3>
              <p>Make informed decisions before clicking links</p>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
};

export default Welcome;
