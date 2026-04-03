import { useState } from "react";
import axios from "../../../shared/api/axios";
import { useNavigate } from "react-router-dom";
import "../styles/AdminLogin.css";

export default function AdminLogin() {
  const [adminId, setAdminId] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const handleLogin = async () => {
    if (!adminId || !password) {
      setError("Please fill in all fields");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const res = await axios.post("/auntys-cafe/admin-login", {
        adminId,
        password,
      });

      if (res.data.success && res.data.token) {
        localStorage.setItem("adminSessionToken", res.data.token);
        sessionStorage.setItem("adminSessionToken", res.data.token);
        console.log("Admin login success");
        navigate("/admin-dashboard", {
          replace: true,
          state: { adminSessionToken: res.data.token },
        });
      } else {
        setError("Invalid credentials. Please try again.");
      }
    } catch (err) {
      console.error("Admin login error:", err);
      setError("Login error. Please check your connection and try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === "Enter") {
      handleLogin();
    }
  };

  return (
    <div className="admin-login-container">
      <div className="floating-icon admin-icon-1">⚙️</div>
      <div className="floating-icon admin-icon-2">🔧</div>
      <div className="floating-icon admin-icon-3">📊</div>
      <div className="floating-icon admin-icon-4">🛠️</div>
      <div className="floating-icon admin-icon-5">💼</div>
      <div className="floating-icon admin-icon-6">📈</div>
      <div className="floating-icon admin-icon-7">🔐</div>
      <div className="floating-icon admin-icon-8">👨‍💼</div>
      <div className="floating-icon admin-icon-9">📋</div>
      <div className="floating-icon admin-icon-10">🏛️</div>

      <div className="admin-login-card">
        <div className="decorative-circle decorative-circle-1"></div>
        <div className="decorative-circle decorative-circle-2"></div>

        <div className="admin-header">
          <div className="admin-logo">🏛️</div>
          <h1 className="admin-title">Admin Portal</h1>
          <p className="admin-subtitle">Campus GrubHub Management 🔐</p>
          <p className="admin-tagline">"Control Panel for Campus Dining Excellence"</p>
        </div>

        <div className="admin-features">
          <div className="feature-item">
            <div className="feature-icon">📊</div>
            <div className="feature-text">Analytics</div>
          </div>
          <div className="feature-item">
            <div className="feature-icon">🍽️</div>
            <div className="feature-text">Menu Control</div>
          </div>
          <div className="feature-item">
            <div className="feature-icon">👥</div>
            <div className="feature-text">User Management</div>
          </div>
        </div>

        {error && <div className="error-message">{error}</div>}

        <div className="login-form">
          <div className="input-group">
            <div className="input-wrapper">
              <span className="input-icon">👨‍💼</span>
              <input
                type="text"
                placeholder="Admin ID"
                value={adminId}
                onChange={(e) => setAdminId(e.target.value)}
                onKeyDown={handleKeyPress}
                className="admin-input"
                disabled={loading}
              />
            </div>
          </div>

          <div className="input-group">
            <div className="input-wrapper">
              <span className="input-icon">🔐</span>
              <input
                type="password"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyDown={handleKeyPress}
                className="admin-input"
                disabled={loading}
              />
            </div>
          </div>

          <button onClick={handleLogin} disabled={loading} className="admin-login-btn">
            {loading ? (
              <>
                <div className="loading-spinner"></div>
                Authenticating...
              </>
            ) : (
              <>
                <span className="btn-icon">🔓</span>
                Access Admin Panel
              </>
            )}
          </button>
        </div>

        <div className="admin-privileges">
          <div className="privileges-title">🛡️ Admin Privileges</div>
          <div className="privileges-grid">
            <div>📋 Manage cafe menu</div>
            <div>📊 View analytics</div>
            <div>⭐ Monitor reviews</div>
            <div>👥 User management</div>
          </div>
        </div>

        <div className="admin-help">
          <div className="help-title">🔧 Need Help?</div>
          <div className="help-content">
            • Contact IT support for login issues
            <br />
            • Ensure you have admin privileges
            <br />
            • Check with system administrator
          </div>
        </div>

        <div className="admin-footer">"Empowering Campus Dining Management" 🏛️</div>
      </div>
    </div>
  );
}
