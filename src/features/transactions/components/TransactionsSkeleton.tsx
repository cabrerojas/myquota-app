import React from "react";
import { View, StyleSheet } from "react-native";
import Skeleton, {
  SkeletonChips,
  SkeletonRow,
} from "@/shared/components/Skeleton";
import { spacing, borderRadius, colors } from "@/shared/theme/tokens";

/** Skeleton placeholder that mirrors the TransactionsScreen layout */
export default function TransactionsSkeleton() {
  return (
    <View style={styles.container}>
      {/* Card selector */}
      <Skeleton width={50} height={14} style={{ marginBottom: spacing.xs }} />
      <SkeletonChips count={3} />

      {/* Search bar */}
      <Skeleton
        width="100%"
        height={40}
        borderRadius={borderRadius.md}
        style={{ marginTop: spacing.sm }}
      />

      {/* Summary bar */}
      <View style={styles.summaryBar}>
        <Skeleton width={90} height={14} />
        <Skeleton width={120} height={14} />
      </View>

      {/* Day group header */}
      <Skeleton
        width="35%"
        height={14}
        style={{ marginTop: spacing.md, marginBottom: spacing.sm }}
      />

      {/* Transaction rows */}
      <SkeletonRow />
      <SkeletonRow />
      <SkeletonRow />

      {/* Day group header */}
      <Skeleton
        width="35%"
        height={14}
        style={{ marginTop: spacing.md, marginBottom: spacing.sm }}
      />

      <SkeletonRow />
      <SkeletonRow />
      <SkeletonRow />
      <SkeletonRow />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: spacing.md,
    backgroundColor: colors.bgLight,
  },
  summaryBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: spacing.md,
  },
});
