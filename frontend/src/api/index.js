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

export const getTodayHotArticle = () =>
  api.get("/articles/today-hot").then((r) => r.data);

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

// 個股簡評（Pro 限定）
export const getStockAnalysis = (ticker) =>
  api.get("/analysis/stock", { params: { ticker }, timeout: 30000 }).then((r) => r.data);

// 每週精選週報（Pro 限定）
export const getWeeklyReport = () =>
  api.get("/weekly-report/latest").then((r) => r.data);

// 管理員後台
export const adminGetStats = () =>
  api.get("/admin/stats").then((r) => r.data);

export const adminListUsers = (params = {}) =>
  api.get("/admin/users", { params }).then((r) => r.data);

export const adminUpdateUserPlan = (userId, plan, expires_days = 30) =>
  api.patch(`/admin/users/${userId}/plan`, { plan, expires_days }).then((r) => r.data);

export const adminListArticles = (params = {}) =>
  api.get("/admin/articles", { params }).then((r) => r.data);

export const adminDeleteArticle = (articleId) =>
  api.delete(`/admin/articles/${articleId}`).then((r) => r.data);

export const adminTriggerNews = () =>
  api.post("/admin/trigger-news-jwt").then((r) => r.data);

export const adminTriggerExpiry = () =>
  api.post("/admin/trigger-expiry-jwt").then((r) => r.data);

export const adminTriggerWeeklyReport = () =>
  api.post("/admin/trigger-weekly-jwt").then((r) => r.data);