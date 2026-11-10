import { defineConfig } from "@playwright/test";

// 최소 E2E(P2-1, test-plan 6절). 기본은 로컬 웹(npm run dev:api + npm run web을 먼저 띄운다).
// 배포 링크로 돌릴 때: E2E_BASE_URL=https://cheonhajangsa-mvp.vercel.app npm run e2e
// 브라우저는 설치된 Chrome을 쓴다(Playwright 브라우저를 따로 받지 않음).
export default defineConfig({
  testDir: "e2e",
  timeout: 60_000,
  retries: 0,
  reporter: "list",
  use: {
    baseURL: process.env.E2E_BASE_URL ?? "http://localhost:8081",
    channel: "chrome",
    viewport: { width: 390, height: 844 },
    locale: "ko-KR",
    // 기록에서 팀원·테스트 기기로 구분(API 명세 1.6)
    extraHTTPHeaders: { "x-test-device": "true" },
  },
});
