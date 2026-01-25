import axios from "axios";

// API Gateway base URL - will be proxied through nginx in production
const API_BASE_URL =
  process.env.NODE_ENV === "production"
    ? "/api"
    : window.location.hostname === "localhost"
      ? "http://localhost:6004"
      : "http://yarpapigateway:8080";

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    "Content-Type": "application/json",
  },
});

// Request interceptor
api.interceptors.request.use(
  (config) => {
    console.log(`Making request to: ${config.url}`);

    // Add JWT token if available
    const token = localStorage.getItem("shopping_token");
    if (token) {
      // Debug: Check token format
      console.log("Token length:", token.length);
      console.log("Token starts with:", token.substring(0, 50));

      // Check if token has proper JWT format (should have 2 dots)
      const parts = token.split(".");
      if (parts.length !== 3) {
        console.error(
          "❌ Invalid JWT format. Expected 3 parts, got:",
          parts.length,
        );
        console.error("Token parts:", parts);
        // Clear invalid token
        localStorage.removeItem("shopping_token");
        return config;
      }

      config.headers.Authorization = `Bearer ${token}`;
    }

    return config;
  },
  (error) => {
    return Promise.reject(error);
  },
);

// Response interceptor
api.interceptors.response.use(
  (response) => {
    // Transform backend response to match our frontend expectations
    if (response.data && typeof response.data === "object") {
      // Handle paginated responses from backend
      if (response.data.data && Array.isArray(response.data.data)) {
        return {
          ...response,
          data: {
            data: response.data.data,
            pageNumber: response.data.pageNumber || 1,
            pageSize: response.data.pageSize || 10,
            totalCount: response.data.totalCount || response.data.data.length,
          },
        };
      }
    }
    return response;
  },
  (error) => {
    console.error("🔴 API Error:", error);

    let errorMessage = "Bir hata oluştu";

    if (error.response) {
      // Backend'den gelen hata mesajları
      const { status, data } = error.response;
      console.error("Response data:", data);
      console.error("Response status:", status);

      switch (status) {
        case 400:
          errorMessage = "Geçersiz istek";
          break;
        case 401:
          errorMessage = "Oturum süreniz dolmuş. Lütfen tekrar giriş yapın.";
          // Token expired, clear local storage
          localStorage.removeItem("shopping_token");
          // Redirect to login if not already there
          if (!window.location.pathname.includes("/login")) {
            window.location.href = "/login";
          }
          break;
        case 403:
          errorMessage = "Bu işlem için yetkiniz yok";
          break;
        case 404:
          errorMessage = "İstenen kaynak bulunamadı";
          break;
        case 500:
          errorMessage = "Sunucu hatası";
          break;
        default:
          errorMessage =
            data?.message || data?.title || `HTTP ${status} hatası`;
      }
    } else if (error.request) {
      console.error("No response received:", error.request);
      errorMessage = "Sunucuya bağlanılamıyor";
    } else {
      console.error("Error message:", error.message);
      errorMessage = error.message;
    }

    // Frontend'e daha anlamlı hata mesajı gönder
    const enhancedError = new Error(errorMessage);
    enhancedError.originalError = error;

    return Promise.reject(enhancedError);
  },
);

export default api;
