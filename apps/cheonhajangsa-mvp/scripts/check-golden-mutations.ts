import { execFileSync, spawnSync } from "node:child_process";
import { mkdtempSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";

// 앱 폴더에서 실행한다. 동시 편집·테스트 없이 두 임시 결함을 주입하고 반드시 복원한다.
const temp = mkdtempSync(join(tmpdir(), "chj-golden-mutation-"));
const suite = JSON.parse(readFileSync("../../tests/harness/golden_cases.yaml", "utf8")) as { cases: { id: string }[] };
const ids = suite.cases.map(({ id }) => id);
type Assertion = { title: string; status: string };
function run(label: string) {
  const report = join(temp, label + ".json");
  const result = spawnSync(process.execPath, [resolve("node_modules/vitest/vitest.mjs"), "run", "tests/harness/mvp-golden.test.ts", "--reporter=json", "--outputFile=" + report], { encoding: "utf8" });
  if (result.error) throw result.error;
  const data = JSON.parse(readFileSync(report, "utf8")) as { testResults: { assertionResults: Assertion[] }[] };
  const assertions = data.testResults.flatMap(({ assertionResults }) => assertionResults);
  if (assertions.length !== ids.length || ids.some((id) => assertions.filter(({ title }) => title === id).length !== 1)) throw new Error("골든 누락 또는 중복");
  if (assertions.some(({ status }) => status !== "passed" && status !== "failed")) throw new Error("skip/미실행 골든 발생");
  return { exit_code: result.status, passed: assertions.filter(({ status }) => status === "passed").length,
    failed_cases: assertions.filter(({ status }) => status === "failed").map(({ title }) => title) };
}
function requirePass(label: string) {
  const result = run(label);
  if (result.exit_code !== 0 || result.failed_cases.length) throw new Error(label + " 기준선 실패");
  return result;
}
const mutations = [
  { id: "unit_price_zero", file: "core/price.ts", before: "return Math.round(amount_won / qty_kg);", after: "return 0; // temporary mutation", must_fail: "MVP-G24" },
  { id: "delivery_unconditionally_available", file: "core/search.ts", before: 'if (deliveryStatus === "supported" && v.delivery_dongs.includes(dong)) {', after: 'if (fulfillment === "delivery") { // temporary mutation', must_fail: "MVP-G04" },
];
const baseline = requirePass("baseline");
const results = [];
for (const mutation of mutations) {
  const original = readFileSync(mutation.file);
  const text = original.toString("utf8");
  if (text.split(mutation.before).length !== 2) throw new Error("결함 주입 위치가 하나가 아님: " + mutation.file);
  try {
    writeFileSync(mutation.file, text.replace(mutation.before, mutation.after));
    const result = run(mutation.id);
    if (result.exit_code !== 1 || !result.failed_cases.includes(mutation.must_fail)) throw new Error("결함을 잡지 못함: " + mutation.id);
    results.push({ ...mutation, ...result });
    console.log(mutation.id + ": detected by " + result.failed_cases.join(", "));
  } finally {
    writeFileSync(mutation.file, original);
  }
  if (!readFileSync(mutation.file).equals(original)) throw new Error("원본 복원 실패: " + mutation.file);
}
const restored = requirePass("restored");
const output = resolve(process.argv[2] ?? "../../docs/evaluation/results/golden-mutation-2026-11-17.json");
mkdirSync(dirname(output), { recursive: true });
writeFileSync(output, JSON.stringify({ run_at: new Date().toISOString(), base_commit: execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim(),
  working_tree: "local evaluation remediation, not pushed", external_services: "stubbed", baseline, mutations: results, restored,
  source_restored: true }, null, 2) + "\n");
console.log("Source restored; golden " + restored.passed + "/" + ids.length + " passed. " + output);
