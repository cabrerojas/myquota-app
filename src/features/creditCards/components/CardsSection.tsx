/**
 * CardsSection
 *
 * The full "Mis Tarjetas" section rendered inside DashboardScreen.
 * Handles:
 *   • Horizontal scroll of CreditCardItem chips
 *   • "Add card" ghost chip at the end of the list
 *   • Elegant empty state when no cards are registered
 *   • Usage-based alert badge propagation to each card
 *
 * Props:
 *   creditCards    — list of cards (CreditCardWithLimits)
 *   selectedCardId — currently active card id (null if none)
 *   onSelectCard   — callback when a card is tapped
 */
import { View, Text, ScrollView, StyleSheet } from "react-native";
import Svg, { Circle, Rect, Line } from "react-native-svg";
import CreditCardItem from "@/features/creditCards/components/CreditCardItem";
import type { CreditCardWithLimits } from "@/shared/types/creditCard";

// ─── Types ────────────────────────────────────────────────────────────────────

interface CardsSectionProps {
  creditCards: CreditCardWithLimits[];
  selectedCardId: string | null;
  onSelectCard: (id: string) => void;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function calcUsagePercent(card: CreditCardWithLimits): number {
  const natPct =
    card.nationalTotalLimit > 0
      ? (card.nationalAmountUsed / card.nationalTotalLimit) * 100
      : 0;
  const intPct =
    card.internationalTotalLimit > 0
      ? (card.internationalAmountUsed / card.internationalTotalLimit) * 100
      : 0;
  return Math.max(natPct, intPct);
}

// ─── Sub-component: Empty state ───────────────────────────────────────────────

function EmptyCards() {
  return (
    <View style={emptyStyles.container}>
      {/* Illustration */}
      <View style={emptyStyles.illustrationWrapper}>
        <Svg width={72} height={52} viewBox="0 0 72 52">
          {/* Card shadow */}
          <Rect x={8} y={10} width={56} height={36} rx={8} fill="#E9ECEF" />
          {/* Card body */}
          <Rect x={4} y={6} width={56} height={36} rx={8} fill="#DEE2E6" />
          {/* Chip */}
          <Rect x={12} y={16} width={14} height={10} rx={2} fill="#CED4DA" />
          {/* Stripe lines */}
          <Line
            x1={12}
            y1={32}
            x2={28}
            y2={32}
            stroke="#CED4DA"
            strokeWidth={2}
            strokeLinecap="round"
          />
          <Line
            x1={12}
            y1={36}
            x2={22}
            y2={36}
            stroke="#CED4DA"
            strokeWidth={2}
            strokeLinecap="round"
          />
          {/* Plus circle overlay */}
          <Circle cx={52} cy={38} r={14} fill="#fff" />
          <Circle cx={52} cy={38} r={12} fill="#E9ECEF" />
          <Line
            x1={52}
            y1={32}
            x2={52}
            y2={44}
            stroke="#ADB5BD"
            strokeWidth={2.5}
            strokeLinecap="round"
          />
          <Line
            x1={46}
            y1={38}
            x2={58}
            y2={38}
            stroke="#ADB5BD"
            strokeWidth={2.5}
            strokeLinecap="round"
          />
        </Svg>
      </View>

      <Text style={emptyStyles.title}>Sin tarjetas registradas</Text>
      <Text style={emptyStyles.subtitle}>
        Agrega tu primera tarjeta para importar transacciones y llevar el
        control de tus cuotas.
      </Text>
    </View>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function CardsSection({
  creditCards,
  selectedCardId,
  onSelectCard,
}: CardsSectionProps) {
  const cardCount = creditCards.length;

  return (
    <View style={styles.section}>
      {/* ── Section header ─────────────────────────────────────────────── */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.sectionLabel}>MIS TARJETAS</Text>
          {cardCount > 0 && (
            <View style={styles.countBadge}>
              <Text style={styles.countBadgeText}>{cardCount}</Text>
            </View>
          )}
        </View>
      </View>

      {/* ── Content ────────────────────────────────────────────────────── */}
      {cardCount === 0 ? (
        <EmptyCards />
      ) : (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
          decelerationRate="fast"
          snapToInterval={228 + 14} // CARD_WIDTH + gap
          snapToAlignment="start"
        >
          {creditCards.map((card) => {
            const usagePct = calcUsagePercent(card);
            return (
              <CreditCardItem
                key={card.id}
                card={card}
                selected={selectedCardId === card.id}
                onPress={() => onSelectCard(card.id)}
                usagePercent={usagePct}
              />
            );
          })}
        </ScrollView>
      )}
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  section: {
    marginTop: 14,
    marginBottom: 6,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: "#868E96",
    letterSpacing: 1.4,
    textTransform: "uppercase",
  },
  countBadge: {
    backgroundColor: "#E9ECEF",
    borderRadius: 10,
    paddingHorizontal: 7,
    paddingVertical: 2,
  },
  countBadgeText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#495057",
  },
  scrollContent: {
    paddingRight: 20,
    paddingBottom: 6,
    paddingTop: 3, // room for the selected ring overhang
  },
});

// Empty state
const emptyStyles = StyleSheet.create({
  container: {
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: 28,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#F1F3F5",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  illustrationWrapper: {
    marginBottom: 16,
    opacity: 0.75,
  },
  title: {
    fontSize: 16,
    fontWeight: "700",
    color: "#343A40",
    marginBottom: 8,
    textAlign: "center",
  },
  subtitle: {
    fontSize: 13,
    color: "#868E96",
    textAlign: "center",
    lineHeight: 19,
    maxWidth: 260,
    marginBottom: 8,
  },
});
