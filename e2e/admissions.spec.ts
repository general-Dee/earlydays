import { expect, test } from "@playwright/test";

// The one full round-trip test that actually writes to Firestore (the
// emulator — see `npm run test:e2e`'s package.json script). Deliberately a
// single test: POST /api/admissions/apply rate-limits by IP
// (lib/rate-limit.ts, max 3/10min), and every request from a local run
// resolves to the same "unknown" IP key, so multiple submitting tests here
// would risk 429ing each other.
test("submitting an application and checking its status by reference code", async ({ page }) => {
  await page.goto("/admissions/apply");

  await page.locator("#aChildName").fill("Zainab Bello");
  await page.locator("#aChildDob").fill("2022-03-15");
  // Leave #aStage at its default (Creche) — the status lookup below asserts on it.
  await page.locator("#aGuardianName").fill("Aisha Bello");
  await page.locator("#aEmail").fill("aisha.bello.e2e@example.com");

  await page.getByRole("button", { name: "Submit Application" }).click();

  await expect(page.getByText(/Thanks — we.ve received your application/)).toBeVisible();
  const referenceCodeLocator = page.locator("code");
  await expect(referenceCodeLocator).toBeVisible();
  const referenceCode = (await referenceCodeLocator.textContent())?.trim() ?? "";
  expect(referenceCode).toMatch(/^[0-9A-F]{8}$/);

  await page.getByRole("link", { name: "Check application status →" }).click();
  await expect(page).toHaveURL(/\/admissions\/status/);

  await page.locator("#sReferenceCode").fill(referenceCode);
  await page.getByRole("button", { name: "Check Status" }).click();

  await expect(page.getByText("new")).toBeVisible();
  await expect(page.getByText("Zainab Bello — Creche")).toBeVisible();
  await expect(page.getByText("Received — awaiting review.")).toBeVisible();
});
