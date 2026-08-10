import {
  View,
  Text,
  TouchableOpacity,
  Pressable,
  StyleSheet,
  ActivityIndicator,
  Alert,
  ScrollView,
  RefreshControl,
  Platform,
} from "react-native";
import { useEffect, useState, useCallback, useMemo } from "react";
import { useFocusEffect } from "@react-navigation/native";
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
import { useBillingPeriods } from "@/features/billingPeriods/services/billingPeriodsApi";
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
import EmptyDashboardState from "../components/EmptyDashboardState";
import FirstImportPrompt from "../components/FirstImportPrompt";
import PressableScale from "@/shared/components/PressableScale";
import {
  configureNotificationHandler,
  setupAndroidChannel,
  scheduleCardNotifications,
} from "@/features/notifications/services/notificationService";
import { CreditCardWithLimits, CreditCard } from "@/shared/types/creditCard";
import { formatShortDate, toISODateString } from "@/shared/utils/format";
import { getSessionUser } from "@/features/auth/services/sessionStorage";
import { useQueryClient } from "@tanstack/react-query";
import ErrorState from "@/shared/components/ErrorState";
import { colors } from "@/shared/theme/colors";
import { spacing, borderRadius, typography } from "@/shared/theme/tokens";
import { iconContainer } from "@/shared/theme/effects";
import Svg, { Circle } from "react-native-svg";

const formatTransactionDate = formatShortDate;

// ─── Suggested Billing Period from Credit Card ─────────────────────────

/** Formats a Date as YYYY-MM to fit the DB's VARCHAR(7) column. */
function formatMonthKey(date: Date): string {
  const y = date.getFullYear();
  const m = (date.getMonth() + 1).toString().padStart(2, "0");
  return `${y}-${m}`;
}

/** Returns the last calendar day of a given month (1–31). */
function lastDayOfMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate();
}

/**
 * Computes a suggested billing period based on the credit card's
 * closingDay and dueDay. Uses the most recent closing date ≤ today.
 * Falls back to endDate + 20 days when dueDay is not set.
 * Returns null when closingDay is not configured.
 */
function computeSuggestedPeriod(card: CreditCard): {
  month: string;
  startDate: string;
  endDate: string;
  dueDate: string;
} | null {
  if (!card.closingDay) return null;

  const today = new Date();
  const closingDay = card.closingDay;

  // ---- endDate: most recent closing ≤ today ----
  const thisMonthLast = lastDayOfMonth(today.getFullYear(), today.getMonth());
  const thisClosing = Math.min(closingDay, thisMonthLast);

  let endYear = today.getFullYear();
  let endMonth = today.getMonth();
  let endDay: number;

  if (today.getDate() >= thisClosing) {
    endDay = thisClosing;
  } else {
    endMonth -= 1;
    if (endMonth < 0) {
      endMonth = 11;
      endYear -= 1;
    }
    const prevLast = lastDayOfMonth(endYear, endMonth);
    endDay = Math.min(closingDay, prevLast);
  }

  const endDate = new Date(endYear, endMonth, endDay);

  // ---- startDate: day after previous closing ----
  let startMonth = endMonth - 1;
  let startYear = endYear;
  if (startMonth < 0) {
    startMonth = 11;
    startYear -= 1;
  }
  const startMonthLast = lastDayOfMonth(startYear, startMonth);
  const startDay = Math.min(closingDay, startMonthLast);
  const startDate = new Date(startYear, startMonth, startDay + 1);

  // ---- dueDate ----
  let dueDate: Date;
  if (card.dueDay) {
    let dueMonth = endMonth + 1;
    let dueYear = endYear;
    if (dueMonth > 11) {
      dueMonth = 0;
      dueYear += 1;
    }
    const dueMonthLast = lastDayOfMonth(dueYear, dueMonth);
    const dueDay = Math.min(card.dueDay, dueMonthLast);
    dueDate = new Date(dueYear, dueMonth, dueDay);
  } else {
    dueDate = new Date(endDate);
    dueDate.setDate(dueDate.getDate() + 20);
  }

  const monthLabel = formatMonthKey(endDate);

  return {
    month: monthLabel,
    startDate: toISODateString(startDate),
    endDate: toISODateString(endDate),
    dueDate: toISODateString(dueDate),
  };
}

