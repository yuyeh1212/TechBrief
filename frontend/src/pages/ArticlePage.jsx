import { useState, useEffect } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { format } from "date-fns";
import { zhTW } from "date-fns/locale";
import { getArticle, getLatestArticles } from "@/api";
import ArticleCard from "@/components/ui/ArticleCard";
import styles from "./ArticlePage.module.scss";

const CATEGORY_LABEL = {
  ai: "人工智慧",
  gpt: "GPT",
  gemini: "Gemini",
  claude: "Claude",
  tech: "科技資訊",
  collaboration: "連動產出",
};

const CATEGORY_PATH = {
  ai: "/ai",
  gpt: "/ai/gpt",
  gemini: "/ai/gemini",
  claude: "/ai/claude",
  tech: "/tech",
  collaboration: "/collaboration",
};

const FALLBACK_IMAGE = "https://images.unsplash.com/photo-1677442135703-1787eea5ce01?w=1200&q=80";

export default function ArticlePage() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const [article, setArticle] = useState(null);
  const [related, setRelated] = useState([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    window.scrollTo(0, 0);
    setLoading(true);
    setNotFound(false);

    (async () => {
      try {
        const data = await getArticle(slug);
        setArticle(data);

        const latest = await getLatestArticles(4);
        setRelated(latest.filter((a) => a.slug !== slug).slice(0, 3));
      } catch (e) {
        if (e.response?.status === 404) setNotFound(true);
      } finally {
        setLoading(false);
      }
    })();
  }, [slug]);

  if (loading) {
    return (
      <main className={styles.main}>
        <div className={styles.skeletonWrap}>
          <div className={styles.skeletonHero} />
          <div className={styles.skeletonBody}>
            <div className={styles.skeletonLine} style={{ width: "70%" }} />
            <div className={styles.skeletonLine} style={{ width: "50%" }} />
            <div className={styles.skeletonLine} style={{ width: "90%" }} />
            <div className={styles.skeletonLine} style={{ width: "60%" }} />
          </div>
        </div>
      </main>
    );
  }

  if (notFound) {
    return (
      <main className={styles.main}>
        <div className={styles.notFound}>
          <h1>404</h1>
          <p>找不到這篇文章</p>
          <Link to="/" className={styles.backBtn}>返回首頁</Link>
        </div>
      </main>
    );
  }

  return (
    <main className={styles.main}>
      {/* Hero Image */}
      <div className={styles.heroImage}>
        <img
          src={article.image_url || FALLBACK_IMAGE}
          alt={article.title}
          onError={(e) => { e.target.src = FALLBACK_IMAGE; }}
        />
        <div className={styles.heroOverlay} />
      </div>

      <div className={styles.container}>
        {/* Breadcrumb */}
        <nav className={styles.breadcrumb}>
          <Link to="/">首頁</Link>
          <span>›</span>
          <Link to={CATEGORY_PATH[article.category] || "/tech"}>
            {CATEGORY_LABEL[article.category] || article.category}
          </Link>
          <span>›</span>
          <span className={styles.breadcrumbCurrent}>{article.title.slice(0, 30)}…</span>
        </nav>

        <article className={styles.article}>
          {/* Header */}
          <header className={styles.header}>
            <div className={styles.categoryBadge}>
              {CATEGORY_LABEL[article.category] || article.category}
            </div>
            <h1 className={styles.title}>{article.title}</h1>
            <p className={styles.summary}>{article.summary}</p>

            <div className={styles.meta}>
              {article.source_name && (
                <span className={styles.metaItem}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                    <path d="M19 3H5a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2V5a2 2 0 00-2-2z" stroke="currentColor" strokeWidth="1.5"/>
                    <path d="M16 3v4M8 3v4M3 11h18" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                  </svg>
                  {article.source_name}
                </span>
              )}
              <span className={styles.metaItem}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                  <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.5"/>
                  <path d="M12 7v5l3 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                </svg>
                {format(new Date(article.created_at), "yyyy年MM月dd日 HH:mm", { locale: zhTW })}
              </span>
              <span className={styles.metaItem}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                  <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" stroke="currentColor" strokeWidth="1.5"/>
                  <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1.5"/>
                </svg>
                {article.view_count} 次瀏覽
              </span>
            </div>
          </header>

          {/* Content */}
          <div
            className={styles.content}
            dangerouslySetInnerHTML={{ __html: article.content }}
          />

          {/* Source link */}
          {article.source_url && (
            <div className={styles.sourceLink}>
              <span>原始來源：</span>
              <a href={article.source_url} target="_blank" rel="noopener noreferrer">
                {article.source_name || article.source_url}
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
                  <path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6M15 3h6v6M10 14L21 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </a>
            </div>
          )}
        </article>

        {/* Related */}
        {related.length > 0 && (
          <section className={styles.related}>
            <div className={styles.relatedHeader}>
              <span className={styles.relatedLabel}>RELATED</span>
              <h2 className={styles.relatedTitle}>相關文章</h2>
            </div>
            <div className={styles.relatedGrid}>
              {related.map((a) => (
                <ArticleCard key={a.id} article={a} />
              ))}
            </div>
          </section>
        )}
      </div>
    </main>
  );
}
