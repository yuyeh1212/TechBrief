import { Link } from "react-router-dom";
import styles from "./Footer.module.scss";

const FRIEND_LINKS = [
  {
    name: "學不完 教不停 用不盡",
    desc: "深入淺出的教學與生活應用分享",
    url: "https://vocus.cc/user/@isvincent",
    icon: "✍️",
    tag: "部落格",
  },
  {
    name: "三師爸 Sense Bar",
    desc: "科技與生活的實用影音頻道",
    url: "https://www.youtube.com/@sensebar",
    icon: "▶️",
    tag: "YouTube",
  },
  {
    name: "泛科學院",
    desc: "用科學角度解析世界的 YouTube 頻道",
    url: "https://www.youtube.com/@panscischool",
    icon: "🔬",
    tag: "YouTube",
  },
  {
    name: "TechOrange 科技報橘",
    desc: "台灣科技新創與數位趨勢媒體",
    url: "https://buzzorange.com/techorange/",
    icon: "🍊",
    tag: "科技媒體",
  },
  {
    name: "科技新報",
    desc: "深度科技產業分析與新聞報導",
    url: "https://technews.tw/",
    icon: "📡",
    tag: "科技媒體",
  },
  {
    name: "Mr. Market 市場先生",
    desc: "淺顯易懂的投資理財知識平台",
    url: "https://rich01.com/",
    icon: "📈",
    tag: "財經",
  },
];

export default function Footer() {
  return (
    <footer className={styles.footer}>
      <div className={styles.inner}>
        <div className={styles.brand}>
          <div className={styles.logo}>
            Tech<span>Brief</span>
          </div>
          <p className={styles.tagline}>即時掌握 AI 與科技趨勢的自動化資訊平台</p>
          <p className={styles.sub}>by TechBrief Labs</p>
        </div>

        <div className={styles.links}>
          <div className={styles.linkGroup}>
            <span className={styles.groupTitle}>頁面</span>
            <Link to="/">首頁 (HOME)</Link>
            <Link to="/ai">人工智慧 (AI)</Link>
            <Link to="/collaboration">工具整合 (Collaboration)</Link>
            <Link to="/tech">科技資訊 (TECH NEWS)</Link>
          </div>

          <div className={styles.linkGroup}>
            <span className={styles.groupTitle}>AI 專區</span>
            <Link to="/ai/gpt">GPT</Link>
            <Link to="/ai/gemini">Gemini</Link>
            <Link to="/ai/claude">Claude</Link>
          </div>

          <div className={styles.linkGroup}>
            <span className={styles.groupTitle}>關於</span>
            <Link to="/pricing">訂閱方案</Link>
            <Link to="/privacy">隱私政策</Link>
          </div>
        </div>
      </div>

      {/* 友站連結 */}
      <div className={styles.friendSection}>
        <p className={styles.friendTitle}>友站推薦</p>
        <div className={styles.friendGrid}>
          {FRIEND_LINKS.map((site) => (
            <a
              key={site.name}
              href={site.url}
              target="_blank"
              rel="noopener noreferrer"
              className={styles.friendCard}
            >
              <span className={styles.friendIcon}>{site.icon}</span>
              <div className={styles.friendInfo}>
                <span className={styles.friendName}>{site.name}</span>
                <span className={styles.friendDesc}>{site.desc}</span>
              </div>
              <span className={styles.friendTag}>{site.tag}</span>
            </a>
          ))}
        </div>
      </div>

      <div className={styles.bottom}>
        <span>© {new Date().getFullYear()} TechBrief Labs. All rights reserved.</span>
        <span className={styles.powered}>
          Powered by <span className={styles.highlight}>Gemini 2.5 Pro</span>
        </span>
      </div>
    </footer>
  );
}
