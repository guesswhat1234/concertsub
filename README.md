# 韓→中 即時字幕（OpenAI Realtime + Next.js + Vercel）

可直接部署到 Vercel。架構：
- 前端（Next.js App Router）在瀏覽器用 WebRTC 直接連線 **OpenAI Realtime**，串流麥克風音訊。
- 後端 `/api/ephemeral` 產生 **ephemeral client_secret** 給瀏覽器使用（避免把真實 API Key 暴露到前端）。

## 一鍵部署步驟

1. **建立 GitHub Repo**
   - 把本專案上傳到 GitHub（或直接上傳 zip）。

2. **Vercel 連動部署**
   - 在 Vercel 新建 Project，連接到你的 GitHub repo。
   - 於專案環境變數設定：
     - `OPENAI_API_KEY` = 你的 OpenAI API key（Server 端使用）。

3. **本機開發**
   ```bash
   npm i
   npm run dev
   # 打開 http://localhost:3000
   ```

4. **使用方式**
   - 網頁開啟後按 **開始**，允許麥克風。
   - 瀏覽器會呼叫 `/api/ephemeral` 取得短期憑證，並與 OpenAI Realtime 透過 **WebRTC** 建立連線。
   - 你會看到即時逐字（白色）與上一句（灰色）字幕。

## 注意事項

- Realtime 連線是直接對 OpenAI，延遲通常低於一般 REST 轉寫+翻譯串接。
- 若演唱會環境噪音大，建議使用指向性麥克風或接音控台 Line-Out 到手機/電腦。
- 驗證與安全：請 **不要** 把 `OPENAI_API_KEY` 放到前端。ephemeral token 會自動過期。

## 參考
- OpenAI Realtime 指南 / WebRTC（見官方文件）
- Vercel 支援 WebSocket 與長連線（若改為自建代理時可用）
