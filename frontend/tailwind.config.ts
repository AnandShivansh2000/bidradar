import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ["var(--font-inter)", "system-ui", "sans-serif"],
      },
      colors: {
        primary: "#10B981",
        "primary-hover": "#059669",
        surface: "#f9fafb",
        border: "#e2e8f0",
        // Design tokens
        "color-high": "#22c55e",
        "color-medium": "#eab308",
        "color-low": "#94a3b8",
        "color-urgent": "#ef4444",
        "color-closing-soon": "#f97316",
        "sidebar-bg": "#0f172a",
        "content-bg": "#ffffff",
      },
      animation: {
        "fade-in-down": "fadeInDown 0.2s ease-out",
      },
      keyframes: {
        fadeInDown: {
          "0%": { opacity: "0", transform: "translateY(-8px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
      },
    },
  },
  plugins: [],
};

export default config;
