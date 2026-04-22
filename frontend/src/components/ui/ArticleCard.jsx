import { Link } from "react-router-dom";
import { format } from "date-fns";
import { zhTW } from "date-fns/locale";
import styles from "./ArticleCard.module.scss";

const CATEGORY_LABEL = {
  ai: "人工智慧",
  gpt: "GPT",
  gemini: "Gemini",
  claude: "Claude",
  tech: "科技資訊",
  collaboration: "工具整合",
  finance: "財經",
};

const FALLBACK_IMAGE = "https://images.unsplash.com/photo-1677442135703-1787eea5ce01?w=800&q=80";

const SENTIMENT_CONFIG = {
  positive: { label: "利多", className: "sentimentPositive" },
  neutral:  { label: "中立", className: "sentimentNeutral" },
  negative: { label: "利空", className: "sentimentNegative" },
};

export default function ArticleCard({ article, featured = false }) {
  const { title, slug, summary, category, image_url, source_name, created_at, view_count, sentiment } = article;

  return (
    <Link to={`/article/${slug}`} className={`${styles.card} ${featured ? styles.featured : ""}`}>
      <div className={styles.imageWrap}>
        <img
          src={image_url || FALLBACK_IMAGE}
          alt={title}
          className={styles.image}
          onError={(e) => { e.target.src = FALLBACK_IMAGE; }}
          loading="lazy"
        />
        <span className={styles.category}>{CATEGORY_LABEL[category] || category}</span>
      </div>

      <div className={styles.body}>
        <h2 className={`${styles.title} ${featured ? styles.featuredTitle : ""}`}>
          {title}
        </h2>
        {category === "finance" && sentiment && SENTIMENT_CONFIG[sentiment] && (
          <span className={`${styles.sentimentBadge} ${styles[SENTIMENT_CONFIG[sentiment].className]}`}>
            {SENTIMENT_CONFIG[sentiment].label}
          </span>
        )}
        <p className={styles.summary}>{summary}</p>

        <div className={styles.meta}>
          {source_name && <span className={styles.source}>{source_name}</span>}
          <span className={styles.date}>
            {format(new Date(created_at), "MM/dd HH:mm", { locale: zhTW })}
          </span>
          {view_count > 0 && (
            <span className={styles.views}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none">
                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" stroke="currentColor" strokeWidth="1.5"/>
                <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1.5"/>
              </svg>
              {view_count}
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}
