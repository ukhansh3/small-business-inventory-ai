import { readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

// Vercel Hobby 요금제는 배포 하나에 서버 함수 12개까지만 허용한다(2026-11-08 배포 실패로 확인).
function countFunctions(dir: string): number {
  return readdirSync(dir).reduce((n, name) => {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) return n + countFunctions(p);
    return n + (/\.(ts|js)$/.test(name) ? 1 : 0);
  }, 0);
}

describe("Vercel 함수 수", () => {
  it("api/ 아래 함수는 12개 이하", () => {
    expect(countFunctions("api")).toBeLessThanOrEqual(12);
  });
});
