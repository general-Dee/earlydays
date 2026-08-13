import { expect, test } from "@playwright/test";
import { blogPosts } from "../lib/data";

const routes = [
  "/",
  "/journey",
  "/safety",
  "/admissions",
  "/events",
  "/blog",
  `/blog/${blogPosts[0].slug}`,
  "/portal",
  "/contact",
];

for (const route of routes) {
  test(`loads ${route}`, async ({ page }) => {
    const response = await page.goto(route);
    expect(response?.status()).toBeLessThan(400);
    await expect(page.locator("body")).toBeVisible();
  });
}

test("unknown route renders the custom 404 page", async ({ page }) => {
  await page.goto("/this-route-does-not-exist");
  await expect(page.getByText("This page wandered off")).toBeVisible();
});

test("sitemap.xml is reachable", async ({ page }) => {
  const response = await page.goto("/sitemap.xml");
  expect(response?.status()).toBe(200);
});

test("robots.txt is reachable", async ({ page }) => {
  const response = await page.goto("/robots.txt");
  expect(response?.status()).toBe(200);
});
