import { useState } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { HelmetProvider } from "react-helmet-async";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import Home from "@/pages/Home";
import CategoryPage from "@/pages/CategoryPage";
import ArticlePage from "@/pages/ArticlePage";
import Privacy from "@/pages/Privacy";
import SearchPage from "@/pages/SearchPage";
import Pricing from "@/pages/Pricing";
import { unsubscribe } from "@/api";
import "@/styles/globals.scss";

export default function App() {
  return (
    <HelmetProvider>
      <BrowserRouter>
        <Navbar />
        <Routes>
          <Route path="/" element={<Home />} />

          {/* AI 主頁 */}
          <Route path="/ai" element={<CategoryPage pageKey="ai" />} />
          {/* AI 子頁 */}
          <Route path="/ai/:sub" element={<CategoryPage pageKey="ai" />} />

          <Route
            path="/collaboration"
            element={<CategoryPage pageKey="collaboration" />}
          />
          <Route path="/tech" element={<CategoryPage pageKey="tech" />} />
          <Route path="/search" element={<SearchPage />} />
          <Route path="/article/:slug" element={<ArticlePage />} />
          <Route path="/privacy" element={<Privacy />} />
          <Route path="/pricing" element={<Pricing />} />

          {/* Unsubscribe 頁面（簡易） */}
          <Route path="/unsubscribe" element={<UnsubscribePage />} />

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
        <Footer />
      </BrowserRouter>
    </HelmetProvider>
  );
}

// 簡易取消訂閱頁
function UnsubscribePage() {
  const email = new URLSearchParams(window.location.search).get("email");
  const [done, setDone] = useState(false);

  async function handleUnsubscribe() {
    try {
      await unsubscribe(email);
      setDone(true);
    } catch (e) {
      alert("操作失敗，請稍後再試");
    }
  }

  return (
    <main
      style={{
        paddingTop: "var(--nav-height)",
        minHeight: "80vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <div style={{ textAlign: "center", padding: "40px 24px" }}>
        {done ? (
          <p style={{ color: "var(--on-surface-variant)", fontSize: "16px" }}>
            已成功取消訂閱 {email}
          </p>
        ) : (
          <>
            <p
              style={{
                color: "var(--on-surface-variant)",
                marginBottom: "24px",
              }}
            >
              確定要取消訂閱{" "}
              <strong style={{ color: "var(--on-surface)" }}>{email}</strong>{" "}
              嗎？
            </p>
            <button
              onClick={handleUnsubscribe}
              style={{
                background: "var(--gradient-primary)",
                color: "#003642",
                border: "none",
                padding: "12px 28px",
                borderRadius: "6px",
                fontWeight: "700",
                cursor: "pointer",
                fontFamily: "var(--font-headline)",
              }}
            >
              確認取消訂閱
            </button>
          </>
        )}
      </div>
    </main>
  );
}
