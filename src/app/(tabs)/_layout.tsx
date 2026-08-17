import { NativeTabs } from "expo-router/unstable-native-tabs";
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
        <NativeTabs.Trigger.Icon
          sf={{ default: "house", selected: "house.fill" }}
          md="home"
        />
        <NativeTabs.Trigger.Label>Inicio</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="transacciones">
        <NativeTabs.Trigger.Icon
          sf={{ default: "doc.text", selected: "doc.text.fill" }}
          md="receipt_long"
        />
        <NativeTabs.Trigger.Label>Transacciones</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="proyecciones">
        <NativeTabs.Trigger.Icon
          sf={{ default: "chart.bar", selected: "chart.bar.fill" }}
          md="trending_up"
        />
        <NativeTabs.Trigger.Label>Proyecciones</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="perfil">
        <NativeTabs.Trigger.Icon
          sf={{ default: "person", selected: "person.fill" }}
          md="person"
        />
        <NativeTabs.Trigger.Label>Perfil</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}
