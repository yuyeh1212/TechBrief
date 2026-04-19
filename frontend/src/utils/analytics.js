/**
 * Google Analytics 4 工具函式
 * 測量 ID：G-70F23R64M0
 */

export const pageview = (path) => {
  if (typeof window.gtag !== "function") return;
  window.gtag("event", "page_view", {
    page_path: path,
  });
};

export const trackEvent = (action, category, label, value) => {
  if (typeof window.gtag !== "function") return;
  window.gtag("event", action, {
    event_category: category,
    event_label: label,
    value,
  });
};
