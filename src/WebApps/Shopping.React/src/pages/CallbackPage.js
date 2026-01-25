import React, { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import "./LoginPage.css";

const CallbackPage = () => {
  const { handleCallback } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    const processCallback = async () => {
      try {
        const result = await handleCallback();
        if (result.success) {
          navigate("/");
        } else {
          navigate("/login");
        }
      } catch (error) {
        console.error("Callback processing failed:", error);
        navigate("/login");
      }
    };

    processCallback();
  }, [handleCallback, navigate]);

  return (
    <div className="login-page">
      <div className="login-container">
        <div className="login-header">
          <h1>🔄 Giriş İşlemi</h1>
          <p>Lütfen bekleyin, giriş işleminiz tamamlanıyor...</p>
        </div>
      </div>
    </div>
  );
};

export default CallbackPage; 