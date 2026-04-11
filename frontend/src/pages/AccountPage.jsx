import { useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { useAuth } from "@/context/AuthContext";
import styles from "./AccountPage.module.scss";

const PLAN_LABELS = {
  free: { name: "免費版", color: "#aaa", badge: "FREE" },
  mini: { name: "Mini", color: "#4fc3f7", badge: "MINI" },
  pro: { name: "Pro", color: "#00e5ff", badge: "PRO" },
  max: { name: "Max", color: "#ff9800", badge: "MAX" },
};

const PLAN_FEATURES = {
  free: ["每日 10 篇精選科技快訊", "AI / 科技 / 協作三大分類", "每日電子報訂閱"],
  mini: ["每日 10 篇精選科技快訊", "AI / 科技 / 協作三大分類", "每日電子報訂閱", "財經新聞專頁"],
  pro: [
    "每日 10 篇精選科技快訊",
    "AI / 科技 / 協作三大分類",
    "每日電子報訂閱",
    "財經新聞專頁",
    "財報速覽",
    "股票監控（即將推出）",
  ],
  max: ["所有 Pro 功能", "進階 AI 摘要分析", "優先客服支援", "更多功能開發中"],
};

export default function AccountPage() {
  const { user, loading, logout, isPro, isMini } = useAuth();
  const navigate = useNavigate();

  // 未登入則跳回首頁
  useEffect(() => {
    if (!loading && !user) navigate("/");
  }, [user, loading, navigate]);

  if (loading || !user) return null;

  const plan = user.plan || "free";
  const planInfo = PLAN_LABELS[plan] || PLAN_LABELS.free;
  const features = PLAN_FEATURES[plan] || PLAN_FEATURES.free;

  return (
    <>
      <Helmet>
        <title>TechBrief | 我的帳號</title>
      </Helmet>

      <main className={styles.page}>
        <div className={styles.container}>

          {/* 個人資訊卡片 */}
          <section className={styles.profileCard}>
            <div className={styles.avatarWrap}>
              {user.picture ? (
                <img
                  src={user.picture}
                  alt={user.name}
                  className={styles.avatar}
                  referrerPolicy="no-referrer"
                />
              ) : (
                <div className={styles.avatarFallback}>
                  {user.name?.charAt(0) || "U"}
                </div>
              )}
            </div>
            <div className={styles.profileInfo}>
              <h1 className={styles.name}>{user.name}</h1>
              <p className={styles.email}>{user.email}</p>
              <span
                className={styles.planBadge}
                style={{ color: planInfo.color, borderColor: planInfo.color }}
              >
                {planInfo.badge}
              </span>
            </div>
          </section>

          {/* 目前方案 */}
          <section className={styles.section}>
            <h2 className={styles.sectionTitle}>目前方案</h2>
            <div className={styles.planCard}>
              <div className={styles.planHeader}>
                <span className={styles.planName} style={{ color: planInfo.color }}>
                  {planInfo.name}
                </span>
                {plan === "free" && (
                  <span className={styles.planPrice}>免費</span>
                )}
                {plan === "mini" && (
                  <span className={styles.planPrice}>NT$33 / 月</span>
                )}
                {plan === "pro" && (
                  <span className={styles.planPrice}>NT$99 / 月</span>
                )}
                {plan === "max" && (
                  <span className={styles.planPrice}>即將推出</span>
                )}
              </div>
              <ul className={styles.featureList}>
                {features.map((f) => (
                  <li key={f}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                      <path
                        d="M5 13l4 4L19 7"
                        stroke={planInfo.color}
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                    {f}
                  </li>
                ))}
              </ul>

              {!isPro && (
                <Link to="/pricing" className={styles.upgradeBtn}>
                  {isMini ? "升級至 Pro" : "查看訂閱方案"}
                </Link>
              )}
            </div>
          </section>

          {/* 帳號操作 */}
          <section className={styles.section}>
            <h2 className={styles.sectionTitle}>帳號設定</h2>
            <div className={styles.actionsCard}>
              <div className={styles.actionRow}>
                <div>
                  <p className={styles.actionLabel}>登入方式</p>
                  <p className={styles.actionDesc}>Google 帳號</p>
                </div>
                <span className={styles.actionTag}>已連結</span>
              </div>
              <div className={styles.divider} />
              <div className={styles.actionRow}>
                <div>
                  <p className={styles.actionLabel}>登出帳號</p>
                  <p className={styles.actionDesc}>登出後需重新使用 Google 登入</p>
                </div>
                <button className={styles.logoutBtn} onClick={logout}>
                  登出
                </button>
              </div>
            </div>
          </section>

        </div>
      </main>
    </>
  );
}
