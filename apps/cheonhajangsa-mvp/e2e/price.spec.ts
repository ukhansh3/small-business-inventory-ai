import { expect, test } from "@playwright/test";

// v3(2026-11-25): 가상 판매처 가격 대신 수원 실제 시세(도매 경매가·소매가)로 판정한다(R-23·R-24).
// 예시 번호 발신 차단(AC-13)은 실제 데이터에 예시 판매처가 없어 단위·골든 테스트(MVP-G13)로 확인한다.
test("AC-17·AC-24·R-23 단가 진단이 수원 실제 시세로 판정한다", async ({ page }) => {
  await page.goto("/?test=1");
  await page.getByRole("tab", { name: "AI 도우미", exact: true }).click();
  const input = page.getByLabel("필요한 재료 입력");
  await input.fill("상추 2키로 만원 부르던데");
  await input.press("Enter");
  await expect(page.getByText(/상추 kg당 5,000원/).first()).toBeVisible({ timeout: 20_000 });
  // 출처(공공데이터)와 도매·소매 기준이 함께 보여야 한다
  await expect(page.getByText(/수원 시세\(kg당\) 도매 [\d,]+원/).first()).toBeVisible();
  await expect(page.getByText("수원 시세 · 공공데이터", { exact: true }).first()).toBeVisible();
  await expect(page.getByText(/도매 경매가 수준|도매와 소매 사이|소매가\([\d,]+원\)보다 비싸요/).first()).toBeVisible();
  await expect(page.getByText("이 가격 기록에 보태기", { exact: true })).toBeVisible();
});
