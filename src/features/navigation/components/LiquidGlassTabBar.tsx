import { useEffect, useRef } from "react";
import {
  View,
  Text,
  Pressable,
  Animated as RNAnimated,
  Platform,
  StyleSheet,
  Dimensions,
} from "react-native";
import Animated, { useSharedValue, useAnimatedStyle, withSpring } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { BlurView } from "expo-blur";
import { GlassView, isLiquidGlassAvailable } from "expo-glass-effect";
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
  const scale = useRef(new RNAnimated.Value(1)).current;

  const handlePressIn = () => {
    RNAnimated.spring(scale, {
      toValue: 0.95,
      useNativeDriver: Platform.OS !== "web",
      friction: 8,
    }).start();
  };

  const handlePressOut = () => {
    RNAnimated.spring(scale, {
      toValue: 1,
      useNativeDriver: Platform.OS !== "web",
      friction: 8,
    }).start();
  };

  return (
    <RNAnimated.View style={{ transform: [{ scale }], flex: 1 }}>
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
    </RNAnimated.View>
  );
}

// ─── Main component ─────────────────────────────────────────────────────────

export function LiquidGlassTabBar({ state, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const bottomPadding = Math.max(insets.bottom, 0);
  const { width: screenWidth } = Dimensions.get("window");
  const TAB_WIDTH = (screenWidth - 24) / 4;

  const animatedIndex = useSharedValue(state.index);

  useEffect(() => {
    animatedIndex.value = withSpring(state.index, {
      damping: 25,
      stiffness: 170,
      mass: 0.5,
    });
  }, [state.index]);

  const pillStyle = useAnimatedStyle(() => ({
    left: animatedIndex.value * TAB_WIDTH + TAB_WIDTH * 0.15,
  }));

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
    <View style={[styles.inner, { paddingTop: 6, paddingBottom: bottomPadding + 6 }]}>
      <Animated.View style={[styles.animatedPill, pillStyle, { width: TAB_WIDTH * 0.7 }]} />
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
    // Pattern A: GlassView (iOS 26+) or BlurView fallback
    if (isLiquidGlassAvailable()) {
      return (
        <GlassView
          style={styles.glassWrapper}
          glassEffectStyle="regular"
        >
          {barContent}
        </GlassView>
      );
    }

    // iOS < 26: BlurView fallback
    return (
      <View style={styles.wrapper}>
        <BlurView
          tint="systemThickMaterialDark"
          intensity={100}
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
  glassWrapper: {
    position: "absolute",
    bottom: 12,
    left: 12,
    right: 12,
    borderRadius: BAR_BORDER_RADIUS,
    overflow: "hidden",
  },
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
  },
  tab: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 4,
    position: "relative",
  },
  tabPressed: {
    opacity: 0.5,
  },
  animatedPill: {
    position: "absolute",
    top: 2,
    bottom: 2,
    borderRadius: 20,
    backgroundColor: colors.accent + "33",
  },
  label: {
    fontSize: 10,
    fontFamily: "Inter_500Medium",
    marginTop: 0,
  },
  labelActive: {
    color: colors.accent,
  },
  labelInactive: {
    color: colors.textSecondary,
  },
});
