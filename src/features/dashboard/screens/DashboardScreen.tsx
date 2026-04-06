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
import { Ionicons } from "@expo/vector-icons";
import { useCreditCards } from "@/features/creditCards/services/creditCardsApi";
import { useUncategorized } from "@/shared/contexts/UncategorizedContext";
import {
  importBankTransactions,
  ImportResult,
  getTransactionsByCreditCard,
  Transaction,
} from "@/features/transactions/services/transactionsApi";
import { useMyProfile } from "@/features/profile/services/userApi";
import { createBillingPeriod } from "@/features/billingPeriods/services/billingPeriodsApi";
import BillingPeriodFormModal from "@/features/billingPeriods/components/BillingPeriodFormModal";
import CardsSection from "@/features/creditCards/components/CardsSection";
import MonthlyStats from "../components/MonthlyStats";
import MonthSummaryCard from "../components/MonthSummaryCard";
import CreditCardAlertBanner from "../components/CreditCardAlertBanner";
import DebtIndicatorCard from "../components/DebtIndicatorCard";
import FinancialHealthIndicator from "../components/FinancialHealthIndicator";
import { useDebtSummary } from "../services/statsApi";
import { isSessionExpired } from "@/shared/utils/authEvents";
import DashboardSkeleton from "../components/DashboardSkeleton";
import {
  configureNotificationHandler,
  setupAndroidChannel,
  scheduleCardNotifications,
} from "@/features/notifications/services/notificationService";
import { CreditCardWithLimits } from "@/shared/types/creditCard";
import { formatShortDate } from "@/shared/utils/format";
import { getSessionUser } from "@/features/auth/services/sessionStorage";
import { useQueryClient } from "@tanstack/react-query";

const formatTransactionDate = formatShortDate;

