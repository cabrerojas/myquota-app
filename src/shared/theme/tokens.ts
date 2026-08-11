/**
 * Design tokens — single source of truth for colors, spacing, and typography.
 *
 * NEVER hard-code hex values in component files.
 * Always import from "@/shared/theme/tokens".
 */

import { colors } from "./colors";

// Re-export semantic colors for convenience
export { colors } from "./colors";
export { typography } from "./typography";
export { effects, glassSurface, glassSubtle } from "./effects";

export const spacing = {
  xs: 4,
  xxs: 2,
  sm: 8,
  sm2: 12,
  md: 16,
  md2: 20,
  lg: 24,
  xl: 32,
  xxl: 40,
  xxxl: 48,
} as const;

/** Height of the floating tab bar zone — bottom inset + tab bar + safe area.
 *  Used as a bottom spacer in scrollable screens so the last item clears the
 *  glass tab bar and is fully tappable. */
export const TAB_BAR_SPACER_HEIGHT = 70;

export const fontSizes = {
  xs: 11,
  sm: 13,
  md: 15,
  lg: 18,
  xl: 22,
  xxl: 28,
} as const;

export const borderRadius = {
  xs: 4,
  sm: 6,
  input: 8,
  md: 10,
  card: 12,
  lg: 14,
  xl: 18,
  glass: 16,
  pill: 20,
  full: 999,
} as const;

// Legacy color names — maintained for backward compatibility
// during migration. New code should use the semantic colors above.
export const legacyColors = {
  primary: colors.primary,
  primaryDark: colors.primaryDark,
  danger: colors.destructive,
  dangerDark: "#B91C1C",
  success: colors.success,
  warning: colors.warning,
  info: colors.secondary,
  bgLight: colors.bg,
  bgWhite: colors.surface,
  textPrimary: colors.textPrimary,
  textSecondary: colors.textSecondary,
  textMuted: colors.textMuted,
  textLight: colors.textMuted,
  border: colors.border,
  borderLight: colors.borderLight,
  cardVisa: "#1A1F71",
  cardMastercard: "#EB001B",
  chartPalette: colors.chartPalette,
} as const;

export { shadows, iconSize } from "./effects";
