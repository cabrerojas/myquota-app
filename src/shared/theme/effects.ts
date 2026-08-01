/**
 * Visual effects — glass surfaces, glows, and shadows.
 *
 * These are style creators, not components. Import and spread into
 * your component's style array for consistent glassmorphism effects.
 */

import { ViewStyle, Platform } from "react-native";
import { colors } from "./colors";
import { borderRadius } from "./tokens";

/**
 * Standard glass surface: solid dark base with glass border.
 *
 * @param elevated - When true, adds accent glow shadow for highlighted cards.
 */
export function glassSurface(elevated: boolean = false): ViewStyle {
  const style: ViewStyle = {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.glass,
    overflow: "hidden",
  };

  if (elevated) {
    style.shadowColor = colors.accent;
    style.shadowOffset = { width: 0, height: 4 };
    style.shadowOpacity = 0.3;
    style.shadowRadius = 12;
    style.elevation = 8;
  }

  return style;
}

/**
 * Subtle glass surface: lower opacity, thinner border.
 * Use for backgrounds, containers that shouldn't compete with content.
 */
export const glassSubtle: ViewStyle = {
  backgroundColor: "rgba(26,36,64,0.5)",
  borderWidth: 1,
  borderColor: colors.borderLight,
  borderRadius: 12,
};

/**
 * Accent glow shadow — use on elevated/highlighted elements.
 */
export const accentGlow: ViewStyle = {
  shadowColor: colors.accent,
  shadowOffset: { width: 0, height: 0 },
  shadowOpacity: 0.4,
  shadowRadius: 16,
  elevation: 6,
};

/**
 * Inset shadow for pressed/depressed states.
 */
export const insetShadow: ViewStyle = {
  shadowColor: "#000000",
  shadowOffset: { width: 0, height: -2 },
  shadowOpacity: 0.2,
  shadowRadius: 4,
  elevation: 1,
};

export const effects = {
  glassSurface,
  glassSubtle,
  accentGlow,
  insetShadow,
};

// ─── Shared icon containers ──────────────────────────────────────────

/** Standard icon container (42×42, glass bg). */
export const iconContainer: ViewStyle = {
  width: 42,
  height: 42,
  borderRadius: 12,
  backgroundColor: "rgba(59,130,246,0.1)",
  justifyContent: "center",
  alignItems: "center",
};

/** Small variant (34×34). */
export const iconContainerSm: ViewStyle = {
  ...iconContainer,
  width: 34,
  height: 34,
  borderRadius: 10,
};

/** Large variant (48×48). */
export const iconContainerLg: ViewStyle = {
  ...iconContainer,
  width: 48,
  height: 48,
};
