import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { loadDataset } from "../core/data";
import { type ImageExpect, gradeImage, IMAGE_TARGET, summarizeImages } from "../evals/grade-images";
import { findCandidates } from "../server/ai/retrieval";
import { createClaudeVision, VISION_PROMPT_VERSION } from "../server/ai/vision";
import { readEnv } from "../server/env";

// 사진 읽기 evals(V2-7): npm run evals:images. 실시간 Claude(비용 발생, 11장). 결과는 evals/results/
if (existsSync(".env.local")) process.loadEnvFile(".env.local");

async function main() {
  const env = readEnv();
  if (!env.anthropicApiKey) throw new Error("ANTHROPIC_API_KEY가 없어 evals를 돌릴 수 없습니다(.env.local)");
  const vision = createClaudeVision(env);
  const candidates = findCandidates("", loadDataset().items);
  const set = JSON.parse(readFileSync("evals/image-cases.json", "utf8")) as { version: string; cases: ImageExpect[] };
  const rows = [];
  for (const c of set.cases) {
    const t = Date.now();
    let got;
    try {
      got = await vision.read({ media_type: "image/png", data: readFileSync(`evals/images/${c.file}`).toString("base64") }, candidates);
    } catch (e) {
      got = { error: e instanceof Error ? e.message : String(e) };
    }
    const g = gradeImage(c, got);
    const ok = g.receiptOk && g.matched === g.expected && g.fabricated === 0;
    rows.push({ id: c.id, file: c.file, ms: Date.now() - t, ...g, got });
    console.log(`${ok ? "✓" : "✗"} ${c.id} ${c.file} 상추 ${g.matched}/${g.expected}${g.notes.length ? " · " + g.notes.join(", ") : ""} (${Date.now() - t}ms)`);
  }
  const ms = rows.map((r) => r.ms).sort((a, b) => a - b);
  const { ok, ...scores } = summarizeImages(rows);
  const summary = { run_at: new Date().toISOString(), model: env.aiModel, prompt_version: VISION_PROMPT_VERSION, cases_version: set.version, cases: rows.length, ...scores, latency_ms: { median: ms[Math.floor(ms.length / 2)], max: ms[ms.length - 1] } };
  mkdirSync("evals/results", { recursive: true });
  const file = `evals/results/${summary.run_at.slice(0, 10)}_${VISION_PROMPT_VERSION}_${env.aiModel}.json`;
  writeFileSync(file, JSON.stringify({ summary, target: IMAGE_TARGET, ok, rows }, null, 2) + "\n");
  console.log("\n" + JSON.stringify(summary, null, 2));
  console.log(`${ok ? "목표 통과" : "목표 미달"} → ${file}`);
  if (!ok) process.exitCode = 1;
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exitCode = 1;
});
