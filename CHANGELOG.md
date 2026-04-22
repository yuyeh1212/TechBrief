# TechBrief CHANGELOG

---

## 初版（2026-03 上線）

### 後端

- RSS 來源設定（The Verge、Wired、Ars Technica、The Guardian、自由時報等）
- YouTube 整合：youtube_service.py，泛科學院 + 三師爸各抓 2 部/天，非 AI/科技內容自動排除，新增 youtube_processed 表
- Gemini Flash 卡片摘要：文章生成時同步產生 card_summary，補跑現有 130 篇
- 新聞股票提示：Gemini Pro 生成文章時輸出 related_stocks，存入 DB
- 財經 RSS 新增：分類 finance，每日 10 篇

### 前端

- 前端分頁：取代「載入更多」→ 頁碼，9 張/頁
- 卡片統一大小：統一有圖、統一高度
- 搜尋功能：Navbar 搜尋列 + 後端 /api/articles/search 端點
- Pricing 頁面：深色霓虹風格，四方案展示
- 財經專頁：Navbar 財經下拉選單、財經新聞卡片頁、財報與股票監控分頁（遮罩）
- 隱私政策更新：新聞來源清單、YouTube 頻道說明

---

## v2.0 — 2026-04-15

### 功能新增

- Google OAuth 登入整合（Google Identity Services）
- JWT 驗證機制（python-jose，7 天有效）
- 會員專區（AccountPage）：顯示用戶資料、目前方案、功能列表
- AI 頁面：Tab 導覽（全部 / GPT / Gemini / Claude），useSearchParams 切換
- ECPay 金流整合（測試環境，商店 2000132）：
  - Order 訂單模型（PENDING / PAID / FAILED / CANCELLED）
  - POST /api/payment/create-order
  - POST /api/payment/notify（伺服器 callback，驗證 CheckMacValue）
  - POST /api/payment/return（瀏覽器 redirect，導向前端結果頁）
  - GET /api/payment/order/{trade_no}（前端輪詢訂單狀態）
- PaymentResult 付款結果頁：輪詢訂單狀態，顯示成功 / 失敗 / 確認中

### 方案功能鎖定

- 財經新聞：卡片免費可見，內文需要 Pro
- 財經股票監控分頁：Pro 遮罩（待修正為 Max）
- 文章股票提示：Pro 用戶顯示真實代號，非 Pro 顯示模糊遮罩
- Email 電子報訂閱：需要 Mini 以上方案

### UI / UX 改善

- Navbar 純中文標籤（首頁 / 人工智慧 / 工具整合 / 科技資訊 / 財經）
- Navbar 用戶下拉選單（頭像 + 藍色箭頭）
- RWD 修正：平板 / 手機 Navbar 完整顯示用戶區塊
- 所有頁面標題統一為 TechBrief | 頁面名稱
- 財經分頁 Tab Bug 修正（點回財經新聞 URL 無 param 時正確重置）
- 連動產出 → 工具整合（全站更名）

### Bug 修正

- Google Sign-In 按鈕登入後未消失（改用 CSS display 控制而非條件渲染）
- ECPay callback URL 誤指向前端 nginx（改為後端網域 api-techbrief.zeabur.app）
- Payment API 使用同步 SQLAlchemy 語法導致 500 錯誤（全部改為 async AsyncSession + select）

---

## v2.1 — 2026-04-21

### 功能新增

- 付款後自動刷新用戶資料（PaymentResult 輪詢完成後呼叫 refreshUser，不需重新登入）
- Google 登入按鈕改為自訂深色霓虹樣式（overlay 疊層方案，解決 FedCM 停用問題）
- 手機版 Google 登入按鈕修正（選單條件渲染導致 renderButton 失效，改以 useEffect 補渲染）
- 測試帳號白名單機制（ADMIN_EMAILS 環境變數，逗號分隔，固定回傳 Max 方案）
- Google Analytics 4 串接（測量 ID：G-70F23R64M0，RouteTracker 自動追蹤頁面切換）
- 友站推薦右側抽屜（固定在畫面右側，點標籤滑出，收錄 6 個友站）
- 財經新聞配額調整：科技 10 篇 + 財經 5 篇分開生成，各自固定配額，每日共 15 篇
- 訂閱到期日系統：付款成功寫入 plan_expires_at（30 天後）、AccountPage 顯示到期日與警告
- 到期前 3 天自動發送提醒 Email（每日 09:00 排程），到期後自動降回 Free 方案

