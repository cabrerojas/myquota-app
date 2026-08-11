import { Platform } from "react-native";
import {
  NativeTabs,
  Icon,
  Label,
  VectorIcon,
} from "expo-router/build/native-tabs";
import Ionicons from "@expo/vector-icons/Ionicons";
import { colors } from "@/shared/theme/colors";

/**
 * NativeTabs tab bar layout — replaces custom LiquidGlassTabBar.
 *
 * ## Accessibility
 * - Label auto-exposes as accessibility label on each tab trigger.
 * - Native tab bar items are ≥ 44pt (iOS) / ≥ 48dp (Android) by system design.
 * - VoiceOver/TalkBack announce labels + selection state natively.
 *
 * ## Reduce Transparency
 * iOS automatically renders the native tab bar with opaque material when
 * Reduce Transparency is enabled — zero app code required.
 *
 * ## Reduce Motion
 * Native stack push/pop auto-simplifies to cross-dissolve; NativeTabs
 * respects the system setting — zero app code required.
 *
 * ## White Flash
 * Prevented by @react-navigation ThemeProvider (DarkTheme, bg #0F172A)
 * in root `_layout.tsx`.
 */
export default function TabLayout() {
  return (
    <NativeTabs
      backgroundColor={colors.bg}
      tintColor={colors.accent}
      minimizeBehavior="onScrollDown"
    >
      <NativeTabs.Trigger name="inicio">
        <Icon
          sf={{ default: "house", selected: "house.fill" }}
          androidSrc={
            <VectorIcon family={Ionicons} name="home-outline" />
          }
        />
        <Label>Inicio</Label>
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="transacciones">
        <Icon
          sf={{ default: "doc.text", selected: "doc.text.fill" }}
          androidSrc={
            <VectorIcon family={Ionicons} name="receipt-outline" />
          }
        />
        <Label>Transacciones</Label>
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="proyecciones">
        <Icon
          sf={{ default: "chart.bar", selected: "chart.bar.fill" }}
          androidSrc={
            <VectorIcon family={Ionicons} name="trending-up-outline" />
          }
        />
        <Label>Proyecciones</Label>
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="perfil">
        <Icon
          sf={{ default: "person", selected: "person.fill" }}
          androidSrc={
            <VectorIcon family={Ionicons} name="person-outline" />
          }
        />
        <Label>Perfil</Label>
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}
