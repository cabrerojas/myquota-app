import { View, Text, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors, borderRadius } from "@/shared/theme/tokens";

interface FinancialHealthIndicatorProps {
  /** User's monthly budget in CLP */
  monthlyBudgetCLP?: number;
  /** User's monthly budget in USD */
  monthlyBudgetUSD?: number;
  /** Actual spending this month in CLP (next month payment) */
  spentCLP?: number;
  /** Actual spending this month in USD (next month payment) */
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
    bgColor: string;
    icon: keyof typeof Ionicons.glyphMap;
    label: string;
  }
> = {
  excellent: {
    color: "#28A745",
    bgColor: "#E8F5E9",
    icon: "shield-checkmark",
    label: "Saludable",
  },
  good: {
    color: "#17A2B8",
    bgColor: "#E3F2FD",
    icon: "trending-up",
    label: "Moderado",
  },
  moderate: {
    color: "#FFC107",
    bgColor: "#FFF8E1",
    icon: "warning",
    label: "Atención",
  },
  warning: {
    color: "#F57C00",
    bgColor: "#FFF3E0",
    icon: "alert-circle",
    label: "Alto",
  },
  critical: {
    color: "#DC3545",
    bgColor: "#FFEBEE",
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
      <Text style={styles.indicatorFlag}>
        {currency === "CLP" ? "🇨🇱" : "🇺🇸"}
      </Text>
      <Text style={styles.indicatorText}>
        {currencySymbol}
        {spentFormatted} / {currencySymbol}
        {budgetFormatted}
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

  if (!hasCLP && !hasUSD) return null;

  // Calculate overall health for the header
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
  const hasAnyBudget = hasCLP || hasUSD;

  if (!hasAnyBudget) return null;

  return (
    <View style={[styles.container, { backgroundColor: headerConfig.bgColor }]}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <View
            style={[styles.iconCircle, { backgroundColor: headerConfig.color }]}
          >
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
    padding: 16,
    borderRadius: borderRadius.xl,
    marginBottom: 16,
    // Enhanced glass with blue accent
    backgroundColor: colors.glassBg,
    borderWidth: 1,
    borderColor: colors.glassBorder,
    shadowColor: colors.glassShadow,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 1,
    shadowRadius: 16,
    elevation: 4,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  iconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  headerLabel: {
    fontSize: 15,
    fontWeight: "700",
  },
  headerSubtitle: {
    fontSize: 11,
    color: colors.textMuted,
  },
  indicators: {
    gap: 8,
  },
  indicatorRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  indicatorDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  indicatorFlag: {
    fontSize: 16,
  },
  indicatorText: {
    fontSize: 14,
    color: colors.textSecondary,
    flex: 1,
  },
  indicatorPercent: {
    fontSize: 15,
    fontWeight: "700",
  },
});
