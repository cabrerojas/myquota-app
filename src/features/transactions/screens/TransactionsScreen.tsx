import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import { useLocalSearchParams, useNavigation, useRouter } from "expo-router";
import CategorySuggestModal from "@/features/categories/components/CategorySuggestModal";
import { useCreditCards } from "@/features/creditCards/services/creditCardsApi";
import {
  useInfiniteTransactions,
  useUpdateTransactionMutation,
} from "@/features/transactions/services/transactionsApi";
import { exportTransactionsToCSV } from "@/features/transactions/services/exportTransactions";
import type { Transaction } from "@/shared/types/transaction";
import { useUncategorized } from "@/shared/contexts/UncategorizedContext";
import { glassSurface } from "@/shared/theme/effects";
import {
  borderRadius,
  colors,
  fontSizes,
  spacing,
} from "@/shared/theme/tokens";
import { typography } from "@/shared/theme/typography";
import { formatDate, getDayKey, getMonthIndex } from "@/shared/utils/format";
import TransactionsSkeleton from "@/features/transactions/components/TransactionsSkeleton";
import ErrorState from "@/shared/components/ErrorState";

type CurrencyFilter = "all" | "CLP" | "USD";

const MONTH_FILTERS = [
  "Todos",
  "Enero",
  "Febrero",
  "Marzo",
  "Abril",
  "Mayo",
  "Junio",
  "Julio",
  "Agosto",
  "Septiembre",
  "Octubre",
  "Noviembre",
  "Diciembre",
];

const MAX_ITEMS_IN_MEMORY = 200;
const TOUCH_TARGET_SIZE = spacing.xxl + spacing.xs;
const PILL_ITEM_GAP = spacing.xs + 1;
const PILL_ITEM_VERTICAL_PADDING = spacing.sm - 1;
const CATEGORY_PILL_VERTICAL_PADDING = spacing.xxs + 1;
const CATEGORY_LABEL_MAX_WIDTH = 90;
const FILTER_BADGE_SIZE = 18;

/** Derive YYYY-MM-DD strings from month (1–12) and year filters for backend queries. */
function dateRangeFromFilters(
  monthFilter: number,
  yearFilter: number | null,
): { startDate?: string; endDate?: string } {
  if (monthFilter <= 0 && yearFilter === null) return {};
  const y = yearFilter ?? new Date().getFullYear();
  if (monthFilter > 0) {
    const m = monthFilter.toString().padStart(2, "0");
    const lastDay = new Date(y, monthFilter, 0).getDate();
    return {
      startDate: `${y}-${m}-01`,
      endDate: `${y}-${m}-${lastDay}`,
    };
  }
  return {
    startDate: `${y}-01-01`,
    endDate: `${y}-12-31`,
  };
}

interface GroupedTransactions {
  day: string;
  transactions: Transaction[];
  totalCLP: number;
  totalUSD: number;
}

