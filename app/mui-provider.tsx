"use client";

import { CssBaseline, ThemeProvider } from "@mui/material";
import muiTheme from "./mui-theme";
import { CacheProvider } from "@emotion/react";
import createCache from "@emotion/cache";

const muiCache = createCache({
  key: "mui",
  prepend: true,
});

export function MuiProvider({ children }: { children: React.ReactNode }) {
  return (
    <CacheProvider value={muiCache}>
      <ThemeProvider theme={muiTheme}>
        <CssBaseline />
        {children}
      </ThemeProvider>
    </CacheProvider>
  );
}
