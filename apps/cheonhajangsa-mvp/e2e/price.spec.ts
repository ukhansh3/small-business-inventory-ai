import { expect, test } from "@playwright/test";

test("AC-13·AC-17·AC-24 단가 진단과 예시 전화 차단", async ({ page }) => {
  await page.goto("/?test=1");
  await page.getByRole("tab", { name: "AI 도우미", exact: true }).click();
  const input = page.getByLabel("필요한 재료 입력");
  await input.fill("상추 2키로 만원 부르던데");
  await input.press("Enter");
  await expect(page.getByText(/상추 kg당 5,000원/).first()).toBeVisible({ timeout: 20_000 });
  // 예시를 실제 가격으로 오인하지 않도록 경고도 함께 확인한다.
  await expect(page.getByText(/예시/).first()).toBeVisible();
  await expect(page.getByText("이 가격 동네 시세에 보태기", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "전화하기", exact: true }).first().click();
  await expect(page.getByText("예시 번호예요. 실제 가게가 아니어서 전화가 걸리지 않아요.")).toBeVisible();
});
