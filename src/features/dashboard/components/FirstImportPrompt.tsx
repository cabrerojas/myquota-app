/**
 * FirstImportPrompt
 *
 * Shown when the user has registered a credit card but hasn't imported
 * any transactions yet. Replaces scattered empty-state components with
 * a cohesive next-step guide.
 *
 * Visual:
 *   ┌───────────────────────────────────────────┐
 *   │   ✅  Tarjeta registrada                  │
 *   │   Ahora importá tus primeros movimientos  │
 *   │                                           │
 *   │   Paso 1 ───── Paso 2 ───── Paso 3       │
 *   │   [✅]         [  ]         [  ]          │
 *   │   Tarjeta     Importar     Ver stats      │
 *   │                                           │
 *   │   ┌─────────────────────────────────┐     │
 *   │   │  📥  Importar movimientos      │     │
 *   │   │  Sincroniza tus gastos desde    │     │
 *   │   │  tu bandeja de email            │     │
 *   │   └─────────────────────────────────┘     │
 *   │                                           │
 *   │   💡 Podés importar en cualquier          │
 *   │   momento desde el botón "Sincronizar"    │
 *   └───────────────────────────────────────────┘
 */
import { View, Text, StyleSheet, ActivityIndicator } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors } from "@/shared/theme/colors";
import { glassSurface, iconContainerSm, iconContainerLg } from "@/shared/theme/effects";
import PressableScale from "@/shared/components/PressableScale";

// ─── Types ────────────────────────────────────────────────────────────────────

