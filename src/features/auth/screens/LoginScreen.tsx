import {
  View,
  Text,
  Pressable,
  StyleSheet,
  ActivityIndicator,
  StatusBar,
  Animated,
  Linking,
  Dimensions,
} from "react-native";
import { useEffect, useRef } from "react";
import { Ionicons } from "@expo/vector-icons";
import Svg, { Circle, Defs, LinearGradient, Stop, Rect, Line } from "react-native-svg";
import { useGoogleSignIn } from "../hooks/useAuth";
import { useRouter } from "expo-router";
import { colors } from "@/shared/theme/colors";

const { width } = Dimensions.get("window");

// ─── Sub-components ──────────────────────────────────────────────────────

function DecorativeBackground() {
  const glowSize = width * 0.9;
  return (
    <View style={bgStyles.container} pointerEvents="none">
      <Svg width="100%" height="100%" style={StyleSheet.absoluteFill}>
        <Defs>
          <LinearGradient id="topRadial" x1="0.5" x2="0.5" y1="0" y2="1">
            <Stop offset="0%" stopColor={colors.accent} stopOpacity="0.15" />
            <Stop offset="60%" stopColor={colors.accent} stopOpacity="0.02" />
            <Stop offset="100%" stopColor={colors.accent} stopOpacity="0" />
          </LinearGradient>
        </Defs>
        <Rect x="0" y="0" width="100%" height="55%" fill="url(#topRadial)" />
        <Circle cx={width * 0.15} cy={120} r={80} fill={colors.accent} opacity={0.05} />
        <Circle cx={width * 0.85} cy={200} r={60} fill={colors.accent} opacity={0.04} />
        <Circle cx={width * 0.5} cy={400} r={100} fill={colors.accent} opacity={0.02} />
      </Svg>
      {/* Bottom wave line */}
      <View style={bgStyles.waveLine} />
    </View>
  );
}

const bgStyles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
  },
  waveLine: {
    position: "absolute",
    bottom: 100,
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: "rgba(59,130,246,0.06)",
  },
});

// ─── Main component ──────────────────────────────────────────────────────

