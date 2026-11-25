import { expect, test } from "@playwright/test";

// v3(2026-11-25): 가상 판매처 가격 대신 실제 시세로 판정한다. R-28부터 상자 단위 사다리(경매·서울 가락 상회·소매) 기준.
// 예시 번호 발신 차단(AC-13)은 실제 데이터에 예시 판매처가 없어 단위·골든 테스트(MVP-G13)로 확인한다.
test("AC-17·AC-24·R-28 단가 진단이 상자 단위 시세 사다리로 판정한다", async ({ page }) => {
  await page.goto("/?test=1");
  await page.getByRole("tab", { name: "AI 도우미", exact: true }).click();
  const input = page.getByLabel("필요한 재료 입력");
  await input.fill("상추 2키로 만원 부르던데");
  await input.press("Enter");
  await expect(page.getByText(/상추 kg당 5,000원/).first()).toBeVisible({ timeout: 20_000 });
  // v3(R-28): 판정 띠 + 상자 값, 근거를 펼치면 가격 사다리(수원 경매·서울 가락 상회·수원 소매)와 사장님 값
  await expect(page.getByText(/^(아주 잘 사셨어요|잘 사셨어요|보통이에요|비싸게 사셨어요)$/).first()).toBeVisible();
  await expect(page.getByText(/상추 4kg 한 상자 · 20,000원/).first()).toBeVisible();
  await page.getByRole("button", { name: "근거 보기" }).first().click();
  for (const label of ["수원 마트·시장", "서울 가락 상회", "수원 새벽 경매"]) {
    await expect(page.getByText(label, { exact: true }).first()).toBeVisible();
  }
  await expect(page.getByText("사장님 20,000원", { exact: true }).first()).toBeVisible();
  await expect(page.getByText("이 가격 기록에 보태기", { exact: true })).toBeVisible();
});
