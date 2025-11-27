export default {
  content: [
    "./app/**/*.{js,ts,jsx,tsx}",
    "./components/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          50:  "#EDF9FE",
          100: "#D6F1FD",
          200: "#AEE4FA",
          300: "#86D7F7",
          400: "#66CDF6",
          500: "#6CCFF6",
          600: "#38B3DA",
          700: "#2199C0",
          800: "#147BA0",
          900: "#0E5A74",
        },
        accent: {
          50:  "#F3FADF",
          100: "#E3F5B8",
          200: "#C8EB73",
          300: "#B4E34F",
          400: "#A8DA2E",
          500: "#98CE00",
          600: "#7FAC00",
          700: "#6A8E00",
          800: "#4D6500",
          900: "#364500",
        },
        graybrand: {
          50:  "#F4F4F5",
          100: "#E6E7E9",
          200: "#C7C8CE",
          300: "#A7A8B3",
          400: "#8A8B98",
          500: "#757780",
          600: "#5F616A",
          700: "#4D4E55",
          800: "#36373C",
          900: "#1E1F22",
        },
        bgdark:  "#001011",
        bglight: "#FFFFFC",
      },
      fontFamily: {
        // default UI / body font (Rubik)
        sans: ["var(--font-rubik)", "system-ui", "-apple-system", "sans-serif"],

        // display font (Bebas Neue) for headings, logos, etc.
        display: ["var(--font-bebas)", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
};
