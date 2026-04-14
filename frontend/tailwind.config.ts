import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ["Inter", "system-ui", "-apple-system", "sans-serif"],
      },
      colors: {
        surface: "#f4f5f7",
        brand: {
          navy:      '#0a1128',
          navyMid:   '#1e293b',
          blue:      '#3b6cf5',
          deepBlue:  '#1b3a8a',
          cyan:      '#38bdf8',
          lightBlue: '#93c5fd',
        },
      },
      animation: {
        "fade-in-up":   "fadeInUp 0.38s cubic-bezier(0.16,1,0.3,1) both",
        "fade-in":      "fadeIn 0.25s ease-out both",
        "slide-down":   "slideDown 0.18s cubic-bezier(0.16,1,0.3,1) both",
        "slide-up":     "slideUp 0.32s cubic-bezier(0.16,1,0.3,1) both",
        "shimmer":      "shimmer 1.6s linear infinite",
        "ping-slow":    "ping 2.2s cubic-bezier(0,0,0.2,1) infinite",
      },
      keyframes: {
        fadeInUp: {
          "0%":   { opacity: "0", transform: "translateY(10px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        fadeIn: {
          "0%":   { opacity: "0" },
          "100%": { opacity: "1" },
        },
        slideDown: {
          "0%":   { opacity: "0", transform: "translateY(-6px) scaleY(0.96)" },
          "100%": { opacity: "1", transform: "translateY(0) scaleY(1)" },
        },
        slideUp: {
          "0%":   { opacity: "0", transform: "translateY(100%)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        shimmer: {
          "0%":   { backgroundPosition: "-400px 0" },
          "100%": { backgroundPosition: "400px 0" },
        },
      },
      boxShadow: {
        "card":       "0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04)",
        "card-hover": "0 4px 12px rgba(0,0,0,0.08), 0 2px 4px rgba(0,0,0,0.04)",
        "dropdown":   "0 8px 24px rgba(0,0,0,0.10), 0 2px 6px rgba(0,0,0,0.06)",
      },
      transitionTimingFunction: {
        spring: "cubic-bezier(0.16,1,0.3,1)",
      },
    },
  },
  plugins: [],
};

export default config;
