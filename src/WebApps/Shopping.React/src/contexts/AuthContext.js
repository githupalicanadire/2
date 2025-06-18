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
      logout(); // Invalid token, logout user
    } finally {
      setLoading(false);
    }
  }, [logout]);

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
      console.log("🔍 API base URL:", api.defaults.baseURL);
      console.log("🔍 Environment:", process.env.NODE_ENV);

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

      // Set authorization header
      api.defaults.headers.common["Authorization"] = `Bearer ${access_token}`;

      // Update state
      console.log("🔄 Setting token:", access_token.substring(0, 20) + "...");
      console.log("🔄 Setting user:", accountResponse.data.user);

      setToken(access_token);
      setUser(accountResponse.data.user);

      console.log("✅ Login successful with IdentityServer4 token");
      console.log(
        "✅ Authentication state updated - token:",
        !!access_token,
        "user:",
        !!accountResponse.data.user,
      );

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
