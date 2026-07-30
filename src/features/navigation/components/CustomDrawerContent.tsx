import {
  View,
  Text,
  Pressable,
  StyleSheet,
  Image,
  Animated,
} from "react-native";
import { BlurView } from "expo-blur";
import {
  DrawerContentScrollView,
  DrawerContentComponentProps,
} from "@react-navigation/drawer";
import { Ionicons } from "@expo/vector-icons";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "expo-router";
import { signOut } from "@/features/auth/hooks/useAuth";
import { useUncategorized } from "@/shared/contexts/UncategorizedContext";
import { UserInfo } from "@/shared/types/user";
import { getSessionUser } from "@/features/auth/services/sessionStorage";
import { colors } from "@/shared/theme/colors";
import { glassSurface } from "@/shared/theme/effects";

// ─── Types ────────────────────────────────────────────────────────────────────

interface NavItem {
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  routeName: string;
  badge?: number;
}

interface NavSection {
  title: string;
  items: NavItem[];
}

// ─── Constants ─────────────────────────────────────────────────────────────────

const NAV_SECTIONS: NavSection[] = [
  {
    title: "Principal",
    items: [
      { label: "Inicio", icon: "home-outline", routeName: "dashboard" },
      { label: "Mis Tarjetas", icon: "card-outline", routeName: "creditCards" },
      { label: "Transacciones", icon: "receipt-outline", routeName: "transactions" },
    ],
  },
  {
    title: "Análisis",
    items: [
      { label: "Gráficos", icon: "bar-chart-outline", routeName: "charts" },
      { label: "Proyección Deuda", icon: "trending-up-outline", routeName: "debtForecast" },
      { label: "Deudas Manuales", icon: "create-outline", routeName: "manualDebts" },
    ],
  },
  {
    title: "Configuración",
    items: [
      { label: "Mi Perfil", icon: "person-outline", routeName: "profile" },
      { label: "Notificaciones", icon: "notifications-outline", routeName: "notificationSettings" },
    ],
  },
];

// ─── Sub-components ────────────────────────────────────────────────────────────

function DrawerNavItem({
  item,
  isActive,
  onPress,
}: {
  item: NavItem;
  isActive: boolean;
  onPress: () => void;
}) {
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const handlePressIn = () => {
    Animated.spring(scaleAnim, {
      toValue: 0.97,
      useNativeDriver: true,
      friction: 8,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      useNativeDriver: true,
      friction: 8,
    }).start();
  };

  return (
    <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
      <Pressable
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        style={({ pressed }) => [
          styles.navItem,
          isActive && styles.navItemActive,
          pressed && !isActive && styles.navItemPressed,
        ]}
        accessibilityLabel={item.label}
        accessibilityRole="menuitem"
        accessibilityState={{ selected: isActive }}
      >
        {/* Active indicator bar */}
        {isActive && <View style={styles.activeBar} />}

        {/* Icon container */}
        <View style={[styles.navIconBox, isActive && styles.navIconBoxActive]}>
          <Ionicons
            name={item.icon}
            size={20}
            color={isActive ? colors.accent : colors.textMuted}
          />
        </View>

        {/* Label */}
        <Text
          style={[styles.navLabel, isActive && styles.navLabelActive]}
          numberOfLines={1}
        >
          {item.label}
        </Text>

        {/* Badge (e.g. uncategorized count) */}
        {item.badge != null && item.badge > 0 && (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>
              {item.badge > 99 ? "99+" : item.badge}
            </Text>
          </View>
        )}
      </Pressable>
    </Animated.View>
  );
}

function DrawerSectionHeader({ title }: { title: string }) {
  return (
    <View style={styles.sectionHeader}>
      <View style={styles.sectionLine} />
      <Text style={styles.sectionTitle}>{title}</Text>
      <View style={styles.sectionLine} />
    </View>
  );
}

// ─── Main component ────────────────────────────────────────────────────────────

