import { useState, useEffect, useRef } from "react";
import styles from "./FriendDrawer.module.scss";

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

export default function FriendDrawer() {
  const [open, setOpen] = useState(false);
  const sentinelRef = useRef(null);

  // 偵測 footer 是否進入視窗，自動開關抽屜
  useEffect(() => {
    const footer = document.querySelector("footer");
    if (!footer) return;

    const observer = new IntersectionObserver(
      ([entry]) => setOpen(entry.isIntersecting),
      { threshold: 0.05 }
    );
    observer.observe(footer);
    return () => observer.disconnect();
  }, []);

  return (
    <div className={`${styles.drawer} ${open ? styles.open : ""}`}>
      {/* 突出的標籤按鈕（左側垂直） */}
      <button
        className={styles.tab}
        onClick={() => setOpen((o) => !o)}
        aria-label="友站推薦"
      >
        <svg
          width="13"
          height="13"
          viewBox="0 0 24 24"
          fill="none"
          className={`${styles.tabChevron} ${open ? styles.rotated : ""}`}
        >
          <path
            d="M15 18l-6-6 6-6"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
        <span>友站推薦</span>
      </button>

      {/* 抽屜內容 */}
      <div className={styles.content}>
        <p className={styles.contentTitle}>友站推薦</p>
        <div className={styles.grid}>
          {FRIEND_LINKS.map((site) => (
            <a
              key={site.name}
              href={site.url}
              target="_blank"
              rel="noopener noreferrer"
              className={styles.card}
            >
              <span className={styles.icon}>{site.icon}</span>
              <div className={styles.info}>
                <span className={styles.name}>{site.name}</span>
                <span className={styles.desc}>{site.desc}</span>
              </div>
              <span className={styles.tag}>{site.tag}</span>
            </a>
          ))}
        </div>
      </div>
    </div>
  );
}
