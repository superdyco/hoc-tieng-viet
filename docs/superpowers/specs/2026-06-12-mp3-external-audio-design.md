# 越語核心989:語音由內嵌 blob 改為外部 mp3 檔

日期:2026-06-12

## 背景

`越語核心989中文版v2.html`(17MB)在第 209/210 行內嵌了 `AUD_N`(北音,9MB)與 `AUD_S`(南音,7.6MB)兩個 base64 mp3 陣列,播放時以 `b64toUrl()` 解碼為 Blob objectURL。使用者希望改用預先產生的外部 mp3 檔(參考 `generate-audio.js` 的產檔模式),不再內嵌 base64。

## 決策

- **mp3 來源**:直接從 v2 HTML 內嵌的 base64 解出存檔,不重新呼叫 Google TTS(零費用、保留南北音、聲音與現況一致)。
- **使用情境**:本機 file:// 直接開啟。相對路徑 `<audio>` 在 file:// 下可正常播放,不需 Service Worker。
- **檔名規則**:以 WORDS 陣列索引命名、補零四位(WORDS 無 id 欄位,索引是唯一可靠對應)。
- **版本策略**:產生新檔 `越語核心989中文版v3.html`,v2 保留不動。

## 元件

### 1. `scripts/extract-audio.mjs`(新檔)

- 讀取 v2 HTML,以行為單位找到 `const AUD_N = [` 與 `const AUD_S = [` 兩行,取出陣列字面值後 `JSON.parse`。
- 解碼 base64,寫成 `audio/n/0000.mp3` ~ `audio/n/0988.mp3` 與 `audio/s/` 同樣 989 檔。
- 陣列元素為 null/空字串時跳過並記錄,結束時印出統計(成功/缺漏索引)。
- 一次性工具,保留於 scripts/ 供未來重跑。

### 2. `越語核心989中文版v3.html`(由 v2 複製修改)

- 刪除 `AUD_N`、`AUD_S` 兩行(17MB → 約 0.5MB)。
- `b64toUrl()` 換成路徑函式:`audUrl(idx, accent)` 回傳 `audio/${accent==='N'?'n':'s'}/${String(idx).padStart(4,'0')}.mp3`。
- 移除 `urlCache`、`atob` 解碼、`revokeObjectURL` 等 blob 相關程式碼。
- 缺檔/播放失敗處理:手動點擊播放失敗 → 退回 `say()` 瀏覽器 TTS(與現行 `!b64` fallback 行為一致);自動播放失敗則靜默。
- 學習佇列、測驗、瀏覽等其他邏輯完全不動。

## 驗證

1. script 跑完核對 `audio/n/`、`audio/s/` 各 989 檔。
2. 抽樣檔案開頭為 mp3 magic bytes(`ID3` 或 `0xFFFB`)。
3. 抽一檔與原 base64 解碼結果做 byte 比對,確認無損。
4. 瀏覽器以 file:// 開啟 v3,實測南北音按鈕播放。

## 不在範圍

- 不重新產生語音(不動 Google TTS)。
- 不加 Service Worker / PWA 離線快取。
- 不改 v2 原檔。
