import { useState, useEffect } from "react";
import { Helmet } from "react-helmet-async";
import { getLatestArticles, getTodayHotArticle } from "@/api";
import ArticleCard from "@/components/ui/ArticleCard";
import SubscribeBar from "@/components/ui/SubscribeBar";
import styles from "./Home.module.scss";

export default function Home() {
  const [featured, setFeatured] = useState(null);
  const [featuredLabel, setFeaturedLabel] = useState({ label: "今日頭條", en: "TOP STORY", hot: false });
  const [articles, setArticles] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const [latest, hotArticle] = await Promise.all([
          getLatestArticles(10),
          getTodayHotArticle().catch(() => null),
        ]);

        // 若今日有瀏覽量 > 0 的文章，置頂為「今日精選」
        if (hotArticle && hotArticle.view_count > 0) {
          setFeatured(hotArticle);
          setFeaturedLabel({ label: "今日精選", en: "HOT TODAY", hot: true });
          // 從 latest 中移除已置頂的文章，避免重複
          setArticles(latest.filter((a) => a.id !== hotArticle.id));
        } else if (latest.length > 0) {
          setFeatured(latest[0]);
          setFeaturedLabel({ label: "今日頭條", en: "TOP STORY", hot: false });
          setArticles(latest.slice(1));
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  return (
    <main className={styles.main}>
      <Helmet>
        <title>TechBrief 科技快訊</title>
      </Helmet>
      {/* Hero */}
      <section className={styles.hero}>
        <div className={styles.heroInner}>
          <span className={styles.badge}>
            <span className={styles.pulseDot} />
            <span className={styles.pulseRing} />
            自動化新聞 (Automated News)
          </span>
          <h1 className={styles.heroTitle}>
            即時掌握<br />
            <span className={styles.gradientText}>AI 與科技</span>趨勢
          </h1>
          <p className={styles.heroDesc}>
            每天早上 10 點，由 Gemini 2.5 Pro 精選整理，10 篇最新科技資訊
          </p>
        </div>
      </section>

      <div className={styles.container}>
        {loading ? (
          <div className={styles.skeletonGrid}>
            {[...Array(6)].map((_, i) => (
              <div key={i} className={styles.skeleton} />
            ))}
          </div>
        ) : articles.length === 0 && !featured ? (
          <div className={styles.empty}>
            <p>今日文章尚未生成，請稍後再訪 🕙</p>
          </div>
        ) : (
          <>
            {/* Featured */}
            {featured && (
              <section className={styles.featuredSection}>
                <SectionLabel label={featuredLabel.label} en={featuredLabel.en} hot={featuredLabel.hot} />
                <ArticleCard article={featured} featured />
              </section>
            )}

            {/* Grid */}
            {articles.length > 0 && (
              <section className={styles.gridSection}>
                <SectionLabel label="最新文章" en="LATEST" />
                <div className={styles.grid}>
                  {articles.map((a, i) => (
                    <div
                      key={a.id}
                      className={styles.gridItem}
                      style={{ animationDelay: `${i * 0.06}s` }}
                    >
                      <ArticleCard article={a} />
                    </div>
                  ))}
                </div>
              </section>
            )}
          </>
        )}

        <SubscribeBar />
      </div>
    </main>
  );
}

function SectionLabel({ label, en, hot = false }) {
  return (
    <div className={styles.sectionLabel}>
      <span className={styles.sectionEn}>{en}</span>
      <h2 className={styles.sectionTitle}>
        {label}
        {hot && <span className={styles.hotBadge}>🔥 熱門</span>}
      </h2>
    </div>
  );
}
