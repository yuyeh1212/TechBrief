import { useState, useEffect, useRef } from "react";
import { Link, NavLink, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import styles from "./Navbar.module.scss";

const AI_SUBMENU = [
  { label: "GPT", to: "/ai/gpt", desc: "OpenAI" },
  { label: "Gemini", to: "/ai/gemini", desc: "Google" },
  { label: "Claude", to: "/ai/claude", desc: "Anthropic" },
];

const FINANCE_SUBMENU = [
  { label: "財經新聞", to: "/finance", desc: "市場動態" },
  { label: "財報", to: "/finance?tab=reports", desc: "即將推出" },
  { label: "股票監控", to: "/finance?tab=stocks", desc: "Pro 限定" },
];

const NAV_ITEMS = [
  { label: "HOME", to: "/", exact: true },
  { label: "人工智慧 (AI)", to: "/ai", submenu: AI_SUBMENU },
  { label: "連動產出 (Collaboration)", to: "/collaboration" },
  { label: "科技資訊 (TECH NEWS)", to: "/tech" },
  { label: "財經", to: "/finance", submenu: FINANCE_SUBMENU },
];

export default function Navbar() {
  const { user, logout, loginWithGoogle, isPro, isMini } = useAuth();
  const [scrolled, setScrolled] = useState(false);
  const [aiOpen, setAiOpen] = useState(false);
  const [financeOpen, setFinanceOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [mobileAiOpen, setMobileAiOpen] = useState(false);
  const [mobileFinanceOpen, setMobileFinanceOpen] = useState(false);
  const aiRef = useRef(null);
  const financeRef = useRef(null);
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // 登入後取消 GIS 殘留的 One-Tap overlay
  useEffect(() => {
    if (user) {
      window.google?.accounts?.id?.cancel();
    }
  }, [user]);

  // 初始化並渲染 Google 登入按鈕（只需執行一次）
  useEffect(() => {
    const initGoogleBtn = () => {
      if (!window.google?.accounts?.id) return;
      window.google.accounts.id.initialize({
        client_id: import.meta.env.VITE_GOOGLE_CLIENT_ID,
        callback: async (response) => {
          try {
            await loginWithGoogle(response.credential);
            window.google?.accounts?.id?.cancel();
          } catch (e) {
            console.error("Google 登入失敗", e);
          }
        },
      });
      const btn = document.getElementById("google-signin-btn");
      if (btn) {
        window.google.accounts.id.renderButton(btn, {
          theme: "outline",
          size: "medium",
          shape: "pill",
          text: "signin_with",
          locale: "zh-TW",
        });
      }
    };

    // 若腳本已載入直接執行，否則等 load 事件
    if (window.google?.accounts?.id) {
      initGoogleBtn();
    } else {
      window.addEventListener("load", initGoogleBtn);
      return () => window.removeEventListener("load", initGoogleBtn);
    }
  }, [loginWithGoogle]); // 移除 user 依賴，只初始化一次

  useEffect(() => {
    setMobileOpen(false);
    setAiOpen(false);
  }, [location.pathname]);

  // 點外面關閉 submenu
  useEffect(() => {
    const handler = (e) => {
      if (aiRef.current && !aiRef.current.contains(e.target)) setAiOpen(false);
      if (financeRef.current && !financeRef.current.contains(e.target)) setFinanceOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <header className={`${styles.navbar} ${scrolled ? styles.scrolled : ""}`}>
      <div className={styles.inner}>
        {/* Logo */}
        <Link to="/" className={styles.logo}>
          <img src="/logo.png" alt="TechBrief" className={styles.logoImg} />
          <span className={styles.logoText}>
            Tech<span className={styles.logoAccent}>Brief</span>
          </span>
        </Link>

        {/* Desktop Nav */}
        <nav className={styles.desktopNav}>
          {NAV_ITEMS.map((item) => {
            const isFinance = item.to === "/finance";
            const isAi = item.to === "/ai";
            const open = isFinance ? financeOpen : isAi ? aiOpen : false;
            const setOpen = isFinance ? setFinanceOpen : isAi ? setAiOpen : () => {};
            const ref = isFinance ? financeRef : isAi ? aiRef : null;

            return item.submenu ? (
              <div
                key={item.label}
                ref={ref}
                className={styles.navItemWrapper}
                onMouseEnter={() => setOpen(true)}
                onMouseLeave={() => setOpen(false)}
              >
                <NavLink
                  to={item.to}
                  className={({ isActive }) =>
                    `${styles.navLink} ${isActive ? styles.active : ""}`
                  }
                >
                  {item.label}
                  <svg
                    width="12"
                    height="12"
                    viewBox="0 0 12 12"
                    fill="none"
                    className={`${styles.chevron} ${open ? styles.open : ""}`}
                  >
                    <path
                      d="M2 4l4 4 4-4"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </NavLink>

                {open && (
                  <div className={styles.submenu}>
                    {item.submenu.map((sub) => (
                      <NavLink
                        key={sub.to}
                        to={sub.to}
                        className={({ isActive }) =>
                          `${styles.submenuItem} ${isActive ? styles.active : ""}`
                        }
                      >
                        <span className={styles.submenuLabel}>{sub.label}</span>
                        <span className={styles.submenuDesc}>{sub.desc}</span>
                      </NavLink>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <NavLink
                key={item.label}
                to={item.to}
                end={item.exact}
                className={({ isActive }) =>
                  `${styles.navLink} ${isActive ? styles.active : ""}`
                }
              >
                {item.label}
              </NavLink>
            );
          })}
        </nav>

        {/* 訂閱按鈕：Pro/Max 以外的使用者才顯示 */}
        {!isPro && (
          <Link to="/pricing" className={styles.proBtn}>
            {isMini ? "升級 Pro" : "訂閱方案"}
          </Link>
        )}

        {/* Google 登入按鈕：永遠留在 DOM，登入後用 CSS 隱藏 */}
        <div
          id="google-signin-btn"
          className={styles.googleSigninBtn}
          style={{ display: user ? "none" : "block" }}
        />

        {/* 登入後的使用者資訊 */}
        {user && (
          <div className={styles.userMenu}>
            {user.picture && (
              <img src={user.picture} alt={user.name} className={styles.avatar} referrerPolicy="no-referrer" />
            )}
            <span className={styles.userName}>{user.name.split(" ")[0]}</span>
            <button className={styles.logoutBtn} onClick={logout}>登出</button>
          </div>
        )}

        {/* 搜尋 */}
        <button
          className={styles.searchIcon}
          onClick={() => navigate("/search")}
          aria-label="搜尋"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
            <circle
              cx="11"
              cy="11"
              r="8"
              stroke="currentColor"
              strokeWidth="1.5"
            />
            <path
              d="M21 21l-4.35-4.35"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
            />
          </svg>
        </button>

        {/* Live pulse indicator */}
        <div className={styles.liveIndicator}>
          <span className={styles.pulseDot} />
          <span className={styles.pulseRing} />
          <span className={styles.liveText}>LIVE</span>
        </div>

        {/* Mobile hamburger */}
        <button
          className={`${styles.hamburger} ${mobileOpen ? styles.open : ""}`}
          onClick={() => setMobileOpen(!mobileOpen)}
          aria-label="選單"
        >
          <span />
          <span />
          <span />
        </button>
      </div>

      {/* Mobile Menu */}
      {mobileOpen && (
        <nav className={styles.mobileNav}>
          {NAV_ITEMS.map((item) => {
            const isFinance = item.to === "/finance";
            const mobileOpen = isFinance ? mobileFinanceOpen : mobileAiOpen;
            const setMobileOpen = isFinance
              ? () => setMobileFinanceOpen(!mobileFinanceOpen)
              : () => setMobileAiOpen(!mobileAiOpen);

            return item.submenu ? (
              <div key={item.label}>
                <button className={styles.mobileNavLink} onClick={setMobileOpen}>
                  {item.label}
                  <svg
                    width="12"
                    height="12"
                    viewBox="0 0 12 12"
                    fill="none"
                    className={`${styles.chevron} ${mobileOpen ? styles.open : ""}`}
                  >
                    <path
                      d="M2 4l4 4 4-4"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </button>
                {mobileOpen && (
                  <div className={styles.mobileSubmenu}>
                    {item.submenu.map((sub) => (
                      <NavLink key={sub.to} to={sub.to} className={styles.mobileSubmenuItem}>
                        {sub.label} <span>({sub.desc})</span>
                      </NavLink>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <NavLink
                key={item.label}
                to={item.to}
                end={item.exact}
                className={styles.mobileNavLink}
              >
                {item.label}
              </NavLink>
            );
          })}
        </nav>
      )}
    </header>
  );
}