export default function CustomDrawerContent(
  props: DrawerContentComponentProps,
) {
  const { state, navigation } = props;
  const router = useRouter();
  const { count: uncategorizedCount } = useUncategorized();
  const [user, setUser] = useState<UserInfo | null>(null);

  useEffect(() => {
    getSessionUser().then((data) => {
      if (data) setUser(data);
    });
  }, []);

  // Get current route name for active state
  const currentRoute = state.routeNames[state.index];

  const handleNavigate = (routeName: string) => {
    navigation.navigate(routeName as any);
  };

  // Inject uncategorized badge into transactions item
  const sections = NAV_SECTIONS.map((section) => ({
    ...section,
    items: section.items.map((item) =>
      item.routeName === "transactions"
        ? { ...item, badge: uncategorizedCount }
        : item,
    ),
  }));

  return (
    <View style={styles.container}>
      {/* ── User section ─────────────────────────────────────────── */}
      <View style={styles.userSection}>
        <BlurView intensity={20} tint="dark" style={StyleSheet.absoluteFill} />
        {/* Accent glow overlay */}
        <View style={styles.userGlow} />

        <View style={styles.userContent}>
          {user?.photo ? (
            <View style={styles.avatarRing}>
              <Image source={{ uri: user.photo }} style={styles.avatar} />
            </View>
          ) : (
            <View style={styles.avatarRing}>
              <View style={styles.avatarPlaceholder}>
                <Ionicons name="person" size={26} color={colors.accent} />
              </View>
            </View>
          )}
          <View style={styles.userInfo}>
            <Text style={styles.userName} numberOfLines={1}>
              {user?.givenName
                ? `${user.givenName} ${user.familyName ?? ""}`
                : "Usuario"}
            </Text>
            <Text style={styles.userEmail} numberOfLines={1}>
              {user?.email ?? "Inicia sesión"}
            </Text>
          </View>
        </View>
      </View>

      {/* ── Navigation items ─────────────────────────────────────── */}
      <DrawerContentScrollView
        {...props}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {sections.map((section) => (
          <View key={section.title} style={styles.sectionContainer}>
            <DrawerSectionHeader title={section.title} />
            {section.items.map((item) => (
              <DrawerNavItem
                key={item.routeName}
                item={item}
                isActive={currentRoute === item.routeName}
                onPress={() => handleNavigate(item.routeName)}
              />
            ))}
          </View>
        ))}
      </DrawerContentScrollView>

      {/* ── Footer: Logout ──────────────────────────────────────── */}
      <View style={styles.footer}>
        <Pressable
          onPress={() => signOut(router)}
          style={({ pressed }) => [
            styles.logoutButton,
            pressed && styles.logoutButtonPressed,
          ]}
          accessibilityLabel="Cerrar sesión"
          accessibilityRole="button"
        >
          <View style={styles.logoutIconBox}>
            <Ionicons name="log-out-outline" size={18} color={colors.destructive} />
          </View>
          <Text style={styles.logoutText}>Cerrar sesión</Text>
        </Pressable>
      </View>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
  },

  // ── User section ─────────────────────────────────────────────
  userSection: {
    paddingTop: 56,
    paddingBottom: 20,
    paddingHorizontal: 20,
    overflow: "hidden",
    position: "relative",
  },
  userGlow: {
    position: "absolute",
    top: -40,
    right: -40,
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: colors.accent,
    opacity: 0.06,
  },
  userContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
  },
  avatarRing: {
    width: 54,
    height: 54,
    borderRadius: 27,
    borderWidth: 2,
    borderColor: colors.accent,
    justifyContent: "center",
    alignItems: "center",
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
  },
  avatarPlaceholder: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "rgba(59,130,246,0.12)",
    justifyContent: "center",
    alignItems: "center",
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 17,
    fontWeight: "700",
    color: colors.textPrimary,
    letterSpacing: 0.2,
  },
  userEmail: {
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 2,
  },

  // ── Scroll content ──────────────────────────────────────────
  scrollContent: {
    paddingBottom: 8,
  },
  sectionContainer: {
    marginBottom: 4,
  },

  // ── Section header ─────────────────────────────────────────
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 6,
  },
  sectionLine: {
    flex: 1,
    height: 1,
    backgroundColor: colors.border,
  },
  sectionTitle: {
    fontSize: 10,
    fontWeight: "700",
    color: colors.textMuted,
    letterSpacing: 1.2,
    textTransform: "uppercase",
  },

  // ── Nav item ───────────────────────────────────────────────
  navItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 11,
    paddingHorizontal: 20,
    marginHorizontal: 8,
    marginVertical: 1,
    borderRadius: 12,
    gap: 12,
    position: "relative",
    overflow: "hidden",
  },
  navItemActive: {
    backgroundColor: "rgba(59,130,246,0.1)",
  },
  navItemPressed: {
    backgroundColor: "rgba(255,255,255,0.04)",
  },
  activeBar: {
    position: "absolute",
    left: 0,
    top: 4,
    bottom: 4,
    width: 3,
    borderRadius: 2,
    backgroundColor: colors.accent,
  },
  navIconBox: {
    width: 32,
    height: 32,
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.04)",
  },
  navIconBoxActive: {
    backgroundColor: "rgba(59,130,246,0.15)",
  },
  navLabel: {
    flex: 1,
    fontSize: 14,
    fontWeight: "500",
    color: colors.textSecondary,
    letterSpacing: 0.2,
  },
  navLabelActive: {
    color: colors.textPrimary,
    fontWeight: "600",
  },

  // ── Badge ──────────────────────────────────────────────────
  badge: {
    backgroundColor: colors.accent,
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 6,
  },
  badgeText: {
    color: colors.textPrimary,
    fontSize: 11,
    fontWeight: "700",
  },

  // ── Footer ─────────────────────────────────────────────────
  footer: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingHorizontal: 28,
    paddingVertical: 14,
    paddingBottom: 28,
  },
  logoutButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 10,
  },
  logoutButtonPressed: {
    backgroundColor: "rgba(220,38,38,0.08)",
  },
  logoutIconBox: {
    width: 32,
    height: 32,
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(220,38,38,0.1)",
  },
  logoutText: {
    fontSize: 14,
    color: colors.destructive,
    fontWeight: "500",
  },
});
