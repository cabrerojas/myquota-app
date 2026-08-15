import type { ImpactFeedbackStyle } from "expo-haptics";
import {
  Pressable,
  Animated,
  StyleProp,
  ViewStyle,
  Platform,
} from "react-native";
import { useRef, useCallback, type ReactNode } from "react";

interface PressableScaleProps {
  scale?: number;
  haptic?: ImpactFeedbackStyle | false;
  style?: StyleProp<ViewStyle>;
  children: ReactNode;
  onPress?: () => void;
  disabled?: boolean;
  accessibilityLabel?: string;
  accessibilityRole?: "button" | "none";
}

/**
 * Pressable with spring scale animation and optional haptic feedback.
 * Follows Modern Dark design system: scale 0.97→1.0, spring damping:20 stiffness:90.
 *
 * On web, haptic feedback is a no-op (expo-haptics imports crash at module level).
 */
export default function PressableScale({
  scale = 0.97,
  haptic,
  onPress,
  style,
  children,
  disabled,
  accessibilityLabel,
  accessibilityRole,
}: PressableScaleProps) {
  const anim = useRef(new Animated.Value(1)).current;
  const animatedStyle: Animated.WithAnimatedValue<ViewStyle> = {
    transform: [{ scale: anim }],
  };

  const handlePressIn = useCallback(() => {
    if (haptic !== false && Platform.OS !== "web") {
      // Dynamic import avoids module-level crash on web.
      void import("expo-haptics")
        .then((Haptics) =>
          Haptics.impactAsync(haptic ?? Haptics.ImpactFeedbackStyle.Light),
        )
        .catch(() => {
          // expo-haptics not available — silent no-op
        });
    }
    Animated.spring(anim, {
      toValue: scale,
      damping: 20,
      stiffness: 90,
      useNativeDriver: Platform.OS !== "web",
    }).start();
  }, [anim, scale, haptic]);

  const handlePressOut = useCallback(() => {
    Animated.spring(anim, {
      toValue: 1,
      damping: 20,
      stiffness: 90,
      useNativeDriver: Platform.OS !== "web",
    }).start();
  }, [anim]);

  return (
    <Pressable
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      disabled={disabled}
      accessibilityLabel={accessibilityLabel}
      accessibilityRole={accessibilityRole}
    >
      <Animated.View style={[animatedStyle, style]}>{children}</Animated.View>
    </Pressable>
  );
}
