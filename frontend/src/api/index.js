import axios from "axios";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL
    ? `${import.meta.env.VITE_API_URL}/api`
    : "/api",
  timeout: 15000,
});

// 自動帶入 JWT token
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("tb_token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// 文章
export const getArticles = (params = {}) =>
  api.get("/articles", { params }).then((r) => r.data);

export const getLatestArticles = (limit = 10) =>
  api.get("/articles/latest", { params: { limit } }).then((r) => r.data);

export const getArticle = (slug) =>
  api.get(`/articles/${slug}`).then((r) => r.data);

// 訂閱
export const subscribe = (email) =>
  api.post("/subscribers", { email }).then((r) => r.data);

export const unsubscribe = (email) =>
  api.delete("/subscribers", { params: { email } }).then((r) => r.data);

// 搜尋功能
export const searchArticles = async ({ q, page = 1, page_size = 9 }) => {
  const params = new URLSearchParams({ q, page, page_size });
  const res = await api.get(`/articles/search?${params}`);
  return res.data;
};

// 金流
export const createOrder = (plan) =>
  api.post("/payment/create-order", { plan }).then((r) => r.data);

export const getOrderStatus = (trade_no) =>
  api.get(`/payment/order/${trade_no}`).then((r) => r.data);