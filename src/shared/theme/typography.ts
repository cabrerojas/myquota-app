/**
 * Typography tokens — Inter font configuration and preset styles.
 */

export const fontFamily = "Inter";

export const fontWeights = {
  regular: "400" as const,
  medium: "500" as const,
  semibold: "600" as const,
  bold: "700" as const,
};

export const typography = {
  fontFamily,
  fontWeights,

  presets: {
    h1: { fontSize: 32, fontWeight: fontWeights.bold, fontFamily },
    h2: { fontSize: 24, fontWeight: fontWeights.bold, fontFamily },
    h3: { fontSize: 20, fontWeight: fontWeights.semibold, fontFamily },
    body: { fontSize: 16, fontWeight: fontWeights.regular, fontFamily },
    bodySmall: { fontSize: 14, fontWeight: fontWeights.regular, fontFamily },
    caption: { fontSize: 12, fontWeight: fontWeights.regular, fontFamily },
    label: { fontSize: 14, fontWeight: fontWeights.semibold, fontFamily },
    amount: { fontSize: 20, fontWeight: fontWeights.bold, fontFamily },
    amountLarge: { fontSize: 28, fontWeight: fontWeights.bold, fontFamily },
  } as const,
} as const;

export type TypographyTokens = typeof typography;
