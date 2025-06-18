import React, { useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import "./LoginPage.css";

const LoginPage = () => {
  const [formData, setFormData] = useState({
    username: "",
    password: "",
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // Get redirect path from location state or default to home
  const from = location.state?.from?.pathname || "/";

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
    // Clear error when user starts typing
    if (error) setError("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    const result = await login(formData.username, formData.password);

    if (result.success) {
      // Redirect to intended page or home
      navigate(from, { replace: true });
    } else {
      setError(result.message);
    }

    setLoading(false);
  };

  return (
    <div className="login-page">
      <div className="login-container">
        <div className="login-header">
          <h1>🎮 ToyLand'e Giriş 🧸</h1>
          <p>Hesabınıza giriş yaparak alışverişe devam edin</p>
        </div>

        <form onSubmit={handleSubmit} className="login-form">
          {error && <div className="error-message">⚠️ {error}</div>}

          <div className="form-group">
            <label htmlFor="username">👤 Kullanıcı Adı</label>
            <input
              type="text"
              id="username"
              name="username"
              value={formData.username}
              onChange={handleChange}
              required
              placeholder="Kullanıcı adınızı girin"
              disabled={loading}
            />
          </div>

          <div className="form-group">
            <label htmlFor="password">🔒 Şifre</label>
            <input
              type="password"
              id="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              required
              placeholder="Şifrenizi girin"
              disabled={loading}
            />
          </div>

          <button
            type="submit"
            className="login-btn"
            disabled={loading || !formData.username || !formData.password}
          >
            {loading ? "🔄 Giriş yapılıyor..." : "🚀 Giriş Yap"}
          </button>
        </form>

        <div className="login-footer">
          <p>
            Hesabınız yok mu?{" "}
            <Link to="/register" state={{ from: location.state?.from }}>
              🎉 Ücretsiz Kayıt Ol
            </Link>
          </p>

          <div className="demo-info">
            <h4>🔧 Test Hesapları</h4>
            <p>
              <strong>Admin:</strong> admin / Admin123!
            </p>
            <p>
              <strong>Demo:</strong> swn / Password123!
            </p>
            <small>⚠️ Bu demo kullanıcıları test amaçlıdır</small>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
