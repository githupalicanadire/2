import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
} from "react";
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
      console.log(
        "🔍 Token found, setting authorization header and verifying...",
      );
      api.defaults.headers.common["Authorization"] = `Bearer ${token}`;
      // Verify token and get user info
      verifyToken();
    } else {
      console.log("🔍 No token found, clearing authorization");
      delete api.defaults.headers.common["Authorization"];
      setUser(null);
      setLoading(false);
    }
  }, [token, verifyToken]);

  const logout = useCallback(() => {
    localStorage.removeItem("shopping_token");
    setToken(null);
    setUser(null);
    delete api.defaults.headers.common["Authorization"];
    console.log("👋 User logged out");
  }, []);

  const verifyToken = useCallback(async () => {
    try {
      setLoading(true);
      console.log("🔍 Verifying token...");
      const response = await api.get("/identity-service/api/account/profile");
      console.log("✅ Token verification successful:", response.data);
      setUser(response.data);
    } catch (error) {
      console.error("❌ Token verification failed:", error);
      console.log("🧹 Clearing invalid token...");
      // Clear invalid token without calling logout to avoid loops
      localStorage.removeItem("shopping_token");
      setToken(null);
      setUser(null);
      delete api.defaults.headers.common["Authorization"];
    } finally {
      setLoading(false);
    }
  }, []);

  const login = async (username, password) => {
    try {
      setLoading(true);

      // Direct login with JWT response (fuck IdentityServer4 complexity)
      console.log("🔍 Logging in with direct JWT...");

      const response = await api.post("/identity-service/api/account/login", {
        username,
        password,
      });

      if (!response.data || !response.data.token) {
        return {
          success: false,
          message: response.data?.message || "Login başarısız",
        };
      }

      const { token, user: userData } = response.data;

      // Debug: Check token format
      console.log("🔍 Received JWT token:", token.substring(0, 50) + "...");
      const tokenParts = token.split(".");
      console.log("🔍 Token parts count:", tokenParts.length);

      if (tokenParts.length !== 3) {
        console.error("❌ Invalid JWT format");
        return {
          success: false,
          message: "Geçersiz token formatı",
        };
      }

      // Store token and user data
      localStorage.setItem("shopping_token", token);

      // Set authorization header
      api.defaults.headers.common["Authorization"] = `Bearer ${token}`;

      // Update state
      console.log("🔄 Setting token and user data...");
      setToken(token);
      setUser(userData);

      console.log("✅ Login successful with direct JWT");
      console.log(
        "✅ Authentication state updated - token:",
        !!token,
        "user:",
        !!userData,
      );

      return { success: true, user: userData };
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

  const isAuthenticated = () => {
    const result = !!token && !!user;
    console.log(
      "🔍 isAuthenticated check - token:",
      !!token,
      "user:",
      !!user,
      "result:",
      result,
    );
    return result;
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
