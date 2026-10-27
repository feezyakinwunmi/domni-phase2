import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Core surfaces
        ink: {
          DEFAULT: "#0B0E1A", // deep navy — dark sections, hero
          900: "#070911",
          800: "#0B0E1A",
          700: "#121628",
          600: "#1B2036",
        },
        // Primary purple system
        violet: {
          50: "#F2F0FF",
          100: "#E4E0FF",
          300: "#B4A9FF",
          400: "#8B7FFF", // gradient highlight
          500: "#6D5AE6", // primary
          600: "#4A3FBF", // gradient deep
          700: "#382E94",
        },
        // Live / vote accent
        pulse: {
          DEFAULT: "#22D3A5",
          soft: "#D6FBF0",
        },
        slate: {
          50: "#F8F9FC",
          100: "#EEF0F6",
          400: "#8A90A6",
          500: "#64748B",
          700: "#3A3F52",
        },
      },
      fontFamily: {
        display: ["var(--font-geist)", "sans-serif"],
        body: ["var(--font-inter)", "sans-serif"],
        mono: ["var(--font-mono)", "monospace"],
        serif: ["var(--font-serif)", "Georgia", "serif"],
      },
      backgroundImage: {
        "domni-gradient": "linear-gradient(135deg, #4A3FBF 0%, #6D5AE6 45%, #8B7FFF 100%)",
        "domni-radial": "radial-gradient(circle at 20% 20%, rgba(139,127,255,0.25), transparent 60%)",
      },
      boxShadow: {
        soft: "0 8px 30px rgba(11, 14, 26, 0.08)",
        glow: "0 0 60px rgba(109, 90, 230, 0.35)",
      },
      borderRadius: {
        xl2: "1.25rem",
      },
      keyframes: {
        float: {
          "0%, 100%": { transform: "translateY(0px)" },
          "50%": { transform: "translateY(-14px)" },
        },
        "pulse-dot": {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.35" },
        },
      },
      animation: {
        float: "float 6s ease-in-out infinite",
        "pulse-dot": "pulse-dot 1.6s ease-in-out infinite",
      },
    },
  },
  plugins: [],
};

export default config;
