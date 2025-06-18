import React, { useState } from "react";
import api from "../services/api";
import { useAuth } from "../contexts/AuthContext";

const JwtDebugPage = () => {
  const [testResults, setTestResults] = useState({});
  const [loading, setLoading] = useState(false);
  const { token } = useAuth();

  const testJwtGeneration = async () => {
    setLoading(true);
    try {
      // Test IdentityServer4 token endpoint directly
      const tokenUrl = `${api.defaults.baseURL}/identity-service/connect/token`;
      console.log("Testing token endpoint:", tokenUrl);

      const response = await fetch(tokenUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({
          grant_type: "password",
          client_id: "demo-client",
          client_secret: "demo-secret",
          username: "admin",
          password: "Admin123!",
          scope: "openid profile email shopping",
        }),
      });

      if (!response.ok) {
        const errorData = await response.text();
        throw new Error(`HTTP ${response.status}: ${errorData}`);
      }

      const data = await response.json();
      setTestResults((prev) => ({
        ...prev,
        jwtGeneration: {
          success: true,
          data: data,
          token: data.access_token,
        },
      }));
    } catch (error) {
      setTestResults((prev) => ({
        ...prev,
        jwtGeneration: {
          success: false,
          error: error.message,
        },
      }));
    } finally {
      setLoading(false);
    }
  };

  const testProfileAccess = async () => {
    setLoading(true);
    try {
      const response = await api.get("/identity-service/api/account/profile");
      setTestResults((prev) => ({
        ...prev,
        profileAccess: {
          success: true,
          data: response.data,
        },
      }));
    } catch (error) {
      setTestResults((prev) => ({
        ...prev,
        profileAccess: {
          success: false,
          error: error.message,
        },
      }));
    } finally {
      setLoading(false);
    }
  };

  const analyzeStoredToken = () => {
    const storedToken = localStorage.getItem("shopping_token");

    if (!storedToken) {
      setTestResults((prev) => ({
        ...prev,
        tokenAnalysis: {
          error: "No token found in localStorage",
        },
      }));
      return;
    }

    try {
      const parts = storedToken.split(".");
      const header = JSON.parse(atob(parts[0]));
      const payload = JSON.parse(atob(parts[1]));

      setTestResults((prev) => ({
        ...prev,
        tokenAnalysis: {
          success: true,
          parts: parts.length,
          header,
          payload,
          tokenLength: storedToken.length,
          tokenPreview: storedToken.substring(0, 100),
        },
      }));
    } catch (error) {
      setTestResults((prev) => ({
        ...prev,
        tokenAnalysis: {
          error: `Failed to analyze token: ${error.message}`,
          tokenPreview: storedToken.substring(0, 100),
        },
      }));
    }
  };

  return (
    <div className="container mt-4">
      <h2>🔍 JWT Debug Page</h2>

      <div className="row">
        <div className="col-md-6">
          <div className="card mb-3">
            <div className="card-header">
              <h5>Current Token Status</h5>
            </div>
            <div className="card-body">
              <p>
                <strong>Token exists:</strong> {token ? "Yes" : "No"}
              </p>
              <p>
                <strong>Token length:</strong> {token ? token.length : "N/A"}
              </p>
              {token && (
                <p>
                  <strong>Token preview:</strong> {token.substring(0, 50)}...
                </p>
              )}
              <button className="btn btn-primary" onClick={analyzeStoredToken}>
                Analyze Stored Token
              </button>
            </div>
          </div>
        </div>

        <div className="col-md-6">
          <div className="card mb-3">
            <div className="card-header">
              <h5>API Tests</h5>
            </div>
            <div className="card-body">
              <button
                className="btn btn-secondary me-2 mb-2"
                onClick={testJwtGeneration}
                disabled={loading}
              >
                Test JWT Generation
              </button>
              <button
                className="btn btn-warning mb-2"
                onClick={testProfileAccess}
                disabled={loading}
              >
                Test Profile Access
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <h5>Test Results</h5>
        </div>
        <div className="card-body">
          <pre
            style={{
              background: "#f8f9fa",
              padding: "1rem",
              borderRadius: "4px",
            }}
          >
            {JSON.stringify(testResults, null, 2)}
          </pre>
        </div>
      </div>
    </div>
  );
};

export default JwtDebugPage;
