import React, { useState, useEffect } from "react";
import { catalogService } from "../services/catalogService";
import { basketService } from "../services/basketService";
import { useAuth } from "../contexts/AuthContext";
import "./ProductsPage.css";

// Helper function to get category icons
const getCategoryIcon = (category) => {
  const iconMap = {
    "Kutu Oyunları": "🎲",
    "Müzik Aletleri": "🎵",
    "Eğitici Oyuncaklar": "🧠",
    "Peluş Oyuncaklar": "🧸",
    "Oyuncak Arabalar": "🚗",
    "Yapım Oyuncakları": "🧱",
    "Oyuncak Bebekler ve Aksesuarları": "👶",
  };
  return iconMap[category] || "🎁";
};

const ProductsPage = () => {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(12);
  const [totalCount, setTotalCount] = useState(0);
  const [addingToCart, setAddingToCart] = useState({});
  const [notification, setNotification] = useState(null);

  const { getCurrentUser, isAuthenticated } = useAuth();

  useEffect(() => {
    fetchCategories();
  }, []);

  useEffect(() => {
    fetchProducts();
  }, [currentPage, selectedCategory]); // eslint-disable-line react-hooks/exhaustive-deps

  const fetchCategories = async () => {
    try {
      const response = await catalogService.getCategories();
      setCategories(response.data || []);
    } catch (err) {
      console.error("Categories fetch error:", err);
    }
  };

  const fetchProducts = async () => {
    try {
      setLoading(true);
      setError(null);

      let response;
      if (selectedCategory) {
        response = await catalogService.getProductsByCategory(selectedCategory);
        setProducts(response.data || []);
        setTotalCount(response.data?.length || 0);
      } else {
        response = await catalogService.getProducts(currentPage, pageSize);
        setProducts(response.data || []);
        setTotalCount(response.totalCount || 0);
      }
    } catch (err) {
      setError(err.message);
      setProducts([]);
    } finally {
      setLoading(false);
    }
  };

  const showNotification = (message, type = "success") => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 3000);
  };

  const addToCart = async (product) => {
    try {
      setAddingToCart((prev) => ({ ...prev, [product.id]: true }));

      if (!isAuthenticated()) {
        showNotification(
          "🔐 Sepete ürün eklemek için giriş yapmalısınız!",
          "warning"
        );
        return;
      }

      const user = getCurrentUser();
      const item = {
        productId: product.id,
        productName: product.name,
        unitPrice: product.price,
        quantity: 1,
        color: "Default",
      };

      await basketService.addItemToBasket(user, item);
      showNotification(`🎉 ${product.name} sepetinize eklendi! 🛒`);
    } catch (error) {
      console.error("Add to cart error:", error);
      showNotification(
        `😔 Ürün sepete eklenirken hata oluştu: ${error.message}`,
        "error"
      );
    } finally {
      setAddingToCart((prev) => ({ ...prev, [product.id]: false }));
    }
  };

  const handleCategoryChange = (category) => {
    setSelectedCategory(category);
    setCurrentPage(1); // Reset to first page when changing category
  };

  if (loading) {
    return <div className="loading">🎪 Oyuncaklar hazırlanıyor... ✨</div>;
  }

  if (error) {
    return (
      <div className="error">
        😔 Oyuncakları yüklerken sorun oluştu: {error}
      </div>
    );
  }

  return (
    <div className="products-page">
      {/* Notification */}
      {notification && (
        <div className={`notification notification-${notification.type}`}>
          {notification.message}
          <button
            className="notification-close"
            onClick={() => setNotification(null)}
          >
            ✕
          </button>
        </div>
      )}

      <div className="page-header">
        <h1>🎁 Oyuncak Dünyamız 🌟</h1>
        <p>🧸 Hayal ettiğiniz her oyuncak burada! 🎮</p>

        {/* Category Filter */}
        <div className="category-filter">
          <button
            className={`category-btn ${selectedCategory === "" ? "active" : ""}`}
            onClick={() => handleCategoryChange("")}
          >
            🌟 Tümü
          </button>
          {categories.map((category) => (
            <button
              key={category}
              className={`category-btn ${selectedCategory === category ? "active" : ""}`}
              onClick={() => handleCategoryChange(category)}
            >
              {getCategoryIcon(category)} {category}
            </button>
          ))}
        </div>

        {selectedCategory && (
          <div className="active-filter">
            <span>
              Kategori: <strong>{selectedCategory}</strong>
            </span>
            <button
              onClick={() => handleCategoryChange("")}
              className="clear-filter"
            >
              ✕ Temizle
            </button>
          </div>
        )}
      </div>

      <div className="products-grid">
        {products.length > 0 ? (
          products.map((product) => (
            <div key={product.id} className="product-card">
              <div className="product-image">
                <img
                  src={product.imageFile || "/api/placeholder/300/200"}
                  alt={product.name}
                  onError={(e) => {
                    e.target.src =
                      'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="300" height="200" viewBox="0 0 300 200"><rect width="300" height="200" fill="%23f0f0f0"/><text x="150" y="100" text-anchor="middle" fill="%23999" font-family="Arial, sans-serif" font-size="14">Resim Yok</text></svg>';
                  }}
                />
              </div>
              <div className="product-info">
                <h3 className="product-name">{product.name}</h3>
                <p className="product-category">
                  {product.category?.join(", ")}
                </p>
                <p className="product-description">{product.description}</p>
                <div className="product-footer">
                  <span className="product-price">${product.price}</span>
                  <button
                    className="btn btn-primary add-to-cart-btn"
                    onClick={() => addToCart(product)}
                    disabled={addingToCart[product.id]}
                  >
                    {addingToCart[product.id]
                      ? "⏳ Ekleniyor..."
                      : "🛒 Sepete At!"}
                  </button>
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="no-products">
            🔍 Henüz oyuncak bulunmamaktadır. Yakında geliyor! 🎁
          </div>
        )}
      </div>

      {!selectedCategory && products.length > 0 && (
        <div className="pagination">
          <button
            className="btn btn-secondary"
            onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
            disabled={currentPage === 1}
          >
            ⬅️ Önceki
          </button>
          <span className="page-info">
            📄 Sayfa {currentPage} ({totalCount} oyuncak)
          </span>
          <button
            className="btn btn-secondary"
            onClick={() => setCurrentPage((prev) => prev + 1)}
            disabled={products.length < pageSize}
          >
            Sonraki ➡️
          </button>
        </div>
      )}

      {selectedCategory && products.length > 0 && (
        <div className="category-results">
          <p>
            🎯 <strong>{selectedCategory}</strong> kategorisinde{" "}
            {products.length} oyuncak bulundu
          </p>
        </div>
      )}
    </div>
  );
};

export default ProductsPage;
