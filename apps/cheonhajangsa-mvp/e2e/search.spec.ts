import { expect, test } from "@playwright/test";

test("AC-5·AC-30 수량 없이 상추를 찾고 결과를 지도 목록으로 연결한다", async ({ page }) => {
  await page.goto("/?test=1");
  await page.getByRole("tab", { name: "AI 도우미", exact: true }).click();
  const input = page.getByLabel("필요한 재료 입력");
  await input.fill("상추");
  await input.press("Enter");
  // 현행 구현은 수량을 모르면 null로 유지하고 시점부터 질문한다.
  await page.getByText("지금 바로", { exact: true }).click();
  await page.getByText("직접 갈게요", { exact: true }).click();
  const map = page.getByRole("button", { name: /검색 결과 지도에서 보기/ });
  await expect(map).toBeVisible({ timeout: 20_000 });
  await expect(page.getByText(/조건에 맞는 곳 \d+곳을 찾았어요/)).toBeVisible();
  await map.click();
  await expect(page.getByRole("tab", { name: "지도", exact: true })).toHaveAttribute("aria-selected", "true");
  await expect(page.getByText("업체 목록", { exact: true })).toBeVisible();
});

test("AC-M01 비로그인 저장 접근에는 로그인을 안내한다", async ({ page }) => {
  await page.goto("/?test=1");
  await page.getByRole("tab", { name: "저장", exact: true }).click();
  await expect(page.getByText(/로그인/).first()).toBeVisible();
});
