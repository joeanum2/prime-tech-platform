import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
        display: ["var(--font-display)", "system-ui", "sans-serif"]
      },
      colors: {
        background: "#f7f7f5",
        surface: "#ffffff",
        border: "#d9d9d2",
        text: "#1f1f1b",
        muted: "#6b6b63",
        primary: "#2f3b2f",
        "primary-hover": "#243024",
        error: "#9b2c2c",
        success: "#2f6b3c",
        warning: "#915f1a"
      },
      boxShadow: {
        card: "0 8px 24px rgba(31, 31, 27, 0.08)"
      }
    }
  },
  plugins: []
};

export default config;
