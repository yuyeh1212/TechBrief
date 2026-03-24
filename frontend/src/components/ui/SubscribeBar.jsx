import { useState } from "react";
import { subscribe } from "@/api";
import styles from "./SubscribeBar.module.scss";

export default function SubscribeBar() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState("idle"); // idle | loading | success | error
  const [message, setMessage] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email) return;
    setStatus("loading");
    try {
      const res = await subscribe(email);
      setStatus("success");
      setMessage(res.message || "訂閱成功！");
      setEmail("");
    } catch (err) {
      setStatus("error");
      setMessage(err.response?.data?.detail || "訂閱失敗，請稍後再試");
    }
  };

  return (
    <section className={styles.section}>
      <div className={styles.glow} />
      <div className={styles.content}>
        <div className={styles.text}>
          <span className={styles.label}>NEWSLETTER</span>
          <h2 className={styles.title}>訂閱每日科技快訊</h2>
          <p className={styles.desc}>
            每天早上 10 點，精選 10 篇 AI 與科技新聞直送信箱
          </p>
        </div>

        {status === "success" ? (
          <div className={styles.successMsg}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="12" r="10" stroke="#00d4ff" strokeWidth="1.5"/>
              <path d="M8 12l3 3 5-5" stroke="#00d4ff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            {message}
          </div>
        ) : (
          <form onSubmit={handleSubmit} className={styles.form}>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="your@email.com"
              className={styles.input}
              required
              disabled={status === "loading"}
            />
            <button
              type="submit"
              className={styles.btn}
              disabled={status === "loading"}
            >
              {status === "loading" ? "訂閱中…" : "立即訂閱"}
            </button>
          </form>
        )}

        {status === "error" && (
          <p className={styles.errorMsg}>{message}</p>
        )}
      </div>
    </section>
  );
}
