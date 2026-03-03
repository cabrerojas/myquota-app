import React from "react";
import { View, StyleSheet } from "react-native";
import Skeleton, {
  SkeletonCard,
  SkeletonChips,
  SkeletonRow,
} from "@/shared/components/Skeleton";
import { spacing } from "@/shared/theme/tokens";

/** Skeleton placeholder that mirrors the DashboardScreen layout */
export default function DashboardSkeleton() {
  return (
    <View style={styles.container}>
      {/* Welcome text */}
      <Skeleton width="45%" height={24} style={{ marginBottom: spacing.lg }} />

      {/* Section title "Mis Tarjetas" */}
      <Skeleton width="30%" height={16} style={{ marginBottom: spacing.sm }} />

      {/* Card selector chips */}
      <SkeletonChips count={3} />

      {/* Import button */}
      <Skeleton
        width="100%"
        height={44}
        borderRadius={10}
        style={{ marginTop: spacing.md, marginBottom: spacing.md }}
      />

      {/* Month summary card */}
      <SkeletonCard>
        <Skeleton width="50%" height={16} />
        <View style={styles.summaryRow}>
          <View style={styles.summaryCol}>
            <Skeleton width={60} height={28} />
            <Skeleton width={40} height={12} style={{ marginTop: 4 }} />
          </View>
          <View style={styles.summaryCol}>
            <Skeleton width={60} height={28} />
            <Skeleton width={40} height={12} style={{ marginTop: 4 }} />
          </View>
        </View>
      </SkeletonCard>

      {/* Debt indicator card */}
      <SkeletonCard>
        <Skeleton width="40%" height={16} />
        <Skeleton width="100%" height={8} borderRadius={4} />
        <View style={styles.summaryRow}>
          <Skeleton width="30%" height={14} />
          <Skeleton width="30%" height={14} />
        </View>
      </SkeletonCard>

      {/* Section title "Últimas Transacciones" */}
      <Skeleton
        width="50%"
        height={16}
        style={{ marginTop: spacing.sm, marginBottom: spacing.sm }}
      />

      {/* Transaction rows */}
      <SkeletonRow />
      <SkeletonRow />
      <SkeletonRow />
      <SkeletonRow />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: spacing.md,
  },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: spacing.sm,
  },
  summaryCol: {
    alignItems: "center",
    gap: 2,
  },
});
