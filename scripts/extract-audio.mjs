// scripts/extract-audio.mjs
// 從 v2 HTML 解出內嵌 base64 語音為 audio/n|s/NNNN.mp3(一次性工具,可重跑)
import fs from "fs";
import path from "path";
import readline from "readline";

const HTML_PATH = "./越語核心989中文版v2.html";
const OUT_ROOT = "./audio";

function parseAudioLine(line, varName) {
  const prefix = `const ${varName} = `;
  if (!line.startsWith(prefix)) return null;
  let body = line.slice(prefix.length).trim();
  if (body.endsWith(";")) body = body.slice(0, -1);
  return JSON.parse(body); // 純字串陣列,JSON.parse 可解
}

async function main() {
  const arrays = {}; // { N: [...], S: [...] }
  const rl = readline.createInterface({
    input: fs.createReadStream(HTML_PATH, "utf8"),
    crlfDelay: Infinity
  });
  for await (const line of rl) {
    for (const v of ["AUD_N", "AUD_S"]) {
      const arr = parseAudioLine(line, v);
      if (arr) arrays[v === "AUD_N" ? "N" : "S"] = arr;
    }
    if (arrays.N && arrays.S) break;
  }
  rl.close();

  if (!arrays.N || !arrays.S) {
    console.error("找不到 AUD_N / AUD_S 行,中止。", { N: !!arrays.N, S: !!arrays.S });
    process.exit(1);
  }

  const summary = {};
  for (const [accent, list] of Object.entries(arrays)) {
    const dir = path.join(OUT_ROOT, accent.toLowerCase());
    fs.mkdirSync(dir, { recursive: true });
    let written = 0;
    const missing = [];
    list.forEach((b64, idx) => {
      if (!b64) { missing.push(idx); return; }
      const file = path.join(dir, `${String(idx).padStart(4, "0")}.mp3`);
      fs.writeFileSync(file, Buffer.from(b64, "base64"));
      written++;
    });
    summary[accent] = { total: list.length, written, missing };
  }
  console.log(JSON.stringify(summary, null, 2));
}

main().catch(err => { console.error(err); process.exit(1); });
