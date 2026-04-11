import { useState, useEffect, useCallback } from "react";
import { Helmet } from "react-helmet-async";
import { useSearchParams } from "react-router-dom";
import { getArticles } from "@/api";
import ArticleCard from "@/components/ui/ArticleCard";
import SubscribeBar from "@/components/ui/SubscribeBar";
import styles from "./AiPage.module.scss";

const TABS = [
  { key: "all",    label: "全部",   category: "ai"     },
  { key: "gpt",    label: "GPT",    category: "gpt"    },
  { key: "gemini", label: "Gemini", category: "gemini" },
  { key: "claude", label: "Claude", category: "claude" },
];

const PAGE_SIZE = 9;

export default function AiPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const tabParam = searchParams.get("tab") || "all";
  const [activeTab, setActiveTab] = useState(
    TABS.find((t) => t.key === tabParam) ? tabParam : "all"
  );

  useEffect(() => {
    const valid = TABS.find((t) => t.key === tabParam);
    if (valid) setActiveTab(tabParam);
  }, [tabParam]);

  const handleTabChange = (key) => {
    setActiveTab(key);
    if (key === "all") {
      setSearchParams({});
    } else {
      setSearchParams({ tab: key });
    }
  };

  const [articles, setArticles] = useState([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);

  const currentTab = TABS.find((t) => t.key === activeTab) || TABS[0];

  const fetchArticles = useCallback(async (p = 1, category) => {
    setLoading(true);
    try {
      const data = await getArticles({ category, page: p, page_size: PAGE_SIZE });
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
    setPage(1);
    fetchArticles(1, currentTab.category);
  }, [activeTab]);

  const goToPage = (p) => {
    if (p >= 1 && p <= totalPages && p !== page)
      fetchArticles(p, currentTab.category);
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
        <title>TechBrief | 人工智慧</title>
      </Helmet>

      <main className={styles.main}>
        {/* Header */}
        <div className={styles.pageHeader}>
          <div className={styles.headerInner}>
            <span className={styles.label}>ARTIFICIAL INTELLIGENCE</span>
            <h1 className={styles.title}>人工智慧 (AI)</h1>
            <p className={styles.desc}>深度解析 AI 領域最新動態，涵蓋大型語言模型、生成式 AI 與產業應用</p>
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
              </button>
            ))}
          </div>
        </div>

        <div className={styles.container}>
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

          <SubscribeBar />
        </div>
      </main>
    </>
  );
}
