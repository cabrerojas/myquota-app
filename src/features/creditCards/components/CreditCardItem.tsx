/**
 * CreditCardItem
 *
 * A premium, fintech-style credit card chip designed for horizontal scroll.
 * Visual hierarchy:
 *   ┌──────────────────────────────────────────┐
 *   │ [chip]                       [VISA / MC] │
 *   │                                          │
 *   │  Nickname / cardType                     │
 *   │                                          │
 *   │  •••• •••• •••• 9884   [INFINITE badge] │
 *   └──────────────────────────────────────────┘
 *
 * Achieves a gradient-like look using layered SVG circle overlays —
 * no external gradient library required.
 */
import { TouchableOpacity, View, Text, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Svg, { Circle, Rect } from "react-native-svg";
import { getCardTheme } from "@/features/creditCards/utils/cardTheme";
import type { CreditCardWithLimits } from "@/shared/types/creditCard";

// ─── Dimensions ───────────────────────────────────────────────────────────────

const CARD_WIDTH = 228;
const CARD_HEIGHT = 144;
const CARD_RADIUS = 20;

// ─── Props ────────────────────────────────────────────────────────────────────

interface CreditCardItemProps {
  card: CreditCardWithLimits;
  selected: boolean;
  onPress: () => void;
  /** Usage % (0–100) across all limits — drives the alert state. */
  usagePercent: number;
}

// ─── Sub-component: EMV chip (drawn with SVG) ─────────────────────────────────

interface ChipProps {
  color: string;
}

function EmuChip({ color }: ChipProps) {
  return (
    <Svg width={34} height={26} viewBox="0 0 34 26">
      {/* Outer body */}
      <Rect
        x={0}
        y={0}
        width={34}
        height={26}
        rx={4}
        ry={4}
        fill={color}
        opacity={0.9}
      />
      {/* Horizontal center groove */}
      <Rect x={0} y={10} width={34} height={6} fill="rgba(0,0,0,0.18)" />
      {/* Vertical center groove */}
      <Rect x={13} y={0} width={8} height={26} fill="rgba(0,0,0,0.12)" />
      {/* Highlight reflection */}
      <Rect
        x={2}
        y={2}
        width={14}
        height={6}
        rx={1}
        fill="rgba(255,255,255,0.18)"
      />
    </Svg>
  );
}

// ─── Sub-component: Network label ─────────────────────────────────────────────

interface NetworkLabelProps {
  label: string;
  color: string;
}

function NetworkLabel({ label, color }: NetworkLabelProps) {
  if (label === "MASTERCARD") {
    // Two overlapping circles logo-style
    return (
      <View style={styles.mcWrapper}>
        <Svg width={36} height={22} viewBox="0 0 36 22">
          <Circle cx={12} cy={11} r={11} fill="#EB001B" opacity={0.92} />
          <Circle cx={24} cy={11} r={11} fill="#F79E1B" opacity={0.92} />
          {/* Overlap blends into orange */}
          <Circle cx={18} cy={11} r={5} fill="#FF5F00" opacity={0.85} />
        </Svg>
        <Text style={[styles.mcLabel, { color }]}>mastercard</Text>
      </View>
    );
  }

  if (label === "VISA") {
    return <Text style={[styles.visaLabel, { color }]}>VISA</Text>;
  }

  if (label === "AMEX") {
    return (
      <View style={styles.genericNetworkWrapper}>
        <Text style={[styles.genericNetworkText, { color }]}>AMEX</Text>
      </View>
    );
  }

  return <Text style={[styles.genericNetworkText, { color }]}>{label}</Text>;
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function CreditCardItem({
  card,
  selected,
  onPress,
  usagePercent,
}: CreditCardItemProps) {
  const theme = getCardTheme(card.cardType);
  const hasAlert = usagePercent >= 80;
  const isCritical = usagePercent >= 95;

  // Build the display name: prefer a short label from cardType
  const displayName = card.cardType;

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.88}
      style={[styles.wrapper, selected && styles.wrapperSelected]}
    >
      {/* ── Card body ────────────────────────────────────────────────────── */}
      <View style={[styles.card, { backgroundColor: theme.bg }]}>
        {/* Decorative depth circles (simulate gradient) */}
        <View style={StyleSheet.absoluteFill} pointerEvents="none">
          <Svg
            width={CARD_WIDTH}
            height={CARD_HEIGHT}
            style={StyleSheet.absoluteFill}
          >
            {/* Large circle top-right */}
            <Circle
              cx={CARD_WIDTH + 10}
              cy={-20}
              r={120}
              fill={theme.accent}
              opacity={theme.overlayOpacity}
            />
            {/* Medium circle bottom-left */}
            <Circle
              cx={-30}
              cy={CARD_HEIGHT + 20}
              r={90}
              fill={theme.accent}
              opacity={theme.overlayOpacity * 0.6}
            />
          </Svg>
        </View>

        {/* ── Row 1: Chip + Network ─────────────────────────────────────── */}
        <View style={styles.topRow}>
          <EmuChip color={theme.chipColor} />
          <NetworkLabel
            label={theme.networkLabel}
            color={theme.networkLabelColor}
          />
        </View>

        {/* ── Row 2: Card name ─────────────────────────────────────────── */}
        <Text
          style={[styles.cardName, { color: theme.textColor }]}
          numberOfLines={1}
        >
          {displayName}
        </Text>

        {/* ── Row 3: Last4 + Level badge ─────────────────────────────────── */}
        <View style={styles.bottomRow}>
          <Text style={[styles.last4, { color: theme.subtextColor }]}>
            <Text style={[styles.bullet, { color: theme.subtextColor }]}>
              {"•••• "}
            </Text>
            <Text style={[styles.last4Digits, { color: theme.textColor }]}>
              {card.cardLastDigits}
            </Text>
          </Text>

          <View
            style={[styles.levelBadge, { backgroundColor: theme.levelBadgeBg }]}
          >
            <Text
              style={[styles.levelBadgeText, { color: theme.levelBadgeColor }]}
            >
              {theme.levelBadgeText}
            </Text>
          </View>
        </View>
      </View>

      {/* ── Alert indicator ──────────────────────────────────────────────── */}
      {hasAlert && (
        <View
          style={[styles.alertBadge, isCritical && styles.alertBadgeCritical]}
        >
          <Ionicons
            name={isCritical ? "alert-circle" : "warning"}
            size={12}
            color="#fff"
          />
        </View>
      )}

      {/* ── Selected ring ────────────────────────────────────────────────── */}
      {selected && (
        <View
          style={[
            styles.selectedRing,
            { borderColor: theme.networkLabelColor },
          ]}
          pointerEvents="none"
        />
      )}
    </TouchableOpacity>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  wrapper: {
    marginRight: 14,
    borderRadius: CARD_RADIUS + 3,
    position: "relative",
  },
  wrapperSelected: {
    // The ring handles selected feedback
  },
  card: {
    width: CARD_WIDTH,
    height: CARD_HEIGHT,
    borderRadius: CARD_RADIUS,
    padding: 18,
    overflow: "hidden",
    justifyContent: "space-between",
    // Elevation
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.28,
    shadowRadius: 12,
    elevation: 8,
  },

  // Top row (chip + network)
  topRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },

  // Mastercard network
  mcWrapper: {
    alignItems: "center",
    gap: 2,
  },
  mcLabel: {
    fontSize: 8,
    fontWeight: "500",
    letterSpacing: 0.5,
    marginTop: 1,
  },

  // Visa network label
  visaLabel: {
    fontSize: 22,
    fontWeight: "900",
    fontStyle: "italic",
    letterSpacing: -1,
    marginTop: 2,
  },

  // Generic network label
  genericNetworkWrapper: {
    borderWidth: 1,
    borderRadius: 4,
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderColor: "rgba(255,255,255,0.35)",
  },
  genericNetworkText: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 1,
  },

  // Card name (middle)
  cardName: {
    fontSize: 14,
    fontWeight: "600",
    letterSpacing: 0.3,
    marginVertical: 2,
  },

  // Bottom row
  bottomRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  bullet: {
    fontSize: 14,
    letterSpacing: 3,
    fontWeight: "700",
  },
  last4: {
    fontSize: 14,
    letterSpacing: 2,
  },
  last4Digits: {
    fontSize: 15,
    fontWeight: "700",
    letterSpacing: 1.5,
  },

  // Level badge
  levelBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 20,
  },
  levelBadgeText: {
    fontSize: 9,
    fontWeight: "800",
    letterSpacing: 1.2,
    textTransform: "uppercase",
  },

  // Alert
  alertBadge: {
    position: "absolute",
    top: 8,
    right: 8,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: "#F57C00",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 10,
  },
  alertBadgeCritical: {
    backgroundColor: "#DC3545",
  },

  // Selected ring
  selectedRing: {
    position: "absolute",
    top: -3,
    left: -3,
    right: -3,
    bottom: -3,
    borderRadius: CARD_RADIUS + 3,
    borderWidth: 2.5,
  },
});
