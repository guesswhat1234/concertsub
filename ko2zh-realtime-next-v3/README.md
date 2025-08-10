# 韓→中 即時字幕（OpenAI Realtime + Next.js + Vercel）

這版已固定 **Next 14 + React 18**，確保 Vercel 能偵測到 Next.js。

## 部署
1. 上傳到 GitHub。
2. 在 Vercel 新建 Project，**Root Directory** 指向 repo 根目錄（或此專案所在資料夾）。
3. 設定環境變數：`OPENAI_API_KEY`。
4. Deploy 後開啟網站 → 按「開始」。

## 常見問題
- **No Next.js version detected**：通常是 Root Directory 沒指到含 `package.json` 的資料夾，或 `package.json` 裡沒有 `next`。本專案的 `package.json` 已含 `"next": "14.2.10"`。
- **404**：測試 `https://你的域名/api/ephemeral` 應該回 200 JSON；若 404 請確認路徑與 Root Directory。
