import { View, Text, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";

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
    padding: 14,
    borderRadius: 14,
    marginBottom: 16,
  },
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
    color: "#868E96",
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
  indicatorFlag: {
    fontSize: 14,
  },
  indicatorText: {
    fontSize: 13,
    color: "#495057",
    flex: 1,
  },
  indicatorPercent: {
    fontSize: 14,
    fontWeight: "700",
  },
});
