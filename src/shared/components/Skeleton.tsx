import React, { useEffect, useRef } from "react";
import { Animated, StyleSheet, View, ViewStyle } from "react-native";
import { colors, borderRadius, spacing } from "@/shared/theme/tokens";

interface SkeletonProps {
  width?: number | `${number}%`;
  height?: number;
  borderRadius?: number;
  style?: ViewStyle;
}

/**
 * Animated skeleton placeholder that pulses between two grey tones.
 * Use it to build loading placeholders that mirror the shape of real content.
 */
export default function Skeleton({
  width = "100%",
  height = 16,
  borderRadius: radius = borderRadius.sm,
  style,
}: SkeletonProps) {
  const opacity = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0.3,
          duration: 800,
          useNativeDriver: true,
        }),
      ]),
    );
    pulse.start();
    return () => pulse.stop();
  }, [opacity]);

  return (
    <Animated.View
      style={[
        {
          width,
          height,
          borderRadius: radius,
          backgroundColor: colors.borderLight,
          opacity,
        },
        style,
      ]}
    />
  );
}

// ─── Pre-built skeleton compositions ───────────────────────────────────────

/** A card-shaped skeleton with configurable child rows */
interface SkeletonCardProps {
  children: React.ReactNode;
  style?: ViewStyle;
}

export function SkeletonCard({ children, style }: SkeletonCardProps) {
  return <View style={[styles.card, style]}>{children}</View>;
}

/** A row with a circle + two text lines (like a transaction row) */
export function SkeletonRow() {
  return (
    <View style={styles.row}>
      <Skeleton width={40} height={40} borderRadius={borderRadius.full} />
      <View style={styles.rowText}>
        <Skeleton width="60%" height={14} />
        <Skeleton width="35%" height={12} style={{ marginTop: 6 }} />
      </View>
      <Skeleton width={70} height={14} />
    </View>
  );
}

/** Horizontal chips placeholder (like card selector) */
export function SkeletonChips({ count = 3 }: { count?: number }) {
  return (
    <View style={styles.chips}>
      {Array.from({ length: count }).map((_, i) => (
        <Skeleton
          key={i}
          width={100}
          height={36}
          borderRadius={borderRadius.xl}
          style={{ marginRight: spacing.sm }}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.bgWhite,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
    gap: spacing.sm,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: spacing.sm,
    gap: spacing.md,
  },
  rowText: {
    flex: 1,
    gap: 2,
  },
  chips: {
    flexDirection: "row",
    paddingVertical: spacing.sm,
  },
});
