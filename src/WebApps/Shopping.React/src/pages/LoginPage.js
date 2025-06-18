import React, { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import "./LoginPage.css";

const LoginPage = () => {
  const { login } = useAuth();
  const location = useLocation();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");
    
    try {
      const result = await login(username, password);
      if (!result.success) {
        setError(result.message);
      }
    } catch (error) {
      console.error("Login failed:", error);
      setError(error.message || "Giriş başarısız. Lütfen kullanıcı adı ve şifrenizi kontrol edin.");
    }
  };

  return (
    <div className="login-page">
      <div className="login-container">
        <div className="login-header">
          <h1>🎮 ToyLand'e Giriş 🧸</h1>
          <p>Hesabınıza giriş yaparak alışverişe devam edin</p>
        </div>

        <form className="login-form" onSubmit={handleLogin}>
          {error && <div className="error-message">{error}</div>}
          
          <div className="form-group">
            <label htmlFor="username">Kullanıcı Adı</label>
            <input
              type="text"
              id="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="password">Şifre</label>
            <input
              type="password"
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          <button type="submit" className="login-btn">
            🚀 Giriş Yap
          </button>
        </form>

        <div className="login-footer">
          <p>
            Hesabınız yok mu?{" "}
            <Link to="/register" state={{ from: location.state?.from }}>
              🎉 Ücretsiz Kayıt Ol
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
