/**
 * EmptyDashboardState
 *
 * A premium, unified empty state for when the user has no credit cards yet.
 * Replaces scattered empty components with a cohesive get-started experience.
 */
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  Animated,
  Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRef } from "react";
import { useRouter } from "expo-router";
import Svg, { Circle, Defs, LinearGradient, Stop, Rect } from "react-native-svg";
import { colors } from "@/shared/theme/colors";
import { borderRadius } from "@/shared/theme/tokens";

// ─── Types ────────────────────────────────────────────────────────────────────

interface ActionItem {
  id: string;
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
  bgColor: string;
  title: string;
  description: string;
  route?: { pathname: string; params?: Record<string, string> };
  onPress?: () => void;
}

interface EmptyDashboardStateProps {
  userName?: string;
  onImport?: () => void;
  onAddCard?: () => void;
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function GradientDivider() {
  return (
    <View style={dividerStyles.wrapper}>
      <Svg height={2} width="100%">
        <Defs>
          <LinearGradient id="dividerGrad" x1="0" x2="1" y1="0" y2="0">
            <Stop offset="0%" stopColor="rgba(59,130,246,0)" />
            <Stop offset="50%" stopColor="rgba(59,130,246,0.3)" />
            <Stop offset="100%" stopColor="rgba(59,130,246,0)" />
          </LinearGradient>
        </Defs>
        <Rect x="0" y="0" width="100%" height="2" fill="url(#dividerGrad)" />
      </Svg>
    </View>
  );
}

function ActionCard({ item }: { item: ActionItem }) {
  const router = useRouter();
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const handlePressIn = () => {
    Animated.spring(scaleAnim, {
      toValue: 0.97,
      useNativeDriver: Platform.OS !== "web",
      friction: 8,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      useNativeDriver: Platform.OS !== "web",
      friction: 8,
    }).start();
  };

  const handlePress = () => {
    if (item.onPress) {
      item.onPress();
    } else if (item.route) {
      router.push(item.route.pathname as any);
    }
  };

  return (
    <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
      <Pressable
        onPress={handlePress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        style={({ pressed }) => [
          styles.actionCard,
          pressed && { opacity: 0.85 },
        ]}
        accessibilityLabel={item.title}
        accessibilityRole="button"
      >
        <View style={[styles.actionIconWrap, { backgroundColor: item.bgColor }]}>
          <Ionicons name={item.icon} size={22} color={item.color} />
        </View>
        <View style={styles.actionTextBlock}>
          <Text style={styles.actionTitle}>{item.title}</Text>
          <Text style={styles.actionDescription}>{item.description}</Text>
        </View>
        <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
      </Pressable>
    </Animated.View>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function EmptyDashboardState({
  userName,
  onImport,
  onAddCard,
}: EmptyDashboardStateProps) {
  const router = useRouter();

  const actions: ActionItem[] = [
    {
      id: "add-card",
      icon: "card-outline",
      color: colors.accent,
      bgColor: "rgba(59,130,246,0.15)",
      title: "Agregar tarjeta",
      description: "Registra tu primera tarjeta de crédito para empezar",
      onPress: onAddCard ?? (() => router.push("/(drawer)/creditCards" as any)),
    },
    {
      id: "import",
      icon: "sync-outline",
      color: colors.success,
      bgColor: "rgba(5,150,105,0.15)",
      title: "Importar movimientos",
      description: "Sincroniza tus gastos bancarios desde tu email",
      onPress: onImport,
    },
    {
      id: "budget",
      icon: "wallet-outline",
      color: colors.accent,
      bgColor: "rgba(59,130,246,0.1)",
      title: "Configurar presupuesto",
      description: "Define tus límites mensuales para controlar gastos",
      route: { pathname: "/(drawer)/profile" },
    },
  ];

  return (
    <View style={styles.container}>
      {/* ── Hero ─────────────────────────────────────────── */}
      <View style={styles.hero}>
        {/* Accent glow circles */}
        <View style={styles.heroGlow} pointerEvents="none">
          <Svg width={180} height={180} style={StyleSheet.absoluteFill}>
            <Circle cx={90} cy={60} r={70} fill={colors.accent} opacity={0.06} />
            <Circle cx={110} cy={90} r={50} fill={colors.accent} opacity={0.04} />
          </Svg>
        </View>

        {/* App icon */}
        <View style={styles.heroIconOuter}>
          <View style={styles.heroIconInner}>
            <Ionicons name="wallet" size={32} color={colors.accent} />
          </View>
        </View>

        <Text style={styles.heroTitle}>
          {userName ? `Bienvenido, ${userName}` : "Bienvenido a MyQuota"}
        </Text>
        <Text style={styles.heroSubtitle}>
          Controla tus gastos, proyecciones de deuda y cuotas pendientes en un
          solo lugar.
        </Text>
      </View>

      <GradientDivider />

      {/* ── Getting started steps ─────────────────────────── */}
      <View style={styles.stepsSection}>
        <Text style={styles.stepsLabel}>PRIMEROS PASOS</Text>

        {/* Step indicators */}
        <View style={styles.stepsRow}>
          {["Agregar tarjeta", "Importar gastos", "Controlar"].map(
            (step, i) => (
              <View key={step} style={styles.stepItem}>
                <View
                  style={[
                    styles.stepDot,
                    i === 0 && styles.stepDotActive,
                  ]}
                >
                  <Text style={styles.stepDotText}>{i + 1}</Text>
                </View>
                {i < 2 && <View style={styles.stepConnector} />}
              </View>
            ),
          )}
        </View>

        {/* Action cards */}
        <View style={styles.actionsContainer}>
          {actions.map((action) => (
            <ActionCard key={action.id} item={action} />
          ))}
        </View>
      </View>

      {/* ── Tip ──────────────────────────────────────────── */}
      <View style={styles.tipCard}>
        <View style={styles.tipIconWrap}>
          <Ionicons name="bulb-outline" size={18} color={colors.warning} />
        </View>
        <View style={styles.tipTextBlock}>
          <Text style={styles.tipTitle}>
            {userName
              ? `${userName}, agrega una tarjeta`
              : "Agrega una tarjeta"}
          </Text>
          <Text style={styles.tipBody}>
            Registra tu primera tarjeta de crédito para empezar a importar
            transacciones y recibir proyecciones inteligentes de tus finanzas.
          </Text>
        </View>
      </View>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const dividerStyles = StyleSheet.create({
  wrapper: {
    height: 2,
    marginVertical: 6,
  },
});

const styles = StyleSheet.create({
  container: {
    gap: 16,
    marginTop: 8,
  },

  // ── Hero ──────────────────────────────────────────────
  hero: {
    alignItems: "center",
    paddingVertical: 32,
    paddingHorizontal: 20,
    position: "relative",
    overflow: "hidden",
  },
  heroGlow: {
    position: "absolute",
    top: -20,
    width: 180,
    height: 180,
    alignSelf: "center",
  },
  heroIconOuter: {
    width: 72,
    height: 72,
    borderRadius: borderRadius.full,
    backgroundColor: "rgba(59,130,246,0.1)",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 20,
    borderWidth: 1,
    borderColor: "rgba(59,130,246,0.2)",
  },
  heroIconInner: {
    width: 56,
    height: 56,
    borderRadius: borderRadius.full,
    backgroundColor: "rgba(59,130,246,0.15)",
    justifyContent: "center",
    alignItems: "center",
  },
  heroTitle: {
    fontSize: 22,
    fontWeight: "700",
    color: colors.textPrimary,
    marginBottom: 10,
    textAlign: "center",
  },
  heroSubtitle: {
    fontSize: 14,
    color: colors.textMuted,
    textAlign: "center",
    lineHeight: 21,
    maxWidth: 320,
  },

  // ── Steps section ────────────────────────────────────
  stepsSection: {
    gap: 16,
  },
  stepsLabel: {
    fontSize: 10,
    fontWeight: "700",
    color: colors.textMuted,
    letterSpacing: 1.4,
    textTransform: "uppercase",
    textAlign: "center",
  },
  stepsRow: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 40,
    marginBottom: 4,
  },
  stepItem: {
    flexDirection: "row",
    alignItems: "center",
  },
  stepDot: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "rgba(255,255,255,0.06)",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: colors.border,
  },
  stepDotActive: {
    backgroundColor: "rgba(59,130,246,0.2)",
    borderColor: colors.accent,
  },
  stepDotText: {
    fontSize: 12,
    fontWeight: "700",
    color: colors.textMuted,
  },
  stepConnector: {
    width: 40,
    height: 1,
    backgroundColor: colors.border,
    marginHorizontal: 4,
  },

  // ── Action cards ─────────────────────────────────────
  actionsContainer: {
    gap: 10,
  },
  actionCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.04)",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.06)",
    padding: 14,
    gap: 14,
  },
  actionIconWrap: {
    width: 44,
    height: 44,
    borderRadius: borderRadius.card,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  actionTextBlock: {
    flex: 1,
  },
  actionTitle: {
    fontSize: 15,
    fontWeight: "600",
    color: colors.textPrimary,
    marginBottom: 2,
  },
  actionDescription: {
    fontSize: 12,
    color: colors.textMuted,
    lineHeight: 17,
  },

  // ── Tip ─────────────────────────────────────────────
  tipCard: {
    flexDirection: "row",
    backgroundColor: "rgba(59,130,246,0.04)",
    borderRadius: borderRadius.card,
    borderWidth: 1,
    borderColor: "rgba(59,130,246,0.1)",
    padding: 14,
    gap: 12,
  },
  tipIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "rgba(217,119,6,0.12)",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
    marginTop: 2,
  },
  tipTextBlock: {
    flex: 1,
  },
  tipTitle: {
    fontSize: 13,
    fontWeight: "600",
    color: colors.textSecondary,
    marginBottom: 4,
  },
  tipBody: {
    fontSize: 12,
    color: colors.textMuted,
    lineHeight: 17,
  },
});
