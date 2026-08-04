/**
 * Typography tokens — fonts and presets.
 *
 * Font: Inter (loaded globally via @expo-google-fonts/inter).
 * NEVER hardcode fontSize/fontWeight in components — use presets.
 * fontWeight is ALWAYS a numeric string: "400" | "500" | "600" | "700".
 */

export const typography = {
  fontFamily: "Inter",

  weights: {
    regular: "400",
    medium: "500",
    semibold: "600",
    bold: "700",
  } as const,

  presets: {
    /** Screen titles — 28px bold */
    h1:          { fontSize: 28, fontWeight: "700", lineHeight: 34 } as const,
    /** Section headers — 22px semibold */
    h2:          { fontSize: 22, fontWeight: "600", lineHeight: 28 } as const,
    /** Card titles — 18px semibold */
    h3:          { fontSize: 18, fontWeight: "600", lineHeight: 24 } as const,
    /** Body text — 15px regular */
    body:        { fontSize: 15, fontWeight: "400", lineHeight: 22 } as const,
    /** Secondary text — 13px regular */
    bodySmall:   { fontSize: 13, fontWeight: "400", lineHeight: 18 } as const,
    /** Meta, badges, legal — 11px regular */
    caption:     { fontSize: 11, fontWeight: "400", lineHeight: 16 } as const,
    /** Labels, chips — 13px semibold */
    label:       { fontSize: 13, fontWeight: "600", lineHeight: 18 } as const,
    /** Montos medianos — 20px semibold */
    amount:      { fontSize: 20, fontWeight: "600", lineHeight: 28 } as const,
    /** Montos grandes — 28px bold */
    amountLg:    { fontSize: 28, fontWeight: "700", lineHeight: 34 } as const,
    /** Hero amounts — 34px bold */
    amountXl:    { fontSize: 34, fontWeight: "700", lineHeight: 40 } as const,
    /** Botones — 15px semibold */
    button:      { fontSize: 15, fontWeight: "600", lineHeight: 20 } as const,
    /** Botones chicos — 13px semibold */
    buttonSm:    { fontSize: 13, fontWeight: "600", lineHeight: 18 } as const,
    /** Tabs, chips — 13px medium */
    tab:         { fontSize: 13, fontWeight: "500", lineHeight: 18 } as const,
    /** UPPERCASE card labels — 14px bold */
    cardTitle:   { fontSize: 14, fontWeight: "700", lineHeight: 18, color: "#FFFFFF" } as const,
  } as const,
} as const;

export type TypographyTokens = typeof typography;
