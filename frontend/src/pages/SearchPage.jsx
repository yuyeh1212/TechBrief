import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { searchArticles } from "@/api";
import ArticleCard from "@/components/ui/ArticleCard";
import styles from "./SearchPage.module.scss";

export default function SearchPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const q = searchParams.get("q") || "";

  const [query, setQuery] = useState(q);
  const [articles, setArticles] = useState([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);

  const doSearch = async (keyword, p = 1) => {
    if (!keyword.trim()) return;
    setLoading(true);
    try {
      const data = await searchArticles({ q: keyword, page: p, page_size: 9 });
      setArticles(data.items);
      setTotalPages(data.total_pages);
      setTotal(data.total);
      setPage(p);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (q) {
      setQuery(q);
      doSearch(q, 1);
    }
  }, [q]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!query.trim()) return;
    setSearchParams({ q: query.trim() });
  };

  const goToPage = (p) => {
    if (p >= 1 && p <= totalPages && p !== page) {
      doSearch(q, p);
    }
  };

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
      <div className={styles.header}>
        <div className={styles.headerInner}>
          <h1 className={styles.title}>搜尋文章</h1>
          <form className={styles.searchForm} onSubmit={handleSubmit}>
            <input
              type="text"
              className={styles.input}
              placeholder="輸入關鍵字搜尋…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              autoFocus
            />
            <button type="submit" className={styles.searchBtn}>
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
          </form>
          {q && !loading && (
            <p className={styles.resultCount}>
              「{q}」共找到 <strong>{total}</strong> 篇文章
            </p>
          )}
        </div>
      </div>

      <div className={styles.container}>
        {loading ? (
          <div className={styles.grid}>
            {[...Array(9)].map((_, i) => (
              <div key={i} className={styles.skeleton} />
            ))}
          </div>
        ) : articles.length === 0 && q ? (
          <div className={styles.empty}>
            <p>找不到「{q}」相關文章 🔍</p>
            <p className={styles.emptyHint}>試試其他關鍵字</p>
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
                    <span key={`e-${i}`} className={styles.ellipsis}>
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
      </div>
    </main>
  );
}
