import { useState, useEffect, useRef } from "react";
import { Link, NavLink, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import styles from "./Navbar.module.scss";

const AI_SUBMENU = [
  { label: "GPT",    to: "/ai?tab=gpt",    desc: "OpenAI"    },
  { label: "Gemini", to: "/ai?tab=gemini", desc: "Google"    },
  { label: "Claude", to: "/ai?tab=claude", desc: "Anthropic" },
];

const FINANCE_SUBMENU = [
  { label: "財經新聞", to: "/finance", desc: "市場動態" },
  { label: "財報", to: "/finance?tab=reports", desc: "即將推出" },
  { label: "個股簡評", to: "/finance?tab=analysis", desc: "AI 分析" },
  { label: "股票監控", to: "/finance?tab=stocks", desc: "Max 限定" },
];

const NAV_ITEMS = [
  { label: "首頁", to: "/", exact: true },
  { label: "人工智慧", to: "/ai", submenu: AI_SUBMENU },
  { label: "工具整合", to: "/collaboration" },
  { label: "科技資訊", to: "/tech" },
  { label: "財經", to: "/finance", submenu: FINANCE_SUBMENU },
];

export default function Navbar() {
  const { user, logout, loginWithGoogle, isPro, isMini } = useAuth();
  const [scrolled, setScrolled] = useState(false);
  const [aiOpen, setAiOpen] = useState(false);
  const [financeOpen, setFinanceOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [mobileAiOpen, setMobileAiOpen] = useState(false);
  const [mobileFinanceOpen, setMobileFinanceOpen] = useState(false);
  const aiRef = useRef(null);
  const financeRef = useRef(null);
  const userMenuRef = useRef(null);
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

  // 初始化 Google Identity Services + renderButton（只需執行一次）
  useEffect(() => {
    const renderBtn = (id) => {
      const el = document.getElementById(id);
      if (!el) return;
      window.google.accounts.id.renderButton(el, {
        theme: "outline",
        size: "large",
        shape: "rectangular",
        text: "signin_with",
        locale: "zh-TW",
      });
    };

    const initGoogle = () => {
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
      renderBtn("google-signin-btn");
      renderBtn("google-signin-btn-mobile");
    };

    if (window.google?.accounts?.id) {
      initGoogle();
    } else {
      window.addEventListener("load", initGoogle);
      return () => window.removeEventListener("load", initGoogle);
    }
  }, [loginWithGoogle]);

  useEffect(() => {
    setMobileOpen(false);
    setAiOpen(false);
  }, [location.pathname]);

  // 手機選單開啟時，補渲染 Google 按鈕（選單是條件渲染，mount 時元素不存在）
  useEffect(() => {
    if (!mobileOpen || user) return;
    const timer = setTimeout(() => {
      if (!window.google?.accounts?.id) return;
      const el = document.getElementById("google-signin-btn-mobile");
      if (!el) return;
      window.google.accounts.id.renderButton(el, {
        theme: "outline",
        size: "large",
        shape: "rectangular",
        text: "signin_with",
        locale: "zh-TW",
      });
    }, 50);
    return () => clearTimeout(timer);
  }, [mobileOpen, user]);

  // 點外面關閉 submenu 和 userMenu
  useEffect(() => {
    const handler = (e) => {
      if (aiRef.current && !aiRef.current.contains(e.target)) setAiOpen(false);
      if (financeRef.current && !financeRef.current.contains(e.target)) setFinanceOpen(false);
      if (userMenuRef.current && !userMenuRef.current.contains(e.target)) setUserMenuOpen(false);
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

        {/* 訂閱按鈕：未登入才顯示，登入後改用下拉選單 */}
        {!user && (
          <Link to="/pricing" className={styles.proBtn}>
            訂閱方案
          </Link>
        )}

        {/* Google 登入按鈕（桌面）：自訂視覺 + 透明 Google 按鈕疊在上面 */}
        {!user && (
          <div className={styles.googleLoginWrap}>
            <div className={styles.googleLoginBtn} aria-hidden="true">
              <svg width="16" height="16" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
              </svg>
              使用 Google 登入
            </div>
            <div id="google-signin-btn" className={styles.googleBtnOverlay} />
          </div>
        )}

        {/* 登入後的使用者下拉選單 */}
        {user && (
          <div
            className={styles.userMenu}
            ref={userMenuRef}
          >
            <button
              className={styles.userTrigger}
              onClick={() => setUserMenuOpen((o) => !o)}
              aria-label="帳號選單"
            >
              {user.picture ? (
                <img src={user.picture} alt={user.name} className={styles.avatar} referrerPolicy="no-referrer" />
              ) : (
                <div className={styles.avatarFallback}>{user.name?.charAt(0)}</div>
              )}
              <span className={styles.userName}>{user.name.split(" ")[0]}</span>
              <svg
                width="12" height="12" viewBox="0 0 12 12" fill="none"
                className={`${styles.userChevron} ${userMenuOpen ? styles.open : ""}`}
              >
                <path d="M2 4l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>

            {userMenuOpen && (
              <div className={styles.userDropdown}>
                <div className={styles.userDropdownHeader}>
                  <p className={styles.dropdownName}>{user.name}</p>
                  <p className={styles.dropdownEmail}>{user.email}</p>
                </div>
                <div className={styles.userDropdownDivider} />
                <Link to="/account" className={styles.userDropdownItem} onClick={() => setUserMenuOpen(false)}>
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
                    <circle cx="12" cy="8" r="4" stroke="currentColor" strokeWidth="1.5"/>
                    <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                  </svg>
                  我的帳號
                </Link>
                <Link to="/pricing" className={styles.userDropdownItem} onClick={() => setUserMenuOpen(false)}>
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
                    <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/>
                  </svg>
                  訂閱方案
                </Link>
                <div className={styles.userDropdownDivider} />
                <button
                  className={`${styles.userDropdownItem} ${styles.userDropdownLogout}`}
                  onClick={() => { logout(); setUserMenuOpen(false); }}
                >
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
                    <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                  登出
                </button>
              </div>
            )}
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

          {/* 手機版帳號區塊 */}
          <div className={styles.mobileDivider} />

          {user ? (
            <div className={styles.mobileUserSection}>
              <div className={styles.mobileUserInfo}>
                {user.picture && (
                  <img src={user.picture} alt={user.name} className={styles.mobileAvatar} referrerPolicy="no-referrer" />
                )}
                <div>
                  <p className={styles.mobileUserName}>{user.name}</p>
                  <p className={styles.mobileUserEmail}>{user.email}</p>
                </div>
              </div>
              <Link to="/account" className={styles.mobileNavLink} onClick={() => setMobileOpen(false)}>
                我的帳號
              </Link>
              {!isPro && (
                <Link to="/pricing" className={styles.mobileNavLink} onClick={() => setMobileOpen(false)}>
                  {isMini ? "升級 Pro" : "訂閱方案"}
                </Link>
              )}
              <button
                className={`${styles.mobileNavLink} ${styles.mobileLogout}`}
                onClick={() => { logout(); setMobileOpen(false); }}
              >
                登出
              </button>
            </div>
          ) : (
            <div className={styles.mobileUserSection}>
              <Link to="/pricing" className={styles.mobileNavLink} onClick={() => setMobileOpen(false)}>
                訂閱方案
              </Link>
              <div className={styles.mobileGoogleLoginWrap}>
                <div className={styles.mobileGoogleLoginBtn} aria-hidden="true">
                  <svg width="16" height="16" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
                    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                  </svg>
                  使用 Google 登入
                </div>
                <div id="google-signin-btn-mobile" className={styles.googleBtnOverlay} />
              </div>
            </div>
          )}
        </nav>
      )}
    </header>
  );
}