export default function DashboardScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isLoadingTransactions, setIsLoadingTransactions] = useState(false);
  const [initialLoadDone, setInitialLoadDone] = useState(false);
  const [userName, setUserName] = useState<string>("");
  const [selectedCardId, setSelectedCardId] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [alertsDismissed, setAlertsDismissed] = useState(false);
  const [isPullRefreshing, setIsPullRefreshing] = useState(false);

  const {
    data: creditCardsData,
    isLoading: isLoadingCards,
    isError: cardsError,
  } = useCreditCards();
  const creditCards = creditCardsData || [];
  const { data: debtSummary, isError: debtError } = useDebtSummary();
  const { data: profile } = useMyProfile();
  const { data: billingPeriodsData } = useBillingPeriods(selectedCardId ?? "");

  const billingPeriods = billingPeriodsData?.items ?? [];
  const activePeriod = useMemo(() => {
    if (!billingPeriods.length) return null;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return (
      billingPeriods.find((p) => {
        const start = new Date(p.startDate);
        start.setHours(0, 0, 0, 0);
        const end = new Date(p.endDate);
        end.setHours(23, 59, 59, 999);
        return today >= start && today <= end;
      }) ?? null
    );
  }, [billingPeriods]);

  const selectedCard = useMemo(
    () => creditCards.find((c) => c.id === selectedCardId) ?? null,
    [creditCards, selectedCardId],
  );

  const daysToClose: number | null = useMemo(() => {
    if (activePeriod) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const end = new Date(activePeriod.endDate);
      end.setHours(23, 59, 59, 999);
      return Math.ceil((end.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    }
    // Fallback: use closingDay from the card if configured
    if (selectedCard?.closingDay) {
      const today = new Date();
      const year = today.getFullYear();
      const month = today.getMonth();
      const lastDay = new Date(year, month + 1, 0).getDate();
      const closingDay = Math.min(selectedCard.closingDay, lastDay);
      if (today.getDate() >= closingDay) {
        const nextMonth = month + 1;
        const nextYear = nextMonth > 11 ? year + 1 : year;
        const nextMonthIdx = nextMonth > 11 ? 0 : nextMonth;
        const nextLast = new Date(nextYear, nextMonthIdx + 1, 0).getDate();
        const nextClosing = Math.min(selectedCard.closingDay, nextLast);
        const nextClosingDate = new Date(nextYear, nextMonthIdx, nextClosing);
        return Math.ceil((nextClosingDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
      }
      const closingDate = new Date(year, month, closingDay);
      return Math.ceil((closingDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    }
    return null;
  }, [activePeriod, selectedCard?.closingDay]);

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
      await queryClient.invalidateQueries({ queryKey: ["monthlyStats"] });
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
      setInitialLoadDone(true);
    }
  }, [selectedCardId]);

  useEffect(() => {
    loadTransactions();
  }, [selectedCardId, refreshKey]);

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
      await queryClient.invalidateQueries({ queryKey: ["debtSummary"] });
      await queryClient.invalidateQueries({ queryKey: ["monthlyStats"] });

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
    await createBillingPeriod(selectedCardId, {
      ...data,
      creditCardId: selectedCardId, // Override with actual card ID
    });
    await queryClient.invalidateQueries({ queryKey: ["debtSummary"] });
    await queryClient.invalidateQueries({ queryKey: ["creditCards"] });
    await queryClient.invalidateQueries({ queryKey: ["monthlyStats"] });
    await refreshCount();
    setRefreshKey((prev) => prev + 1);
    Alert.alert("Éxito", "Período de facturación creado correctamente.");
  };

  // Set up notifications when creditCards loads (native only)
  useEffect(() => {
    if (Platform.OS !== "web" && creditCards.length > 0) {
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

  // Refresh dashboard data when screen regains focus (e.g., returning from transactions)
  useFocusEffect(
    useCallback(() => {
      queryClient.invalidateQueries({ queryKey: ["debtSummary"] });
      queryClient.invalidateQueries({ queryKey: ["monthlyStats"] });
      refreshCount();
    }, [queryClient, refreshCount]),
  );

  if (isLoadingCards) {
    return (
      <ScrollView style={styles.container}>
        <DashboardSkeleton />
      </ScrollView>
    );
  }

  // Show skeleton until first transaction load attempt completes
  if (creditCards.length > 0 && !initialLoadDone) {
    return (
      <ScrollView style={styles.container}>
        <DashboardSkeleton />
      </ScrollView>
    );
  }

  // No cards yet → show unified empty state
  if (cardsError || debtError) {
    return (
      <ErrorState
        message="No se pudo cargar el dashboard. Verifica tu conexión."
        onRetry={handlePullRefresh}
      />
    );
  }

  if (creditCards.length === 0) {
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
        <EmptyDashboardState userName={userName} />
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
          <Circle
            cx={60}
            cy={-20}
            r={100}
            fill={colors.accent}
            opacity={0.04}
          />
          <Circle
            cx={300}
            cy={40}
            r={120}
            fill={colors.accent}
            opacity={0.03}
          />
        </Svg>
      </View>

      <Text style={styles.welcome}>Hola, {userName} 👋</Text>

      <FinancialHealthIndicator
        monthlyBudgetCLP={profile?.monthlyBudgetCLP}
        monthlyBudgetUSD={profile?.monthlyBudgetUSD}
        spentCLP={debtSummary?.nextMonthCLP}
        spentUSD={debtSummary?.nextMonthUSD}
        daysToClose={daysToClose}
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
        <>
          {/*
           * First-time user with card but no data yet:
           * Show a cohesive import prompt instead of scattered empty cards.
           * Once they import, the switches flip and normal dashboard renders.
           */}
          {isLoadingTransactions === false && transactions.length === 0 ? (
            <FirstImportPrompt
              onImport={handleImportTransactions}
              isImporting={isRefreshing}
              cardCount={creditCards.length}
            />
          ) : (
            <>
              {/* Normal dashboard — data exists */}
              <PressableScale
                style={[
                  styles.importButton,
                  isRefreshing && styles.buttonDisabled,
                ]}
                onPress={handleImportTransactions}
                disabled={isRefreshing}
                accessibilityRole="button"
                accessibilityLabel={
                  isRefreshing
                    ? "Sincronizando movimientos"
                    : "Sincronizar movimientos"
                }
              >
                {isRefreshing ? (
                  <ActivityIndicator size="small" color={colors.bg} />
                ) : (
                  <Ionicons name="sync-outline" size={16} color={colors.bg} />
                )}
                <Text style={styles.importButtonText}>
                  {isRefreshing
                    ? "Sincronizando..."
                    : "Sincronizar movimientos"}
                </Text>
              </PressableScale>

              {/*
               * Has transactions but no billing period yet:
               * show prompt to create one. Stats cards still render
               * below — they work even without explicit billing periods
               * (fall back to calendar-month grouping in the backend).
               */}
              {!debtSummary ||
              ((debtSummary.totalCLP ?? 0) === 0 &&
                (debtSummary.totalUSD ?? 0) === 0 &&
                !debtSummary.nextMonthCLP) ? (
                <View style={styles.billingPromptCard}>
                  <View style={styles.billingPromptIcon}>
                    <Ionicons
                      name="calendar-outline"
                      size={20}
                      color={colors.accent}
                    />
                  </View>
                  <View style={styles.billingPromptContent}>
                    <Text style={styles.billingPromptTitle}>
                      Crear período de facturación
                    </Text>
                    <Text style={styles.billingPromptBody}>
                      Para ver estadísticas, proyecciones y organizar tus gastos
                      por mes.
                    </Text>
                    <PressableScale
                      onPress={() => {
                        const selectedCard = creditCards.find(
                          (c) => c.id === selectedCardId,
                        );
                        if (selectedCard) {
                          const suggestion =
                            computeSuggestedPeriod(selectedCard);
                          if (suggestion) {
                            setOrphanSuggestion(suggestion);
                          }
                        }
                        setShowOrphanModal(true);
                      }}
                      style={styles.billingPromptBtn}
                      accessibilityLabel="Crear período de facturación"
                      accessibilityRole="button"
                    >
                      <Ionicons
                        name="add-circle-outline"
                        size={16}
                        color={colors.accent}
                      />
                      <Text style={styles.billingPromptBtnText}>
                        Crear período
                      </Text>
                    </PressableScale>
                  </View>
                </View>
              ) : null}

              {/* Stats cards — always shown when transactions exist */}
              <MonthSummaryCard
                creditCardId={selectedCardId}
                nextPeriodCLP={debtSummary?.nextMonthCLP}
                nextPeriodUSD={debtSummary?.nextMonthUSD}
              />
              {debtSummary &&
                ((debtSummary.totalCLP ?? 0) > 0 ||
                  (debtSummary.totalUSD ?? 0) > 0) && (
                  <DebtIndicatorCard
                    refreshKey={refreshKey}
                    summary={debtSummary}
                  />
                )}
              <MonthlyStats creditCardId={selectedCardId} />
            </>
          )}
        </>
      )}

      {uncategorizedCount > 0 && (
        <TouchableOpacity
          style={styles.categorizeBanner}
          onPress={() =>
            router.push({
              pathname: "/(tabs)/transacciones" as any,
              params: { filter: "uncategorized" },
            })
          }
          activeOpacity={0.85}
        >
          <View style={styles.categorizeAccent} />
          <View style={styles.categorizeIconWrap}>
            <Ionicons name="pricetag" size={17} color={colors.accent} />
          </View>
          <View style={styles.categorizeTextBlock}>
            <Text style={styles.categorizeCount}>{uncategorizedCount}</Text>
            <Text style={styles.categorizeLabel}>
              {uncategorizedCount === 1
                ? "transacción sin categorizar"
                : "Transacciones sin categorizar"}
            </Text>
            <Text style={styles.categorizeSubtitle}>
              Toca para asignar categorías
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={colors.accent} />
        </TouchableOpacity>
      )}

      <TouchableOpacity
        style={styles.sectionHeader}
        onPress={() => router.push("/(tabs)/transacciones" as any)}
      >
        <Text style={styles.sectionTitle}>Movimientos recientes</Text>
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
          <View style={styles.emptyTxIconWrap}>
            <Ionicons
              name="receipt-outline"
              size={28}
              color={colors.textMuted}
            />
          </View>
          <Text style={styles.emptyTxTitle}>Sin movimientos recientes</Text>
          <Text style={styles.emptyTxBody}>
            Usa "Sincronizar movimientos" para importar tus gastos bancarios.
          </Text>
          <TouchableOpacity
            style={styles.emptyTxCta}
            onPress={handleImportTransactions}
          >
            <Ionicons name="sync-outline" size={14} color={colors.accent} />
            <Text style={styles.emptyTxCtaText}>Sincronizar ahora</Text>
          </TouchableOpacity>
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
                            backgroundColor:
                              item.categoryColor || colors.surface,
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
                          color={colors.accent}
                        />
                        <Text style={styles.txUncategorizedText}>
                          Sin categoría
                        </Text>
                      </View>
                    )}
                  </View>
                </View>
                <View style={styles.transactionRight}>
                  <Text style={styles.amount}>
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
        isFirstTime
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  contentContainer: { padding: spacing.lg, paddingBottom: 40 },
  welcome: {
    fontSize: 22,
    fontWeight: "700",
    marginBottom: 4,
    color: colors.textPrimary,
  },
  sectionTitle: {
    ...typography.presets.cardTitle,
    color: colors.textPrimary,
    marginBottom: 0,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: spacing.md,
    marginBottom: spacing.sm2,
  },
  seeAllButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
    paddingVertical: spacing.xs,
    minHeight: 44,
  },
  seeAllText: {
    ...typography.presets.label,
    color: colors.accent,
  },
  transaction: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: spacing.sm2,
    paddingHorizontal: 4,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  transactionsContainer: {
    maxHeight: 240,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    paddingHorizontal: spacing.sm2,
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
  txCategoryName: {
    fontSize: 11,
    fontWeight: "600",
    color: colors.textPrimary,
  },
  txUncategorized: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "rgba(59,130,246,0.3)",
    backgroundColor: "rgba(59,130,246,0.06)",
  },
  txUncategorizedText: {
    fontSize: 11,
    fontWeight: "600",
    color: colors.accent,
  },
  amount: { color: colors.textPrimary, fontSize: 15, fontWeight: "600" },
  emptyTransactions: {
    alignItems: "center",
    paddingVertical: 28,
    paddingHorizontal: 24,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 8,
  },
  emptyTxIconWrap: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "rgba(255,255,255,0.04)",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 4,
  },
  emptyTxTitle: {
    color: colors.textSecondary,
    fontSize: 15,
    fontWeight: "600",
  },
  emptyTxBody: {
    color: colors.textMuted,
    fontSize: 12,
    textAlign: "center",
    lineHeight: 18,
    maxWidth: 260,
  },
  emptyTxCta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 8,
    paddingVertical: spacing.sm2,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.pill,
    borderWidth: 1,
    borderColor: "rgba(59,130,246,0.3)",
    backgroundColor: "rgba(59,130,246,0.08)",
  },
  emptyTxCtaText: {
    ...typography.presets.label,
    color: colors.accent,
  },
  buttonDisabled: { opacity: 0.6 },
  importButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    alignSelf: "stretch",
    backgroundColor: colors.accent,
    minHeight: 48,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.md,
    marginTop: spacing.md,
    gap: 6,
  },
  importButtonText: {
    ...typography.presets.label,
    color: colors.bg,
    fontWeight: "700",
  },
  categorizeBanner: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(59,130,246,0.08)",
    borderWidth: 1,
    borderColor: "rgba(59,130,246,0.25)",
    borderRadius: 14,
    marginTop: spacing.md,
    padding: 16,
    gap: 14,
    overflow: "hidden",
  },
  categorizeAccent: {
    position: "absolute",
    left: 0,
    top: 0,
    bottom: 0,
    width: 3,
    backgroundColor: colors.accent,
  },
  categorizeIconWrap: {
    width: 42,
    height: 42,
    borderRadius: borderRadius.card,
    backgroundColor: "rgba(59,130,246,0.14)",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  categorizeTextBlock: {
    flex: 1,
    gap: 3,
  },
  categorizeCount: {
    fontSize: 26,
    fontWeight: "800",
    color: colors.accent,
    lineHeight: 30,
    letterSpacing: -0.5,
  },
  categorizeLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.textPrimary,
  },
  categorizeSubtitle: {
    fontSize: 12,
    color: colors.textMuted,
    fontWeight: "500",
  },
  topGradient: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 160,
    pointerEvents: "none",
  },
  billingPromptCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 14,
    marginTop: 16,
    padding: spacing.md,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(59,130,246,0.2)",
    backgroundColor: "rgba(59,130,246,0.05)",
  },
  billingPromptIcon: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.card,
    backgroundColor: "rgba(59,130,246,0.12)",
    justifyContent: "center",
    alignItems: "center",
    marginTop: 2,
  },
  billingPromptContent: {
    flex: 1,
    gap: 8,
  },
  billingPromptTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: colors.textPrimary,
  },
  billingPromptBody: {
    fontSize: 12,
    color: colors.textMuted,
    lineHeight: 18,
  },
  billingPromptBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: spacing.sm2,
    paddingHorizontal: 16,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.accent,
    backgroundColor: "rgba(59,130,246,0.1)",
    alignSelf: "flex-start",
    marginTop: 2,
  },
  billingPromptBtnText: {
    ...typography.presets.label,
    color: colors.accent,
  },
});
