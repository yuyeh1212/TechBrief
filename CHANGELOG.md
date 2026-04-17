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

## 待執行（v2.1 預定）

- [ ] 付款後自動刷新用戶資料（不需重新登入）
- [ ] Google 登入按鈕改為自訂樣式（符合深色霓虹風格，解決 RWD 擠壓問題）
- [ ] 股票監控遮罩改為 Max 才解鎖
- [ ] 測試帳號白名單機制（固定 Max 方案）
- [ ] 財經新聞更新頻率調整
- [ ] Google Analytics 串接
- [ ] 推薦網站 / 友站連結區塊
- [ ] 訂閱到期日 + 到期前三天 Email 提醒
- [ ] Pro / Max 功能重整定價
- [ ] 股票掃描模擬器（Max）
- [ ] 管理員後台