### 方案調整

- Pro 方案新增：AI 個股簡評（Coming Soon）、每週精選看好標的
- Max 方案精簡：僅保留股票掃描模擬器（自訂篩選條件，未來支援台股）
- 財經頁 Tab 調整：財經新聞 → 財報 → 個股簡評 → 股票監控（Max）
- Navbar 財經下拉選單新增個股簡評項目

### Bug 修正

- 排程器 flush 失敗改為單篇跳過，不影響其他文章（修正原本一篇壞掉全部 rollback）
- AI 非科技內容（動物、體育等）自動跳過，不再插入 DB（新增 skip 機制與 category 合法性驗證）
- OpenRouter API 逾時改為 90 秒，加最多 2 次重試
- RSS 來源：MoneyDJ SSL 憑證問題以 verify=False 繞過，Reuters 已失效移除改用 Investing.com
- scheduler.py 補上 timedelta import
- 到期提醒改用日期比較（忽略時間精度），避免秒差造成漏發

---

## v2.2 — 2026-04-21

### 功能新增

- 登出後重新登入無需刷新頁面（Navbar 監聽 user 變 null 時補 renderButton，桌面版與手機版皆修正）
- 文章內股票代號可點擊（Pro 用戶股票標籤改為 Link，導向 /finance?tab=analysis&ticker=代號；FinancePage 個股簡評 tab 讀取 ticker 並自動帶入分析）
- AI 個股簡評正式上線（GET /api/analysis/stock，Gemini Flash Lite 模型，搜尋近 30 天 DB 相關文章作為上下文；無資料時以訓練知識生成並附免責說明）
- 管理員後台（/admin 頁面，JWT + ADMIN_EMAILS 白名單驗證）：
  - 統計總覽：總用戶、付費用戶、文章數、今日新增、方案分佈
  - 用戶管理：列表、方案篩選、直接修改用戶方案
  - 文章管理：列表、分類篩選、刪除文章
  - 手動觸發：新聞任務、到期檢查任務
  - auth 回應新增 is_admin 欄位，Navbar 用戶下拉選單顯示金色「管理後台」入口（限 admin 可見）

---

## v2.3 — 2026-04-22

### 功能新增

- 換頁統一滾回頂部（ScrollToTop 全域元件，監聽 pathname 變化）
- 友站抽屜改為膠囊形狀（縮小佔位、保持右側固定位置）
- 文章頁預估閱讀時間（字數 ÷ 400 字/分鐘，顯示於 meta 列）
- 個股簡評歷史查詢記錄（localStorage 最近 5 筆，可點擊重查、一鍵清除）
- 右下角回頂按鈕（滾動超過 400px 才出現，平滑回頂）
- 首頁今日精選置頂：新增 `GET /articles/today-hot` 端點（台灣時間 UTC+8），當日 view_count 最高文章自動置頂並顯示「今日精選 🔥」標籤，無瀏覽量時退回最新文章邏輯
- 財經新聞情緒標籤：DB 新增 `sentiment` 欄，AI 生成財經文章時自動輸出利多／中立／利空判斷，ArticleCard 顯示對應顏色標籤；補跑現有 26 篇舊文章

---

---

## v2.4 — 進行中

### 已完成

- 每週精選看好標的（Pro 限定）：新增 `WeeklyReport` 資料表，每週一 09:30 排程彙整本週 `sentiment=positive` 財經文章，Gemini Flash Lite 生成市場概況 + 最多 5 檔精選標的；FinancePage 新增「每週精選」tab，卡片式呈現各標的；完成後自動 Email 通知所有 Pro/Max 用戶

---

## 待更新（正式上線前）

- [ ] Free 用戶累積閱讀 5 篇後，文章頁底部出現低調升級橫幅（localStorage 計數，非強制遮罩）
- [ ] 深色/淺色模式切換（工程量較大，保留評估）
- [ ] Mini 電子報樣式優化（需先規劃個人化方向）
- [ ] ECPay 綠界金流切換正式環境（商店代號與 API URL 更換）
- [ ] Resend 網域驗證（讓到期提醒信可寄給所有用戶，非僅自己信箱）
- [ ] 股票掃描模擬器（Max 方案，台股自訂篩選條件）
