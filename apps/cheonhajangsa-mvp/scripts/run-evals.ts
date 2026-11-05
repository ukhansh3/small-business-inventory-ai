import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { loadDataset } from "../core/data";
import { createClaudeAi } from "../server/ai/claude";
import { PROMPT_VERSION } from "../server/ai/prompt";
import { findCandidates } from "../server/ai/retrieval";
import { AiUnavailableError } from "../server/ai/types";
import { type Expect, type Got, grade, summarize, TARGET } from "../evals/grade";
import { readEnv } from "../server/env";

// AI 입력 해석 evals(P2-3): npm run evals
// evals/cases.json의 문장을 실시간 Claude에 한 번씩 보내 조건 정확도·지어낸 값·범위 판별을 잰다.
// 실제 API를 부르므로 비용이 든다(Haiku, 26건). 결과는 evals/results/에 남긴다(개발기획서 7절: 프롬프트를 바꾸면 다시 돌린다).
if (existsSync(".env.local")) process.loadEnvFile(".env.local");

type Case = { id: string; text: string; expect: Expect };

async function main() {
  const env = readEnv();
  if (!env.anthropicApiKey) throw new Error("ANTHROPIC_API_KEY가 없어 evals를 돌릴 수 없습니다(.env.local)");
  const ai = createClaudeAi(env);
  const data = loadDataset();
  const set = JSON.parse(readFileSync("evals/cases.json", "utf8")) as { version: string; cases: Case[] };

  const rows = [];
  for (const c of set.cases) {
    const started = Date.now();
    let got: Got;
    try {
      got = await ai.decide({ text: c.text, candidates: findCandidates(c.text, data.items) });
    } catch (e) {
      got = { type: "error", message: e instanceof AiUnavailableError ? e.message : String(e) };
    }
    const ms = Date.now() - started;
    const { pass, wrong, fabricated } = grade(c.expect, got);
    rows.push({ id: c.id, text: c.text, expect: c.expect, got, pass, wrong, fabricated, ms });
    console.log(`${pass ? "✓" : "✗"} ${c.id} ${c.text} ${pass ? "" : `→ ${JSON.stringify(got)}`} (${ms}ms)`);
  }

  const { ok, ...scores } = summarize(rows);
  const ms = rows.map((r) => r.ms).sort((a, b) => a - b);
  const summary = {
    run_at: new Date().toISOString(),
    model: env.aiModel,
    prompt_version: PROMPT_VERSION,
    cases_version: set.version,
    cases: rows.length,
    ...scores,
    latency_ms: { median: ms[Math.floor(ms.length / 2)], max: ms[ms.length - 1] },
  };

  mkdirSync("evals/results", { recursive: true });
  const file = `evals/results/${summary.run_at.slice(0, 10)}_${PROMPT_VERSION}_${env.aiModel}.json`;
  writeFileSync(file, JSON.stringify({ summary, target: TARGET, ok, rows }, null, 2) + "\n");
  console.log("\n" + JSON.stringify(summary, null, 2));
  console.log(`${ok ? "목표 통과" : "목표 미달"} → ${file}`);
  if (!ok) process.exitCode = 1;
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exitCode = 1;
});
