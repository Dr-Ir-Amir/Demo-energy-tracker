 import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router';
import './Login.css';

export default function Login() {
  const [isSignUp, setIsSignUp] = useState(false);
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login, register } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      if (isSignUp) {
        await register(username, email, password);
      } else {
        await login(username, password);
      }
      navigate('/dashboard');
    } catch (err) {
      setError(err.response?.data?.detail || 'Authentication failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const fillDemo = () => {
    setUsername('demo');
    setPassword('demo1234');
    setIsSignUp(false);
  };

  return (
    <div className="login-page">
      <div className="login-container">
        {/* Left Panel */}
        <div className="login-left">
          <div className="login-form-wrapper">
            <div className="brand">
              <div className="brand-icon">⚡</div>
              <span className="brand-name">EnergyTrack</span>
            </div>

            <h1 className="welcome-title">Welcome Back!</h1>
            <p className="welcome-sub">Monitor your energy. Power your sustainability.</p>

            <div className="tab-toggle">
              <button className={`tab-btn ${!isSignUp ? 'active' : ''}`} onClick={() => setIsSignUp(false)}>Sign In</button>
              <button className={`tab-btn ${isSignUp ? 'active' : ''}`} onClick={() => setIsSignUp(true)}>Sign Up</button>
            </div>

            <form onSubmit={handleSubmit}>
              <div className="input-group">
                <input type="text" placeholder="Enter your username" value={username} onChange={(e) => setUsername(e.target.value)} required />
                <span className="input-icon">👤</span>
              </div>

              {isSignUp && (
                <div className="input-group">
                  <input type="email" placeholder="Enter your email" value={email} onChange={(e) => setEmail(e.target.value)} required />
                  <span className="input-icon">✉️</span>
                </div>
              )}

              <div className="input-group">
                <input type={showPw ? 'text' : 'password'} placeholder="Enter your password" value={password} onChange={(e) => setPassword(e.target.value)} required />
                <span className="input-icon toggle-pw" onClick={() => setShowPw(!showPw)}>{showPw ? '🙈' : '👁️'}</span>
              </div>

              {!isSignUp && (
                <div className="form-options">
                  <label className="remember"><input type="checkbox" /> Remember me</label>
                </div>
              )}

              {error && <div className="error-msg">{error}</div>}

              <button type="submit" className="btn-primary" disabled={loading}>
                {loading ? 'Please wait...' : isSignUp ? 'Create Account' : 'Login'}
              </button>
            </form>

            <div className="divider"><span>OR</span></div>

            <button className="btn-demo" onClick={fillDemo}>
              🧪 Use Demo Account
            </button>

            <p className="footer-text">© 2026 EnergyTrack. Sustainability Dashboard.</p>
          </div>
        </div>

        {/* Right Panel - Energy Visual */}
        <div className="login-right">
          <div className="energy-visual">
            <div className="energy-grid">
              <div className="energy-orb orb-1"></div>
              <div className="energy-orb orb-2"></div>
              <div className="energy-orb orb-3"></div>
              <div className="energy-pulse"></div>
            </div>
            <div className="right-overlay">
              <div className="metric-cards">
                <div className="mini-card">
                  <span className="mini-icon">☀️</span>
                  <div><div className="mini-val">42.8 kWh</div><div className="mini-label">Solar Today</div></div>
                </div>
                <div className="mini-card">
                  <span className="mini-icon">🔌</span>
                  <div><div className="mini-val">156.3 kWh</div><div className="mini-label">Grid Usage</div></div>
                </div>
                <div className="mini-card">
                  <span className="mini-icon">🌿</span>
                  <div><div className="mini-val">27.4%</div><div className="mini-label">Renewable</div></div>
                </div>
                <div className="mini-card">
                  <span className="mini-icon">📉</span>
                  <div><div className="mini-val">18.2 kg</div><div className="mini-label">CO₂ Saved</div></div>
                </div>
              </div>
              <p className="right-tagline">Real-time energy intelligence<br/>for a sustainable future</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
