import { View, Text, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { glassSurface, glassSubtle } from "@/shared/theme/effects";
import { colors } from "@/shared/theme/colors";
import { borderRadius, spacing } from "@/shared/theme/tokens";

interface FinancialHealthIndicatorProps {
  monthlyBudgetCLP?: number;
  monthlyBudgetUSD?: number;
  spentCLP?: number;
  spentUSD?: number;
  daysToClose?: number | null;
}

type HealthLevel = "excellent" | "good" | "moderate" | "warning" | "critical";

const getHealthLevel = (usagePercent: number): HealthLevel => {
  if (usagePercent < 50) return "excellent";
  if (usagePercent < 70) return "good";
  if (usagePercent < 85) return "moderate";
  if (usagePercent < 95) return "warning";
  return "critical";
};

const healthConfig: Record<
  HealthLevel,
  {
    color: string;
    bgAccent: string;
    icon: keyof typeof Ionicons.glyphMap;
    label: string;
  }
> = {
  excellent: {
    color: colors.success,
    bgAccent: "rgba(5, 150, 105, 0.15)",
    icon: "shield-checkmark",
    label: "Saludable",
  },
  good: {
    color: colors.accent,
    bgAccent: "rgba(59, 130, 246, 0.15)",
    icon: "trending-up",
    label: "Moderado",
  },
  moderate: {
    color: colors.warning,
    bgAccent: "rgba(217, 119, 6, 0.15)",
    icon: "warning",
    label: "Atención",
  },
  warning: {
    color: colors.warning,
    bgAccent: "rgba(217, 119, 6, 0.15)",
    icon: "alert-circle",
    label: "Alto",
  },
  critical: {
    color: colors.destructive,
    bgAccent: "rgba(220, 38, 38, 0.15)",
    icon: "close-circle",
    label: "Crítico",
  },
};

export default function FinancialHealthIndicator({
  monthlyBudgetCLP,
  monthlyBudgetUSD,
  spentCLP = 0,
  spentUSD = 0,
  daysToClose,
}: FinancialHealthIndicatorProps) {
  const hasCLP = monthlyBudgetCLP && monthlyBudgetCLP > 0;
  const hasUSD = monthlyBudgetUSD && monthlyBudgetUSD > 0;
  const noBudget = !hasCLP && !hasUSD;

  if (noBudget) {
    return (
      <View style={styles.noBudgetContainer}>
        <View style={styles.noBudgetHeader}>
          <View style={styles.headerLeft}>
            <View style={styles.iconCircle}>
              <Ionicons
                name="wallet-outline"
                size={18}
                color={colors.secondary}
              />
            </View>
            <View>
              <Text style={styles.overline}>SALUD FINANCIERA</Text>
              <Text style={styles.noBudgetTitle}>Sin presupuesto</Text>
            </View>
          </View>
          <Ionicons
            name="arrow-forward-circle-outline"
            size={24}
            color={colors.secondary}
          />
        </View>
        <Text style={styles.noBudgetHint}>
          Configura un límite mensual en Perfil para ver cuánto te queda
          disponible.
        </Text>
      </View>
    );
  }

  let overallHealth: HealthLevel = "excellent";
  let maxUsage = 0;

  if (hasCLP) {
    const clpUsage = (spentCLP / monthlyBudgetCLP!) * 100;
    maxUsage = Math.max(maxUsage, clpUsage);
  }
  if (hasUSD) {
    const usdUsage = (spentUSD / monthlyBudgetUSD!) * 100;
    maxUsage = Math.max(maxUsage, usdUsage);
  }

  if (maxUsage > 0) {
    overallHealth = getHealthLevel(maxUsage);
  }

  const headerConfig = healthConfig[overallHealth];
  const primaryCurrency = hasCLP ? "CLP" : "USD";
  const budget = hasCLP ? monthlyBudgetCLP! : monthlyBudgetUSD!;
  const spent = hasCLP ? spentCLP : spentUSD;
  const currencySymbol = primaryCurrency === "CLP" ? "$" : "US$";
  const usagePercent = (spent / budget) * 100;
  const progress = Math.min(Math.max(usagePercent, 0), 100);
  const remaining = budget - spent;
  const remainingLabel = remaining >= 0 ? "Te quedan" : "Excediste por";
  const explanation =
    overallHealth === "excellent" || overallHealth === "good"
      ? "Vas dentro de tu límite mensual."
      : "Revisa tus próximos gastos para cuidar tu límite.";

  return (
    <View
      style={styles.container}
      accessibilityLabel="Indicador de salud financiera"
    >
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.overline}>SALUD FINANCIERA</Text>
        </View>
        <View
          style={[
            styles.statusIcon,
            { backgroundColor: headerConfig.bgAccent },
          ]}
        >
          <Ionicons
            name={headerConfig.icon}
            size={18}
            color={headerConfig.color}
          />
        </View>
      </View>

      <Text style={styles.primaryAmount}>
        {currencySymbol}
        {spent.toLocaleString("es-CL")}
      </Text>
      <Text style={styles.primaryLabel}>gastado este mes</Text>
      <Text style={styles.remainingAmount}>
        {remainingLabel} {currencySymbol}
        {Math.abs(remaining).toLocaleString("es-CL")}
      </Text>
      {daysToClose !== null && daysToClose !== undefined && (
        <View style={styles.closingRow}>
          <Ionicons name="calendar-outline" size={14} color={colors.textSecondary} />
          <Text style={styles.closingText}>
            {daysToClose === 0
              ? "Tu facturación cierra hoy"
              : `Quedan ${daysToClose} día${daysToClose !== 1 ? "s" : ""} para el cierre`}
          </Text>
        </View>
      )}
      <View
        style={styles.progressTrack}
        accessibilityLabel={`${Math.round(usagePercent)}% del presupuesto utilizado`}
      >
        <View
          style={[
            styles.progressFill,
            { width: `${progress}%`, backgroundColor: headerConfig.color },
          ]}
        />
      </View>
      <View style={styles.statusRow}>
        <View style={styles.statusLabelWrap}>
          <View
            style={[
              styles.indicatorDot,
              { backgroundColor: headerConfig.color },
            ]}
          />
          <Text style={[styles.statusLabel, { color: headerConfig.color }]}>
            {headerConfig.label}
          </Text>
        </View>
        <Text style={styles.statusExplanation}>{explanation}</Text>
      </View>
      {hasCLP && hasUSD && (
        <Text style={styles.secondaryCurrency}>
          USD {spentUSD.toLocaleString("es-CL")} /{" "}
          {monthlyBudgetUSD!.toLocaleString("es-CL")}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...glassSurface(true),
    padding: spacing.lg,
    marginBottom: spacing.md,
  } as any,
  noBudgetContainer: {
    ...glassSubtle,
    padding: spacing.lg,
    marginBottom: spacing.md,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: spacing.sm2,
  },
  noBudgetHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: spacing.sm2,
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  iconCircle: {
    width: 44,
    height: 44,
    borderRadius: borderRadius.card,
    backgroundColor: colors.successBg,
    alignItems: "center",
    justifyContent: "center",
  },
  overline: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 1.2,
    color: colors.textSecondary,
  },
  noBudgetTitle: {
    color: colors.textPrimary,
    fontSize: 18,
    fontWeight: "700",
    marginTop: 3,
  },
  statusIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  primaryAmount: {
    color: colors.textPrimary,
    fontSize: 32,
    fontWeight: "800",
    letterSpacing: -0.8,
  },
  primaryLabel: {
    color: colors.textSecondary,
    fontSize: 13,
    marginTop: 2,
  },
  remainingAmount: {
    color: colors.textPrimary,
    fontSize: 16,
    fontWeight: "700",
    marginTop: spacing.md,
  },
  progressTrack: {
    height: 8,
    backgroundColor: colors.borderLight,
    borderRadius: borderRadius.full,
    overflow: "hidden",
    marginTop: spacing.sm,
  },
  progressFill: {
    height: "100%",
    borderRadius: borderRadius.full,
  },
  statusRow: {
    marginTop: spacing.sm2,
    gap: spacing.xs,
  },
  statusLabelWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  statusLabel: {
    fontSize: 14,
    fontWeight: "700",
  },
  statusExplanation: {
    color: colors.textSecondary,
    fontSize: 13,
    lineHeight: 18,
  },
  secondaryCurrency: {
    color: colors.textSecondary,
    fontSize: 12,
    marginTop: spacing.sm2,
  },
  noBudgetHint: {
    fontSize: 13,
    color: colors.textSecondary,
    lineHeight: 19,
  },
  indicatorDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  closingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: spacing.sm,
    paddingVertical: 6,
    paddingHorizontal: 10,
    backgroundColor: "rgba(255,255,255,0.04)",
    borderRadius: borderRadius.sm,
    alignSelf: "flex-start",
  },
  closingText: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: "500",
  },
});