interface FirstImportPromptProps {
  onImport: () => void;
  isImporting?: boolean;
  cardCount: number;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

interface StepConfig {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  completed: boolean;
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function ProgressStep({
  icon,
  label,
  completed,
  isLast,
  isFirst,
}: StepConfig & { isLast?: boolean; isFirst?: boolean }) {
  return (
    <View style={stepStyles.column}>
      {/* Dot + connector row — dot stays centered, continuous line between dots */}
      <View style={stepStyles.dotRow}>
        {/* Left spacer — visible connector except for first column */}
        <View
          style={[
            stepStyles.spacer,
            stepStyles.spacerLine,
            completed && stepStyles.connectorDone,
            isFirst && stepStyles.spacerHidden,
          ]}
        />
        {/* Dot */}
        <View
          style={[
            stepStyles.dot,
            completed ? stepStyles.dotDone : stepStyles.dotPending,
          ]}
        >
          <Ionicons
            name={completed ? "checkmark" : icon}
            size={completed ? 14 : 16}
            color={completed ? colors.textPrimary : colors.textMuted}
          />
        </View>
        {/* Right spacer — visible connector except for last column */}
        <View
          style={[
            stepStyles.spacer,
            stepStyles.spacerLine,
            completed && stepStyles.connectorDone,
            isLast && stepStyles.spacerHidden,
          ]}
        />
      </View>
      <Text
        style={[
          stepStyles.label,
          completed ? stepStyles.labelDone : stepStyles.labelPending,
        ]}
        numberOfLines={1}
      >
        {label}
      </Text>
    </View>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function FirstImportPrompt({
  onImport,
  isImporting = false,
  cardCount,
}: FirstImportPromptProps) {
  const steps: StepConfig[] = [
    { icon: "card-outline", label: "Tarjeta", completed: true },
    { icon: "download-outline", label: "Importar", completed: false },
    { icon: "stats-chart", label: "Ver stats", completed: false },
  ];

  return (
    <View style={styles.container}>
      {/* ── Header ─────────────────────────────────────────── */}
      <View style={styles.header}>
        <View style={styles.successIcon}>
          <Ionicons name="checkmark-circle" size={24} color={colors.success} />
        </View>
        <View style={styles.headerText}>
          <Text style={styles.headerTitle}>
            {cardCount === 1
              ? "Tarjeta registrada"
              : `${cardCount} tarjetas registradas`}
          </Text>
          <Text style={styles.headerSubtitle}>
            Ahora importá tus primeros movimientos para ver estadísticas y
            proyecciones.
          </Text>
        </View>
      </View>

      {/* ── Progress steps ──────────────────────────────────── */}
      <View style={styles.progressRow}>
        {steps.map((step, i) => (
          <ProgressStep
            key={step.label}
            {...step}
            isFirst={i === 0}
            isLast={i === steps.length - 1}
          />
        ))}
      </View>

      {/* ── Big CTA ─────────────────────────────────────────── */}
      <PressableScale
        onPress={onImport}
        disabled={isImporting}
        style={[styles.ctaCard, isImporting && { opacity: 0.7 }]}
        accessibilityLabel="Importar movimientos"
        accessibilityRole="button"
      >
        <View style={styles.ctaIconWrap}>
          {isImporting ? (
            <ActivityIndicator size="small" color={colors.accent} />
          ) : (
            <Ionicons name="cloud-download-outline" size={28} color={colors.accent} />
          )}
        </View>
        <View style={styles.ctaTextBlock}>
          <Text style={styles.ctaTitle}>
            {isImporting ? "Importando..." : "Importar movimientos"}
          </Text>
          <Text style={styles.ctaBody}>
            {isImporting
              ? "Buscando nuevas transacciones..."
              : "Sincronizá tus gastos bancarios desde tu email"}
          </Text>
        </View>
        {!isImporting && (
          <Ionicons name="arrow-forward" size={20} color={colors.accent} />
        )}
      </PressableScale>

      {/* ── Tip ────────────────────────────────────────────── */}
      <View style={styles.tipRow}>
        <Ionicons name="information-circle-outline" size={14} color={colors.textSubtle} />
        <Text style={styles.tipText}>
          También podés importar después desde el botón "Sincronizar" en cualquier momento.
        </Text>
      </View>
    </View>
  );
}

// ─── Step styles ──────────────────────────────────────────────────────────────

const stepStyles = StyleSheet.create({
  column: {
    flex: 1,
    alignItems: "center",
    gap: 6,
  },
  dotRow: {
    flexDirection: "row",
    alignItems: "center",
    width: "100%",
  },
  spacer: {
    flex: 1,
  },
  spacerLine: {
    height: 1,
    backgroundColor: colors.border,
  },
  spacerHidden: {
    backgroundColor: "transparent",
  },
  dot: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
  },
  dotDone: {
    backgroundColor: colors.success,
  },
  dotPending: {
    backgroundColor: "rgba(255,255,255,0.06)",
    borderWidth: 1,
    borderColor: colors.border,
  },
  label: {
    fontSize: 10,
    fontWeight: "600",
    textAlign: "center",
  },
  labelDone: {
    color: colors.textSecondary,
  },
  labelPending: {
    color: colors.textMuted,
  },
  connector: {
    flex: 1,
    height: 1,
    backgroundColor: colors.border,
  },
  connectorDone: {
    backgroundColor: colors.success,
  },
});

// ─── Main styles ──────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    ...glassSurface(false),
    padding: 20,
    marginTop: 16,
  },

  // Header
  header: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
  },
  successIcon: {
    ...iconContainerSm,
    backgroundColor: "rgba(5,150,105,0.12)",
    marginTop: 2,
  },
  headerText: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: colors.textPrimary,
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 13,
    color: colors.textMuted,
    lineHeight: 19,
  },

  // Progress steps
  progressRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginTop: 20,
    marginBottom: 8,
    gap: 0,
  },

  // CTA
  ctaCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(59,130,246,0.06)",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgba(59,130,246,0.2)",
    padding: 16,
    marginTop: 16,
    gap: 14,
  },
  ctaIconWrap: {
    ...iconContainerLg,
    backgroundColor: "rgba(59,130,246,0.12)",
    flexShrink: 0,
  },
  ctaTextBlock: {
    flex: 1,
  },
  ctaTitle: {
    fontSize: 15,
    fontWeight: "600",
    color: colors.accent,
    marginBottom: 2,
  },
  ctaBody: {
    fontSize: 12,
    color: colors.textMuted,
    lineHeight: 17,
  },

  // Tip
  tipRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 6,
    marginTop: 12,
  },
  tipText: {
    fontSize: 11,
    color: colors.textSubtle,
    lineHeight: 16,
    flex: 1,
  },
});
