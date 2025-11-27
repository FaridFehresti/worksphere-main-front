"use client";

import { createTheme } from "@mui/material/styles";

const muiTheme = createTheme({
  palette: {
    primary: {
      main: "#6CCFF6",
      dark: "#147BA0",
      light: "#AEE4FA",
    },
    secondary: {
      main: "#98CE00",
      dark: "#4D6500",
      light: "#C8EB73",
    },
    background: {
      default: "#001011",
      paper: "#FFFFFC",
    },
    text: {
      primary: "#FFFFFC",
      secondary: "#C7C8CE",
    },
  },
  shape: {
    borderRadius: 12,
  },
  typography: {
    // default font = Rubik
    fontFamily:
      "var(--font-rubik), system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",

    // Use Bebas Neue for large display headings
    h1: {
      fontFamily: "var(--font-bebas), var(--font-rubik), system-ui, sans-serif",
      letterSpacing: "0.04em",
      textTransform: "uppercase",
    },
    h2: {
      fontFamily: "var(--font-bebas), var(--font-rubik), system-ui, sans-serif",
      letterSpacing: "0.04em",
      textTransform: "uppercase",
    },
    // other headings still use Rubik by default, but you can customize:
    h3: {
      fontWeight: 600,
    },
  },
});

export default muiTheme;
