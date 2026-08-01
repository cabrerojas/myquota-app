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
export { effects, glassSurface, glassSubtle, accentGlow } from "./effects";

export const spacing = {
  xs: 4,
  sm: 8,
  sm2: 12,
  md: 16,
  md2: 20,
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
  pill: 20,
  glass: 16,
  full: 999,
} as const;

// Legacy color names — maintained for backward compatibility
// during migration. New code should use the semantic colors above.
export const legacyColors = {
  primary: "#3B82F6",
  primaryDark: "#2563EB",
  danger: colors.destructive,
  dangerDark: "#B91C1C",
  success: colors.success,
  warning: colors.warning,
  info: "#3B82F6",
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
  chartPalette: [
    "#3B82F6",
    "#DC2626",
    "#059669",
    "#D97706",
    "#3B82F6",
    "#8B5CF6",
    "#F97316",
    "#14B8A6",
    "#EC4899",
    "#6B7280",
    "#2563EB",
    "#B91C1C",
  ] as readonly string[],
} as const;
