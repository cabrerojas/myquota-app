import {
  Pressable,
  Animated,
  StyleProp,
  ViewStyle,
  Platform,
} from "react-native";
import { useRef, useCallback } from "react";
import * as Haptics from "expo-haptics";

interface PressableScaleProps {
  scale?: number;
  haptic?: Haptics.ImpactFeedbackStyle | false;
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
 */
export default function PressableScale({
  scale = 0.97,
  haptic = Haptics.ImpactFeedbackStyle.Light,
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
      Haptics.impactAsync(haptic);
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
