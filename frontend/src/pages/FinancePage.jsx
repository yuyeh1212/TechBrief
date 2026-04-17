import { useState, useEffect, useCallback } from "react";
import { Helmet } from "react-helmet-async";
import { Link, useSearchParams } from "react-router-dom";
import { getArticles } from "@/api";
import { useAuth } from "@/context/AuthContext";
import ArticleCard from "@/components/ui/ArticleCard";
import SubscribeBar from "@/components/ui/SubscribeBar";
import styles from "./FinancePage.module.scss";

const TABS = [
  { key: "news", label: "財經新聞" },
  { key: "reports", label: "財報" },
  { key: "stocks", label: "股票監控" },
];

const PAGE_SIZE = 9;

export default function FinancePage() {
  const { isPro, isMax } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const tabParam = searchParams.get("tab");
  const [activeTab, setActiveTab] = useState(tabParam || "news");

  useEffect(() => {
    if (tabParam && ["news", "reports", "stocks"].includes(tabParam)) {
      setActiveTab(tabParam);
    } else if (!tabParam) {
      setActiveTab("news");
    }
  }, [tabParam]);

  const handleTabChange = (key) => {
    setActiveTab(key);
    if (key === "news") {
      setSearchParams({});
    } else {
      setSearchParams({ tab: key });
    }
  };
  const [articles, setArticles] = useState([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);

  const fetchArticles = useCallback(async (p = 1) => {
    setLoading(true);
    try {
      const data = await getArticles({ category: "finance", page: p, page_size: PAGE_SIZE });
      setArticles(data.items);
      setTotalPages(data.total_pages);
      setPage(p);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (activeTab === "news") fetchArticles(1);
  }, [activeTab]);

  const goToPage = (p) => {
    if (p >= 1 && p <= totalPages && p !== page) fetchArticles(p);
  };

  const getPageNumbers = () => {
    const delta = 2;
    const range = [];
    const left = Math.max(1, page - delta);
    const right = Math.min(totalPages, page + delta);
    for (let i = left; i <= right; i++) range.push(i);
    if (left > 1) { range.unshift("..."); range.unshift(1); }
    if (right < totalPages) { range.push("..."); range.push(totalPages); }
    return range;
  };

  return (
    <>
      <Helmet>
        <title>TechBrief | 財經</title>
        <meta name="description" content="最新財經新聞、財報分析與科技股票動態，Pro 方案解鎖股票監控功能。" />
      </Helmet>

      <main className={styles.main}>
        {/* Header */}
        <div className={styles.pageHeader}>
          <div className={styles.headerInner}>
            <span className={styles.label}>FINANCE</span>
            <h1 className={styles.title}>財經專區</h1>
            <p className={styles.desc}>科技財經新聞、財報動態與股票分析，掌握市場脈動</p>
          </div>
        </div>

        {/* Tab Bar */}
        <div className={styles.tabBar}>
          <div className={styles.tabInner}>
            {TABS.map((tab) => (
              <button
                key={tab.key}
                className={`${styles.tab} ${activeTab === tab.key ? styles.tabActive : ""}`}
                onClick={() => handleTabChange(tab.key)}
              >
                {tab.label}
                {tab.key === "stocks" && <span className={styles.proBadge}>Pro</span>}
              </button>
            ))}
          </div>
        </div>

        <div className={styles.container}>
          {/* ── 財經新聞 ── */}
          {activeTab === "news" && (
            <>
              {loading ? (
                <div className={styles.grid}>
                  {[...Array(9)].map((_, i) => (
                    <div key={i} className={styles.skeleton} />
                  ))}
                </div>
              ) : articles.length === 0 ? (
                <div className={styles.empty}>
                  <p>此分類目前沒有文章 🔍</p>
                  <p className={styles.emptyHint}>文章每天早上 10 點自動生成</p>
                </div>
              ) : (
                <>
                  <div className={styles.grid}>
                    {articles.map((a, i) => (
                      <div key={a.id} className={styles.gridItem} style={{ animationDelay: `${i * 0.05}s` }}>
                        <ArticleCard article={a} />
                      </div>
                    ))}
                  </div>

                  {totalPages > 1 && (
                    <div className={styles.pagination}>
                      <button className={styles.pageBtn} onClick={() => goToPage(page - 1)} disabled={page === 1}>‹</button>
                      {getPageNumbers().map((p, i) =>
                        p === "..." ? (
                          <span key={`e-${i}`} className={styles.ellipsis}>…</span>
                        ) : (
                          <button
                            key={p}
                            className={`${styles.pageBtn} ${p === page ? styles.pageBtnActive : ""}`}
                            onClick={() => goToPage(p)}
                          >{p}</button>
                        )
                      )}
                      <button className={styles.pageBtn} onClick={() => goToPage(page + 1)} disabled={page === totalPages}>›</button>
                    </div>
                  )}
                </>
              )}
            </>
          )}

          {/* ── 財報（即將推出）── */}
          {activeTab === "reports" && (
            <div className={styles.comingSoon}>
              <div className={styles.comingSoonIcon}>📊</div>
              <h2 className={styles.comingSoonTitle}>財報分析</h2>
              <p className={styles.comingSoonDesc}>
                重要財報發布日期、EPS 速報與財務指標解析，即將上線。
              </p>
              <span className={styles.comingSoonBadge}>Coming Soon</span>
            </div>
          )}

          {/* ── 股票監控（Max 遮罩）── */}
          {activeTab === "stocks" && (
            <div className={styles.stockSection}>
              <div className={styles.stockLock}>
                {/* 模糊預覽 */}
                <div className={styles.stockBlur}>
                  <div className={styles.stockPreviewGrid}>
                    {["NVDA", "2330.TW", "AAPL", "MSFT", "2454.TW", "GOOGL"].map((s) => (
                      <div key={s} className={styles.stockCard}>
                        <span className={styles.stockTicker}>{s}</span>
                        <span className={styles.stockChange}>+2.4%</span>
                        <div className={styles.stockBar} />
                      </div>
                    ))}
                  </div>
                </div>
                {/* 遮罩 */}
                {!isMax && (
                  <div className={styles.stockOverlay}>
                    <span className={styles.lockIcon}>🔒</span>
                    <h3>股票監控需要 Max 方案</h3>
                    <p>追蹤科技股即時動態、相關新聞連動與 AI 分析報告</p>
                    <Link to="/pricing" className={styles.upgradeBtn}>
                      查看方案
                    </Link>
                  </div>
                )}
              </div>
            </div>
          )}

          <SubscribeBar />
        </div>
      </main>
    </>
  );
}
