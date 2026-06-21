import type { Config } from "tailwindcss";

export default {
  content: ["./app/**/*.{js,jsx,ts,tsx}"],
  darkMode: ["class", '[data-polaris-theme="dark"]'],
  theme: {
    extend: {
      colors: {
        // VANTA brand tokens — adaptable to Shopify Admin light/dark via data-polaris-theme (Section 24)
        vanta: {
          50: "#f5f7fa",
          100: "#eaeef5",
          200: "#cfd8e8",
          300: "#a7b8d4",
          400: "#7891bd",
          500: "#516ba3",
          600: "#3e5488",
          700: "#34456e",
          800: "#2d3a5c",
          900: "#1a2238",
          950: "#0f1424",
        },
        accent: {
          DEFAULT: "#7c5cff",
          soft: "#a892ff",
          dark: "#5b3fd6",
        },
      },
      fontFamily: {
        sans: ["Inter", "Polaris-Regular", "system-ui", "sans-serif"],
        mono: ["JetBrains Mono", "ui-monospace", "monospace"],
        arabic: ["IBM Plex Sans Arabic", "Tajawal", "sans-serif"],
      },
      animation: {
        "pulse-glow": "pulseGlow 2.4s ease-in-out infinite",
        "shimmer": "shimmer 1.6s linear infinite",
        "fade-in-up": "fadeInUp 0.32s cubic-bezier(0.22, 1, 0.36, 1)",
        "scale-in": "scaleIn 0.22s cubic-bezier(0.22, 1, 0.36, 1)",
        "checkmark-morph": "checkmarkMorph 0.6s cubic-bezier(0.22, 1, 0.36, 1)",
      },
      keyframes: {
        pulseGlow: {
          "0%, 100%": { boxShadow: "0 0 0 0 rgba(124, 92, 255, 0.35)" },
          "50%": { boxShadow: "0 0 24px 6px rgba(124, 92, 255, 0.25)" },
        },
        shimmer: {
          "0%": { backgroundPosition: "-1000px 0" },
          "100%": { backgroundPosition: "1000px 0" },
        },
        fadeInUp: {
          "0%": { opacity: "0", transform: "translateY(8px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        scaleIn: {
          "0%": { opacity: "0", transform: "scale(0.96)" },
          "100%": { opacity: "1", transform: "scale(1)" },
        },
        checkmarkMorph: {
          "0%": { transform: "scale(0.5) rotate(-12deg)", opacity: "0" },
          "60%": { transform: "scale(1.1) rotate(2deg)", opacity: "1" },
          "100%": { transform: "scale(1) rotate(0deg)", opacity: "1" },
        },
      },
      backgroundImage: {
        "shimmer-skeleton":
          "linear-gradient(90deg, rgba(255,255,255,0) 0, rgba(255,255,255,0.08) 20%, rgba(255,255,255,0.15) 60%, rgba(255,255,255,0))",
      },
    },
  },
  plugins: [],
} satisfies Config;
