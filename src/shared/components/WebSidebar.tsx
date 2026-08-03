import { View, Text, StyleSheet, ScrollView, Pressable } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors } from "@/shared/theme/colors";
import { useState } from "react";

type WebScreen = "dashboard" | "creditCards" | "transactions" | "charts" | "debtForecast" | "manualDebts" | "profile";

const menuItems: { key: WebScreen; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { key: "dashboard", label: "Inicio", icon: "home" },
  { key: "creditCards", label: "Mis Tarjetas", icon: "card" },
  { key: "transactions", label: "Transacciones", icon: "list" },
  { key: "charts", label: "Gráficos", icon: "bar-chart" },
  { key: "debtForecast", label: "Proyección Deuda", icon: "trending-up" },
  { key: "manualDebts", label: "Deudas Manuales", icon: "add-circle" },
  { key: "profile", label: "Mi Perfil", icon: "person" },
];

interface WebLayoutProps {
  children?: React.ReactNode;
}

export function WebSidebar({ active, onSelect }: { active: WebScreen; onSelect: (s: WebScreen) => void }) {
  return (
    <View style={s.sidebar}>
      <View style={s.brand}>
        <Ionicons name="wallet" size={24} color={colors.accent} />
        <Text style={s.brandText}>myQuota</Text>
      </View>
      <ScrollView style={s.menu}>
        {menuItems.map(item => (
          <Pressable
            key={item.key}
            style={[s.menuItem, active === item.key && s.menuItemActive]}
            onPress={() => onSelect(item.key)}
          >
            <Ionicons
              name={item.icon}
              size={18}
              color={active === item.key ? colors.accent : colors.textMuted}
            />
            <Text style={[s.menuLabel, active === item.key && s.menuLabelActive]}>
              {item.label}
            </Text>
          </Pressable>
        ))}
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  sidebar: {
    width: 240,
    backgroundColor: "#1A2440",
    borderRightWidth: 1,
    borderRightColor: "rgba(255,255,255,0.06)",
    paddingTop: 20,
  },
  brand: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 20,
    paddingBottom: 24,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.06)",
  },
  brandText: {
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "800",
  },
  menu: {
    flex: 1,
    paddingTop: 12,
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 10,
    paddingHorizontal: 20,
    marginHorizontal: 8,
    borderRadius: 8,
    marginBottom: 2,
  },
  menuItemActive: {
    backgroundColor: "rgba(59,130,246,0.12)",
  },
  menuLabel: {
    color: colors.textMuted,
    fontSize: 14,
    fontWeight: "500",
  },
  menuLabelActive: {
    color: colors.accent,
    fontWeight: "600",
  },
});
