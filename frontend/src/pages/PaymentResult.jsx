import { useEffect, useState, useRef } from "react";
import { Helmet } from "react-helmet-async";
import { Link, useSearchParams } from "react-router-dom";
import { getOrderStatus } from "@/api";
import styles from "./PaymentResult.module.scss";

const MAX_POLLS = 10;
const POLL_INTERVAL_MS = 2000;

export default function PaymentResult() {
  const [searchParams] = useSearchParams();
  const [status, setStatus] = useState("loading"); // loading | paid | failed | unknown
  const [orderInfo, setOrderInfo] = useState(null);
  const pollCount = useRef(0);

  // 優先從 URL 參數取 trade_no（ECPay /return 重導向帶入）
  // 備用從 localStorage 讀（ClientBackURL 沒帶參數時）
  const tradeNo =
    searchParams.get("trade_no") ||
    localStorage.getItem("tb_pending_trade");
  const successParam = searchParams.get("success"); // "1" or "0" from /return

  useEffect(() => {
    if (!tradeNo) {
      setStatus("unknown");
      return;
    }

    // 若 ECPay 已告知成功/失敗，先根據此設定初始狀態
    if (successParam === "0") {
      setStatus("failed");
    }

    const poll = async () => {
      try {
        const order = await getOrderStatus(tradeNo);
        setOrderInfo(order);

        if (order.status === "paid") {
          setStatus("paid");
          localStorage.removeItem("tb_pending_trade");
          return; // stop polling
        }
        if (order.status === "failed" || order.status === "cancelled") {
          setStatus("failed");
          localStorage.removeItem("tb_pending_trade");
          return; // stop polling
        }

        // Still pending — keep polling
        pollCount.current += 1;
        if (pollCount.current < MAX_POLLS) {
          setTimeout(poll, POLL_INTERVAL_MS);
        } else {
          // Timeout: can't confirm result
          setStatus(successParam === "1" ? "paid" : "unknown");
        }
      } catch (err) {
        console.error(err);
        setStatus("unknown");
      }
    };

    poll();
  }, [tradeNo, successParam]);

  const PLAN_LABEL = { mini: "Mini", pro: "Pro", max: "Max" };

  return (
    <>
      <Helmet>
        <title>TechBrief | 付款結果</title>
      </Helmet>

      <main className={styles.page}>
        <div className={styles.card}>
          {status === "loading" && (
            <>
              <div className={styles.spinner} />
              <h1 className={styles.title}>確認付款中...</h1>
              <p className={styles.desc}>請稍候，正在確認您的付款狀態</p>
            </>
          )}

          {status === "paid" && (
            <>
              <div className={`${styles.icon} ${styles.iconSuccess}`}>✓</div>
              <h1 className={styles.title}>付款成功！</h1>
              {orderInfo && (
                <p className={styles.desc}>
                  您已成功訂閱{" "}
                  <strong>TechBrief {PLAN_LABEL[orderInfo.plan] ?? orderInfo.plan}</strong>{" "}
                  方案，方案功能已立即開通。
                </p>
              )}
              <div className={styles.actions}>
                <Link to="/account" className={styles.btnPrimary}>
                  前往會員專區
                </Link>
                <Link to="/" className={styles.btnOutline}>
                  回到首頁
                </Link>
              </div>
            </>
          )}

          {status === "failed" && (
            <>
              <div className={`${styles.icon} ${styles.iconFailed}`}>✕</div>
              <h1 className={styles.title}>付款未完成</h1>
              <p className={styles.desc}>
                您的付款未成功，帳號方案維持不變。如有疑問請聯絡我們。
              </p>
              <div className={styles.actions}>
                <Link to="/pricing" className={styles.btnPrimary}>
                  重新選擇方案
                </Link>
                <Link to="/" className={styles.btnOutline}>
                  回到首頁
                </Link>
              </div>
            </>
          )}

          {status === "unknown" && (
            <>
              <div className={`${styles.icon} ${styles.iconUnknown}`}>?</div>
              <h1 className={styles.title}>付款狀態確認中</h1>
              <p className={styles.desc}>
                我們正在處理您的訂單，通常在幾分鐘內完成。您可至會員專區確認方案狀態，或聯絡我們協助。
              </p>
              <div className={styles.actions}>
                <Link to="/account" className={styles.btnPrimary}>
                  查看會員專區
                </Link>
                <a href="mailto:contact@techbrief.app" className={styles.btnOutline}>
                  聯絡客服
                </a>
              </div>
            </>
          )}
        </div>
      </main>
    </>
  );
}
