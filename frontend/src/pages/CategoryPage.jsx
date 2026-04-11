import { useState, useEffect, useCallback } from "react";
import { useParams } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { getArticles } from "@/api";
import ArticleCard from "@/components/ui/ArticleCard";
import SubscribeBar from "@/components/ui/SubscribeBar";
import styles from "./CategoryPage.module.scss";

const PAGE_META = {
  ai: {
    title: "人工智慧 (AI)",
    tabTitle: "人工智慧",
    desc: "深度解析 AI 領域最新動態，涵蓋大型語言模型、生成式 AI 與產業應用",
    category: "ai",
  },
  gpt: {
    title: "GPT 專區",
    tabTitle: "GPT",
    desc: "OpenAI GPT 系列最新發展、應用場景與使用技巧",
    category: "gpt",
  },
  gemini: {
    title: "Gemini 專區",
    tabTitle: "Gemini",
    desc: "Google Gemini 模型更新、Workspace 整合與 AI Studio 應用",
    category: "gemini",
  },
  claude: {
    title: "Claude 專區",
    tabTitle: "Claude",
    desc: "Anthropic Claude 最新版本、能力評測與 API 開發實踐",
    category: "claude",
  },
  tech: {
    title: "科技資訊 (TECH NEWS)",
    tabTitle: "科技資訊",
    desc: "涵蓋半導體、軟體、新創、產業趨勢等全方位科技資訊",
    category: "tech",
  },
  collaboration: {
    title: "連動產出 (Collaboration)",
    tabTitle: "連動產出",
    desc: "自動化工作流、API 整合、n8n 與無程式碼工具的應用實踐",
    category: "collaboration",
  },
};

const PAGE_SIZE = 9;

export default function CategoryPage({ pageKey }) {
  const { sub } = useParams();
  const key = sub || pageKey;
  const meta = PAGE_META[key] || PAGE_META.tech;

  const [articles, setArticles] = useState([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);

  const fetchArticles = useCallback(
    async (p = 1) => {
      setLoading(true);
      try {
        const data = await getArticles({
          category: meta.category,
          page: p,
          page_size: PAGE_SIZE,
        });
        setArticles(data.items);
        setTotalPages(data.total_pages);
        setPage(p);
        window.scrollTo({ top: 0, behavior: "smooth" });
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    },
    [meta.category],
  );

  useEffect(() => {
    setPage(1);
    fetchArticles(1);
  }, [key]);

  const goToPage = (p) => {
    if (p >= 1 && p <= totalPages && p !== page) {
      fetchArticles(p);
    }
  };

  // 產生頁碼陣列，最多顯示 5 個
  const getPageNumbers = () => {
    const delta = 2;
    const range = [];
    const left = Math.max(1, page - delta);
    const right = Math.min(totalPages, page + delta);

    for (let i = left; i <= right; i++) range.push(i);

    if (left > 1) {
      range.unshift("...");
      range.unshift(1);
    }
    if (right < totalPages) {
      range.push("...");
      range.push(totalPages);
    }
    return range;
  };

  return (
    <main className={styles.main}>
      <Helmet>
        <title>TechBrief | {meta.tabTitle}</title>
      </Helmet>
      <div className={styles.pageHeader}>
        <div className={styles.headerInner}>
          <span className={styles.label}>{meta.category.toUpperCase()}</span>
          <h1 className={styles.title}>{meta.title}</h1>
          <p className={styles.desc}>{meta.desc}</p>
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
                <div
                  key={a.id}
                  className={styles.gridItem}
                  style={{ animationDelay: `${i * 0.05}s` }}
                >
                  <ArticleCard article={a} />
                </div>
              ))}
            </div>

            {totalPages > 1 && (
              <div className={styles.pagination}>
                <button
                  className={styles.pageBtn}
                  onClick={() => goToPage(page - 1)}
                  disabled={page === 1}
                >
                  ‹
                </button>

                {getPageNumbers().map((p, i) =>
                  p === "..." ? (
                    <span key={`ellipsis-${i}`} className={styles.ellipsis}>
                      …
                    </span>
                  ) : (
                    <button
                      key={p}
                      className={`${styles.pageBtn} ${p === page ? styles.pageBtnActive : ""}`}
                      onClick={() => goToPage(p)}
                    >
                      {p}
                    </button>
                  ),
                )}

                <button
                  className={styles.pageBtn}
                  onClick={() => goToPage(page + 1)}
                  disabled={page === totalPages}
                >
                  ›
                </button>
              </div>
            )}
          </>
        )}

        <SubscribeBar />
      </div>
    </main>
  );
}
