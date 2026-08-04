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
import { colors, spacing } from "@/shared/theme/tokens";
import { glassSurface, glassSubtle } from "@/shared/theme/effects";
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
          <Rect
            x={8}
            y={10}
            width={56}
            height={36}
            rx={8}
            fill={colors.surface}
          />
          {/* Card body */}
          <Rect
            x={4}
            y={6}
            width={56}
            height={36}
            rx={8}
            fill="rgba(255,255,255,0.08)"
          />
          {/* Chip */}
          <Rect
            x={12}
            y={16}
            width={14}
            height={10}
            rx={2}
            fill="rgba(255,255,255,0.15)"
          />
          {/* Stripe lines */}
          <Line
            x1={12}
            y1={32}
            x2={28}
            y2={32}
            stroke="rgba(255,255,255,0.15)"
            strokeWidth={2}
            strokeLinecap="round"
          />
          <Line
            x1={12}
            y1={36}
            x2={22}
            y2={36}
            stroke="rgba(255,255,255,0.15)"
            strokeWidth={2}
            strokeLinecap="round"
          />
          {/* Plus circle overlay */}
          <Circle cx={52} cy={38} r={14} fill={colors.surface} />
          <Circle cx={52} cy={38} r={12} fill="rgba(255,255,255,0.06)" />
          <Line
            x1={52}
            y1={32}
            x2={52}
            y2={44}
            stroke={colors.textMuted}
            strokeWidth={2.5}
            strokeLinecap="round"
          />
          <Line
            x1={46}
            y1={38}
            x2={58}
            y2={38}
            stroke={colors.textMuted}
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
        <>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.scrollContent}
            decelerationRate="fast"
            snapToInterval={228 + 14}
            snapToAlignment="start"
            accessibilityLabel="Selector de tarjetas"
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
          {selectedCardId && (
            <Text
              style={styles.selectedCaption}
              accessibilityLiveRegion="polite"
            >
              {creditCards.find((card) => card.id === selectedCardId)
                ?.cardType ?? "Tarjeta seleccionada"}
            </Text>
          )}
          {cardCount > 1 && (
            <View
              style={styles.pagination}
              accessibilityLabel={`Tarjeta ${Math.max(creditCards.findIndex((card) => card.id === selectedCardId) + 1, 1)} de ${cardCount}`}
            >
              {creditCards.map((card) => (
                <View
                  key={card.id}
                  style={[
                    styles.dot,
                    card.id === selectedCardId && styles.dotActive,
                  ]}
                />
              ))}
            </View>
          )}
        </>
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
    color: colors.textSecondary,
    letterSpacing: 1.4,
    textTransform: "uppercase",
  },
  countBadge: {
    backgroundColor: "rgba(255,255,255,0.08)",
    borderRadius: 10,
    paddingHorizontal: 7,
    paddingVertical: 2,
  },
  countBadgeText: {
    fontSize: 11,
    fontWeight: "700",
    color: colors.textMuted,
  },
  scrollContent: {
    paddingHorizontal: spacing.lg,
    paddingBottom: 6,
    paddingTop: 3, // room for the selected ring overhang
  },
  selectedCaption: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: "600",
    marginTop: spacing.xs,
    marginLeft: spacing.lg,
  },
  pagination: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: spacing.xs,
    minHeight: 44,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.textSubtle,
  },
  dotActive: {
    width: 18,
    backgroundColor: colors.accent,
  },
});

// Empty state
const emptyStyles = StyleSheet.create({
  container: {
    ...glassSurface(),
    padding: 28,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 1,
  },
  illustrationWrapper: {
    marginBottom: 16,
    opacity: 0.6,
  },
  title: {
    fontSize: 16,
    fontWeight: "700",
    color: colors.textSecondary,
    marginBottom: 8,
    textAlign: "center",
  },
  subtitle: {
    fontSize: 13,
    color: colors.textMuted,
    textAlign: "center",
    lineHeight: 19,
    maxWidth: 260,
    marginBottom: 8,
  },
});
