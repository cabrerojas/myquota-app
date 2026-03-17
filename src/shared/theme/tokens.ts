/**
 * Design tokens — single source of truth for colors, spacing, and typography.
 *
 * NEVER hard-code hex values in component files.
 * Always import from "@/shared/theme/tokens".
 */

export const colors = {
  primary: "#007BFF",
  primaryDark: "#0056B3",
  danger: "#DC3545",
  dangerDark: "#C82333",
  success: "#28A745",
  warning: "#FFC107",
  info: "#17A2B8",

  // Backgrounds - Financial blue theme
  bgLight: "#F0F7FF",  // Azul muy sutil
  bgWhite: "#FFFFFF",
  bgCard: "#FFFFFF",

  // Glass morphism backgrounds
  glassBg: "rgba(255, 255, 255, 0.92)",
  glassBorder: "rgba(0, 122, 255, 0.15)",
  glassShadow: "rgba(0, 82, 178, 0.12)",
  
  // Gradient backgrounds
  gradientStart: "#F0F7FF",
  gradientEnd: "#E1EBF8",
  gradientBlueStart: "#E3F2FD",
  gradientBlueEnd: "#BBDEFB",

  // Accent colors for cards
  accentBlue: "#007BFF",
  accentGreen: "#10B981",
  accentOrange: "#F59E0B",
  accentRed: "#EF4444",

  // Text
  textPrimary: "#212529",
  textSecondary: "#495057",
  textMuted: "#868E96",
  textLight: "#6C757D",

  // Borders
  border: "#DEE2E6",
  borderLight: "#E9ECEF",

  // Card brand colors
  cardVisa: "#1A1F71",
  cardMastercard: "#EB001B",

  // Chart palette
  chartPalette: [
    "#007BFF",
    "#DC3545",
    "#28A745",
    "#FFC107",
    "#17A2B8",
    "#6F42C1",
    "#FD7E14",
    "#20C997",
    "#E83E8C",
    "#6C757D",
    "#0056B3",
    "#C82333",
  ] as readonly string[],
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
} as const;

export const fontSizes = {
  xs: 11,
  sm: 13,
  md: 15,
  lg: 18,
  xl: 22,
  xxl: 28,
} as const;

export const borderRadius = {
  sm: 6,
  md: 10,
  lg: 14,
  xl: 18,
  full: 999,
} as const;
