import { expect, test } from "@playwright/test";

test("AC-5·AC-30 수량 없이 상추를 찾고 결과를 지도 목록으로 연결한다", async ({ page }) => {
  await page.goto("/?test=1");
  await page.getByRole("tab", { name: "AI 도우미", exact: true }).click();
  const input = page.getByLabel("필요한 재료 입력");
  await input.fill("상추");
  await input.press("Enter");
  // 수량을 모르면 시점만 묻는다. v3(ADR-013 검토안): 받는 방식은 묻지 않고, 지금+소량이면 가까운 가게 한 곳을 추천한다
  await page.getByText("지금 바로", { exact: true }).click();
  await expect(page.getByText("급할 때 가까운 곳", { exact: true })).toBeVisible({ timeout: 20_000 });
  await expect(page.getByText(/에서 바로 사세요$/).first()).toBeVisible();
  const map = page.getByRole("button", { name: /추천한 곳 지도에서 보기/ });
  await expect(map).toBeVisible();
  await map.click();
  await expect(page.getByRole("tab", { name: "지도", exact: true })).toHaveAttribute("aria-selected", "true");
  await expect(page.getByText("업체 목록", { exact: true })).toBeVisible();
});

test("AC-M01 비로그인 저장 접근에는 로그인을 안내한다", async ({ page }) => {
  await page.goto("/?test=1");
  await page.getByRole("tab", { name: "저장", exact: true }).click();
  await expect(page.getByText(/로그인/).first()).toBeVisible();
});
