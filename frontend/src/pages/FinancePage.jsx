import { useState, useEffect, useCallback, useRef } from "react";
import { Helmet } from "react-helmet-async";
import { Link, useSearchParams } from "react-router-dom";
import { getArticles, getStockAnalysis, getWeeklyReport } from "@/api";
import { useAuth } from "@/context/AuthContext";
import ArticleCard from "@/components/ui/ArticleCard";
import SubscribeBar from "@/components/ui/SubscribeBar";
import styles from "./FinancePage.module.scss";

const TABS = [
  { key: "news", label: "財經新聞" },
  { key: "reports", label: "財報" },
  { key: "analysis", label: "個股簡評" },
  { key: "weekly", label: "每週精選" },
  { key: "stocks", label: "股票監控" },
];

const PAGE_SIZE = 9;

export default function FinancePage() {
  const { isPro, isMax } = useAuth();

  // 每週精選 state
  const [weeklyReport, setWeeklyReport] = useState(null);
  const [weeklyLoading, setWeeklyLoading] = useState(false);
  const [weeklyError, setWeeklyError] = useState("");
  const [searchParams, setSearchParams] = useSearchParams();
  const tabParam = searchParams.get("tab");
  const [activeTab, setActiveTab] = useState(tabParam || "news");

  // 個股簡評 state
  const [tickerInput, setTickerInput] = useState(searchParams.get("ticker") || "");
  const [analysisResult, setAnalysisResult] = useState(null);
  const [analysisLoading, setAnalysisLoading] = useState(false);
  const [analysisError, setAnalysisError] = useState("");
  const [queryUsage, setQueryUsage] = useState(null); // { daily_used, daily_limit, weekly_used, weekly_limit }
  const inputRef = useRef(null);

  // 歷史查詢記錄（localStorage，最多 5 筆）
  const HISTORY_KEY = "tb_stock_history";
  const [history, setHistory] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem(HISTORY_KEY) || "[]");
    } catch {
      return [];
    }
  });

  const saveHistory = (ticker) => {
    const updated = [ticker, ...history.filter((t) => t !== ticker)].slice(0, 5);
    setHistory(updated);
    localStorage.setItem(HISTORY_KEY, JSON.stringify(updated));
  };

  const clearHistory = () => {
    setHistory([]);
    localStorage.removeItem(HISTORY_KEY);
  };

  useEffect(() => {
    if (tabParam && ["news", "reports", "analysis", "weekly", "stocks"].includes(tabParam)) {
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
    // 切換 tab 時清除分析結果
    if (key !== "analysis") {
      setAnalysisResult(null);
      setAnalysisError("");
    }
  };

  // 從 URL ticker 參數自動觸發分析（由文章頁點擊股票代號進入）
  useEffect(() => {
    const ticker = searchParams.get("ticker");
    if (ticker && activeTab === "analysis" && isPro && !analysisResult && !analysisLoading) {
      setTickerInput(ticker);
      handleAnalysis(ticker);
    }
  }, [activeTab, isPro]);

  const handleAnalysis = async (overrideTicker) => {
    const query = (overrideTicker || tickerInput).trim().toUpperCase();
    if (!query) return;
    setAnalysisLoading(true);
    setAnalysisError("");
    setAnalysisResult(null);
    try {
      const data = await getStockAnalysis(query);
      setAnalysisResult(data);
      saveHistory(query);
      // 更新剩餘次數
      if (data.daily_limit) {
        setQueryUsage({
          daily_used: data.daily_used,
          daily_limit: data.daily_limit,
          weekly_used: data.weekly_used,
          weekly_limit: data.weekly_limit,
        });
      }
    } catch (e) {
      const detail = e.response?.data?.detail;
      if (detail && typeof detail === "object") {
        // 超出限制的結構化錯誤
        setAnalysisError(detail.message);
        setQueryUsage({
          daily_used: detail.daily_used,
          daily_limit: detail.daily_limit,
          weekly_used: detail.weekly_used,
          weekly_limit: detail.weekly_limit,
        });
      } else {
        setAnalysisError(typeof detail === "string" ? detail : "分析失敗，請稍後再試");
      }
    } finally {
      setAnalysisLoading(false);
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
    if (activeTab === "weekly" && isPro && !weeklyReport && !weeklyLoading) {
      setWeeklyLoading(true);
      setWeeklyError("");
      getWeeklyReport()
        .then((data) => setWeeklyReport(data))
        .catch((e) => setWeeklyError(e.response?.data?.detail || "載入失敗，請稍後再試"))
        .finally(() => setWeeklyLoading(false));
    }
  }, [activeTab, isPro]);

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
                {tab.key === "stocks" && <span className={styles.proBadge}>Max</span>}
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

          {/* ── 個股簡評 ── */}
          {activeTab === "analysis" && (
            <div className={styles.analysisSection}>
              {!isPro ? (
                /* 非 Pro：升級遮罩 */
                <div className={styles.comingSoon}>
                  <div className={styles.comingSoonIcon}>🔍</div>
                  <h2 className={styles.comingSoonTitle}>AI 個股簡評</h2>
                  <p className={styles.comingSoonDesc}>
                    輸入股票代號，AI 即時彙整近期相關新聞與市場情緒分析。
                  </p>
                  <Link to="/pricing" className={styles.upgradeBtn}>
                    升級 Pro 解鎖
                  </Link>
                </div>
              ) : (
                /* Pro 用戶：完整功能 */
                <>
                  {/* 搜尋列 */}
                  <div className={styles.analysisSearchWrap}>
                    {/* 用量標籤（有資料才顯示） */}
                    {queryUsage && (
                      <div className={styles.queryUsageRow}>
                        <span className={`${styles.usageBadge} ${queryUsage.daily_used >= queryUsage.daily_limit ? styles.usageBadgeFull : ""}`}>
                          今日 {queryUsage.daily_used}/{queryUsage.daily_limit} 次
                        </span>
                        <span className={`${styles.usageBadge} ${queryUsage.weekly_used >= queryUsage.weekly_limit ? styles.usageBadgeFull : ""}`}>
                          本週 {queryUsage.weekly_used}/{queryUsage.weekly_limit} 次
                        </span>
                      </div>
                    )}
                    <div className={styles.analysisSearchBox}>
                      <span className={styles.analysisSearchIcon}>📊</span>
                      <input
                        ref={inputRef}
                        type="text"
                        className={styles.analysisInput}
                        placeholder="輸入股票代號，例如 NVDA 或 2330.TW"
                        value={tickerInput}
                        onChange={(e) => setTickerInput(e.target.value.toUpperCase())}
                        onKeyDown={(e) => e.key === "Enter" && handleAnalysis()}
                        maxLength={20}
                      />
                      <button
                        className={styles.analysisBtn}
                        onClick={() => handleAnalysis()}
                        disabled={analysisLoading || !tickerInput.trim()}
                      >
                        {analysisLoading ? "分析中…" : "開始分析"}
                      </button>
                    </div>
                    <p className={styles.analysisHint}>
                      支援台股（如 2330.TW）與美股（如 NVDA、AAPL）
                    </p>
                  </div>

                  {/* 歷史查詢記錄 */}
                  {history.length > 0 && (
                    <div className={styles.historyWrap}>
                      <span className={styles.historyLabel}>最近查詢</span>
                      <div className={styles.historyTags}>
                        {history.map((t) => (
                          <button
                            key={t}
                            className={styles.historyTag}
                            onClick={() => {
                              setTickerInput(t);
                              handleAnalysis(t);
                            }}
                          >
                            {t}
                          </button>
                        ))}
                      </div>
                      <button className={styles.historyClear} onClick={clearHistory}>
                        清除
                      </button>
                    </div>
                  )}

                  {/* 載入中 */}
                  {analysisLoading && (
                    <div className={styles.analysisLoading}>
                      <div className={styles.loadingSpinner} />
                      <p>AI 正在彙整相關資訊，約需 5-10 秒…</p>
                    </div>
                  )}

                  {/* 錯誤 */}
                  {analysisError && !analysisLoading && (
                    <div className={styles.analysisError} style={{ marginTop: "24px" }}>{analysisError}</div>
                  )}

                  {/* 結果卡片 */}
                  {analysisResult && !analysisLoading && (
                    <div className={styles.analysisCard}>
                      {/* 標頭 */}
                      <div className={styles.analysisCardHeader}>
                        <div>
                          <span className={styles.analysisTicker}>{analysisResult.ticker}</span>
                          <span className={styles.analysisCompany}>{analysisResult.company_name}</span>
                        </div>
                        <span className={`${styles.sentimentBadge} ${styles[`sentiment_${analysisResult.sentiment}`]}`}>
                          {analysisResult.sentiment === "positive" ? "▲" : analysisResult.sentiment === "negative" ? "▼" : "◆"} {analysisResult.sentiment_label}
                        </span>
                      </div>

                      {/* 概覽 */}
                      <p className={styles.analysisOverview}>{analysisResult.overview}</p>

                      {/* 關鍵重點 */}
                      <div className={styles.analysisPoints}>
                        <p className={styles.analysisPointsTitle}>關鍵重點</p>
                        <ul>
                          {analysisResult.key_points?.map((pt, i) => (
                            <li key={i}>{pt}</li>
                          ))}
                        </ul>
                      </div>

                      {/* 結語 */}
                      <p className={styles.analysisConclusion}>{analysisResult.conclusion}</p>

                      {/* 資料來源 */}
                      {analysisResult.related_articles?.length > 0 && (
                        <div className={styles.analysisRelated}>
                          <p className={styles.analysisRelatedTitle}>參考文章</p>
                          <div className={styles.analysisRelatedList}>
                            {analysisResult.related_articles.map((a) => (
                              <Link
                                key={a.slug}
                                to={`/article/${a.slug}`}
                                className={styles.analysisRelatedItem}
                              >
                                {a.title}
                              </Link>
                            ))}
                          </div>
                        </div>
                      )}
                      {!analysisResult.has_articles && (
                        <p className={styles.analysisNoData}>
                          ⚠️ 資料庫暫無近期相關文章，以上分析基於 AI 訓練資料
                        </p>
                      )}

                      <p className={styles.analysisDisclaimer}>
                        本分析由 AI 自動生成，僅供參考，不構成任何投資建議。
                      </p>
                    </div>
                  )}

                  {/* 初始空狀態 */}
                  {!analysisResult && !analysisLoading && !analysisError && (
                    <div className={styles.analysisEmpty}>
                      <div className={styles.analysisEmptyIcon}>🔍</div>
                      <p>輸入股票代號，AI 即時彙整近期相關新聞與情緒分析</p>
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {/* ── 每週精選 ── */}
          {activeTab === "weekly" && (
            <div className={styles.weeklySection}>
              {!isPro ? (
                <div className={styles.comingSoon}>
                  <div className={styles.comingSoonIcon}>📈</div>
                  <h2 className={styles.comingSoonTitle}>每週精選看好標的</h2>
                  <p className={styles.comingSoonDesc}>
                    每週一 AI 彙整本週財經新聞，精選最具潛力的看好標的，附上新聞依據與短期展望。
                  </p>
                  <Link to="/pricing" className={styles.upgradeBtn}>升級 Pro 解鎖</Link>
                </div>
              ) : weeklyLoading ? (
                <div className={styles.weeklyLoading}>
                  <div className={styles.loadingSpinner} />
                  <p>載入本週報告中…</p>
                </div>
              ) : weeklyError ? (
                <div className={styles.analysisError}>{weeklyError}</div>
              ) : !weeklyReport ? (
                <div className={styles.weeklyEmpty}>
                  <div className={styles.comingSoonIcon}>📭</div>
                  <h2 className={styles.comingSoonTitle}>本週報告尚未產生</h2>
                  <p className={styles.comingSoonDesc}>
                    每週日晚上 20:00 自動更新，若剛升級 Pro 請於本週日後查看第一份報告。
                  </p>
                </div>
              ) : (
                <>
                  {/* 報告標頭 */}
                  <div className={styles.weeklyHeader}>
                    <div>
                      <span className={styles.weeklyLabel}>WEEKLY PICKS</span>
                      <h2 className={styles.weeklyTitle}>本週精選看好標的</h2>
                      <p className={styles.weeklyDate}>
                        週期：{weeklyReport.week_start} 起 ·
                        基於 {weeklyReport.article_count} 篇財經正面新聞
                      </p>
                    </div>
                  </div>

                  {/* 市場總覽 */}
                  <div className={styles.weeklyOverview}>
                    <p className={styles.weeklyOverviewLabel}>本週市場概況</p>
                    <p className={styles.weeklyOverviewText}>{weeklyReport.market_overview}</p>
                  </div>

                  {/* 精選標的卡片 */}
                  <div className={styles.picksGrid}>
                    {weeklyReport.picks.map((pick, i) => (
                      <div key={i} className={styles.pickCard}>
                        <div className={styles.pickCardHeader}>
                          <span className={styles.pickTicker}>{pick.ticker}</span>
                          <span className={styles.pickRank}>#{i + 1}</span>
                        </div>
                        <p className={styles.pickCompany}>{pick.company}</p>
                        <p className={styles.pickReason}>{pick.reason}</p>
                        <div className={styles.pickOutlookWrap}>
                          <span className={styles.pickOutlookLabel}>短期展望</span>
                          <span className={styles.pickOutlook}>{pick.outlook}</span>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* 免責聲明 */}
                  {weeklyReport.disclaimer && (
                    <p className={styles.weeklyDisclaimer}>{weeklyReport.disclaimer}</p>
                  )}
                </>
              )}
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
