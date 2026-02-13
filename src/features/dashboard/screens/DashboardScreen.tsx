import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  ScrollView,
  RefreshControl,
} from "react-native";
import { useEffect, useState, useCallback } from "react";
import { useRouter } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Ionicons } from "@expo/vector-icons";
import { getCreditCards } from "@/features/creditCards/services/creditCardsApi";
import {
  importBankTransactions,
  ImportResult,
  getTransactionsByCreditCard,
  Transaction,
} from "@/features/transactions/services/transactionsApi";
import { createBillingPeriod } from "@/features/billingPeriods/services/billingPeriodsApi";
import BillingPeriodFormModal from "@/features/billingPeriods/components/BillingPeriodFormModal";
import MonthlyStats from "../components/MonthlyStats";
import MonthSummaryCard from "../components/MonthSummaryCard";
import CreditCardAlertBanner from "../components/CreditCardAlertBanner";
import DebtIndicatorCard from "../components/DebtIndicatorCard";

interface CreditCard {
  id: string;
  cardType: string;
  cardLastDigits: string;
  nationalAmountUsed: number;
  nationalTotalLimit: number;
  internationalAmountUsed: number;
  internationalTotalLimit: number;
}

const formatTransactionDate = (dateStr: string): string => {
  try {
    const date = new Date(dateStr);
    return date.toLocaleDateString("es-CL", {
      timeZone: "America/Santiago",
      day: "2-digit",
      month: "short",
    });
  } catch {
    return "";
  }
};

