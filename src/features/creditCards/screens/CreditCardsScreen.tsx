import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
  RefreshControl,
} from "react-native";
import { useEffect, useState, useCallback } from "react";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { getCreditCards } from "../services/creditCardsApi";
import { CreditCard } from "@/shared/types/creditCard";
import { formatCLP } from "@/shared/utils/format";

export default function CreditCardsScreen() {
  const router = useRouter();
  const [creditCards, setCreditCards] = useState<CreditCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchCards = useCallback(async () => {
    try {
      const data = await getCreditCards();
      setCreditCards(data);
    } catch (error) {
      console.error("Error fetching credit cards:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchCards();
  }, [fetchCards]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchCards();
  };

  const getCardIcon = (cardType: string): keyof typeof Ionicons.glyphMap => {
    const type = cardType.toLowerCase();
    if (type.includes("visa")) return "card";
    if (type.includes("master")) return "card";
    return "card-outline";
  };

  const getCardColor = (cardType: string): string => {
    const type = cardType.toLowerCase();
    if (type.includes("visa")) return "#1A1F71";
    if (type.includes("master")) return "#EB001B";
    return "#007BFF";
  };

  const formatCurrency = formatCLP;

  const getUsagePercent = (used: number, total: number): number => {
    if (total <= 0) return 0;
    return Math.min((used / total) * 100, 100);
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#007BFF" />
        <Text style={styles.loadingText}>Cargando tarjetas...</Text>
      </View>
    );
  }

  if (creditCards.length === 0) {
    return (
      <View style={styles.centered}>
        <Ionicons name="card-outline" size={64} color="#CED4DA" />
        <Text style={styles.emptyTitle}>Sin tarjetas</Text>
        <Text style={styles.emptySubtitle}>
          No tienes tarjetas de crédito registradas
        </Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      <Text style={styles.headerTitle}>
        {creditCards.length} {creditCards.length === 1 ? "tarjeta" : "tarjetas"}
      </Text>

      {creditCards.map((card) => {
        const usagePercent = getUsagePercent(
          card.nationalAmountUsed,
          card.nationalTotalLimit,
        );
        const intUsagePercent = getUsagePercent(
          card.internationalAmountUsed,
          card.internationalTotalLimit,
        );
        const maxUsage = Math.max(usagePercent, intUsagePercent);
        const hasAlert = maxUsage >= 80;
        const isCritical = maxUsage >= 95;
        const cardColor = getCardColor(card.cardType);

        return (
          <View key={card.id} style={styles.card}>
            {/* Card Header */}
            <View style={[styles.cardHeader, { backgroundColor: cardColor }]}>
              <View style={styles.cardHeaderLeft}>
                <Ionicons
                  name={getCardIcon(card.cardType)}
                  size={28}
                  color="#fff"
                />
                <View style={styles.cardHeaderInfo}>
                  <Text style={styles.cardType}>{card.cardType}</Text>
                  <Text style={styles.cardDigits}>
                    **** **** **** {card.cardLastDigits}
                  </Text>
                </View>
              </View>
              <View style={styles.statusBadge}>
                <Text style={styles.statusText}>
                  {card.status === "active" ? "Activa" : card.status}
                </Text>
              </View>
            </View>

            {/* Alert Banner */}
            {hasAlert && (
              <View
                style={[
                  styles.cupoAlertStrip,
                  {
                    backgroundColor: isCritical ? "#FFF3F3" : "#FFF8E1",
                    borderBottomColor: isCritical ? "#FFCDD2" : "#FFE082",
                  },
                ]}
              >
                <Ionicons
                  name={isCritical ? "alert-circle" : "warning"}
                  size={16}
                  color={isCritical ? "#DC3545" : "#F57C00"}
                />
                <Text
                  style={[
                    styles.cupoAlertText,
                    { color: isCritical ? "#DC3545" : "#F57C00" },
                  ]}
                >
                  {isCritical
                    ? `¡Cupo casi agotado! (${Math.round(maxUsage)}% utilizado)`
                    : `Cupo alto: ${Math.round(maxUsage)}% utilizado`}
                </Text>
              </View>
            )}

            {/* Card Body */}
            <View style={styles.cardBody}>
              {card.cardHolderName ? (
                <Text style={styles.holderName}>{card.cardHolderName}</Text>
              ) : null}

              {/* National Usage */}
              {card.nationalTotalLimit > 0 && (
                <View style={styles.usageSection}>
                  <View style={styles.usageHeader}>
                    <Text style={styles.usageLabel}>Cupo Nacional</Text>
                    <Text style={styles.usageAmount}>
                      {formatCurrency(card.nationalAmountUsed)} /{" "}
                      {formatCurrency(card.nationalTotalLimit)}
                    </Text>
                  </View>
                  <View style={styles.progressBar}>
                    <View
                      style={[
                        styles.progressFill,
                        {
                          width: `${usagePercent}%`,
                          backgroundColor:
                            usagePercent > 80
                              ? "#DC3545"
                              : usagePercent > 50
                                ? "#FFC107"
                                : "#28A745",
                        },
                      ]}
                    />
                  </View>
                  <Text style={styles.availableText}>
                    Disponible: {formatCurrency(card.nationalAmountAvailable)}
                  </Text>
                </View>
              )}

              {/* International Usage */}
              {card.internationalTotalLimit > 0 && (
                <View style={styles.usageSection}>
                  <View style={styles.usageHeader}>
                    <Text style={styles.usageLabel}>Cupo Internacional</Text>
                    <Text style={styles.usageAmount}>
                      {formatCurrency(card.internationalAmountUsed)} /{" "}
                      {formatCurrency(card.internationalTotalLimit)}
                    </Text>
                  </View>
                  <View style={styles.progressBar}>
                    <View
                      style={[
                        styles.progressFill,
                        {
                          width: `${getUsagePercent(card.internationalAmountUsed, card.internationalTotalLimit)}%`,
                          backgroundColor:
                            getUsagePercent(
                              card.internationalAmountUsed,
                              card.internationalTotalLimit,
                            ) > 80
                              ? "#DC3545"
                              : getUsagePercent(
                                    card.internationalAmountUsed,
                                    card.internationalTotalLimit,
                                  ) > 50
                                ? "#FFC107"
                                : "#28A745",
                        },
                      ]}
                    />
                  </View>
                  <Text style={styles.availableText}>
                    Disponible:{" "}
                    {formatCurrency(card.internationalAmountAvailable)}
                  </Text>
                </View>
              )}
            </View>

            {/* Card Actions */}
            <View style={styles.cardActions}>
              <TouchableOpacity
                style={styles.actionButton}
                onPress={() =>
                  router.push({
                    pathname: "/(screens)/billingPeriods",
                    params: {
                      creditCardId: card.id,
                      creditCardLabel: `${card.cardType} - ${card.cardLastDigits}`,
                    },
                  })
                }
              >
                <Ionicons name="calendar-outline" size={18} color="#007BFF" />
                <Text style={styles.actionText}>Ver Períodos</Text>
                <Ionicons name="chevron-forward" size={16} color="#007BFF" />
              </TouchableOpacity>
            </View>
          </View>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8F9FA",
  },
  contentContainer: {
    padding: 16,
    paddingBottom: 32,
  },
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#F8F9FA",
    padding: 20,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 15,
    color: "#868E96",
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#495057",
    marginTop: 16,
  },
  emptySubtitle: {
    fontSize: 14,
    color: "#868E96",
    marginTop: 6,
  },
  headerTitle: {
    fontSize: 14,
    color: "#868E96",
    marginBottom: 12,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    fontWeight: "600",
  },
  card: {
    backgroundColor: "#fff",
    borderRadius: 16,
    marginBottom: 16,
    elevation: 3,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    overflow: "hidden",
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 18,
  },
  cardHeaderLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  cardHeaderInfo: {
    marginLeft: 12,
  },
  cardType: {
    fontSize: 17,
    fontWeight: "bold",
    color: "#fff",
  },
  cardDigits: {
    fontSize: 13,
    color: "rgba(255,255,255,0.8)",
    marginTop: 2,
    letterSpacing: 1,
  },
  statusBadge: {
    backgroundColor: "rgba(255,255,255,0.25)",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    color: "#fff",
    fontWeight: "600",
  },
  cardBody: {
    padding: 18,
  },
  holderName: {
    fontSize: 13,
    color: "#868E96",
    marginBottom: 14,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  usageSection: {
    marginBottom: 14,
  },
  usageHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 6,
  },
  usageLabel: {
    fontSize: 13,
    color: "#495057",
    fontWeight: "600",
  },
  usageAmount: {
    fontSize: 13,
    color: "#868E96",
  },
  progressBar: {
    height: 8,
    backgroundColor: "#E9ECEF",
    borderRadius: 4,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    borderRadius: 4,
  },
  availableText: {
    fontSize: 12,
    color: "#28A745",
    marginTop: 4,
    fontWeight: "500",
  },
  cardActions: {
    borderTopWidth: 1,
    borderTopColor: "#F1F3F5",
    paddingHorizontal: 18,
    paddingVertical: 12,
  },
  actionButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 8,
  },
  actionText: {
    fontSize: 14,
    color: "#007BFF",
    fontWeight: "600",
    marginLeft: 8,
    flex: 1,
  },
  cupoAlertStrip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 18,
    paddingVertical: 8,
    borderBottomWidth: 1,
  },
  cupoAlertText: {
    fontSize: 13,
    fontWeight: "600",
    flex: 1,
  },
});
