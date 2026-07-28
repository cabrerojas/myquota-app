import { View, Text, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { glassSurface, glassSubtle } from "@/shared/theme/effects";
import { colors } from "@/shared/theme/colors";

interface FinancialHealthIndicatorProps {
  monthlyBudgetCLP?: number;
  monthlyBudgetUSD?: number;
  spentCLP?: number;
  spentUSD?: number;
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

interface BudgetIndicatorProps {
  budget: number;
  spent: number;
  currency: "CLP" | "USD";
}

function BudgetIndicator({ budget, spent, currency }: BudgetIndicatorProps) {
  if (!budget || budget <= 0) return null;

  const usagePercent = (spent / budget) * 100;
  const health = getHealthLevel(usagePercent);
  const config = healthConfig[health];

  const currencySymbol = currency === "CLP" ? "$" : "US$";
  const spentFormatted = spent.toLocaleString("es-CL");
  const budgetFormatted = budget.toLocaleString("es-CL");

  return (
    <View style={styles.indicatorRow}>
      <View style={[styles.indicatorDot, { backgroundColor: config.color }]} />
      <Text style={styles.indicatorText}>
        {currency === "CLP" ? "🇨🇱 " : "🇺🇸 "}
        {currencySymbol}{spentFormatted} / {currencySymbol}{budgetFormatted}
      </Text>
      <Text style={[styles.indicatorPercent, { color: config.color }]}>
        {Math.round(usagePercent)}%
      </Text>
    </View>
  );
}

export default function FinancialHealthIndicator({
  monthlyBudgetCLP,
  monthlyBudgetUSD,
  spentCLP = 0,
  spentUSD = 0,
}: FinancialHealthIndicatorProps) {
  const hasCLP = monthlyBudgetCLP && monthlyBudgetCLP > 0;
  const hasUSD = monthlyBudgetUSD && monthlyBudgetUSD > 0;
  const noBudget = !hasCLP && !hasUSD;

  if (noBudget) {
    return (
      <View style={styles.noBudgetContainer}>
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <View style={[styles.iconCircle, { backgroundColor: "rgba(59, 130, 246, 0.12)" }]}>
              <Ionicons name="wallet-outline" size={16} color={colors.accent} />
            </View>
            <Text style={[styles.headerLabel, { color: colors.textMuted }]}>
              Sin presupuesto
            </Text>
          </View>
          <Text style={[styles.headerSubtitle, { color: colors.textSubtle }]}>
            Configure su presupuesto mensual
          </Text>
        </View>
        <Text style={styles.noBudgetHint}>
          Vaya a Perfil para definir sus límites mensuales y ver el indicador de salud financiera.
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

  return (
    <View style={[styles.container, { backgroundColor: headerConfig.bgAccent }]}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <View style={[styles.iconCircle, { backgroundColor: headerConfig.color }]}>
            <Ionicons name={headerConfig.icon} size={16} color="#fff" />
          </View>
          <Text style={[styles.headerLabel, { color: headerConfig.color }]}>
            {headerConfig.label}
          </Text>
        </View>
        <Text style={styles.headerSubtitle}>vs presupuesto mensual</Text>
      </View>

      <View style={styles.indicators}>
        {hasCLP && (
          <BudgetIndicator
            budget={monthlyBudgetCLP!}
            spent={spentCLP}
            currency="CLP"
          />
        )}
        {hasUSD && (
          <BudgetIndicator
            budget={monthlyBudgetUSD!}
            spent={spentUSD}
            currency="USD"
          />
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 14,
    borderRadius: 14,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  noBudgetContainer: {
    ...glassSubtle,
    padding: 14,
    marginBottom: 16,
  } as any,
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  iconCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  headerLabel: {
    fontSize: 14,
    fontWeight: "700",
  },
  headerSubtitle: {
    fontSize: 11,
    color: colors.textMuted,
  },
  noBudgetHint: {
    fontSize: 12,
    color: colors.textMuted,
    lineHeight: 17,
    marginTop: -4,
  },
  indicators: {
    gap: 6,
  },
  indicatorRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  indicatorDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  indicatorText: {
    fontSize: 13,
    color: colors.textSecondary,
    flex: 1,
  },
  indicatorPercent: {
    fontSize: 14,
    fontWeight: "700",
  },
});
