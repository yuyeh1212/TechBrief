import { useState, useEffect } from "react";
import { Helmet } from "react-helmet-async";
import { getLatestArticles, getArticles } from "@/api";
import ArticleCard from "@/components/ui/ArticleCard";
import SubscribeBar from "@/components/ui/SubscribeBar";
import styles from "./Home.module.scss";

export default function Home() {
  const [featured, setFeatured] = useState(null);
  const [articles, setArticles] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const latest = await getLatestArticles(10);
        if (latest.length > 0) {
          setFeatured(latest[0]);
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
                <SectionLabel label="今日頭條" en="TOP STORY" />
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

function SectionLabel({ label, en }) {
  return (
    <div className={styles.sectionLabel}>
      <span className={styles.sectionEn}>{en}</span>
      <h2 className={styles.sectionTitle}>{label}</h2>
    </div>
  );
}
