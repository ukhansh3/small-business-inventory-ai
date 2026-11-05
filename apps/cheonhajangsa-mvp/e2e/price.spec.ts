import { expect, test } from "@playwright/test";

// v2 가격 한 줄 진단(AC-24): 받은 가격을 적으면 kg당 가격과 동네 시세 대비 판정, 더 싼 곳이 나온다
test("가격 한 줄 → kg당 5,000원 판정과 더 싼 곳", async ({ page }) => {
  await page.goto("/");
  const input = page.getByLabel("필요한 재료 입력");
  await input.fill("상추 2키로 만원 부르던데");
  await input.press("Enter");

  await expect(page.getByText(/상추 kg당 5,000원 · 동네 중간 [\d,]+원보다 \d+% 비싼 편/)).toBeVisible({ timeout: 20_000 });
  await expect(page.getByText("동네 시세", { exact: true }).first()).toBeVisible();
  await expect(page.getByText(/kg당 5,000원보다 싸게 파는 곳/)).toBeVisible();
  await expect(page.getByText("이 가격 동네 시세에 보태기")).toBeVisible();
});
