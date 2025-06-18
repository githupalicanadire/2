import api from './api';

export const getProducts = async () => {
  const response = await api.get('/catalog-service/products');
  return response.data;
};

export const getProductById = async (id) => {
  const response = await api.get(`/catalog-service/products/${id}`);
  return response.data;
};

export const updateProduct = async (id, productData) => {
  const response = await api.put(`/catalog-service/products`, {
    id,
    ...productData
  });
  return response.data;
};

export const deleteProduct = async (id) => {
  const response = await api.delete(`/catalog-service/products/${id}`);
  return response.data;
}; 