export default function DashboardScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isLoadingTransactions, setIsLoadingTransactions] = useState(false);
  const [userName, setUserName] = useState<string>("");
  const [selectedCardId, setSelectedCardId] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [alertsDismissed, setAlertsDismissed] = useState(false);
  const [isPullRefreshing, setIsPullRefreshing] = useState(false);
  
  const { data: creditCards = [], isLoading: isLoadingCards } = useCreditCards();
  const { data: debtSummary } = useDebtSummary();
  const { data: profile } = useMyProfile();
  
  const [refreshKey, setRefreshKey] = useState(0);
  const { count: uncategorizedCount, refreshCount } = useUncategorized();

  // Initialize selectedCardId when creditCards loads
  useEffect(() => {
    if (creditCards.length > 0 && !selectedCardId) {
      setSelectedCardId(creditCards[0].id);
    }
  }, [creditCards, selectedCardId]);

  // Pull to refresh handler using queryClient
  const handlePullRefresh = useCallback(async () => {
    setIsPullRefreshing(true);
    try {
      // Invalidate queries to force refetch
      await queryClient.invalidateQueries({ queryKey: ["creditCards"] });
      await queryClient.invalidateQueries({ queryKey: ["debtSummary"] });
      await refreshCount();
      setRefreshKey((prev) => prev + 1);
      setAlertsDismissed(false);
    } catch (error) {
      if (!isSessionExpired()) console.error("Error refreshing:", error);
    } finally {
      setIsPullRefreshing(false);
    }
  }, [queryClient, refreshCount]);

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
      if (!isSessionExpired())
        console.error("Error loading transactions:", error);
    } finally {
      setIsLoadingTransactions(false);
    }
  }, [selectedCardId]);

  useEffect(() => {
    loadTransactions();
  }, [selectedCardId]);

  const handleImportTransactions = useCallback(async () => {
    if (!selectedCardId) {
      Alert.alert("Error", "Selecciona una tarjeta primero.");
      return;
    }
    setIsRefreshing(true);
    try {
      const result = await importBankTransactions(selectedCardId);
      setRefreshKey((prev) => prev + 1);

      // Refresh uncategorized count after import
      await refreshCount();

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
      if (!isSessionExpired()) {
        Alert.alert(
          "Error",
          error instanceof Error
            ? error.message
            : "Error al importar transacciones",
        );
      }
    } finally {
      setIsRefreshing(false);
    }
  }, [selectedCardId, refreshCount]);

  const handleCreateSuggestedPeriod = async (data: {
    creditCardId: string;
    month: string;
    startDate: string;
    endDate: string;
    dueDate: string;
  }) => {
    if (!selectedCardId) return;
    await createBillingPeriod(selectedCardId, data);
    Alert.alert("Éxito", "Período de facturación creado correctamente.");
    setRefreshKey((prev) => prev + 1);
  };

  const _getSelectedCardLabel = () => {
    const card = creditCards.find((c) => c.id === selectedCardId);
    return card ? `${card.cardType} - ${card.cardLastDigits}` : "";
  };

  // Set up notifications when creditCards loads
  useEffect(() => {
    if (creditCards.length > 0) {
      configureNotificationHandler();
      setupAndroidChannel().then(() => {
        scheduleCardNotifications(creditCards).catch(console.warn);
      });
    }
  }, [creditCards]);

  // Get user name from session
  useEffect(() => {
    getSessionUser().then((user) => {
      if (user?.givenName) {
        setUserName(user.givenName);
      }
    });
  }, []);

  if (isLoadingCards) {
    return (
      <ScrollView style={styles.container}>
        <DashboardSkeleton />
      </ScrollView>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl
          refreshing={isPullRefreshing}
          onRefresh={handlePullRefresh}
        />
      }
    >
      <Text style={styles.welcome}>Hola, {userName} 👋</Text>

      {/* Indicador de salud financiera */}
      <FinancialHealthIndicator
        monthlyBudgetCLP={profile?.monthlyBudgetCLP}
        monthlyBudgetUSD={profile?.monthlyBudgetUSD}
        spentCLP={debtSummary?.nextMonthCLP}
        spentUSD={debtSummary?.nextMonthUSD}
      />

      {/* ── Mis Tarjetas ─────────────────────────────────────────────── */}
      <CardsSection
        creditCards={creditCards}
        selectedCardId={selectedCardId}
        onSelectCard={setSelectedCardId}
      />

      {/* Alerta de cupo */}
      {!alertsDismissed && creditCards.length > 0 && (
        <CreditCardAlertBanner
          creditCards={creditCards}
          onDismiss={() => setAlertsDismissed(true)}
        />
      )}

      {/* Botón sincronizar movimientos */}
      {selectedCardId && (
        <TouchableOpacity
          style={[styles.importButton, isRefreshing && styles.buttonDisabled]}
          onPress={handleImportTransactions}
          disabled={isRefreshing}
        >
          {isRefreshing ? (
            <ActivityIndicator size="small" color="#0891B2" />
          ) : (
            <Ionicons name="sync-outline" size={16} color="#0891B2" />
          )}
          <Text style={styles.importButtonText}>
            {isRefreshing ? "Sincronizando..." : "Sincronizar movimientos"}
          </Text>
        </TouchableOpacity>
      )}

      {/* ── Banner: categorizar transacciones ───────────────────────── */}
      {uncategorizedCount > 0 && (
        <TouchableOpacity
          style={styles.categorizeBanner}
          onPress={() =>
            router.push({
              pathname: "/(drawer)/transactions",
              params: { filter: "uncategorized" },
            })
          }
          activeOpacity={0.82}
        >
          {/* Left accent strip */}
          <View style={styles.categorizeStrip} />

          {/* Icon */}
          <View style={styles.categorizeIconWrap}>
            <Ionicons name="pricetag" size={18} color="#F57C00" />
          </View>

          {/* Text block */}
          <View style={styles.categorizeTextBlock}>
            <View style={styles.categorizeTopRow}>
              <Text style={styles.categorizeCount}>{uncategorizedCount}</Text>
              <Text style={styles.categorizeLabel}>
                {uncategorizedCount === 1
                  ? " transacción pendiente"
                  : " transacciones pendientes"}
              </Text>
            </View>
            <Text style={styles.categorizeSubtitle}>
              Toca para categorizar ahora
            </Text>
          </View>

          {/* Arrow */}
          <View style={styles.categorizeArrow}>
            <Ionicons name="chevron-forward" size={18} color="#F57C00" />
          </View>
        </TouchableOpacity>
      )}

      {/* Resumen del mes actual */}
      {selectedCardId && (
        <MonthSummaryCard
          creditCardId={selectedCardId}
          nextPeriodCLP={debtSummary?.nextMonthCLP}
          nextPeriodUSD={debtSummary?.nextMonthUSD}
        />
      )}

      {/* Indicador de deuda en cuotas */}
      <DebtIndicatorCard
        refreshKey={refreshKey}
        summary={debtSummary ?? undefined}
      />

      {/* Estadísticas Mensuales */}
      {selectedCardId && (
        <MonthlyStats creditCardId={selectedCardId} />
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
                  <View style={styles.txMeta}>
                    <Text style={styles.transactionDate}>
                      {formatTransactionDate(item.transactionDate)}
                    </Text>
                    {item.categoryId ? (
                      <View
                        style={[
                          styles.txCategoryPill,
                          {
                            backgroundColor: item.categoryColor || "#E9ECEF",
                          },
                        ]}
                      >
                        <Text style={styles.txCategoryEmoji}>
                          {item.categoryIcon || "🏷️"}
                        </Text>
                        <Text style={styles.txCategoryName} numberOfLines={1}>
                          {item.categoryName}
                        </Text>
                      </View>
                    ) : (
                      <View style={styles.txUncategorized}>
                        <Ionicons
                          name="pricetag-outline"
                          size={10}
                          color="#F57C00"
                        />
                        <Text style={styles.txUncategorizedText}>
                          Sin categoría
                        </Text>
                      </View>
                    )}
                  </View>
                </View>
                <View style={styles.transactionRight}>
                  <Text style={styles.negative}>
                    {item.currency === "USD" ? "US$" : "$"}
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
  welcome: {
    fontSize: 22,
    fontWeight: "bold",
    marginBottom: 4,
    color: "#212529",
  },
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
  txMeta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 2,
  },
  transactionDate: { fontSize: 12, color: "#868E96" },
  txCategoryPill: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
    gap: 3,
  },
  txCategoryEmoji: { fontSize: 10 },
  txCategoryName: { fontSize: 10, fontWeight: "600", color: "#212529" },
  txUncategorized: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
    borderWidth: 1,
    borderStyle: "dashed",
    borderColor: "#F57C00",
    backgroundColor: "#FFF8E1",
  },
  txUncategorizedText: { fontSize: 10, fontWeight: "600", color: "#F57C00" },
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
    alignSelf: "flex-start",
    backgroundColor: "#F0FDFF",
    borderWidth: 1,
    borderColor: "#BAE6FD",
    paddingVertical: 9,
    paddingHorizontal: 16,
    borderRadius: 20,
    marginTop: 14,
    gap: 6,
  },
  importButtonText: {
    color: "#0891B2",
    fontSize: 13,
    fontWeight: "600",
  },
  // ── Categorize action banner ────────────────────────────────────────────
  categorizeBanner: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFBF5",
    borderWidth: 1,
    borderColor: "#FFE0B2",
    borderRadius: 16,
    marginTop: 14,
    overflow: "hidden",
    paddingRight: 14,
    shadowColor: "#F57C00",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 2,
  },
  categorizeStrip: {
    width: 4,
    alignSelf: "stretch",
    backgroundColor: "#F57C00",
  },
  categorizeIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "#FFF3E0",
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 14,
    marginRight: 12,
    flexShrink: 0,
  },
  categorizeTextBlock: {
    flex: 1,
    paddingVertical: 14,
  },
  categorizeTopRow: {
    flexDirection: "row",
    alignItems: "baseline",
  },
  categorizeCount: {
    fontSize: 20,
    fontWeight: "800",
    color: "#E65100",
    lineHeight: 24,
  },
  categorizeLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: "#BF360C",
  },
  categorizeSubtitle: {
    fontSize: 11,
    color: "#F57C00",
    fontWeight: "500",
    marginTop: 2,
    letterSpacing: 0.2,
  },
  categorizeArrow: {
    marginLeft: 8,
  },
});
