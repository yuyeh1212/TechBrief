# TechBrief 科技快訊

自動化 AI 科技新聞平台，每天早上 10 點從 RSS 抓取最新新聞，透過 Gemini 2.5 Pro 生成文章。

## 專案結構

```
techbrief/
├── frontend/   # React + Vite
└── backend/    # Python + FastAPI
```

---

## Zeabur 部署步驟

### 1. Push 到 GitHub

```bash
git init
git add .
git commit -m "init: TechBrief"
git remote add origin https://github.com/yourname/techbrief.git
git push -u origin main
```

### 2. 建立 Zeabur 專案

1. 登入 [zeabur.com](https://zeabur.com)
2. 新建 Project
3. 加入服務 → **Deploy from GitHub**，選 `techbrief` repo

### 3. 建立兩個 Service

Zeabur 支援 monorepo，分別部署：

**後端 (backend)**
- 選 `backend/` 子目錄
- Zeabur 自動辨識 Python，會用 `zbpack.toml` 啟動

**前端 (frontend)**
- 選 `frontend/` 子目錄
- Zeabur 自動辨識 Vite，用 `zbpack.toml` build + serve

### 4. 建立 PostgreSQL

- Zeabur Dashboard → Add Service → **PostgreSQL**
- 建立完後，複製 Connection String

### 5. 設定後端環境變數

在後端 Service 的 Variables 頁面設定：

| 變數名 | 說明 |
|--------|------|
| `DATABASE_URL` | PostgreSQL connection string |
| `OPENROUTER_API_KEY` | OpenRouter API Key |
| `RESEND_API_KEY` | Resend API Key |
| `RESEND_FROM_EMAIL` | 寄件人 Email（需先在 Resend 驗證網域）|
| `LINE_CHANNEL_ACCESS_TOKEN` | LINE Channel Access Token |
| `LINE_CHANNEL_SECRET` | LINE Channel Secret |
| `CORS_ORIGINS` | `["https://你的前端網址"]` |
| `DEBUG` | `false` |

### 6. 設定前端環境變數

| 變數名 | 說明 |
|--------|------|
| `VITE_API_URL` | 後端 API 網址，例如 `https://techbrief-api.zeabur.app` |

### 7. 設定 LINE Webhook

1. 後端部署完成後，取得後端網址
2. 至 LINE Developers → Messaging API → Webhook URL 填入：
   ```
   https://你的後端網址/api/line/webhook
   ```
3. 開啟 Webhook → **驗證**

### 8. 手動觸發第一次新聞抓取（測試用）

```bash
curl -X POST https://你的後端網址/api/admin/trigger-news \
  -H "X-Admin-Token: 你的OPENROUTER_API_KEY前16碼"
```

---

## 本地開發

```bash
# 後端
cd backend
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
cp .env.example .env   # 填入環境變數
uvicorn app.main:app --reload --port 8080

# 前端
cd frontend
npm install
cp .env.example .env   # 填 VITE_API_URL=http://localhost:8080
npm run dev
```

---

## 資料流

```
RSS Feeds (10個來源)
    ↓ 每天 10:00 (Asia/Taipei)
抓取 24 小時內新聞
    ↓
OpenRouter Gemini 2.5 Pro
    ↓ 生成 10 篇文章
PostgreSQL 存儲
    ↓
Resend 發送電子報給訂閱者

LINE 官方帳號 (被動回覆)
  用戶輸入「今日快報」
    ↓
Webhook → 查 DB → 回覆 Flex Message
```
