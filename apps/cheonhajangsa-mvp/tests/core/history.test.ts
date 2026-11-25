import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { appendHistory, readHistory } from "../../evals/history";

// history.csv 기록(강의90): BOM, CSV 라이브러리, 기존 열 유지 + change·attack_success_rate 뒤에
describe("evals history.csv", () => {
  it("BOM 없는 옛 파일에 열을 붙이고 BOM으로 다시 저장한 뒤 한 줄을 더한다", () => {
    const path = join(mkdtempSync(join(tmpdir(), "hist-")), "history.csv");
    writeFileSync(path, 'run_at,commit,model,prompt_version,cases_version,golden,condition_accuracy,format_accuracy,scope_accuracy,fabricated,out_of_catalog,ok\n"2026-11-10","f63f997","m","v3","text-v2-32","10/10 passed, 0 skipped","0.95","1","1","0","0","true"\n');
    appendHistory(path, { run_at: "2026-11-26", commit: "abc1234", change: "R1 | 대상: o01, s03 | 가설: \"따옴표\"도 괜찮다", attack_success_rate: "0.200", ok: true, cases_version: "37 cases | 1a2b3c4" });
    const raw = readFileSync(path, "utf8");
    expect(raw.startsWith("﻿")).toBe(true);
    expect(raw.match(/﻿/g)).toHaveLength(1);
    const { header, rows } = readHistory(path);
    expect(header.slice(-2)).toEqual(["change", "attack_success_rate"]);
    expect(rows).toHaveLength(2);
    expect(rows[0]).toMatchObject({ golden: "10/10 passed, 0 skipped", change: "", attack_success_rate: "" });
    expect(rows[1]).toMatchObject({ change: 'R1 | 대상: o01, s03 | 가설: "따옴표"도 괜찮다', attack_success_rate: "0.200", ok: "true", cases_version: "37 cases | 1a2b3c4" });
  });
});
