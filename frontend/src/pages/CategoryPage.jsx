import { useState, useEffect, useCallback } from "react";
import { useParams } from "react-router-dom";
import { getArticles } from "@/api";
import ArticleCard from "@/components/ui/ArticleCard";
import SubscribeBar from "@/components/ui/SubscribeBar";
import styles from "./CategoryPage.module.scss";

const PAGE_META = {
  ai: {
    title: "人工智慧 (AI)",
    desc: "深度解析 AI 領域最新動態，涵蓋大型語言模型、生成式 AI 與產業應用",
    category: "ai",
  },
  gpt: {
    title: "GPT 專區",
    desc: "OpenAI GPT 系列最新發展、應用場景與使用技巧",
    category: "gpt",
  },
  gemini: {
    title: "Gemini 專區",
    desc: "Google Gemini 模型更新、Workspace 整合與 AI Studio 應用",
    category: "gemini",
  },
  claude: {
    title: "Claude 專區",
    desc: "Anthropic Claude 最新版本、能力評測與 API 開發實踐",
    category: "claude",
  },
  tech: {
    title: "科技資訊 (TECH NEWS)",
    desc: "涵蓋半導體、軟體、新創、產業趨勢等全方位科技資訊",
    category: "tech",
  },
  collaboration: {
    title: "連動產出 (Collaboration)",
    desc: "自動化工作流、API 整合、n8n 與無程式碼工具的應用實踐",
    category: "collaboration",
  },
};

const PAGE_SIZE = 12;

export default function CategoryPage({ pageKey }) {
  const { sub } = useParams(); // ai/gpt, ai/gemini, ai/claude
  const key = sub || pageKey;
  const meta = PAGE_META[key] || PAGE_META.tech;

  const [articles, setArticles] = useState([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  const fetchArticles = useCallback(async (p = 1, reset = false) => {
    if (p === 1) setLoading(true);
    else setLoadingMore(true);

    try {
      const data = await getArticles({
        category: meta.category,
        page: p,
        page_size: PAGE_SIZE,
      });

      setArticles((prev) => reset ? data.items : [...prev, ...data.items]);
      setTotalPages(data.total_pages);
      setPage(p);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [meta.category]);

  useEffect(() => {
    setArticles([]);
    setPage(1);
    fetchArticles(1, true);
  }, [key]);

  const loadMore = () => {
    if (page < totalPages && !loadingMore) {
      fetchArticles(page + 1);
    }
  };

  return (
    <main className={styles.main}>
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
            {[...Array(6)].map((_, i) => (
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
                  style={{ animationDelay: `${(i % PAGE_SIZE) * 0.05}s` }}
                >
                  <ArticleCard article={a} />
                </div>
              ))}
            </div>

            {page < totalPages && (
              <div className={styles.loadMoreWrap}>
                <button
                  className={styles.loadMoreBtn}
                  onClick={loadMore}
                  disabled={loadingMore}
                >
                  {loadingMore ? "載入中…" : "載入更多"}
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
