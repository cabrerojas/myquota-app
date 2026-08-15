import React from "react";
import { View, StyleSheet } from "react-native";
import Skeleton, {
  SkeletonCard,
  SkeletonChips,
} from "@/shared/components/Skeleton";
import { spacing, borderRadius, colors } from "@/shared/theme/tokens";

/** Skeleton placeholder that mirrors the QuotasScreen layout */
export default function QuotasSkeleton() {
  return (
    <View style={styles.container}>
      {/* Card selector chips */}
      <SkeletonChips count={3} />

      {/* Summary card */}
      <SkeletonCard style={styles.summaryCard}>
        <View style={styles.summaryRow}>
          <View style={styles.summaryCol}>
            <Skeleton width={24} height={24} borderRadius={12} />
            <Skeleton width={30} height={22} style={{ marginTop: 4 }} />
            <Skeleton width={60} height={12} style={{ marginTop: 2 }} />
          </View>
          <View style={styles.divider} />
          <View style={styles.summaryCol}>
            <Skeleton width={24} height={24} borderRadius={12} />
            <Skeleton width={30} height={22} style={{ marginTop: 4 }} />
            <Skeleton width={60} height={12} style={{ marginTop: 2 }} />
          </View>
          <View style={styles.divider} />
          <View style={styles.summaryCol}>
            <Skeleton width={24} height={24} borderRadius={12} />
            <Skeleton width={70} height={22} style={{ marginTop: 4 }} />
            <Skeleton width={40} height={12} style={{ marginTop: 2 }} />
          </View>
        </View>
      </SkeletonCard>

      {/* Filter tabs */}
      <View style={styles.filterRow}>
        <Skeleton width={90} height={32} borderRadius={borderRadius.xl} />
        <Skeleton width={80} height={32} borderRadius={borderRadius.xl} />
        <Skeleton width={70} height={32} borderRadius={borderRadius.xl} />
      </View>

      {/* Quota cards */}
      {[1, 2, 3].map((i) => (
        <SkeletonCard key={i} style={styles.quotaCard}>
          <View style={styles.quotaHeader}>
            <Skeleton width="55%" height={16} />
            <Skeleton width={70} height={22} borderRadius={borderRadius.sm} />
          </View>
          <Skeleton width="40%" height={13} style={{ marginTop: 4 }} />
          <Skeleton
            width="100%"
            height={6}
            borderRadius={3}
            style={{ marginTop: spacing.sm }}
          />
          <View style={styles.quotaFooter}>
            <Skeleton width="30%" height={12} />
            <Skeleton width="25%" height={12} />
          </View>
        </SkeletonCard>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: spacing.md,
  },
  summaryCard: {
    marginTop: spacing.sm,
  },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "center",
  },
  summaryCol: {
    alignItems: "center",
    gap: 2,
  },
  divider: {
    width: 1,
    height: 50,
    backgroundColor: colors.borderLight,
  },
  filterRow: {
    flexDirection: "row",
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  quotaCard: {
    marginBottom: spacing.sm,
  },
  quotaHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  quotaFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: spacing.sm,
  },
});