export default function LoginScreen() {
  const router = useRouter();
  const { signIn, isLoading } = useGoogleSignIn(router);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(20)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 700,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 700,
        useNativeDriver: true,
      }),
    ]).start();
  }, [fadeAnim, slideAnim]);

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={colors.bg} />

      <DecorativeBackground />

      <Animated.View
        style={[
          styles.content,
          { opacity: fadeAnim, transform: [{ translateY: slideAnim }] },
        ]}
      >
        {/* ── Brand section ────────────────────────────────── */}
        <View style={styles.brandSection}>
          <View style={styles.iconOuter}>
            <View style={styles.iconInner}>
              <Ionicons name="wallet" size={30} color={colors.accent} />
            </View>
          </View>
          <Text style={styles.brandName}>myQuota</Text>
          <Text style={styles.tagline}>
            Controlá tus gastos, proyecciones{'\n'}y cuotas en un solo lugar.
          </Text>
        </View>

        {/* ── Value Cards ───────────────────────────────────── */}
        <View style={styles.valueCards}>
          {[
            { icon: "card-outline" as const, label: "Tarjetas", desc: "Todas tus tarjetas en un solo panel" },
            { icon: "trending-up-outline" as const, label: "Proyecciones", desc: "Deuda futura calculada al instante" },
            { icon: "stats-chart-outline" as const, label: "Estadísticas", desc: "Gráficos claros de tus gastos" },
          ].map((item) => (
            <View key={item.label} style={styles.valueCard}>
              <View style={styles.valueCardDot}>
                <Ionicons name={item.icon} size={16} color={colors.accent} />
              </View>
              <View style={styles.valueCardText}>
                <Text style={styles.valueCardLabel}>{item.label}</Text>
                <Text style={styles.valueCardDesc}>{item.desc}</Text>
              </View>
            </View>
          ))}
        </View>

        {/* ── Spacer ────────────────────────────────────────── */}
        <View style={{ flex: 1 }} />

        {/* ── Google Sign-In ────────────────────────────────── */}
        {isLoading ? (
          <View style={styles.loadingBox}>
            <ActivityIndicator size="large" color={colors.accent} />
            <Text style={styles.loadingText}>Conectando con Google...</Text>
          </View>
        ) : (
          <Pressable
            onPress={signIn}
            style={({ pressed }) => [
              styles.googleButton,
              pressed && styles.googleButtonPressed,
            ]}
            accessibilityLabel="Iniciar sesión con Google"
            accessibilityRole="button"
          >
            <View style={styles.googleIconBox}>
              <Ionicons name="logo-google" size={20} color="#fff" />
            </View>
            <Text style={styles.googleButtonLabel}>
              Continuar con Google
            </Text>
          </Pressable>
        )}

        {/* ── Footer ────────────────────────────────────────── */}
        <View style={styles.footer}>
          <Text style={styles.terms}>
            Al continuar, aceptás nuestros{" "}
            <Text
              style={styles.termsLink}
              onPress={() => Linking.openURL("https://myquota.app/terms")}
            >
              Términos y Condiciones
            </Text>
          </Text>
        </View>
      </Animated.View>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
  },

  // ── Content ────────────────────────────────────────────
  content: {
    flex: 1,
    paddingHorizontal: 28,
    paddingTop: 70,
    paddingBottom: 32,
  },

  // ── Brand ──────────────────────────────────────────────
  brandSection: {
    alignItems: "center",
    marginBottom: 32,
  },
  iconOuter: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: "rgba(59,130,246,0.08)",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(59,130,246,0.12)",
    marginBottom: 16,
  },
  iconInner: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: "rgba(59,130,246,0.18)",
    justifyContent: "center",
    alignItems: "center",
  },
  brandName: {
    fontSize: 30,
    fontWeight: "800",
    color: colors.textPrimary,
    letterSpacing: -0.5,
    marginBottom: 6,
  },
  tagline: {
    fontSize: 14,
    color: colors.textMuted,
    textAlign: "center",
    lineHeight: 21,
  },

  // ── Value Cards ────────────────────────────────────────
  valueCards: {
    gap: 10,
  },
  valueCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.03)",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 14,
    gap: 12,
  },
  valueCardDot: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: "rgba(59,130,246,0.1)",
    justifyContent: "center",
    alignItems: "center",
    flexShrink: 0,
  },
  valueCardText: {
    flex: 1,
  },
  valueCardLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.textPrimary,
    marginBottom: 2,
  },
  valueCardDesc: {
    fontSize: 12,
    color: colors.textMuted,
    lineHeight: 16,
  },

  // ── Loading ────────────────────────────────────────────
  loadingBox: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    paddingVertical: 16,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: "rgba(255,255,255,0.03)",
  },
  loadingText: {
    fontSize: 14,
    color: colors.textMuted,
    fontWeight: "500",
  },

  // ── Google Button ─────────────────────────────────────
  googleButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: 15,
    paddingHorizontal: 24,
    gap: 14,
  },
  googleButtonPressed: {
    backgroundColor: colors.surfaceElevated,
    borderColor: colors.accent,
  },
  googleIconBox: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: colors.accent,
    justifyContent: "center",
    alignItems: "center",
  },
  googleButtonLabel: {
    fontSize: 16,
    fontWeight: "600",
    color: colors.textPrimary,
  },

  // ── Footer ────────────────────────────────────────────
  footer: {
    alignItems: "center",
    marginTop: 20,
  },
  terms: {
    fontSize: 11,
    color: colors.textSubtle,
    textAlign: "center",
    lineHeight: 16,
  },
  termsLink: {
    color: colors.accent,
    fontWeight: "600",
  },
});
