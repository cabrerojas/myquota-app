/**
 * Dark finance semantic color tokens — single source of truth.
 *
 * NEVER hard-code hex values in component files.
 * Always import from "@/shared/theme/colors" or "@/shared/theme/tokens".
 */

export const colors = {
  // ── Fondos ──────────────────────────────────────
  bg:              "#0F172A",   // Fondo principal
  surface:         "#192134",   // Tarjetas, cards (menos saturado de azul que #1A2440)
  surfaceElevated: "#1E2D4A",   // Modals, dropdowns, sheets

  // ── Marca ───────────────────────────────────────
  primary:         "#1E40AF",   // Azul confianza — navegación, identidad
  primaryDark:     "#1E3A8A",   // Estados pressed/hover de primary
  secondary:       "#3B82F6",   // Azul acción — links, chips activos, selecciones
  accent:          "#10B981",   // Verde profit — CTAs positivos (emerald-500, WCAG AA)
  accentDark:      "#059669",   // Estados pressed/hover de accent

  // ── Texto ───────────────────────────────────────
  textPrimary:     "#FFFFFF",
  textSecondary:   "rgba(255,255,255,0.8)",
  textMuted:       "rgba(255,255,255,0.65)",  // WCAG AA on dark bg
  textSubtle:      "rgba(255,255,255,0.45)",  // WCAG AA for large text

  // ── Feedback ────────────────────────────────────
  destructive:     "#DC2626",
  destructiveBg:   "rgba(220,38,38,0.1)",
  success:         "#34D399",   // Éxito (emerald-400, distinguible de accent)
  successBg:       "rgba(52,211,153,0.1)",
  warning:         "#FBBF24",   // Amber-400, WCAG AA on dark bg
  warningBg:       "rgba(251,191,36,0.1)",

  // ── Bordes ──────────────────────────────────────
  border:          "rgba(255,255,255,0.08)",
  borderLight:     "rgba(255,255,255,0.04)",

  // ── Glass ───────────────────────────────────────
  glass: {
    background:    "rgba(26,36,64,0.8)",
    border:        "rgba(255,255,255,0.08)",
    blurIntensity: 20,
  } as const,

  // ── Skeleton ────────────────────────────────────
  skeleton: {
    base:          "rgba(255,255,255,0.06)",
    highlight:     "rgba(255,255,255,0.12)",
  } as const,

  // ── Gráficos ────────────────────────────────────
  chartPalette: [
    "#3B82F6", "#10B981", "#FBBF24", "#DC2626",
    "#8B5CF6", "#F97316", "#14B8A6", "#EC4899",
    "#1E40AF", "#34D399", "#D97706", "#6B7280",
  ] as const,
} as const;

export type ColorTokens = typeof colors;
