import axios from "axios";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL
    ? `${import.meta.env.VITE_API_URL}/api`
    : "/api",
  timeout: 15000,
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
