/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./src/client/**/*.{js,ts,jsx,tsx,html}",
    "./src/admin/**/*.{js,ts,jsx,tsx,html}",
    "./src/shared/**/*.{js,ts,jsx,tsx}",
    "./index.html",
  ],
  theme: {
    extend: {
      colors: {
        // Brand palette: deep navy masthead + newsroom red accent.
        navy: {
          50: "#eef2f8",
          100: "#d9e2ef",
          200: "#b3c5dd",
          300: "#84a3c6",
          400: "#547dad",
          500: "#2f5b8f",
          600: "#1d4270",
          700: "#122c4e",
          800: "#0c1f38",
          900: "#081426",
          950: "#050b18",
        },
        brand: {
          DEFAULT: "#c8102e",
          50: "#fdf0f2",
          100: "#fbdde1",
          200: "#f6b8c1",
          300: "#ef8b9b",
          400: "#e0526a",
          500: "#c8102e",
          600: "#a50d27",
          700: "#830a1f",
          800: "#5f0817",
          900: "#3d0510",
        },
      },
      fontFamily: {
        // Bengali-first stack: Noto Sans Bengali / Noto Serif Bengali fall
        // back to system fonts. Load the webfonts in index.html.
        sans: [
          '"Noto Sans Bengali"',
          '"Noto Sans"',
          "system-ui",
          "-apple-system",
          '"Segoe UI"',
          "Roboto",
          "sans-serif",
        ],
        serif: [
          '"Noto Serif Bengali"',
          '"Noto Serif"',
          "Georgia",
          '"Times New Roman"',
          "serif",
        ],
        bengali: ['"Noto Sans Bengali"', '"Noto Serif Bengali"', "sans-serif"],
      },
    },
  },
  plugins: [require("@tailwindcss/typography")],
};
