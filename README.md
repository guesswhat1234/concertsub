# 韓→中 即時字幕（OpenAI Realtime + Next.js + Vercel） v4

這是最新穩定版：Next 14 / React 18、**不含 vercel.json**（避免舊 Runtime 錯誤），API route 強制 Node.js runtime。

## 部署
1. 把此資料夾內所有檔案上傳到 GitHub repo 的根目錄（根目錄要直接看到 `package.json` 與 `app/`）。
2. Vercel 新建 Project → Root Directory 指向含 `package.json` 的那層（通常是 `/`）。
3. 在 Project → Settings → Environment Variables 新增：`OPENAI_API_KEY`。
4. Deploy 完成後：
   - 開 `https://你的域名/api/health` 應得 `ok`
   - 開 `https://你的域名/api/ephemeral` 應回 200 JSON（含 `client_secret`）
   - 首頁按「開始」授權麥克風即可使用。

## 備註
- 本專案在瀏覽器以 **WebRTC** 直接串 OpenAI Realtime（低延遲）。
- `app/api/ephemeral/route.ts` 僅建立短效 `client_secret`，避免暴露你的真實 API Key。
- 若要簡中字幕，把 instructions 中的 `zh-TW` 改為 `zh-CN`。

