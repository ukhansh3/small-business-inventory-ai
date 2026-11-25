import { existsSync, readFileSync, writeFileSync, appendFileSync } from "node:fs";
import { parse } from "csv-parse/sync";
import { stringify } from "csv-stringify/sync";

// evals/results/history.csv 기록(강의90 최종평가 지침).
// - BOM 있는 UTF-8(utf-8-sig): Excel에서 한글이 깨지지 않게
// - 문자열을 이어 붙이지 않고 CSV 라이브러리로 한 줄씩 추가(값에 쉼표·따옴표가 있어도 열이 어긋나지 않음)
// - 기존 열 순서는 그대로 두고 change, attack_success_rate를 뒤에 붙인다
export const HISTORY_FIELDS = [
  "run_at", "commit", "model", "prompt_version", "cases_version", "golden",
  "condition_accuracy", "format_accuracy", "scope_accuracy", "fabricated", "out_of_catalog", "ok",
  "change", "attack_success_rate",
] as const;
export type HistoryRow = Partial<Record<(typeof HISTORY_FIELDS)[number], string | number | boolean | null>>;

const BOM = "﻿";

export function readHistory(path: string): { header: string[]; rows: Record<string, string>[] } {
  if (!existsSync(path)) return { header: [...HISTORY_FIELDS], rows: [] };
  const text = readFileSync(path, "utf8").replace(/^﻿/, "");
  const records = parse(text, { columns: true, skip_empty_lines: true }) as Record<string, string>[];
  const header = text.split(/\r?\n/, 1)[0]!.length ? (parse(text.split(/\r?\n/, 1)[0]!) as string[][])[0]! : [...HISTORY_FIELDS];
  return { header, rows: records };
}

// 빠진 열을 뒤에 붙이고 파일 전체를 BOM 있는 UTF-8로 다시 쓴다(기존 행은 빈 값). 이미 맞으면 그대로
export function migrateHistory(path: string): void {
  if (!existsSync(path)) return;
  const raw = readFileSync(path, "utf8");
  const { header, rows } = readHistory(path);
  const columns = [...header, ...HISTORY_FIELDS.filter((f) => !header.includes(f))];
  if (raw.startsWith(BOM) && columns.length === header.length) return;
  writeFileSync(path, BOM + stringify(rows, { header: true, columns, cast: { boolean: (v) => String(v) } }));
}

export function appendHistory(path: string, row: HistoryRow): void {
  migrateHistory(path);
  const columns = existsSync(path) ? readHistory(path).header : [...HISTORY_FIELDS];
  const record = Object.fromEntries(columns.map((c) => [c, row[c as keyof HistoryRow] ?? ""]));
  const opts = { columns, cast: { boolean: (v: boolean) => String(v), number: (v: number) => String(v) } };
  if (!existsSync(path)) writeFileSync(path, BOM + stringify([record], { ...opts, header: true }));
  else appendFileSync(path, stringify([record], { ...opts, header: false }));
}
