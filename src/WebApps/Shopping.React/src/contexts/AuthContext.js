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
      const response = await api.post("/identity-service/api/account/login", {
        username,
        password,
      });

      if (response.data && response.data.token) {
        const { token: newToken, user: userData } = response.data;

        // Debug: Check token format before storing
        console.log(
          "🔍 Received token:",
          typeof newToken,
          newToken?.substring(0, 50),
        );
        const tokenParts = newToken?.split(".");
        console.log("🔍 Token parts count:", tokenParts?.length);

        if (
          !newToken ||
          typeof newToken !== "string" ||
          tokenParts?.length !== 3
        ) {
          console.error("❌ Invalid token received from server");
          return {
            success: false,
            message: "Geçersiz token formatı",
          };
        }

        // Store token
        localStorage.setItem("shopping_token", newToken);
        setToken(newToken);
        setUser(userData);

        // Set authorization header
        api.defaults.headers.common["Authorization"] = `Bearer ${newToken}`;

        console.log("✅ Login successful:", userData);
        return { success: true };
      } else {
        return {
          success: false,
          message: response.data?.message || "Login başarısız",
        };
      }
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
