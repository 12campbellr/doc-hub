import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        navy: {
          950: "#0a1420",
          900: "#0f1f30",
          800: "#152a40",
          700: "#1d3a56",
          600: "#28506f",
        },
        accent: {
          DEFAULT: "#17b8ac",
          light: "#4fd8cd",
          dark: "#0f8a80",
        },
      },
      fontFamily: {
        sans: [
          "-apple-system",
          "BlinkMacSystemFont",
          "Segoe UI",
          "Roboto",
          "Helvetica Neue",
          "Arial",
          "sans-serif",
        ],
      },
    },
  },
  plugins: [],
};
export default config;
