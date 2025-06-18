import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
} from "react";
import { UserManager, User } from "oidc-client-ts";
import api from "../services/api";

const config = {
  authority: "http://localhost:6007",
  client_id: "shopping-spa",
  redirect_uri: "http://localhost:6006/callback",
  response_type: "code",
  scope: "openid profile shopping_api",
  post_logout_redirect_uri: "http://localhost:6006",
};

const userManager = new UserManager(config);

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
  const [loading, setLoading] = useState(true);

  const login = async (username, password) => {
    try {
      setLoading(true);
      
      // Önce Identity Server'dan token al
      const response = await fetch("http://localhost:6007/connect/token", {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({
          grant_type: "password",
          username: username,
          password: password,
          client_id: "shopping-spa",
          scope: "openid profile shopping_api",
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error_description || "Giriş başarısız");
      }

      const data = await response.json();
      console.log("Token response:", data); // Debug için
      
      // Token'ı kullanarak kullanıcı bilgilerini al
      const userResponse = await fetch("http://localhost:6007/connect/userinfo", {
        method: "GET",
        headers: {
          "Authorization": `Bearer ${data.access_token}`,
          "Content-Type": "application/json",
        },
      });

      if (!userResponse.ok) {
        console.error("Userinfo response:", await userResponse.text()); // Debug için
        throw new Error("Kullanıcı bilgileri alınamadı");
      }

      const userInfo = await userResponse.json();
      console.log("Userinfo response:", userInfo); // Debug için
      
      // Kullanıcı bilgilerini ve token'ı birleştir
      const user = {
        ...userInfo,
        access_token: data.access_token,
        id_token: data.id_token,
        token_type: data.token_type,
        expires_at: Date.now() + data.expires_in * 1000,
      };

      setUser(user);
      
      // API çağrıları için token'ı ayarla
      api.defaults.headers.common["Authorization"] = `Bearer ${data.access_token}`;
      
      return { success: true, user };
    } catch (error) {
      console.error("Login error:", error);
      return {
        success: false,
        message: error.message || "Giriş yapılırken hata oluştu",
      };
    } finally {
      setLoading(false);
    }
  };

  const logout = useCallback(async () => {
    try {
      await userManager.signoutRedirect();
    } catch (error) {
      console.error("Logout error:", error);
    }
  }, []);

  const handleCallback = async () => {
    try {
      const user = await userManager.signinRedirectCallback();
      setUser(user);
      
      // Set token for API calls
      if (user.access_token) {
        api.defaults.headers.common["Authorization"] = `Bearer ${user.access_token}`;
      }
      
      return { success: true, user };
    } catch (error) {
      console.error("Callback error:", error);
      return {
        success: false,
        message: "Giriş işlemi tamamlanamadı",
      };
    }
  };

  const isAuthenticated = () => {
    return !!user;
  };

  const getCurrentUser = () => {
    return user?.profile?.name || "guest";
  };

  const getCurrentCustomerId = () => {
    return user?.profile?.sub || null;
  };

  // Effects
  useEffect(() => {
    const checkUser = async () => {
      try {
        const user = await userManager.getUser();
        if (user) {
          setUser(user);
          if (user.access_token) {
            api.defaults.headers.common["Authorization"] = `Bearer ${user.access_token}`;
          }
        }
      } catch (error) {
        console.error("Error checking user:", error);
      } finally {
        setLoading(false);
      }
    };

    checkUser();
  }, []);

  const value = {
    user,
    loading,
    login,
    logout,
    handleCallback,
    isAuthenticated,
    getCurrentUser,
    getCurrentCustomerId,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
