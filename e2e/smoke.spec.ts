import { expect, test } from "@playwright/test";

// One of the sample posts defaultBlogPosts() (lib/blogPosts.ts) falls back
// to when Firestore has no real blog posts yet — matches what a fresh
// deploy actually serves at this URL.
const SAMPLE_BLOG_SLUG = "helping-a-shy-child-through-the-first-week";

const routes = [
  "/",
  "/journey",
  "/safety",
  "/gallery",
  "/admissions",
  "/admissions/apply",
  "/events",
  "/blog",
  `/blog/${SAMPLE_BLOG_SLUG}`,
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

const adminRoutes = [
  { path: "/admin/announcements", heading: "Announcements" },
  { path: "/admin/applications", heading: "Applications" },
  { path: "/admin/inquiries", heading: "Inquiries" },
  { path: "/admin/parents", heading: "Parent Accounts" },
  { path: "/admin/reports", heading: "Progress Reports" },
  { path: "/admin/events", heading: "Events" },
  { path: "/admin/blog", heading: "Blog Posts" },
];

for (const { path, heading } of adminRoutes) {
  test(`${path} shows the login gate when logged out`, async ({ page }) => {
    const response = await page.goto(path);
    expect(response?.status()).toBeLessThan(400);
    await expect(page.getByRole("heading", { name: heading, level: 1 })).toBeVisible();
    await expect(page.getByRole("button", { name: "Log In" })).toBeVisible();
    await expect(page.getByLabel("Email")).toBeVisible();
    await expect(page.getByLabel("Password")).toBeVisible();
  });
}

test("/portal shows the login gate when logged out", async ({ page }) => {
  const response = await page.goto("/portal");
  expect(response?.status()).toBeLessThan(400);
  await expect(page.getByRole("heading", { name: "Parent Login" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Log In" })).toBeVisible();
  await expect(page.getByLabel("Email")).toBeVisible();
  await expect(page.getByLabel("Password")).toBeVisible();
});
