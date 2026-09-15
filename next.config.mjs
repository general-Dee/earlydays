import { withSentryConfig } from "@sentry/nextjs/config";
import bundleAnalyzer from "@next/bundle-analyzer";

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    remotePatterns: [{ protocol: "https", hostname: "firebasestorage.googleapis.com" }],
  },
  // Next 14 needs this explicitly for instrumentation.ts to run; Next 15+
  // no longer needs the flag, but withSentryConfig would set it for us
  // either way — kept explicit for clarity on this Next 14 project.
  experimental: {
    instrumentationHook: true,
  },
};

// Opt-in only (npm run analyze) — a no-op wrapper otherwise, so the normal
// build/dev path is completely unaffected. openAnalyzer is false so it never
// tries to shell out and launch a browser; the static HTML reports it always
// writes to .next/analyze/ can be opened manually.
const withBundleAnalyzer = bundleAnalyzer({
  enabled: process.env.ANALYZE === "true",
  openAnalyzer: false,
});

export default withSentryConfig(withBundleAnalyzer(nextConfig), {
  // Only used for uploading source maps on build — silently skipped with a
  // warning (not a build failure) when SENTRY_AUTH_TOKEN isn't set, so this
  // is safe to ship ahead of creating a Sentry project.
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  authToken: process.env.SENTRY_AUTH_TOKEN,
  silent: true,
  telemetry: false,
  webpack: {
    treeshake: { removeDebugLogging: true },
  },
});
