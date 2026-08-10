import { useEffect, useRef } from "react";
import {
  View,
  Text,
  Pressable,
  Animated,
  Platform,
  StyleSheet,
  AccessibilityInfo,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { BlurView } from "expo-blur";
import { GlassView, isGlassEffectAPIAvailable } from "expo-glass-effect";
import * as Haptics from "expo-haptics";
import { Ionicons } from "@expo/vector-icons";
import type { BottomTabBarProps } from "@react-navigation/bottom-tabs";
import { colors } from "@/shared/theme/colors";
import { iconSize } from "@/shared/theme/effects";

// ─── Types ──────────────────────────────────────────────────────────────────

interface TabConfig {
  routeName: string;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
}

// ─── Tab registry ───────────────────────────────────────────────────────────

const TABS: TabConfig[] = [
  { routeName: "inicio", label: "Inicio", icon: "home-outline" },
  { routeName: "transacciones", label: "Transacciones", icon: "receipt-outline" },
  { routeName: "proyecciones", label: "Proyecciones", icon: "trending-up-outline" },
  { routeName: "perfil", label: "Perfil", icon: "person-outline" },
];

// ─── Single tab button ──────────────────────────────────────────────────────

function TabButton({
  config,
  isActive,
  onPress,
}: {
  config: TabConfig;
  isActive: boolean;
  onPress: () => void;
}) {
  const scale = useRef(new Animated.Value(1)).current;

  const handlePressIn = () => {
    Animated.spring(scale, {
      toValue: 0.95,
      useNativeDriver: Platform.OS !== "web",
      friction: 8,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scale, {
      toValue: 1,
      useNativeDriver: Platform.OS !== "web",
      friction: 8,
    }).start();
  };

  return (
    <Animated.View style={{ transform: [{ scale }], flex: 1 }}>
      <Pressable
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        style={({ pressed }) => [
          styles.tab,
          pressed && styles.tabPressed,
        ]}
        accessibilityLabel={config.label}
        accessibilityRole="tab"
        accessibilityState={{ selected: isActive }}
        hitSlop={8}
      >
        {isActive && <View style={styles.activePill} />}
        <Ionicons
          name={config.icon}
          size={iconSize.md}
          color={isActive ? colors.accent : colors.textSecondary}
        />
        <Text
          style={[
            styles.label,
            isActive ? styles.labelActive : styles.labelInactive,
          ]}
          numberOfLines={1}
        >
          {config.label}
        </Text>
      </Pressable>
    </Animated.View>
  );
}

// ─── Main component ─────────────────────────────────────────────────────────

export function LiquidGlassTabBar({ state, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const bottomPadding = insets.bottom > 0 ? insets.bottom : 8;

  const handlePress = (routeName: string, index: number) => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }

    const event = navigation.emit({
      type: "tabPress",
      target: routeName,
      canPreventDefault: true,
    });

    if (!event.defaultPrevented) {
      navigation.navigate(routeName);
    }
  };

  const barContent = (
    <View style={[styles.inner, { paddingBottom: bottomPadding }]}>
      {TABS.map((tab) => {
        const route = state.routes.find((r) => r.name === tab.routeName);
        const isActive = route ? state.index === state.routes.indexOf(route) : false;
        return (
          <TabButton
            key={tab.routeName}
            config={tab}
            isActive={isActive}
            onPress={() => handlePress(tab.routeName, state.routes.indexOf(route!))}
          />
        );
      })}
    </View>
  );

  if (Platform.OS === "ios") {
    // Pattern A: Guarded Adaptive Glass — try native GlassView first, fall back to BlurView
    if (isGlassEffectAPIAvailable()) {
      return (
        <View style={styles.wrapper}>
          <GlassView
            style={styles.glass}
            glassEffectStyle="regular"
            tintColor="rgba(15,23,42,0.55)"
          >
            {barContent}
          </GlassView>
        </View>
      );
    }

    return (
      <View style={styles.wrapper}>
        <BlurView
          tint="systemMaterialDark"
          intensity={95}
          style={styles.blur}
        >
          {barContent}
        </BlurView>
      </View>
    );
  }

  return (
    <View style={styles.wrapper}>
      <View style={styles.androidFallback}>{barContent}</View>
    </View>
  );
}

// ─── Styles ─────────────────────────────────────────────────────────────────

const BAR_BORDER_RADIUS = 24;

const styles = StyleSheet.create({
  wrapper: {
    position: "absolute",
    bottom: 12,
    left: 12,
    right: 12,
    borderRadius: BAR_BORDER_RADIUS,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: colors.border,
  },
  blur: {
    borderRadius: BAR_BORDER_RADIUS,
    overflow: "hidden",
  },
  glass: {
    borderRadius: BAR_BORDER_RADIUS,
    overflow: "hidden",
  },
  androidFallback: {
    backgroundColor: "rgba(15, 23, 42, 0.94)",
    borderRadius: BAR_BORDER_RADIUS,
  },
  inner: {
    flexDirection: "row",
    alignItems: "center",
    paddingTop: 6,
  },
  tab: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 6,
    position: "relative",
  },
  tabPressed: {
    opacity: 0.5,
  },
  activePill: {
    position: "absolute",
    top: 2,
    bottom: 2,
    width: "70%",
    borderRadius: 20,
    backgroundColor: colors.accent + "33", // 20% opacity
  },
  label: {
    fontSize: 10,
    fontFamily: "Inter_500Medium",
    marginTop: 2,
  },
  labelActive: {
    color: colors.accent,
  },
  labelInactive: {
    color: colors.textSecondary,
  },
});
