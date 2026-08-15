import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        ink: "#e9e9ed",
        "ink-soft": "#a9a9b5",
        sun: "#9184d9",
        "sun-soft": "#423a6a",
        chalk: "#161826",
        paper: "#232532",
        leaf: "#7fd9a8",
        "leaf-soft": "#1e3a2c",
        clay: "#e0876f",
        "clay-soft": "#3a2420",
        slate: "#9a96ab",
        line: "#2c2e3d",
        "accent-light": "#d2cefd",
        "tint-text": "#f5f4ff",
        ground: "#262a60",
        "ground-card": "#292b31",
      },
      fontFamily: {
        display: ["var(--font-inter)", "sans-serif"],
        body: ["var(--font-inter)", "sans-serif"],
        mono: ["var(--font-inter)", "sans-serif"],
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
