import styles from "./Privacy.module.scss";

export default function Privacy() {
  return (
    <main className={styles.main}>
      <div className={styles.container}>
        <header className={styles.header}>
          <span className={styles.label}>PRIVACY POLICY</span>
          <h1 className={styles.title}>隱私政策</h1>
          <p className={styles.subtitle}>科技快訊 TechBrief | TechBrief Labs</p>
        </header>

        <div className={styles.content}>
          <section>
            <p>歡迎造訪 <strong>科技快訊 TechBrief</strong>（以下簡稱「本站」）。本站由 TechBrief Labs（以下簡稱「我們」）營運。我們非常重視您的隱私權，並承諾保護您的個人資料。</p>
          </section>

          <section>
            <h2>1. 資訊來源與內容聲明</h2>
            <p>本站為自動化技術驅動之新聞彙整平台，旨在為讀者提供及時的科技資訊。</p>
            <p><strong>內容來源：</strong>本站內容自動彙整自公開新聞來源，包括但不限於：自由時報、數位時代、商業週刊、學不完．教不停．用不盡、科技新報、科技報橘、AI郵報、新聞雲、iThome、電腦王阿達等平台。</p>
            <p><strong>版權歸屬：</strong>所有彙整新聞之版權均歸原媒體機構或原作者所有。本站僅提供標題、摘要或連結跳轉，並盡可能標註來源出處。</p>
          </section>

          <section>
            <h2>2. 資訊蒐集與使用</h2>
            <p>當您瀏覽本站時，我們可能會透過以下方式收集資訊：</p>
            <p><strong>Log Files：</strong>包含您的 IP 位址、瀏覽器類型、造訪時間及點擊路徑。這些資訊僅用於分析網站流量與優化使用者體驗。</p>
            <p><strong>Cookies：</strong>我們會使用 Cookie 來儲存您的個人偏好設定，以提供更個人化的瀏覽體驗。您可以透過瀏覽器設定拒絕 Cookie，但這可能導致網站部分功能無法正常運作。</p>
          </section>

          <section>
            <h2>3. 第三方連結</h2>
            <p>本站包含導向外部媒體網站的連結。一旦您點擊並離開本站，我們無法控制該外部網站的隱私做法或內容。建議您在提供任何個人資料前，先閱讀該網站的隱私權政策。</p>
          </section>

          <section>
            <h2>4. 資料保護與安全</h2>
            <p>TechBrief Labs 採取合理的技術與組織措施，防止您的資訊遭受未經授權的存取、修改或洩露。</p>
          </section>

          <section>
            <h2>5. 政策修訂</h2>
            <p>我們保留隨時修改本隱私政策的權利。任何修訂將即時公布於此頁面，不另行個別通知。</p>
          </section>

          <section>
            <h2>聯絡我們</h2>
            <p>若您對本隱私政策有任何疑問，或發現內容引用有誤，請透過官方管道與 TechBrief Labs 聯繫。</p>
          </section>
        </div>
      </div>
    </main>
  );
}
