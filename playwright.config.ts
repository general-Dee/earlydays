import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  // The dev server compiles each route lazily on its first visit; in a slow
  // sandboxed environment a single route's first compile measured well past
  // the previous 30s budget even after the server itself was already up.
  timeout: 120_000,
  expect: {
    // Default 5s was too tight for a real (emulator) network round trip in
    // the same slow environment.
    timeout: 30_000,
  },
  fullyParallel: true,
  use: {
    baseURL: "http://localhost:3000",
  },
  webServer: {
    command: "npm run dev",
    url: "http://localhost:3000",
    reuseExistingServer: !process.env.CI,
    // `test:e2e` now runs this under `firebase emulators:exec` — emulator
    // boot plus the dev server's first-time compile of the homepage can
    // take several minutes on a slow/CI machine, well past the previous
    // 120s budget (measured ~5 minutes in one CI-like sandboxed environment).
    timeout: 360_000,
  },
});
