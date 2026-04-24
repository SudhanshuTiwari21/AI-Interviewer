import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    container: {
      center: true,
      padding: {
        DEFAULT: "1rem",
        sm: "1.5rem",
        lg: "2rem",
      },
      screens: {
        "2xl": "1280px",
      },
    },
    extend: {
      fontFamily: {
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
        display: ["var(--font-display)", "system-ui", "sans-serif"],
        mono: ["ui-monospace", "SFMono-Regular", "monospace"],
      },
      colors: {
        ink: {
          50: "#f7f8fa",
          100: "#eef0f4",
          200: "#dde1e9",
          300: "#bcc3d1",
          400: "#8a93a6",
          500: "#5b6478",
          600: "#3e4658",
          700: "#2a3142",
          800: "#1b2030",
          900: "#0e1220",
          950: "#070912",
        },
        accent: {
          50: "#eef4ff",
          100: "#dde9ff",
          200: "#b9d0ff",
          300: "#8fb1ff",
          400: "#5e8bff",
          500: "#3a66f5",
          600: "#2a4dd6",
          700: "#223fa8",
          800: "#1d3686",
          900: "#1b2f6c",
        },
        success: {
          50: "#ecfdf3",
          500: "#12b76a",
          600: "#039855",
        },
        warn: {
          50: "#fffaeb",
          500: "#f79009",
          600: "#dc6803",
        },
        danger: {
          50: "#fef3f2",
          500: "#f04438",
          600: "#d92d20",
        },
      },
      borderRadius: {
        xl: "0.85rem",
        "2xl": "1.1rem",
      },
      boxShadow: {
        soft: "0 1px 2px rgba(16,24,40,0.04), 0 1px 3px rgba(16,24,40,0.06)",
        card: "0 1px 2px rgba(16,24,40,0.06), 0 8px 24px -8px rgba(16,24,40,0.08)",
        pop: "0 12px 40px -12px rgba(58,102,245,0.35)",
      },
      keyframes: {
        "fade-in": {
          "0%": { opacity: "0", transform: "translateY(4px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "pulse-ring": {
          "0%": { transform: "scale(0.8)", opacity: "0.7" },
          "100%": { transform: "scale(2.4)", opacity: "0" },
        },
        shimmer: {
          "0%": { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
      },
      animation: {
        "fade-in": "fade-in 0.4s ease-out both",
        "pulse-ring": "pulse-ring 1.4s ease-out infinite",
        shimmer: "shimmer 2.4s linear infinite",
      },
    },
  },
  plugins: [],
};

export default config;
