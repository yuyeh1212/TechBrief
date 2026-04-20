import { useState } from "react";
import { Helmet } from "react-helmet-async";
import { useAuth } from "@/context/AuthContext";
import { createOrder } from "@/api";
import styles from "./Pricing.module.scss";

const PLANS = [
  {
    key: "free",
    name: "Free",
    price: null,
    priceLabel: "NT$0",
    period: "永久免費",
    badge: null,
    available: true,
    description: "免費瀏覽全站科技 & AI 新聞",
    cta: "立即開始",
    ctaStyle: "outline",
    features: [
      { text: "免費網站瀏覽", included: true },
      { text: "全站文章搜尋", included: true },
      { text: "文章 AI 快速摘要", included: true },
      { text: "Email 訂閱通知", included: false },
      { text: "財經專區 & 財報頁面", included: false },
      { text: "新聞股票提示", included: false },
      { text: "AI 個股簡評", included: false },
      { text: "股票掃描模擬器", included: false },
    ],
  },
  {
    key: "mini",
    name: "Mini",
    price: 33,
    priceLabel: "NT$33",
    period: "/ 月",
    badge: null,
    available: true,
    description: "開通 Email 訂閱，不錯過每日更新",
    cta: "選擇 Mini",
    ctaStyle: "outline",
    features: [
      { text: "所有 Free 功能", included: true },
      { text: "開通 Email 訂閱", included: true },
      { text: "每日新聞更新通知", included: true },
      { text: "財經專區 & 財報頁面", included: false },
      { text: "新聞股票提示", included: false },
      { text: "AI 個股簡評", included: false },
      { text: "股票掃描模擬器", included: false },
    ],
  },
  {
    key: "pro",
    name: "Pro",
    price: 99,
    priceLabel: "NT$99",
    period: "/ 月",
    badge: "最受歡迎",
    available: true,
    description: "解鎖財經專區、股票提示與 AI 個股簡評",
    cta: "選擇 Pro",
    ctaStyle: "primary",
    features: [
      { text: "所有 Mini 功能", included: true },
      { text: "財經專區 & 財報頁面", included: true },
      { text: "新聞內含股票提示", included: true },
      { text: "AI 個股簡評（輸入代號即時分析）", included: true },
      { text: "每週精選看好標的報告", included: true },
      { text: "股票掃描模擬器", included: false },
    ],
  },
  {
    key: "max",
    name: "Max",
    price: null,
    priceLabel: "即將推出",
    period: "",
    badge: "Coming Soon",
    available: false,
    description: "專業級股票掃描模擬器，精準捕捉市場機會",
    cta: "敬請期待",
    ctaStyle: "ghost",
    features: [
      { text: "所有 Pro 功能", included: true },
      { text: "股票掃描模擬器", included: true },
      { text: "自訂掃描條件與篩選器", included: true },
      { text: "美股支援（即將推出）", included: true },
    ],
  },
];

const FAQ = [
  {
    q: "支援哪些付款方式？",
    a: "目前透過綠界科技（ECPay）進行金流處理，支援 Visa、Mastercard、JCB 等主流信用卡付款，安全便利。",
  },
  {
    q: "可以隨時取消訂閱嗎？",
    a: "可以，訂閱方案皆可在任何時候取消，取消後仍可使用至當期結束日，不會立即失效。",
  },
  {
    q: "付款安全嗎？我的信用卡資料會被儲存嗎？",
    a: "付款流程由綠界科技處理，符合 PCI-DSS 安全標準。TechBrief 本身不儲存任何信用卡資料。",
  },
  {
    q: "Mini 和 Pro 有試用期嗎？",
    a: "目前尚未提供試用期，Free 方案可永久免費使用，歡迎先體驗後再決定是否升級。",
  },
  {
    q: "Max 方案何時推出？",
    a: "Max 方案目前正在開發中，核心功能為專業級股票掃描模擬器，支援自訂篩選條件，未來也將加入美股支援。完成後即會公告開放，敬請期待。",
  },
];

