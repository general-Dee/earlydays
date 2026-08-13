import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        ink: "#16213E",
        "ink-soft": "#2C3A5E",
        sun: "#F5A623",
        "sun-soft": "#FCE3B4",
        chalk: "#FBF7F0",
        paper: "#FFFFFF",
        leaf: "#3F7D58",
        "leaf-soft": "#DCEBE1",
        clay: "#C4522A",
        "clay-soft": "#F3DCD1",
        slate: "#6B7280",
        line: "#E7E1D4",
      },
      fontFamily: {
        display: ["var(--font-fraunces)", "serif"],
        body: ["var(--font-manrope)", "sans-serif"],
        mono: ["var(--font-plex-mono)", "monospace"],
      },
      spacing: {
        "4.5": "1.125rem",
        "5.5": "1.375rem",
      },
      maxWidth: {
        wrap: "1180px",
      },
      borderRadius: {
        card: "14px",
      },
    },
  },
  plugins: [],
};

export default config;
