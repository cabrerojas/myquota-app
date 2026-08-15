/**
 * Visual effects — glass surfaces, shadows, and icon containers.
 */

import { ViewStyle } from "react-native";
import { colors } from "./colors";

// Local — avoids circular dependency with tokens.ts
const GLASS_RADIUS = 16;

// ─── Glassmorphism ──────────────────────────────────────────────

export function glassSurface(elevated: boolean = false): ViewStyle {
  const style: ViewStyle = {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: GLASS_RADIUS,
    overflow: "hidden",
  };

  if (elevated) {
    Object.assign(style, shadows.elevated);
  }

  return style;
}

export const glassSubtle: ViewStyle = {
  backgroundColor: "rgba(26,36,64,0.5)",
  borderWidth: 1,
  borderColor: colors.borderLight,
  borderRadius: 12,
};

// ─── Shadows (SÓLO 3 en toda la app) ────────────────────────────

export const shadows = {
  /** Card elevada con glow de acento — glassSurface(true) */
  elevated: {
    shadowColor: colors.accent,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  } as ViewStyle,

  /** FAB y elementos flotantes */
  floating: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 6,
  } as ViewStyle,

  /** Presionado / inset sutil */
  pressed: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 1,
  } as ViewStyle,
};

// ─── Icon scale ─────────────────────────────────────────────────

export const iconSize = {
  xs: 12,   // Badges, indicadores
  sm: 16,   // Acciones inline (edit, delete, chevron)
  md: 20,   // Íconos de sección, navegación
  lg: 24,   // Features, empty states
  xl: 32,   // Hero, login
} as const;

// ─── Icon containers ────────────────────────────────────────────

export const iconContainer: ViewStyle = {
  width: 42,
  height: 42,
  borderRadius: 12,
  backgroundColor: "rgba(59,130,246,0.1)",
  justifyContent: "center",
  alignItems: "center",
};

export const iconContainerSm: ViewStyle = {
  ...iconContainer,
  width: 34,
  height: 34,
  borderRadius: 10,
};

export const iconContainerLg: ViewStyle = {
  ...iconContainer,
  width: 48,
  height: 48,
  borderRadius: 14,
};

// ─── Barrel ─────────────────────────────────────────────────────

export const effects = {
  glassSurface,
  glassSubtle,
  shadows,
  iconSize,
  iconContainer,
  iconContainerSm,
  iconContainerLg,
};
