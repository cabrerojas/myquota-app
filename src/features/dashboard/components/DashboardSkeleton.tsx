import { View, StyleSheet, Animated, Platform } from "react-native";
import { useRef, useEffect } from "react";
import { colors } from "@/shared/theme/colors";
import { spacing, borderRadius } from "@/shared/theme/tokens";
import Skeleton, { SkeletonCard } from "@/shared/components/Skeleton";

/** Single shimmer block matching card dimensions. */
function SkeletonBlock({
  width,
  height,
  radius = borderRadius.md,
}: {
  width: number | string;
  height: number;
  radius?: number;
}) {
  const shimmer = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.timing(shimmer, {
        toValue: 1,
        duration: 1200,
        useNativeDriver: Platform.OS !== "web",
      }),
    );
    loop.start();
    return () => loop.stop();
  }, [shimmer]);

  const opacity = shimmer.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [0.15, 0.25, 0.15],
  });

  return (
    <Animated.View
      style={[
        {
          width: width as any,
          height,
          borderRadius: radius,
          backgroundColor: colors.textPrimary,
          opacity,
        },
      ]}
    />
  );
}

/** Mimics MonthSummaryCard loading state. */
export function MonthSummarySkeleton() {
  return (
    <View style={s.card}>
      <SkeletonBlock width={120} height={18} />
      <View style={{ flexDirection: "row", marginTop: spacing.md }}>
        <SkeletonBlock width="45%" height={36} />
        <SkeletonBlock width="45%" height={36} />
      </View>
      <SkeletonBlock width="60%" height={14} radius={7} />
    </View>
  );
}

/** Mimics DebtIndicatorCard loading state. */
export function DebtIndicatorSkeleton() {
  return (
    <View style={s.card}>
      <SkeletonBlock width={100} height={18} />
      <View style={{ flexDirection: "row", marginTop: spacing.sm }}>
        <SkeletonBlock width="30%" height={14} radius={7} />
      </View>
      <SkeletonBlock width="70%" height={28} radius={7} />
    </View>
  );
}

/** Mimics MonthlyStats loading state. */
export function MonthlyStatsSkeleton() {
  return (
    <View style={s.card}>
      <SkeletonBlock width={140} height={18} />
      <View style={{ gap: spacing.sm, marginTop: spacing.md }}>
        {[1, 2, 3].map((i) => (
          <View
            key={i}
            style={{ flexDirection: "row", justifyContent: "space-between" }}
          >
            <SkeletonBlock width={100} height={16} />
            <View style={{ flexDirection: "row", gap: spacing.sm }}>
              <SkeletonBlock width={80} height={16} />
              <SkeletonBlock width={60} height={16} />
            </View>
          </View>
        ))}
      </View>
    </View>
  );
}

/** Mimics FinancialHealthIndicator loading state. */
export function FinancialHealthSkeleton() {
  return (
    <SkeletonCard>
      <View style={{ flexDirection: "row", gap: 12 }}>
        {/* CLP indicator skeleton */}
        <View style={{ flex: 1, gap: 8 }}>
          <Skeleton width={80} height={14} />
          <Skeleton width="100%" height={6} borderRadius={4} />
          <Skeleton width={60} height={13} />
        </View>
        {/* USD indicator skeleton */}
        <View style={{ flex: 1, gap: 8 }}>
          <Skeleton width={80} height={14} />
          <Skeleton width="100%" height={6} borderRadius={4} />
          <Skeleton width={60} height={13} />
        </View>
      </View>
    </SkeletonCard>
  );
}

/** Full dashboard skeleton. */
export default function DashboardSkeleton() {
  return (
    <View style={s.container}>
      {/* Welcome line */}
      <SkeletonBlock width={180} height={24} radius={12} />
      <View style={{ height: spacing.lg }} />
      {/* Financial health indicator */}
      <FinancialHealthSkeleton />
      <View style={{ height: spacing.lg }} />
      {/* Card selector row */}
      <SkeletonBlock width="100%" height={44} radius={12} />
      <View style={{ height: spacing.lg }} />
      {/* Import button */}
      <SkeletonBlock width="100%" height={48} radius={12} />
      <View style={{ height: spacing.lg }} />
      {/* Stat cards */}
      <MonthSummarySkeleton />
      <View style={{ height: spacing.md }} />
      <DebtIndicatorSkeleton />
      <View style={{ height: spacing.md }} />
      <MonthlyStatsSkeleton />
    </View>
  );
}

const s = StyleSheet.create({
  container: {
    padding: spacing.lg,
    paddingBottom: 40,
  },
  card: {
    backgroundColor: "rgba(255,255,255,0.03)",
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    marginBottom: spacing.md,
  },
});
