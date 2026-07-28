/**
 * Dark finance semantic color tokens — single source of truth.
 *
 * NEVER hard-code hex values in component files.
 * Always import from "@/shared/theme/colors" or "@/shared/theme/tokens".
 */

export const colors = {
  // Legacy aliases for backward compatibility during migration
  bgLight: "#0F172A",
  bgWhite: "#1A2440",
  primary: "#3B82F6",
  primaryDark: "#2563EB",
  danger: "#DC2626",
  dangerDark: "#B91C1C",
  textLight: "rgba(255,255,255,0.5)",
  info: "#3B82F6",
  bg: "#0F172A",
  surface: "#1A2440",
  surfaceElevated: "#1E2D4A",

  // Text hierarchy (opacity scale for white)
  textPrimary: "#FFFFFF",
  textSecondary: "rgba(255,255,255,0.8)",
  textMuted: "rgba(255,255,255,0.5)",
  textSubtle: "rgba(255,255,255,0.3)",

  // Brand / accent
  accent: "#3B82F6",
  accentGlow: "rgba(59,130,246,0.3)",

  // Borders
  border: "rgba(255,255,255,0.08)",
  borderLight: "rgba(255,255,255,0.04)",

  // Feedback
  destructive: "#DC2626",
  success: "#059669",
  warning: "#D97706",

  // Skeleton loading
  skeleton: {
    base: "rgba(255,255,255,0.06)",
    highlight: "rgba(255,255,255,0.12)",
  } as const,

  // Glassmorphism
  glass: {
    background: "rgba(26,36,64,0.8)",
    border: "rgba(255,255,255,0.08)",
    blurIntensity: 20,
  } as const,
} as const;

export type ColorTokens = typeof colors;