export default function TransactionsScreen() {
  const params = useLocalSearchParams<{
    filter?: string;
    creditCardId?: string;
    categoryId?: string;
    categoryName?: string;
  }>();
  const { decrementCount } = useUncategorized();
  const [selectedCardId, setSelectedCardId] = useState<string | null>(
    params.creditCardId ?? null,
  );
  const [searchQuery, setSearchQuery] = useState("");
  const [currencyFilter, setCurrencyFilter] = useState<CurrencyFilter>("all");
  const [monthFilter, setMonthFilter] = useState(0);
  const [yearFilter, setYearFilter] = useState<number | null>(null);
  const [minAmount, setMinAmount] = useState("");
  const [maxAmount, setMaxAmount] = useState("");
  const [onlyUncategorized, setOnlyUncategorized] = useState(
    params.filter === "uncategorized",
  );
  const [showFilters, setShowFilters] = useState(
    params.filter === "uncategorized",
  );
  const [categoryFilter, setCategoryFilter] = useState<{
    id: string;
    name: string;
  } | null>(
    params.categoryId && params.categoryName
      ? { id: params.categoryId, name: params.categoryName }
      : null,
  );

  // Derive date range from month/year filters → pushed to backend SQL
  const { startDate, endDate } = dateRangeFromFilters(monthFilter, yearFilter);
  const {
    data: creditCards = [],
    isLoading: loadingCards,
    error: cardsError,
    refetch: refetchCards,
  } = useCreditCards();

  // React Query infinite pagination (auto-cached, auto-refetched on filter change)
  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isFetching,
    isError: transactionsError,
    error: transactionQueryError,
    refetch,
  } = useInfiniteTransactions(
    selectedCardId,
    startDate,
    endDate,
    categoryFilter?.id,
  );

  // Flat list from all pages, deduplicated by id, capped at MAX_ITEMS_IN_MEMORY
  const transactions = useMemo(() => {
    const seen = new Set<string>();
    const all: Transaction[] = [];
    for (const page of data?.pages ?? []) {
      for (const item of page.items) {
        if (!seen.has(item.id)) {
          seen.add(item.id);
          all.push(item);
        }
      }
    }
    return all.slice(0, MAX_ITEMS_IN_MEMORY);
  }, [data]);

  const filterParamRef = useRef(params.filter);
  filterParamRef.current = params.filter;

  const categoryParamRef = useRef({
    categoryId: params.categoryId,
    categoryName: params.categoryName,
  });
  categoryParamRef.current = {
    categoryId: params.categoryId,
    categoryName: params.categoryName,
  };

  useFocusEffect(
    useCallback(() => {
      if (filterParamRef.current === "uncategorized") {
        setOnlyUncategorized(true);
        setShowFilters(true);
      }
      const { categoryId, categoryName } = categoryParamRef.current;
      if (categoryId && categoryName) {
        setCategoryFilter({ id: categoryId, name: categoryName });
      }
    }, []),
  );

  const router = useRouter();
  const navigation = useNavigation();
  const updateTransactionMutation = useUpdateTransactionMutation();
  const [categoryModalVisible, setCategoryModalVisible] = useState(false);
  const [categoryModalMerchant, setCategoryModalMerchant] = useState<
    string | null
  >(null);
  const [categoryModalTransactionId, setCategoryModalTransactionId] = useState<
    string | null
  >(null);
  const [categoryModalCreditCardId, setCategoryModalCreditCardId] = useState<
    string | null
  >(null);

  const availableYears = useMemo(() => {
    const years = new Set<number>();
    transactions.forEach((t) => {
      const y = new Date(t.transactionDate).getFullYear();
      years.add(y);
    });
    return Array.from(years).sort((a, b) => b - a);
  }, [transactions]);

  useEffect(() => {
    if (creditCards.length === 0) {
      setSelectedCardId(null);
      return;
    }

    setSelectedCardId((currentSelectedCardId) => {
      if (
        currentSelectedCardId &&
        creditCards.some((card) => card.id === currentSelectedCardId)
      ) {
        return currentSelectedCardId;
      }

      return creditCards[0].id;
    });
  }, [creditCards]);

  const onRefresh = useCallback(() => {
    refetch();
  }, [refetch]);

  const loadMore = useCallback(() => {
    if (hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  // Filter + search
  const filteredTransactions = useMemo(() => {
    return transactions.filter((t) => {
      // Uncategorized filter
      if (onlyUncategorized && t.categoryId) {
        return false;
      }
      // Search
      if (
        searchQuery &&
        !t.merchant.toLowerCase().includes(searchQuery.toLowerCase())
      ) {
        return false;
      }
      // Currency
      if (currencyFilter !== "all" && t.currency !== currencyFilter) {
        return false;
      }
      // Month
      if (monthFilter > 0 && getMonthIndex(t.transactionDate) !== monthFilter) {
        return false;
      }
      // Year
      if (
        yearFilter !== null &&
        new Date(t.transactionDate).getFullYear() !== yearFilter
      ) {
        return false;
      }
      // Monto mínimo
      if (minAmount && t.amount < Number(minAmount)) {
        return false;
      }
      // Monto máximo
      if (maxAmount && t.amount > Number(maxAmount)) {
        return false;
      }
      return true;
    });
  }, [
    transactions,
    searchQuery,
    currencyFilter,
    monthFilter,
    yearFilter,
    minAmount,
    maxAmount,
    onlyUncategorized,
  ]);

  // Group by day
  const groupedTransactions = useMemo((): GroupedTransactions[] => {
    const groups: Record<string, GroupedTransactions> = {};
    filteredTransactions.forEach((t) => {
      const day = getDayKey(t.transactionDate);
      if (!groups[day]) {
        groups[day] = { day, transactions: [], totalCLP: 0, totalUSD: 0 };
      }
      groups[day].transactions.push(t);
      if (t.currency === "USD") {
        groups[day].totalUSD += t.amount;
      } else {
        groups[day].totalCLP += t.amount;
      }
    });
    return Object.values(groups);
  }, [filteredTransactions]);

  // Totals
  const totals = useMemo(() => {
    let clp = 0;
    let usd = 0;
    filteredTransactions.forEach((t) => {
      if (t.currency === "USD") usd += t.amount;
      else clp += t.amount;
    });
    return { clp, usd, count: filteredTransactions.length };
  }, [filteredTransactions]);

  const activeFiltersCount =
    (currencyFilter !== "all" ? 1 : 0) +
    (monthFilter > 0 ? 1 : 0) +
    (yearFilter !== null ? 1 : 0) +
    (minAmount ? 1 : 0) +
    (maxAmount ? 1 : 0) +
    (searchQuery ? 1 : 0) +
    (onlyUncategorized ? 1 : 0) +
    (categoryFilter ? 1 : 0);

  const getRefundListBadge = (transaction: Transaction) => {
    if (transaction.source === "refund") {
      return { label: "Refund", tone: "success" as const };
    }
    if (transaction.refundStatus === "full") {
      return { label: "Refund total", tone: "success" as const };
    }
    if (transaction.refundStatus === "partial") {
      return { label: "Refund parcial", tone: "warning" as const };
    }
    if (transaction.canRefund) {
      return { label: "Admite refund", tone: "secondary" as const };
    }
    return null;
  };

  // Wire headerRight filter button
  useEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <Pressable
          onPress={() => setShowFilters(!showFilters)}
          hitSlop={8}
          style={styles.headerIconButton}
          accessibilityRole="button"
          accessibilityLabel="Mostrar filtros"
        >
          <Ionicons
            name="options-outline"
            size={20}
            color={
              activeFiltersCount > 0 ? colors.textPrimary : colors.textSecondary
            }
          />
          {activeFiltersCount > 0 && (
            <View style={styles.filterBadge}>
              <Text style={styles.filterBadgeText}>{activeFiltersCount}</Text>
            </View>
          )}
        </Pressable>
      ),
    });
  }, [navigation, activeFiltersCount, showFilters]);

  if (loadingCards) {
    return (
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.centered}
        contentInsetAdjustmentBehavior="automatic"
      >
        <TransactionsSkeleton />
      </ScrollView>
    );
  }

  if (cardsError) {
    return (
      <ErrorState
        message={
          cardsError instanceof Error
            ? cardsError.message
            : "No se pudo cargar las tarjetas. Verifica tu conexión."
        }
        onRetry={() => {
          refetchCards();
        }}
      />
    );
  }

  if (transactionsError) {
    return (
      <ErrorState
        message={
          transactionQueryError instanceof Error
            ? transactionQueryError.message
            : "No se pudo cargar las transacciones. Verifica tu conexión."
        }
        onRetry={() => {
          refetch();
        }}
      />
    );
  }

  return (
    <View style={styles.container}>
      {isFetching && !data ? (
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.centered}
          contentInsetAdjustmentBehavior="automatic"
        >
          <ActivityIndicator size="large" color={colors.accent} />
        </ScrollView>
      ) : groupedTransactions.length === 0 ? (
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.centered}
          contentInsetAdjustmentBehavior="automatic"
        >
          <Ionicons
            name="receipt-outline"
            size={48}
            color={colors.textSubtle}
          />
          <Text style={styles.emptyText}>
            {searchQuery || activeFiltersCount > 0
              ? "Sin resultados para estos filtros"
              : "No hay transacciones"}
          </Text>
        </ScrollView>
      ) : (
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          contentInsetAdjustmentBehavior="automatic"
          refreshControl={
            <RefreshControl refreshing={isFetching} onRefresh={onRefresh} />
          }
        >
          {/* Quick-access pill bar */}
          <View style={styles.pillBar}>
            <View style={[styles.pillItem, styles.pillActive]}>
              <Ionicons
                name="receipt-outline"
                size={15}
                color={colors.accent}
              />
              <Text style={[styles.pillText, styles.pillTextActive]}>
                Transacciones
              </Text>
            </View>
            <Pressable
              style={styles.pillItem}
              onPress={() => router.push("/(tabs)/transacciones/manualDebts")}
              accessibilityLabel="Ver compras en cuotas"
              accessibilityRole="button"
            >
              <Ionicons
                name="cart-outline"
                size={15}
                color={colors.textSecondary}
              />
              <Text style={styles.pillText}>Compras en Cuotas</Text>
            </Pressable>
          </View>

          {/* Search bar — iOS-style */}
          <View style={styles.searchBar}>
            <Ionicons name="search" size={18} color={colors.textSecondary} />
            <TextInput
              style={styles.searchInput}
              placeholder="Buscar transacciones"
              placeholderTextColor={colors.textMuted}
              value={searchQuery}
              onChangeText={setSearchQuery}
              autoCorrect={false}
            />
            {searchQuery.length > 0 && (
              <Pressable onPress={() => setSearchQuery("")} hitSlop={8}>
                <Ionicons
                  name="close-circle"
                  size={18}
                  color={colors.textMuted}
                />
              </Pressable>
            )}
          </View>

          {/* Card selector */}
          <View style={styles.cardSelectorContainer}>
            <Text style={styles.filterLabel}>Tarjeta</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {creditCards.map((card) => (
                <Pressable
                  key={card.id}
                  style={[
                    styles.cardChip,
                    selectedCardId === card.id && styles.cardChipActive,
                  ]}
                  onPress={() => setSelectedCardId(card.id)}
                  accessibilityRole="button"
                  accessibilityLabel={`Seleccionar tarjeta ${card.cardType} terminada en ${card.cardLastDigits}`}
                >
                  <Ionicons
                    name="card-outline"
                    size={16}
                    color={
                      selectedCardId === card.id
                        ? colors.textPrimary
                        : colors.textMuted
                    }
                  />
                  <Text
                    style={[
                      styles.cardChipText,
                      selectedCardId === card.id && styles.cardChipTextActive,
                    ]}
                  >
                    {card.cardType} •{card.cardLastDigits}
                  </Text>
                </Pressable>
              ))}
            </ScrollView>
          </View>

          {/* Filters panel */}
          {showFilters && (
            <View style={styles.filtersPanel}>
              {/* Uncategorized filter */}
              <Pressable
                style={[
                  styles.filterChip,
                  onlyUncategorized && styles.filterChipActive,
                  styles.inlineFilterChip,
                ]}
                onPress={() => setOnlyUncategorized(!onlyUncategorized)}
                accessibilityRole="button"
              >
                <Ionicons
                  name={
                    onlyUncategorized
                      ? "checkmark-circle"
                      : "help-circle-outline"
                  }
                  size={16}
                  color={onlyUncategorized ? colors.textPrimary : colors.accent}
                />
                <Text
                  style={[
                    styles.filterChipText,
                    onlyUncategorized && styles.filterChipTextActive,
                  ]}
                >
                  Solo sin categoría
                </Text>
              </Pressable>

              {/* Category drill-down filter */}
              {categoryFilter && (
                <Pressable
                  style={[
                    styles.filterChip,
                    styles.filterChipActive,
                    styles.inlineFilterChip,
                  ]}
                  onPress={() => setCategoryFilter(null)}
                  accessibilityLabel={`Quitar filtro de categoría ${categoryFilter.name}`}
                  accessibilityRole="button"
                >
                  <Ionicons
                    name="close-circle"
                    size={16}
                    color={colors.textPrimary}
                  />
                  <Text style={styles.filterChipTextActive}>
                    {categoryFilter.name}
                  </Text>
                </Pressable>
              )}

              {/* Currency filter */}
              <Text style={styles.filterLabel}>Moneda</Text>
              <View style={styles.filterRow}>
                {(["all", "CLP", "USD"] as CurrencyFilter[]).map((c) => (
                  <Pressable
                    key={c}
                    style={[
                      styles.filterChip,
                      currencyFilter === c && styles.filterChipActive,
                    ]}
                    onPress={() => setCurrencyFilter(c)}
                    accessibilityRole="button"
                  >
                    <Text
                      style={[
                        styles.filterChipText,
                        currencyFilter === c && styles.filterChipTextActive,
                      ]}
                    >
                      {c === "all" ? "Todas" : c === "USD" ? "USD" : "CLP"}
                    </Text>
                  </Pressable>
                ))}
              </View>

              {/* Year filter */}
              <Text style={styles.filterLabel}>Año</Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={styles.monthFilterScroll}
              >
                <Pressable
                  style={[
                    styles.filterChip,
                    yearFilter === null && styles.filterChipActive,
                  ]}
                  onPress={() => setYearFilter(null)}
                  accessibilityRole="button"
                >
                  <Text
                    style={[
                      styles.filterChipText,
                      yearFilter === null && styles.filterChipTextActive,
                    ]}
                  >
                    Todos
                  </Text>
                </Pressable>
                {availableYears.map((y) => (
                  <Pressable
                    key={y}
                    style={[
                      styles.filterChip,
                      yearFilter === y && styles.filterChipActive,
                    ]}
                    onPress={() => setYearFilter(y)}
                    accessibilityRole="button"
                  >
                    <Text
                      style={[
                        styles.filterChipText,
                        yearFilter === y && styles.filterChipTextActive,
                      ]}
                    >
                      {y}
                    </Text>
                  </Pressable>
                ))}
              </ScrollView>

              {/* Month filter */}
              <Text style={styles.filterLabel}>Mes</Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={styles.monthFilterScroll}
              >
                {MONTH_FILTERS.map((m, idx) => (
                  <Pressable
                    key={m}
                    style={[
                      styles.filterChip,
                      monthFilter === idx && styles.filterChipActive,
                    ]}
                    onPress={() => setMonthFilter(idx)}
                    accessibilityRole="button"
                  >
                    <Text
                      style={[
                        styles.filterChipText,
                        monthFilter === idx && styles.filterChipTextActive,
                      ]}
                    >
                      {m.substring(0, 3)}
                    </Text>
                  </Pressable>
                ))}
              </ScrollView>

              {/* Monto mínimo/máximo */}
              <Text style={styles.filterLabel}>Monto</Text>
              <View style={styles.filterRow}>
                <TextInput
                  style={styles.amountInput}
                  placeholder="Mínimo"
                  keyboardType="numeric"
                  value={minAmount}
                  onChangeText={setMinAmount}
                  placeholderTextColor={colors.textMuted}
                />
                <Text style={styles.amountRangeSeparator}>—</Text>
                <TextInput
                  style={styles.amountInput}
                  placeholder="Máximo"
                  keyboardType="numeric"
                  value={maxAmount}
                  onChangeText={setMaxAmount}
                  placeholderTextColor={colors.textMuted}
                />
              </View>

              {activeFiltersCount > 0 && (
                <Pressable
                  style={styles.clearFilters}
                  onPress={() => {
                    setCurrencyFilter("all");
                    setMonthFilter(0);
                    setYearFilter(null);
                    setMinAmount("");
                    setMaxAmount("");
                    setSearchQuery("");
                    setOnlyUncategorized(false);
                    setCategoryFilter(null);
                    if (creditCards.length > 0) {
                      setSelectedCardId(creditCards[0].id);
                    }
                  }}
                  accessibilityRole="button"
                >
                  <Text style={styles.clearFiltersText}>Limpiar filtros</Text>
                </Pressable>
              )}
            </View>
          )}

          {/* Summary bar */}
          <View style={styles.summaryBar}>
            <Text style={styles.summaryCount}>
              {totals.count}{" "}
              {totals.count === 1 ? "transacción" : "transacciones"}
            </Text>
            <View style={styles.summaryTotals}>
              {totals.clp > 0 && (
                <Text style={styles.summaryAmount}>
                  ${totals.clp.toLocaleString("es-CL")}
                </Text>
              )}
              {totals.usd > 0 && (
                <Text style={styles.summaryAmountUSD}>
                  US$
                  {totals.usd.toLocaleString("es-CL", {
                    minimumFractionDigits: 2,
                  })}
                </Text>
              )}
            </View>
            <Pressable
              style={styles.exportButton}
              onPress={async () => {
                setTimeout(async () => {
                  try {
                    await exportTransactionsToCSV(
                      filteredTransactions.map((t) => ({
                        ...t,
                        cardType: creditCards.find(
                          (c) => c.id === selectedCardId,
                        )?.cardType,
                        cardLastDigits: creditCards.find(
                          (c) => c.id === selectedCardId,
                        )?.cardLastDigits,
                      })),
                    );
                  } catch {
                    alert("Error al exportar transacciones");
                  }
                }, 300);
              }}
              accessibilityRole="button"
              accessibilityLabel="Exportar transacciones filtradas"
            >
              <Ionicons
                name="download-outline"
                size={20}
                color={colors.accent}
              />
              <Text style={styles.exportButtonText}>Exportar</Text>
            </Pressable>
          </View>
          <Text style={styles.exportInfo}>
            Solo se exportarán las transacciones filtradas actualmente.
          </Text>

          {/* Transaction list */}
          {groupedTransactions.map((group) => (
            <View key={group.day} style={styles.dayGroup}>
              <View style={styles.dayHeader}>
                <Text style={styles.dayTitle}>
                  {group.day}
                  {(() => {
                    if (group.transactions.length > 0) {
                      const date = new Date(
                        group.transactions[0].transactionDate,
                      );
                      const year = date.getFullYear();
                      if (!group.day.includes(year.toString())) {
                        return ` ${year}`;
                      }
                    }
                    return "";
                  })()}
                </Text>
                <View style={styles.dayTotals}>
                  {group.totalCLP > 0 && (
                    <Text style={styles.dayTotal}>
                      ${group.totalCLP.toLocaleString("es-CL")}
                    </Text>
                  )}
                  {group.totalUSD > 0 && (
                    <Text style={styles.dayTotalUSD}>
                      US$
                      {group.totalUSD.toLocaleString("es-CL", {
                        minimumFractionDigits: 2,
                      })}
                    </Text>
                  )}
                </View>
              </View>
              {group.transactions.map((t) => {
                const refundBadge = getRefundListBadge(t);

                return (
                  <View key={t.id} style={styles.transaction}>
                    <Pressable
                      style={styles.transactionMainAction}
                      onPress={() => {
                        if (!selectedCardId) {
                          return;
                        }

                        router.push({
                          pathname: "/(screens)/transactionDetail",
                          params: {
                            creditCardId: selectedCardId,
                            transactionId: t.id,
                          },
                        });
                      }}
                      accessibilityRole="button"
                      accessibilityLabel={`Ver detalle de ${t.merchant}`}
                    >
                      <View style={styles.transactionLeft}>
                        <Text style={styles.merchant} numberOfLines={1}>
                          {t.merchant}
                        </Text>
                        <View style={styles.transactionMetaRow}>
                          <Text style={styles.transactionMeta}>
                            {formatDate(t.transactionDate)}
                          </Text>
                          {refundBadge && (
                            <View
                              style={[
                                styles.transactionBadge,
                                refundBadge.tone === "secondary" &&
                                  styles.transactionBadgeSecondary,
                                refundBadge.tone === "warning" &&
                                  styles.transactionBadgeWarning,
                                refundBadge.tone === "success" &&
                                  styles.transactionBadgeSuccess,
                              ]}
                            >
                              <Text
                                style={[
                                  styles.transactionBadgeText,
                                  refundBadge.tone === "secondary" &&
                                    styles.transactionBadgeTextPrimary,
                                  refundBadge.tone === "warning" &&
                                    styles.transactionBadgeTextWarning,
                                  refundBadge.tone === "success" &&
                                    styles.transactionBadgeTextSuccess,
                                ]}
                              >
                                {refundBadge.label}
                              </Text>
                            </View>
                          )}
                        </View>
                      </View>
                      <View style={styles.transactionAmountWrap}>
                        <Text
                          style={[
                            styles.amount,
                            t.source === "refund" && styles.amountRefund,
                          ]}
                        >
                          {t.currency === "USD"
                            ? `US$${t.amount.toFixed(2)}`
                            : `$${t.amount.toLocaleString("es-CL")}`}
                        </Text>
                      </View>
                    </Pressable>
                    <Pressable
                      style={styles.categoryBtn}
                      onPress={() => {
                        setCategoryModalMerchant(t.merchant);
                        setCategoryModalTransactionId(t.id);
                        setCategoryModalCreditCardId(selectedCardId);
                        setCategoryModalVisible(true);
                      }}
                      accessibilityRole="button"
                      accessibilityLabel={
                        t.categoryId
                          ? `Cambiar categoría de ${t.merchant}`
                          : `Categorizar ${t.merchant}`
                      }
                    >
                      {t.categoryId ? (
                        <View
                          style={[
                            styles.categoryPill,
                            {
                              backgroundColor:
                                t.categoryColor || colors.surface,
                            },
                          ]}
                        >
                          <Text style={styles.categoryEmoji}>
                            {t.categoryIcon || "🏷️"}
                          </Text>
                          <Text style={styles.categoryName} numberOfLines={1}>
                            {t.categoryName}
                          </Text>
                        </View>
                      ) : (
                        <View style={styles.uncategorizedPill}>
                          <Ionicons
                            name="pricetag-outline"
                            size={13}
                            color={colors.accent}
                          />
                          <Text style={styles.uncategorizedText}>
                            Categorizar
                          </Text>
                        </View>
                      )}
                    </Pressable>
                  </View>
                );
              })}
            </View>
          ))}

          {/* Load More Button */}
          {hasNextPage && (
            <Pressable
              style={styles.loadMoreButton}
              onPress={loadMore}
              disabled={isFetchingNextPage}
              accessibilityRole="button"
            >
              {isFetchingNextPage ? (
                <ActivityIndicator size="small" color={colors.accent} />
              ) : (
                <View style={styles.loadMoreContent}>
                  <Ionicons
                    name="download-outline"
                    size={18}
                    color={colors.accent}
                  />
                  <Text style={styles.loadMoreText}>
                    Cargar más transacciones
                  </Text>
                </View>
              )}
            </Pressable>
          )}
        </ScrollView>
      )}
      <CategorySuggestModal
        visible={categoryModalVisible}
        merchant={categoryModalMerchant || ""}
        onClose={() => setCategoryModalVisible(false)}
        onCategorySelected={(category) => {
          const creditCardId = categoryModalCreditCardId;
          const transactionId = categoryModalTransactionId;
          if (!creditCardId || !transactionId) {
            setCategoryModalVisible(false);
            return;
          }
          (async () => {
            try {
              // Check if transaction was uncategorized before update
              const wasMissingCategory = transactions.find(
                (t) => t.id === transactionId && !t.categoryId,
              );

              await updateTransactionMutation.mutateAsync({
                creditCardId,
                transactionId,
                data: {
                  categoryId: category.id,
                },
              });

              if (wasMissingCategory) {
                decrementCount();
              }
            } catch (e) {
              Alert.alert(
                "Error",
                e instanceof Error
                  ? e.message
                  : "No se pudo actualizar la categoría",
              );
            } finally {
              setCategoryModalVisible(false);
            }
          })();
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  centered: {
    flexGrow: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: spacing.md2,
  },
  headerIconButton: {
    width: TOUCH_TARGET_SIZE,
    height: TOUCH_TARGET_SIZE,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyText: {
    fontSize: 15,
    color: colors.textMuted,
    marginTop: spacing.sm2,
    textAlign: "center",
  },
  // Card selector
  cardSelectorContainer: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm2,
    paddingBottom: spacing.sm,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  // Pill navigation bar
  pillBar: {
    flexDirection: "row",
    paddingHorizontal: spacing.sm2,
    paddingVertical: spacing.md,
    gap: spacing.sm,
  },
  pillItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: PILL_ITEM_GAP,
    paddingVertical: PILL_ITEM_VERTICAL_PADDING,
    paddingHorizontal: spacing.md - 2,
    borderRadius: borderRadius.pill,
    backgroundColor: colors.borderLight,
    borderWidth: 1,
    borderColor: colors.border,
  },
  pillActive: {
    backgroundColor: colors.glass.background,
    borderColor: colors.secondary,
  },
  pillText: {
    fontSize: fontSizes.sm - 1,
    fontWeight: "600",
    color: colors.textSecondary,
  },
  pillTextActive: {
    color: colors.accent,
  },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: spacing.sm2,
    marginBottom: spacing.sm,
    paddingHorizontal: spacing.sm2,
    minHeight: spacing.xxl,
    backgroundColor: colors.border,
    borderRadius: borderRadius.md,
    gap: spacing.sm,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: colors.textPrimary,
    paddingVertical: 0,
  },
  cardChip: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    minHeight: TOUCH_TARGET_SIZE,
    borderRadius: borderRadius.pill,
    backgroundColor: colors.border,
    marginRight: spacing.sm,
    gap: spacing.sm,
  },
  cardChipActive: {
    backgroundColor: colors.secondary,
  },
  // Category pill
  categoryPill: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing.sm,
    paddingVertical: CATEGORY_PILL_VERTICAL_PADDING,
    borderRadius: borderRadius.card,
    gap: spacing.xs,
  },
  categoryEmoji: { fontSize: fontSizes.sm - 1 },
  categoryName: {
    fontSize: fontSizes.xs,
    fontWeight: "600",
    color: colors.textPrimary,
    maxWidth: CATEGORY_LABEL_MAX_WIDTH,
  },
  cardChipText: {
    ...typography.presets.label,
    color: colors.textSecondary,
  },
  cardChipTextActive: {
    color: colors.textPrimary,
  },
  filterBadge: {
    position: "absolute",
    top: -spacing.xs,
    right: -spacing.xs,
    backgroundColor: colors.accent,
    width: FILTER_BADGE_SIZE,
    height: FILTER_BADGE_SIZE,
    borderRadius: borderRadius.full,
    justifyContent: "center",
    alignItems: "center",
  },
  filterBadgeText: {
    fontSize: fontSizes.xs - 1,
    fontWeight: "700",
    color: colors.textPrimary,
  },
  // Filters panel
  filtersPanel: {
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.sm2,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  filterLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: colors.textMuted,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginTop: spacing.sm2,
    marginBottom: spacing.sm,
  },
  filterRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
  monthFilterScroll: {
    marginBottom: spacing.xs,
  },
  filterChip: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: spacing.sm2,
    paddingVertical: spacing.sm,
    minHeight: 44,
    borderRadius: borderRadius.pill,
    backgroundColor: colors.border,
    gap: spacing.xs,
  },
  filterChipActive: {
    backgroundColor: colors.secondary,
  },
  inlineFilterChip: {
    alignSelf: "flex-start",
    marginBottom: spacing.sm2,
  },
  filterChipText: {
    ...typography.presets.tab,
    color: colors.textSecondary,
  },
  filterChipTextActive: {
    color: colors.textPrimary,
  },
  clearFilters: {
    marginTop: spacing.sm,
    alignSelf: "flex-start",
  },
  clearFiltersText: {
    ...typography.presets.label,
    color: colors.accent,
  },
  amountRangeSeparator: {
    marginHorizontal: spacing.sm,
    color: colors.textSecondary,
  },
  // Summary bar
  summaryBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    ...glassSurface(false),
  },
  summaryCount: {
    ...typography.presets.tab,
    color: colors.textMuted,
  },
  summaryTotals: {
    flexDirection: "row",
    gap: spacing.sm2,
  },
  summaryAmount: {
    ...typography.presets.cardTitle,
    color: colors.textPrimary,
  },
  summaryAmountUSD: {
    ...typography.presets.cardTitle,
    color: colors.accent,
  },
  exportButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.glass.background,
    borderRadius: borderRadius.input,
    paddingHorizontal: spacing.sm2,
    paddingVertical: spacing.sm - 2,
    marginLeft: spacing.md - 6,
    minHeight: 44,
  },
  exportButtonText: {
    ...typography.presets.cardTitle,
    color: colors.accent,
    marginLeft: 6,
  },
  exportInfo: {
    fontSize: 11,
    color: colors.textMuted,
    textAlign: "center",
    marginBottom: spacing.xxs,
    marginTop: -spacing.sm,
  },
  // Day groups
  dayGroup: {
    marginHorizontal: spacing.md,
    marginBottom: spacing.sm2,
    ...glassSurface(),
  },
  dayHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: spacing.md - 2,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
    backgroundColor: colors.borderLight,
    borderTopLeftRadius: borderRadius.glass,
    borderTopRightRadius: borderRadius.glass,
  },
  dayTitle: {
    ...typography.presets.label,
    color: colors.textSecondary,
    textTransform: "capitalize",
  },
  dayTotals: {
    flexDirection: "row",
    gap: borderRadius.md,
  },
  dayTotal: {
    fontSize: 13,
    fontWeight: "700",
    color: colors.textPrimary,
  },
  dayTotalUSD: {
    fontSize: 13,
    fontWeight: "700",
    color: colors.accent,
  },
  transaction: {
    gap: spacing.xs,
    paddingHorizontal: spacing.md - 2,
    paddingVertical: spacing.sm2,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  transactionMainAction: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  transactionLeft: {
    flex: 1,
    marginRight: spacing.sm2,
  },
  transactionAmountWrap: { alignItems: "flex-end", maxWidth: "46%" },
  merchant: {
    fontSize: 14,
    fontWeight: "500",
    color: colors.textPrimary,
  },
  transactionMetaRow: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: spacing.sm - 2,
    marginTop: spacing.xxs,
  },
  transactionMeta: {
    fontSize: 12,
    color: colors.textMuted,
  },
  transactionBadge: {
    minHeight: 22,
    justifyContent: "center",
    paddingHorizontal: spacing.sm,
    borderRadius: borderRadius.pill,
  },
  transactionBadgeSecondary: { backgroundColor: colors.secondary },
  transactionBadgeWarning: { backgroundColor: colors.warningBg },
  transactionBadgeSuccess: { backgroundColor: colors.successBg },
  transactionBadgeText: { fontSize: 10, fontWeight: "700" },
  transactionBadgeTextPrimary: { color: colors.textPrimary },
  transactionBadgeTextWarning: { color: colors.warning },
  transactionBadgeTextSuccess: { color: colors.success },
  amount: {
    fontSize: 15,
    fontWeight: "700",
    color: colors.textPrimary,
  },
  amountRefund: { color: colors.success },
  categoryBtn: {
    marginTop: spacing.xs,
    alignSelf: "flex-end",
  },
  uncategorizedPill: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xxs + 1,
    borderRadius: borderRadius.glass,
    borderWidth: 1,
    borderColor: colors.accent,
    borderStyle: "dashed",
    backgroundColor: colors.glass.background,
    gap: spacing.xs,
  },
  uncategorizedText: {
    fontSize: 11,
    fontWeight: "600",
    color: colors.accent,
  },
  amountInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.input,
    padding: spacing.sm,
    fontSize: 15,
    backgroundColor: colors.surface,
    color: colors.textPrimary,
    minWidth: 80,
    textAlign: "right",
  },
  loadMoreButton: {
    marginHorizontal: spacing.md - 2,
    marginVertical: 16,
    paddingVertical: spacing.sm2,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.input,
    alignItems: "center",
  },
  loadMoreContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  loadMoreText: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.accent,
  },
});
