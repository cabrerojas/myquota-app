/**
 * ThemeContext — dark-only theme provider for MyQuota.
 *
 * Usage:
 *   <ThemeProvider><App /></ThemeProvider>
 *   const { colors, effects } = useAppTheme();
 */

import React, { createContext, useContext } from "react";
import { colors } from "./colors";
import { typography } from "./typography";
import { effects } from "./effects";
import { spacing, fontSizes, borderRadius } from "./tokens";

export interface Theme {
  colors: typeof colors;
  spacing: typeof spacing;
  fontSizes: typeof fontSizes;
  borderRadius: typeof borderRadius;
  typography: typeof typography;
  effects: typeof effects;
}

const theme: Theme = {
  colors,
  spacing,
  fontSizes,
  borderRadius,
  typography,
  effects,
};

const ThemeContext = createContext<Theme>(theme);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  return (
    <ThemeContext.Provider value={theme}>{children}</ThemeContext.Provider>
  );
}

export function useAppTheme(): Theme {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error("useAppTheme must be used within a <ThemeProvider>");
  }
  return ctx;
}