export default function Pricing() {
  const [openFaq, setOpenFaq] = useState(null);
  const [loadingPlan, setLoadingPlan] = useState(null);
  const { user } = useAuth();

  const handlePlanClick = async (plan) => {
    if (plan.key === "free") return;
    if (!plan.available) return;

    if (!user) {
      // 未登入：捲動到頁面頂部並提示
      window.scrollTo({ top: 0, behavior: "smooth" });
      alert("請先登入後再選擇方案");
      return;
    }

    try {
      setLoadingPlan(plan.key);
      const { html, trade_no } = await createOrder(plan.key);
      // 儲存 trade_no，付款完成後結果頁使用
      localStorage.setItem("tb_pending_trade", trade_no);
      // 注入 ECPay 自動提交表單並導向付款頁
      const container = document.createElement("div");
      container.innerHTML = html;
      document.body.appendChild(container);
      const form = container.querySelector("form");
      if (form) form.submit();
    } catch (err) {
      console.error(err);
      alert("建立訂單失敗，請稍後再試");
    } finally {
      setLoadingPlan(null);
    }
  };

  return (
    <>
      <Helmet>
        <title>TechBrief | 訂閱方案</title>
        <meta
          name="description"
          content="選擇最適合你的 TechBrief 方案，從免費到專業，解鎖完整 AI 科技財經分析功能。"
        />
      </Helmet>

      <main className={styles.pricingPage}>
        {/* Hero */}
        <section className={styles.hero}>
          <p className={styles.heroEyebrow}>PRICING</p>
          <h1 className={styles.heroTitle}>
            選擇你的<span className={styles.accent}>方案</span>
          </h1>
          <p className={styles.heroSub}>
            從免費開始，隨時升級。所有方案均包含每日 AI 科技摘要。
          </p>
        </section>

        {/* Plans Grid */}
        <section className={styles.plansSection}>
          <div className={styles.plansGrid}>
            {PLANS.map((plan) => (
              <div
                key={plan.key}
                className={`${styles.planCard} ${plan.key === "pro" ? styles.featured : ""} ${!plan.available ? styles.comingSoon : ""}`}
              >
                {plan.badge && (
                  <div
                    className={`${styles.badge} ${plan.key === "max" ? styles.badgeGhost : ""}`}
                  >
                    {plan.badge}
                  </div>
                )}

                <div className={styles.planHeader}>
                  <h2 className={styles.planName}>{plan.name}</h2>
                  <div className={styles.planPrice}>
                    <span className={styles.priceAmount}>{plan.priceLabel}</span>
                    {plan.period && (
                      <span className={styles.pricePeriod}>{plan.period}</span>
                    )}
                  </div>
                  <p className={styles.planDesc}>{plan.description}</p>
                </div>

                <button
                  className={`${styles.ctaBtn} ${styles[`cta_${plan.ctaStyle}`]}`}
                  disabled={!plan.available || loadingPlan === plan.key}
                  onClick={() => handlePlanClick(plan)}
                >
                  {loadingPlan === plan.key ? "處理中..." : plan.cta}
                </button>

                <ul className={styles.featureList}>
                  {plan.features.map((f, i) => (
                    <li
                      key={i}
                      className={`${styles.featureItem} ${!f.included ? styles.featureExcluded : ""}`}
                    >
                      <span className={styles.featureIcon}>
                        {f.included ? (
                          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                            <path
                              d="M3 8l3.5 3.5L13 4.5"
                              stroke="currentColor"
                              strokeWidth="2"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            />
                          </svg>
                        ) : (
                          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                            <path
                              d="M4 4l8 8M12 4l-8 8"
                              stroke="currentColor"
                              strokeWidth="1.5"
                              strokeLinecap="round"
                            />
                          </svg>
                        )}
                      </span>
                      <span>
                        {f.text}
                        {f.note && (
                          <span className={styles.featureNote}> ({f.note})</span>
                        )}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </section>

        {/* FAQ */}
        <section id="faq" className={styles.faqSection}>
          <h2 className={styles.faqTitle}>常見問題</h2>
          <div className={styles.faqList}>
            {FAQ.map((item, i) => (
              <div
                key={i}
                className={`${styles.faqItem} ${openFaq === i ? styles.faqOpen : ""}`}
              >
                <button
                  className={styles.faqQuestion}
                  onClick={() => setOpenFaq(openFaq === i ? null : i)}
                >
                  <span>{item.q}</span>
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 16 16"
                    fill="none"
                    className={styles.faqChevron}
                  >
                    <path
                      d="M3 6l5 5 5-5"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </button>
                {openFaq === i && (
                  <p className={styles.faqAnswer}>{item.a}</p>
                )}
              </div>
            ))}
          </div>
        </section>

        {/* Bottom CTA */}
        <section className={styles.bottomCta}>
          <p className={styles.bottomCtaText}>還有疑問？歡迎聯絡我們</p>
          <a href="mailto:contact@techbrief.app" className={styles.bottomCtaLink}>
            contact@techbrief.app
          </a>
        </section>
      </main>
    </>
  );
}
