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
import { colors } from "@/shared/theme/colors";
import { spacing, borderRadius } from "@/shared/theme/tokens";
import Svg, { Circle } from "react-native-svg";

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

  const { data: creditCardsData, isLoading: isLoadingCards } = useCreditCards();
  const creditCards = creditCardsData || [];
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

  const [showOrphanModal, setShowOrphanModal] = useState(false);
  const [orphanSuggestion, setOrphanSuggestion] =
    useState<ImportResult["suggestedPeriod"]>(null);
  const [orphanedCount, setOrphanedCount] = useState(0);

  const loadTransactions = useCallback(async () => {
    if (!selectedCardId) return;
    setIsLoadingTransactions(true);
    try {
      const dataResponse = await getTransactionsByCreditCard(selectedCardId);
      const data = dataResponse.items;
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
      await refreshCount();

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
          tintColor={colors.accent}
          colors={[colors.accent]}
        />
      }
    >
      {/* Decorative top gradient */}
      <View style={styles.topGradient} pointerEvents="none">
        <Svg width="100%" height={160} style={StyleSheet.absoluteFill}>
          <Circle cx={60} cy={-20} r={100} fill={colors.accent} opacity={0.04} />
          <Circle cx={300} cy={40} r={120} fill={colors.accent} opacity={0.03} />
        </Svg>
      </View>

      <Text style={styles.welcome}>Hola, {userName} 👋</Text>

      <FinancialHealthIndicator
        monthlyBudgetCLP={profile?.monthlyBudgetCLP}
        monthlyBudgetUSD={profile?.monthlyBudgetUSD}
        spentCLP={debtSummary?.nextMonthCLP}
        spentUSD={debtSummary?.nextMonthUSD}
      />

      <CardsSection
        creditCards={creditCards}
        selectedCardId={selectedCardId}
        onSelectCard={setSelectedCardId}
      />

      {!alertsDismissed && creditCards.length > 0 && (
        <CreditCardAlertBanner
          creditCards={creditCards}
          onDismiss={() => setAlertsDismissed(true)}
        />
      )}

      {selectedCardId && (
        <TouchableOpacity
          style={[styles.importButton, isRefreshing && styles.buttonDisabled]}
          onPress={handleImportTransactions}
          disabled={isRefreshing}
        >
          {isRefreshing ? (
            <ActivityIndicator size="small" color={colors.accent} />
          ) : (
            <Ionicons name="sync-outline" size={16} color={colors.accent} />
          )}
          <Text style={styles.importButtonText}>
            {isRefreshing ? "Sincronizando..." : "Sincronizar movimientos"}
          </Text>
        </TouchableOpacity>
      )}

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
          <View style={styles.categorizeStrip} />
          <View style={styles.categorizeIconWrap}>
            <Ionicons name="pricetag" size={18} color={colors.warning} />
          </View>
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
          <View style={styles.categorizeArrow}>
            <Ionicons name="chevron-forward" size={18} color={colors.warning} />
          </View>
        </TouchableOpacity>
      )}

      {selectedCardId && (
        <MonthSummaryCard
          creditCardId={selectedCardId}
          nextPeriodCLP={debtSummary?.nextMonthCLP}
          nextPeriodUSD={debtSummary?.nextMonthUSD}
        />
      )}

      <DebtIndicatorCard
        refreshKey={refreshKey}
        summary={debtSummary ?? undefined}
      />

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
          <Ionicons name="chevron-forward" size={14} color={colors.accent} />
        </View>
      </TouchableOpacity>
      {isLoadingTransactions ? (
        <ActivityIndicator
          size="small"
          color={colors.accent}
          style={{ marginVertical: 10 }}
        />
      ) : transactions.length === 0 ? (
        <View style={styles.emptyTransactions}>
          <Ionicons name="receipt-outline" size={40} color={colors.textMuted} />
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
                            backgroundColor: item.categoryColor || colors.surface,
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
                          color={colors.warning}
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
  container: { flex: 1, backgroundColor: colors.bg },
  contentContainer: { padding: spacing.lg, paddingBottom: 40 },
  welcome: {
    fontSize: 22,
    fontWeight: "bold",
    marginBottom: 4,
    color: colors.textPrimary,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "700",
    marginBottom: 0,
    color: colors.textSecondary,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: spacing.md,
    marginBottom: 10,
  },
  seeAllButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
  },
  seeAllText: {
    fontSize: 13,
    color: colors.accent,
    fontWeight: "600",
  },
  transaction: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 4,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  transactionsContainer: {
    maxHeight: 240,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: colors.border,
  },
  transactionLeft: {
    flex: 1,
    marginRight: 10,
  },
  transactionRight: {
    alignItems: "flex-end",
  },
  merchant: { fontSize: 15, fontWeight: "500", color: colors.textPrimary },
  txMeta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 2,
  },
  transactionDate: { fontSize: 12, color: colors.textMuted },
  txCategoryPill: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
    gap: 3,
  },
  txCategoryEmoji: { fontSize: 10 },
  txCategoryName: { fontSize: 10, fontWeight: "600", color: colors.textPrimary },
  txUncategorized: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
    borderWidth: 1,
    borderStyle: "dashed",
    borderColor: colors.warning,
    backgroundColor: "rgba(217,119,6,0.1)",
  },
  txUncategorizedText: { fontSize: 10, fontWeight: "600", color: colors.warning },
  negative: { color: colors.destructive, fontSize: 15, fontWeight: "bold" },
  emptyTransactions: {
    alignItems: "center",
    paddingVertical: 30,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  emptyText: { color: colors.textMuted, marginTop: 8, fontSize: 14 },
  buttonDisabled: { opacity: 0.6 },
  importButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    alignSelf: "flex-start",
    backgroundColor: "rgba(59,130,246,0.1)",
    borderWidth: 1,
    borderColor: "rgba(59,130,246,0.3)",
    paddingVertical: 9,
    paddingHorizontal: 16,
    borderRadius: 20,
    marginTop: spacing.md,
    gap: 6,
  },
  importButtonText: {
    color: colors.accent,
    fontSize: 13,
    fontWeight: "600",
  },
  categorizeBanner: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(217,119,6,0.08)",
    borderWidth: 1,
    borderColor: "rgba(217,119,6,0.2)",
    borderRadius: 16,
    marginTop: spacing.md,
    overflow: "hidden",
    paddingRight: 14,
  },
  categorizeStrip: {
    width: 4,
    alignSelf: "stretch",
    backgroundColor: colors.warning,
  },
  categorizeIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "rgba(217,119,6,0.15)",
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
    color: colors.warning,
    lineHeight: 24,
  },
  categorizeLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: colors.warning,
  },
  categorizeSubtitle: {
    fontSize: 11,
    color: colors.textMuted,
    fontWeight: "500",
    marginTop: 2,
    letterSpacing: 0.2,
  },
  categorizeArrow: {
    marginLeft: 8,
  },
  topGradient: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 160,
    pointerEvents: "none",
  },
});
