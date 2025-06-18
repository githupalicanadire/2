import React, { createContext, useContext, useState, useEffect } from "react";
import api from "../services/api";

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem("shopping_token"));
  const [loading, setLoading] = useState(true);

  // Set token in API headers if exists
  useEffect(() => {
    if (token) {
      api.defaults.headers.common["Authorization"] = `Bearer ${token}`;
      // Verify token and get user info
      verifyToken();
    } else {
      delete api.defaults.headers.common["Authorization"];
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const verifyToken = async () => {
    try {
      setLoading(true);
      const response = await api.get("/identity-service/api/account/profile");
      setUser(response.data);
    } catch (error) {
      console.error("Token verification failed:", error);
      logout(); // Invalid token, logout user
    } finally {
      setLoading(false);
    }
  };

  const login = async (username, password) => {
    try {
      setLoading(true);

      // Step 1: Validate credentials with our account endpoint
      const accountResponse = await api.post(
        "/identity-service/api/account/login",
        {
          username,
          password,
        },
      );

      if (!accountResponse.data || !accountResponse.data.needsToken) {
        return {
          success: false,
          message: accountResponse.data?.message || "Login başarısız",
        };
      }

      // Step 2: Get token from IdentityServer4 using Resource Owner Password flow
      // Use API base URL + connect/token path
      const tokenUrl = `${api.defaults.baseURL}/identity-service/connect/token`;
      console.log("🔍 Token endpoint URL:", tokenUrl);

      const tokenResponse = await fetch(tokenUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({
          grant_type: "password",
          client_id: "demo-client",
          client_secret: "demo-secret",
          username: username,
          password: password,
          scope: "openid profile email shopping",
        }),
      });

      if (!tokenResponse.ok) {
        const errorData = await tokenResponse.text();
        console.error(
          "❌ Token request failed:",
          tokenResponse.status,
          errorData,
        );
        return {
          success: false,
          message: `Token alınamadı: ${tokenResponse.status}`,
        };
      }

      const tokenData = await tokenResponse.json();
      console.log("🔍 Token response:", tokenData);

      const { access_token, token_type } = tokenData;

      if (!access_token) {
        console.error("❌ No access_token in response:", tokenData);
        return {
          success: false,
          message: "Geçersiz token yanıtı",
        };
      }

      // Debug: Check token format
      console.log(
        "🔍 Received IdentityServer4 token:",
        token_type,
        access_token.substring(0, 50),
      );
      const tokenParts = access_token.split(".");
      console.log("🔍 Token parts count:", tokenParts.length);

      if (tokenParts.length !== 3) {
        console.error("❌ Invalid JWT format from IdentityServer4");
        return {
          success: false,
          message: "Geçersiz token formatı",
        };
      }

      // Store token and user data
      localStorage.setItem("shopping_token", access_token);
      setToken(access_token);
      setUser(accountResponse.data.user);

      // Set authorization header
      api.defaults.headers.common["Authorization"] = `Bearer ${access_token}`;

      console.log(
        "✅ Login successful with IdentityServer4 token:",
        accountResponse.data.user,
      );
      console.log("✅ Authentication state updated");

      return { success: true, user: accountResponse.data.user };
    } catch (error) {
      console.error("❌ Login error:", error);
      return {
        success: false,
        message:
          error.response?.data?.message ||
          error.message ||
          "Giriş yapılırken hata oluştu",
      };
    } finally {
      setLoading(false);
    }
  };

  const register = async (userData) => {
    try {
      setLoading(true);
      const response = await api.post(
        "/identity-service/api/account/register",
        {
          username: userData.username,
          email: userData.email,
          firstName: userData.firstName,
          lastName: userData.lastName,
          password: userData.password,
        },
      );

      console.log("✅ Registration successful:", response.data);
      return {
        success: true,
        message: "Kayıt başarılı! Şimdi giriş yapabilirsiniz.",
      };
    } catch (error) {
      console.error("❌ Registration error:", error);
      return {
        success: false,
        message:
          error.response?.data?.message ||
          error.message ||
          "Kayıt olurken hata oluştu",
      };
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    localStorage.removeItem("shopping_token");
    setToken(null);
    setUser(null);
    delete api.defaults.headers.common["Authorization"];
    console.log("👋 User logged out");
  };

  const isAuthenticated = () => {
    return !!token && !!user;
  };

  const getCurrentUser = () => {
    return user?.username || "guest";
  };

  const getCurrentCustomerId = () => {
    return user?.id || null;
  };

  const value = {
    user,
    token,
    loading,
    login,
    register,
    logout,
    isAuthenticated,
    getCurrentUser,
    getCurrentCustomerId,
    verifyToken,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