export default function DashboardScreen() {
  const router = useRouter();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isLoadingTransactions, setIsLoadingTransactions] = useState(false);
  const [userName, setUserName] = useState<string>("");
  const [creditCards, setCreditCards] = useState<CreditCard[]>([]);
  const [selectedCardId, setSelectedCardId] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [alertsDismissed, setAlertsDismissed] = useState(false);
  const [isPullRefreshing, setIsPullRefreshing] = useState(false);

  const handlePullRefresh = useCallback(async () => {
    setIsPullRefreshing(true);
    try {
      const cards = await getCreditCards();
      setCreditCards(cards);
      setAlertsDismissed(false);
      setRefreshKey((prev: number) => prev + 1);
    } catch (error) {
      console.error("Error refreshing:", error);
    } finally {
      setIsPullRefreshing(false);
    }
  }, []);

  // Estado para el modal de crear período sugerido
  const [showOrphanModal, setShowOrphanModal] = useState(false);
  const [orphanSuggestion, setOrphanSuggestion] =
    useState<ImportResult["suggestedPeriod"]>(null);
  const [orphanedCount, setOrphanedCount] = useState(0);

  const loadTransactions = useCallback(async () => {
    if (!selectedCardId) return;
    setIsLoadingTransactions(true);
    try {
      const data = await getTransactionsByCreditCard(selectedCardId);
      // Ordenar por fecha desc y tomar las últimas 10
      const sorted = data
        .sort(
          (a, b) =>
            new Date(b.transactionDate).getTime() -
            new Date(a.transactionDate).getTime(),
        )
        .slice(0, 10);
      setTransactions(sorted);
    } catch (error) {
      console.error("Error loading transactions:", error);
    } finally {
      setIsLoadingTransactions(false);
    }
  }, [selectedCardId]);

  useEffect(() => {
    loadTransactions();
  }, [loadTransactions, refreshKey]);

  const handleImportTransactions = useCallback(async () => {
    if (!selectedCardId) {
      Alert.alert("Error", "Selecciona una tarjeta primero.");
      return;
    }
    setIsRefreshing(true);
    try {
      const result = await importBankTransactions(selectedCardId);
      setRefreshKey((prev: number) => prev + 1);

      // Verificar si hay transacciones huérfanas
      if (result.orphanedCount > 0 && result.suggestedPeriod) {
        setOrphanSuggestion(result.suggestedPeriod);
        setOrphanedCount(result.orphanedCount);
        setShowOrphanModal(true);
      } else {
        const parts: string[] = [];
        if (result.importedCount > 0) {
          parts.push(`${result.importedCount} transacciones importadas`);
        }
        if (result.quotasCreated > 0) {
          parts.push(`${result.quotasCreated} cuotas creadas`);
        }
        Alert.alert(
          "Éxito",
          parts.length > 0
            ? parts.join(", ") + "."
            : "No hay nuevas transacciones.",
        );
      }
    } catch (error) {
      Alert.alert(
        "Error",
        error instanceof Error
          ? error.message
          : "Error al importar transacciones",
      );
    } finally {
      setIsRefreshing(false);
    }
  }, [selectedCardId]);

  const handleCreateSuggestedPeriod = async (data: {
    month: string;
    startDate: string;
    endDate: string;
  }) => {
    if (!selectedCardId) return;
    await createBillingPeriod(selectedCardId, data);
    Alert.alert("Éxito", "Período de facturación creado correctamente.");
    setRefreshKey((prev: number) => prev + 1);
  };

  const getSelectedCardLabel = () => {
    const card = creditCards.find((c) => c.id === selectedCardId);
    return card ? `${card.cardType} - ${card.cardLastDigits}` : "";
  };

  useEffect(() => {
    // Obtener nombre del usuario
    AsyncStorage.getItem("user").then((user) => {
      if (user) {
        const parsedUser = JSON.parse(user);
        if (parsedUser.givenName) {
          setUserName(parsedUser.givenName);
        }
      }
    });

    // Obtener tarjetas de crédito
    getCreditCards().then((cards) => {
      setCreditCards(cards);
      if (cards.length > 0) {
        setSelectedCardId(cards[0].id);
      }
    });
  }, []);

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl refreshing={isPullRefreshing} onRefresh={handlePullRefresh} />
      }
    >
      <Text style={styles.welcome}>Hola, {userName} 👋</Text>

      {/* Selección de Tarjeta de Crédito */}
      <Text style={styles.sectionTitle}>Mis Tarjetas</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        {creditCards.map((item) => {
          const natPercent = item.nationalTotalLimit > 0
            ? (item.nationalAmountUsed / item.nationalTotalLimit) * 100
            : 0;
          const intPercent = item.internationalTotalLimit > 0
            ? (item.internationalAmountUsed / item.internationalTotalLimit) * 100
            : 0;
          const maxPercent = Math.max(natPercent, intPercent);
          const hasAlert = maxPercent >= 80;

          return (
          <TouchableOpacity
            key={item.id}
            style={[
              styles.cardButton,
              selectedCardId === item.id && styles.selectedCard,
              hasAlert && selectedCardId !== item.id && styles.cardButtonAlert,
            ]}
            onPress={() => setSelectedCardId(item.id)}
          >
            {hasAlert && (
              <View style={styles.alertBadge}>
                <Ionicons
                  name={maxPercent >= 95 ? "alert-circle" : "warning"}
                  size={14}
                  color={maxPercent >= 95 ? "#DC3545" : "#F57C00"}
                />
              </View>
            )}
            <Ionicons
              name="card-outline"
              size={22}
              color={selectedCardId === item.id ? "#fff" : "#495057"}
            />
            <Text
              style={[
                styles.cardType,
                selectedCardId === item.id && styles.cardTypeSelected,
              ]}
            >
              {item.cardType}
            </Text>
            <Text
              style={[
                styles.cardDigits,
                selectedCardId === item.id && styles.cardDigitsSelected,
              ]}
            >
              **** {item.cardLastDigits}
            </Text>
          </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* Alerta de cupo */}
      {!alertsDismissed && creditCards.length > 0 && (
        <CreditCardAlertBanner
          creditCards={creditCards}
          onDismiss={() => setAlertsDismissed(true)}
        />
      )}

      {/* Botón Importar Transacciones */}
      {selectedCardId && (
        <TouchableOpacity
          style={[styles.importButton, isRefreshing && styles.buttonDisabled]}
          onPress={handleImportTransactions}
          disabled={isRefreshing}
        >
          {isRefreshing ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Ionicons name="cloud-download-outline" size={20} color="#fff" />
          )}
          <Text style={styles.importButtonText}>
            {isRefreshing ? "Importando..." : "Importar Transacciones"}
          </Text>
        </TouchableOpacity>
      )}

      {/* Resumen del mes actual */}
      {selectedCardId && (
        <MonthSummaryCard
          creditCardId={selectedCardId}
          refreshKey={refreshKey}
        />
      )}

      {/* Indicador de deuda en cuotas */}
      <DebtIndicatorCard refreshKey={refreshKey} />

      {/* Estadísticas Mensuales */}
      {selectedCardId && (
        <MonthlyStats
          creditCardId={selectedCardId}
          key={`${selectedCardId}-${refreshKey}`}
        />
      )}

      <TouchableOpacity
        style={styles.sectionHeader}
        onPress={() => router.push("/(drawer)/transactions")}
      >
        <Text style={styles.sectionTitle}>Últimas Transacciones</Text>
        <View style={styles.seeAllButton}>
          <Text style={styles.seeAllText}>Ver todas</Text>
          <Ionicons name="chevron-forward" size={14} color="#007BFF" />
        </View>
      </TouchableOpacity>
      {isLoadingTransactions ? (
        <ActivityIndicator
          size="small"
          color="#007BFF"
          style={{ marginVertical: 10 }}
        />
      ) : transactions.length === 0 ? (
        <View style={styles.emptyTransactions}>
          <Ionicons name="receipt-outline" size={40} color="#CED4DA" />
          <Text style={styles.emptyText}>No hay transacciones aún</Text>
        </View>
      ) : (
        <View style={styles.transactionsContainer}>
          <ScrollView nestedScrollEnabled showsVerticalScrollIndicator={false}>
            {transactions.map((item) => (
              <View key={item.id} style={styles.transaction}>
                <View style={styles.transactionLeft}>
                  <Text style={styles.merchant} numberOfLines={1}>
                    {item.merchant}
                  </Text>
                  <Text style={styles.transactionDate}>
                    {formatTransactionDate(item.transactionDate)}
                  </Text>
                </View>
                <View style={styles.transactionRight}>
                  <Text style={styles.negative}>
                    {item.currency === "Dolar" ? "US$" : "$"}
                    {item.amount.toLocaleString("es-CL")}
                  </Text>
                </View>
              </View>
            ))}
          </ScrollView>
        </View>
      )}

      {/* Modal para crear período cuando hay transacciones huérfanas */}
      <BillingPeriodFormModal
        visible={showOrphanModal}
        onClose={() => setShowOrphanModal(false)}
        onSubmit={handleCreateSuggestedPeriod}
        initialData={orphanSuggestion ?? undefined}
        title="Crear Período de Facturación"
        isOrphanSuggestion
        orphanedCount={orphanedCount}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F8F9FA" },
  contentContainer: { padding: 20, paddingBottom: 40 },
  welcome: { fontSize: 22, fontWeight: "bold", marginBottom: 4, color: "#212529" },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "700",
    marginBottom: 0,
    color: "#495057",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 16,
    marginBottom: 10,
  },
  seeAllButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
  },
  seeAllText: {
    fontSize: 13,
    color: "#007BFF",
    fontWeight: "600",
  },
  transaction: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 4,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F3F5",
  },
  transactionsContainer: {
    maxHeight: 240,
    backgroundColor: "#fff",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 4,
    elevation: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },
  transactionLeft: {
    flex: 1,
    marginRight: 10,
  },
  transactionRight: {
    alignItems: "flex-end",
  },
  merchant: { fontSize: 15, fontWeight: "500", color: "#212529" },
  transactionDate: { fontSize: 12, color: "#868E96", marginTop: 2 },
  negative: { color: "#DC3545", fontSize: 15, fontWeight: "bold" },
  emptyTransactions: {
    alignItems: "center",
    paddingVertical: 30,
    backgroundColor: "#fff",
    borderRadius: 12,
  },
  emptyText: { color: "#868E96", marginTop: 8, fontSize: 14 },
  buttonDisabled: {
    opacity: 0.6,
  },
  importButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#17A2B8",
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 12,
    marginTop: 16,
    gap: 8,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  importButtonText: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "700",
  },
  cardButton: {
    paddingVertical: 16,
    paddingHorizontal: 20,
    backgroundColor: "#fff",
    borderRadius: 14,
    marginRight: 12,
    minWidth: 140,
    alignItems: "center",
    borderWidth: 2,
    borderColor: "#E9ECEF",
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    position: "relative" as const,
  },
  cardButtonAlert: {
    borderColor: "#FFE082",
    backgroundColor: "#FFFDF5",
  },
  alertBadge: {
    position: "absolute" as const,
    top: 6,
    right: 6,
  },
  selectedCard: {
    backgroundColor: "#007BFF",
    borderColor: "#007BFF",
  },
  cardType: {
    fontSize: 14,
    fontWeight: "600",
    color: "#495057",
    marginTop: 6,
  },
  cardTypeSelected: {
    color: "#fff",
  },
  cardDigits: {
    fontSize: 13,
    color: "#868E96",
    marginTop: 2,
  },
  cardDigitsSelected: {
    color: "rgba(255,255,255,0.8)",
  },
});
