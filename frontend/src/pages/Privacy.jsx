import { Helmet } from "react-helmet-async";
import styles from "./Privacy.module.scss";

export default function Privacy() {
  return (
    <main className={styles.main}>
      <Helmet>
        <title>TechBrief | 隱私政策</title>
      </Helmet>
      <div className={styles.container}>
        <header className={styles.header}>
          <span className={styles.label}>PRIVACY POLICY</span>
          <h1 className={styles.title}>隱私政策</h1>
          <p className={styles.subtitle}>科技快訊 TechBrief | TechBrief Labs</p>
        </header>

        <div className={styles.content}>
          <section>
            <p>歡迎造訪 <strong>科技快訊 TechBrief</strong>（以下簡稱「本站」）。本站由 TechBrief Labs（以下簡稱「我們」）營運。我們非常重視您的隱私權，並承諾保護您的個人資料。本政策最後更新日期：2026 年 4 月 9 日。</p>
          </section>

          <section>
            <h2>1. 資訊來源與內容聲明</h2>
            <p>本站為自動化技術驅動之新聞彙整平台，旨在為讀者提供及時的科技資訊。</p>
            <p><strong>內容來源：</strong>本站內容自動彙整自公開新聞來源，包括但不限於：自由時報、科技新報、科技報橘、iThome、動腦新聞、TechCrunch、The Verge、VentureBeat、MIT Technology Review、Wired、The Guardian、OpenAI Blog、Google AI Blog、Anthropic Blog、經濟日報、工商時報、Yahoo Finance 等平台。</p>
            <p><strong>版權歸屬：</strong>所有彙整新聞之版權均歸原媒體機構或原作者所有。本站僅提供標題、摘要或連結跳轉，並盡可能標註來源出處。</p>
          </section>

          <section>
            <h2>2. 資訊蒐集與使用</h2>
            <p>當您瀏覽本站時，我們可能會透過以下方式收集資訊：</p>
            <p><strong>Log Files：</strong>包含您的 IP 位址、瀏覽器類型、造訪時間及點擊路徑。這些資訊僅用於分析網站流量與優化使用者體驗。</p>
            <p><strong>Cookies：</strong>我們會使用 Cookie 來儲存您的個人偏好設定，以提供更個人化的瀏覽體驗。您可以透過瀏覽器設定拒絕 Cookie，但這可能導致網站部分功能無法正常運作。</p>
          </section>

          <section>
            <h2>3. 電子報訂閱</h2>
            <p>當您訂閱本站電子報（Mini 方案及以上）時，我們將收集您的 <strong>電子郵件地址</strong>，用途如下：</p>
            <p><strong>每日更新通知：</strong>定期發送科技 & AI 新聞摘要至您的信箱。</p>
            <p><strong>服務通知：</strong>發送與您訂閱方案相關的重要通知，例如方案異動或系統維護。</p>
            <p>您的電子郵件地址不會提供予任何第三方作為行銷用途。您可隨時透過電子報底部的「取消訂閱」連結停止接收，或造訪 <strong>/unsubscribe</strong> 頁面操作。</p>
          </section>

          <section>
            <h2>4. 付款資料處理</h2>
            <p>本站訂閱付款由 <strong>綠界科技（ECPay）</strong> 提供金流服務，支援信用卡（Visa、Mastercard、JCB）付款。</p>
            <p><strong>TechBrief Labs 本身不儲存任何信用卡號碼或金融帳戶資訊。</strong>所有付款資料由綠界科技依其隱私政策及 PCI-DSS 安全標準處理與保管。</p>
            <p>如對付款安全有疑慮，請參閱綠界科技隱私政策：<a href="https://www.ecpay.com.tw/Service/privacy_policy" target="_blank" rel="noopener noreferrer">ecpay.com.tw</a></p>
          </section>

          <section>
            <h2>5. 第三方連結</h2>
            <p>本站包含導向外部媒體網站的連結。一旦您點擊並離開本站，我們無法控制該外部網站的隱私做法或內容。建議您在提供任何個人資料前，先閱讀該網站的隱私權政策。</p>
          </section>

          <section>
            <h2>6. 資料保護與安全</h2>
            <p>TechBrief Labs 採取合理的技術與組織措施，防止您的資訊遭受未經授權的存取、修改或洩露。您的個人資料僅在提供服務所必要的範圍內使用，不會與無關第三方共享。</p>
          </section>

          <section>
            <h2>7. 政策修訂</h2>
            <p>我們保留隨時修改本隱私政策的權利。任何修訂將即時公布於此頁面，並更新頁首的修訂日期，不另行個別通知。</p>
          </section>

          <section>
            <h2>聯絡我們</h2>
            <p>若您對本隱私政策有任何疑問、或希望行使個人資料相關權利（查詢、更正、刪除），請透過以下方式聯繫：</p>
            <p><strong>Email：</strong><a href="mailto:contact@techbrief.app">contact@techbrief.app</a></p>
          </section>
        </div>
      </div>
    </main>
  );
}
