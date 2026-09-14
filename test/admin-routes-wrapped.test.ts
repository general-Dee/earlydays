import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

// Guards against a future app/api/admin/**/route.ts handler being added
// without going through an admin-auth check. withAdminRoute/withSuperAdminRoute
// wrap almost every handler; app/api/admin/me/route.ts is the one exception,
// calling getAdminIdentity directly — so this checks for any of the
// lib/firebase/admin-auth helpers being referenced, not one specific wrapper.
const ADMIN_API_ROOT = path.join(process.cwd(), "app", "api", "admin");
const HTTP_METHODS = ["GET", "POST", "PUT", "PATCH", "DELETE"];
const AUTH_HELPERS = [
  "withAdminRoute",
  "withSuperAdminRoute",
  "requireAdminEmail",
  "requireSuperAdmin",
  "getAdminIdentity",
  "requireAuthenticatedUser",
];

function findRouteFiles(dir: string): string[] {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) return findRouteFiles(full);
    return entry.name === "route.ts" ? [full] : [];
  });
}

const routeFiles = findRouteFiles(ADMIN_API_ROOT).map((file) => path.relative(process.cwd(), file));

describe("every app/api/admin/**/route.ts handler is authorization-checked", () => {
  it("found admin route files to check (sanity check that the scan itself works)", () => {
    expect(routeFiles.length).toBeGreaterThan(0);
  });

  it.each(routeFiles)("%s", (relativeFile) => {
    const source = fs.readFileSync(path.join(process.cwd(), relativeFile), "utf8");
    const exportedMethods = HTTP_METHODS.filter((method) => new RegExp(`export const ${method}\\s*=`).test(source));

    if (exportedMethods.length === 0) return;

    const usesAuthHelper = AUTH_HELPERS.some((helper) => new RegExp(`\\b${helper}\\b`).test(source));

    expect(
      usesAuthHelper,
      `${relativeFile} exports ${exportedMethods.join(", ")} but doesn't reference any admin-auth helper ` +
        `(${AUTH_HELPERS.join(", ")}) — every admin route handler must check authorization.`
    ).toBe(true);
  });
});
