import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { appendFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { loadDataset } from "../core/data";
import { createClaudeAi } from "../server/ai/claude";
import { PROMPT_VERSION } from "../server/ai/prompt";
import { findCandidates } from "../server/ai/retrieval";
import { AiUnavailableError } from "../server/ai/types";
import { type Expect, type Got, grade, summarize, TARGET } from "../evals/grade";
import { readEnv } from "../server/env";

// AI 입력 해석 evals(P2-3): npm run evals
// 기존 v2 텍스트 32개를 JSONL로 옮긴 기준선. 실시간 호출에는 비용이 든다.
if (existsSync(".env.local")) process.loadEnvFile(".env.local");

type Case = { id: string; query: string; category: string; expect: Expect };
const outputDir = "../../evals/results";

async function main() {
  const env = readEnv();
  if (!env.anthropicApiKey) throw new Error("ANTHROPIC_API_KEY가 없어 evals를 돌릴 수 없습니다(.env.local)");
  const ai = createClaudeAi(env);
  const data = loadDataset();
  const dataset = readFileSync("../../evals/evalset.jsonl", "utf8");
  const cases = dataset.trim().split(/\r?\n/).map((line) => JSON.parse(line) as Case);
  if (cases.length !== 32 || new Set(cases.map(({ id }) => id)).size !== cases.length) {
    throw new Error("비교용 텍스트 기준선은 서로 다른 32개 케이스여야 합니다.");
  }
  const commit = process.env.QA_COMMIT ?? execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim();

  const rows = [];
  for (const c of cases) {
    const started = Date.now();
    const candidates = findCandidates(c.query, data.items);
    let got: Got;
    try {
      got = await ai.decide({ text: c.query, candidates });
    } catch (e) {
      got = { type: "error", message: e instanceof AiUnavailableError ? e.message : String(e) };
    }
    const ms = Date.now() - started;
    const scored = grade(c.expect, got);
    const formatOk = got.type !== "error";
    const itemId = got.type === "search" || got.type === "price" ? got.item_id : null;
    const outOfCatalog = itemId !== null && !candidates.some((item) => item.active && item.id === itemId);
    const pass = scored.pass && formatOk && !outOfCatalog;
    rows.push({ id: c.id, category: c.category, text: c.query, expect: c.expect, got, ...scored, pass, formatOk, outOfCatalog, ms });
    console.log(`${pass ? "✓" : "✗"} ${c.id} (${ms}ms)`);
  }

  const { ok: existingTargetsMet, ...scores } = summarize(rows);
  const ms = rows.map((r) => r.ms).sort((a, b) => a - b);
  const runAt = new Date().toISOString();
  const summary = {
    run_at: runAt,
    commit,
    model: env.aiModel,
    prompt_version: PROMPT_VERSION,
    cases_version: "text-v2-32",
    cases_sha256: createHash("sha256").update(dataset).digest("hex"),
    item_catalog_sha256: createHash("sha256").update(JSON.stringify(data.items)).digest("hex"),
    golden: process.env.QA_GOLDEN ?? "not_recorded",
    cases: rows.length,
    ...scores,
    format_accuracy: rows.filter(({ formatOk }) => formatOk).length / rows.length,
    out_of_catalog: rows.filter(({ outOfCatalog }) => outOfCatalog).length,
    latency_ms: { median: ms[Math.floor(ms.length / 2)], max: ms[ms.length - 1] },
  };

  const ok = existingTargetsMet && summary.format_accuracy === 1 && summary.out_of_catalog === 0;
  const failures = rows.filter(({ pass }) => !pass);
  const failure_counts: Record<string, number> = {};
  for (const row of failures) failure_counts[row.category] = (failure_counts[row.category] ?? 0) + 1;
  mkdirSync(outputDir, { recursive: true });
  const runId = runAt.replace(/[:.]/g, "");
  const file = `${outputDir}/${runId}_${PROMPT_VERSION}_${env.aiModel.replace(/[^a-z0-9._-]/gi, "_")}.json`;
  writeFileSync(file, JSON.stringify({ summary, target: { ...TARGET, formatAccuracy: 1, outOfCatalog: 0 },
    ok, failure_counts, failed_case_ids: failures.slice(0, 10).map(({ id }) => id), rows }, null, 2) + "\n", { flag: "wx" });
  const history = `${outputDir}/history.csv`;
  if (!existsSync(history)) writeFileSync(history, "run_at,commit,model,prompt_version,cases_version,golden,condition_accuracy,format_accuracy,scope_accuracy,fabricated,out_of_catalog,ok\n", { flag: "wx" });
  const historyFields = [runAt, commit, env.aiModel, PROMPT_VERSION, summary.cases_version, summary.golden, summary.condition_accuracy,
    summary.format_accuracy, summary.scope_accuracy, summary.fabricated, summary.out_of_catalog, ok];
  appendFileSync(history, historyFields.map((field) => '"' + String(field).replaceAll('"', '""') + '"').join(",") + "\n");
  console.log("\n" + JSON.stringify(summary, null, 2));
  console.log(`${ok ? "목표 통과" : "목표 미달"} → ${file}`);
  if (!ok) process.exitCode = 1;
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exitCode = 1;
});
