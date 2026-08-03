import {
  Pressable,
  Animated,
  StyleProp,
  ViewStyle,
  Platform,
} from "react-native";
import { useRef, useCallback } from "react";

interface PressableScaleProps {
  scale?: number;
  haptic?: string | false;
  style?: StyleProp<ViewStyle>;
  children: React.ReactNode;
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

  const handlePressIn = useCallback(() => {
    if (haptic !== false && Platform.OS !== "web") {
      // Dynamic import avoids module-level crash on web
      try {
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const Haptics = require("expo-haptics");
        Haptics.impactAsync(haptic ?? Haptics.ImpactFeedbackStyle.Light);
      } catch {
        // expo-haptics not available — silent no-op
      }
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
      <Animated.View style={[{ transform: [{ scale: anim }] }, style as any]}>
        {children}
      </Animated.View>
    </Pressable>
  );
}
