import { expect, test } from "@playwright/test";

// 시나리오 1(test-plan 6절): '상추' → 선택지 3번 → 결과 카드 1개 이상 → 전화하기 누르면 예시 안내
test("상추 한 마디로 결과까지, 예시 번호는 전화가 걸리지 않는다", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByText("예시 데이터예요")).toBeVisible();

  const input = page.getByLabel("필요한 재료 입력");
  await input.fill("상추");
  await input.press("Enter");

  await page.getByText("2kg", { exact: true }).click();
  await page.getByText("지금 바로", { exact: true }).click();
  await page.getByText("직접 갈게요", { exact: true }).click();

  await expect(page.getByText(/조건에 맞는 곳 \d+곳을 찾았어요/)).toBeVisible({ timeout: 20_000 });
  const calls = page.getByText("전화하기", { exact: true });
  expect(await calls.count()).toBeGreaterThan(0);

  // 예시 판매처는 tel:로 이동하지 않고 안내만 한다(AC-13)
  const url = page.url();
  await calls.first().click();
  await expect(page.getByText("예시 번호예요. 실제 가게가 아니어서 전화가 걸리지 않아요.")).toBeVisible();
  expect(page.url()).toBe(url);
});
