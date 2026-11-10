import { readFileSync } from "node:fs";
import { z } from "zod";

const file = process.argv[2];
if (!file) throw new Error("Usage: check-golden-report <Vitest JSON report>");
const { cases } = z.object({ cases: z.array(z.object({ id: z.string(), required: z.literal(true) })).min(1) })
  .parse(JSON.parse(readFileSync("../../tests/harness/golden_cases.yaml", "utf8")));
const report = z.object({ testResults: z.array(z.object({
  name: z.string(),
  assertionResults: z.array(z.object({ title: z.string(), status: z.string() })),
})) }).parse(JSON.parse(readFileSync(file, "utf8")));

const assertions = report.testResults
  .filter(({ name }) => name.replaceAll("\\", "/").endsWith("/tests/harness/mvp-golden.test.ts"))
  .flatMap(({ assertionResults }) => assertionResults);
for (const { id } of cases) {
  const matches = assertions.filter(({ title }) => title === id);
  if (matches.length !== 1 || matches[0]?.status !== "passed") {
    throw new Error(`Required golden ${id} did not pass exactly once: ${matches.map(({ status }) => status).join(", ") || "missing"}`);
  }
}
if (assertions.length !== cases.length) throw new Error("Unexpected golden assertions in report");
console.log(`Golden report: ${cases.length}/${cases.length} required cases passed, 0 missing/skipped/failed`);
