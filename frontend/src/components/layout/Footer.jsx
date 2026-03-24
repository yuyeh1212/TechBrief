import { Link } from "react-router-dom";
import styles from "./Footer.module.scss";

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
            <Link to="/collaboration">連動產出 (Collaboration)</Link>
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
            <Link to="/privacy">隱私政策</Link>
          </div>
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
