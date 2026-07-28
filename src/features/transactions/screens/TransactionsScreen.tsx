import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  TextInput,
  ScrollView,
  RefreshControl,
} from "react-native";
import { useEffect, useState, useCallback, useMemo, useRef } from "react";
import { Ionicons } from "@expo/vector-icons";
import { getCreditCards } from "@/features/creditCards/services/creditCardsApi";
import {
  getTransactionsByCreditCard,
  Transaction,
  updateTransaction,
  PaginatedResponse as TransactionsResponse,
} from "../services/transactionsApi";
import { exportTransactionsToCSV } from "../services/exportTransactions";
import { useRouter, useLocalSearchParams } from "expo-router";
import { useFocusEffect } from "@react-navigation/native";
import CategorySuggestModal from "@/features/categories/components/CategorySuggestModal";
import { CreditCardBasic } from "@/shared/types/creditCard";
import { formatDate, getDayKey, getMonthIndex } from "@/shared/utils/format";
import { useUncategorized } from "@/shared/contexts/UncategorizedContext";
import { isSessionExpired } from "@/shared/utils/authEvents";
import { colors } from "@/shared/theme/tokens";
import { glassSurface, glassSubtle } from "@/shared/theme/effects";
import TransactionsSkeleton from "../components/TransactionsSkeleton";

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

interface GroupedTransactions {
  day: string;
  transactions: Transaction[];
  totalCLP: number;
  totalUSD: number;
}

export default function TransactionsScreen() {
  const params = useLocalSearchParams<{ filter?: string }>();
  const { decrementCount } = useUncategorized();
  const [creditCards, setCreditCards] = useState<CreditCardBasic[]>([]);
  const [selectedCardId, setSelectedCardId] = useState<string | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingTransactions, setLoadingTransactions] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [currencyFilter, setCurrencyFilter] = useState<CurrencyFilter>("all");
  const [monthFilter, setMonthFilter] = useState(0); // 0 = Todos
  const [showFilters, setShowFilters] = useState(
    params.filter === "uncategorized",
  );
  const [yearFilter, setYearFilter] = useState<number | null>(null);
  const [minAmount, setMinAmount] = useState("");
  const [maxAmount, setMaxAmount] = useState("");
  const [onlyUncategorized, setOnlyUncategorized] = useState(
    params.filter === "uncategorized",
  );

  // Pagination state
  const [hasMore, setHasMore] = useState(true);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);

  // Snapshot the filter param in a ref so useFocusEffect can read the
  // latest value without being listed as a dependency (avoids loops).
  const filterParamRef = useRef(params.filter);
  filterParamRef.current = params.filter;

  // Re-apply the filter EVERY TIME this screen comes into focus.
  //
  // Why useFocusEffect instead of useEffect([params.filter])?
  // The drawer keeps this screen permanently mounted in memory.
  // When the user navigates here with { filter: "uncategorized" } for the
  // second time, params.filter doesn't *change* (it was already that value),
  // so useEffect's dependency check sees no difference and skips the run.
  // useFocusEffect fires on every focus event regardless of param diffs.
  useFocusEffect(
    useCallback(() => {
      if (filterParamRef.current === "uncategorized") {
        setOnlyUncategorized(true);
        setShowFilters(true);
      }
    }, []),
  );

  const router = useRouter();
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

  // Calcular años presentes en las transacciones
  const availableYears = useMemo(() => {
    const years = new Set<number>();
    transactions.forEach((t) => {
      const y = new Date(t.transactionDate).getFullYear();
      years.add(y);
    });
    return Array.from(years).sort((a, b) => b - a);
  }, [transactions]);

  // Load credit cards
  useEffect(() => {
    getCreditCards()
      .then((cardsResponse) => {
        setCreditCards(cardsResponse.items);
        if (cardsResponse.items.length > 0) {
          setSelectedCardId(cardsResponse.items[0].id);
        }
      })
      .finally(() => setLoading(false));
  }, []);

  // Load transactions when card changes
  const loadTransactions = useCallback(async (cursor?: string, isRefresh = false) => {
    if (!selectedCardId) return;
    setLoadingTransactions(true);
    try {
      const data = await getTransactionsByCreditCard(
        selectedCardId,
        50,
        cursor,
      );
      
      const sorted = [...data.items].sort(
        (a, b) =>
          new Date(b.transactionDate).getTime() -
          new Date(a.transactionDate).getTime(),
      );
      
      if (isRefresh || !cursor) {
        setTransactions(sorted);
      } else {
        setTransactions(prev => [...prev, ...sorted]);
      }
      
      setHasMore(data.metadata.hasMore);
      setNextCursor(data.metadata.nextCursor);
    } catch (error) {
      if (!isSessionExpired())
        console.error("Error loading transactions:", error);
    } finally {
      setLoadingTransactions(false);
    }
  }, [selectedCardId]);

  useEffect(() => {
    loadTransactions();
  }, [loadTransactions]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    setNextCursor(null);
    await loadTransactions(undefined, true);
    setRefreshing(false);
  }, [loadTransactions]);

  const loadMore = useCallback(() => {
    if (loadingMore || !hasMore || !nextCursor) return;
    setLoadingMore(true);
    loadTransactions(nextCursor);
  }, [loadingMore, hasMore, nextCursor, loadTransactions]);

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
    (onlyUncategorized ? 1 : 0);

  if (loading) {
    return <TransactionsSkeleton />;
  }

  return (
    <View style={styles.container}>
      {/* Card selector */}
      <View style={styles.cardSelectorContainer}>
        <Text style={styles.filterLabel}>Tarjeta</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {creditCards.map((card) => (
            <TouchableOpacity
              key={card.id}
              style={[
                styles.cardChip,
                selectedCardId === card.id && styles.cardChipActive,
              ]}
              onPress={() => setSelectedCardId(card.id)}
            >
              <Ionicons
                name="card-outline"
                size={16}
                color={selectedCardId === card.id ? colors.textPrimary : colors.textMuted}
              />
              <Text
                style={[
                  styles.cardChipText,
                  selectedCardId === card.id && styles.cardChipTextActive,
                ]}
              >
                {card.cardType} •{card.cardLastDigits}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Search + filter bar */}
      <View style={styles.searchBar}>
        <View style={styles.searchInput}>
          <Ionicons name="search" size={18} color={colors.textMuted} />
          <TextInput
            style={styles.searchText}
            placeholder="Buscar comercio..."
            placeholderTextColor={colors.textMuted}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery("")}>
              <Ionicons name="close-circle" size={18} color={colors.textMuted} />
            </TouchableOpacity>
          )}
        </View>
        <TouchableOpacity
          style={[
            styles.filterButton,
            activeFiltersCount > 0 && styles.filterButtonActive,
          ]}
          onPress={() => setShowFilters(!showFilters)}
        >
          <Ionicons
            name="options-outline"
            size={20}
            color={activeFiltersCount > 0 ? colors.textPrimary : colors.textSecondary}
          />
          {activeFiltersCount > 0 && (
            <View style={styles.filterBadge}>
              <Text style={styles.filterBadgeText}>{activeFiltersCount}</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      {/* Filters panel */}
      {showFilters && (
        <View style={styles.filtersPanel}>
          {/* Uncategorized filter */}
          <TouchableOpacity
            style={[
              styles.filterChip,
              onlyUncategorized && styles.filterChipActive,
              {
                flexDirection: "row",
                alignItems: "center",
                gap: 4,
                alignSelf: "flex-start",
                marginBottom: 12,
              },
            ]}
            onPress={() => setOnlyUncategorized(!onlyUncategorized)}
          >
            <Ionicons
              name={
                onlyUncategorized ? "checkmark-circle" : "help-circle-outline"
              }
              size={16}
              color={onlyUncategorized ? colors.textPrimary : colors.warning}
            />
            <Text
              style={[
                styles.filterChipText,
                onlyUncategorized && styles.filterChipTextActive,
              ]}
            >
              Solo sin categoría
            </Text>
          </TouchableOpacity>

          {/* Currency filter */}
          <Text style={styles.filterLabel}>Moneda</Text>
          <View style={styles.filterRow}>
            {(["all", "CLP", "USD"] as CurrencyFilter[]).map((c) => (
              <TouchableOpacity
                key={c}
                style={[
                  styles.filterChip,
                  currencyFilter === c && styles.filterChipActive,
                ]}
                onPress={() => setCurrencyFilter(c)}
              >
                <Text
                  style={[
                    styles.filterChipText,
                    currencyFilter === c && styles.filterChipTextActive,
                  ]}
                >
                  {c === "all" ? "Todas" : c === "USD" ? "USD" : "CLP"}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Year filter */}
          <Text style={styles.filterLabel}>Año</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.monthFilterScroll}
          >
            <TouchableOpacity
              style={[
                styles.filterChip,
                yearFilter === null && styles.filterChipActive,
              ]}
              onPress={() => setYearFilter(null)}
            >
              <Text
                style={[
                  styles.filterChipText,
                  yearFilter === null && styles.filterChipTextActive,
                ]}
              >
                Todos
              </Text>
            </TouchableOpacity>
            {availableYears.map((y) => (
              <TouchableOpacity
                key={y}
                style={[
                  styles.filterChip,
                  yearFilter === y && styles.filterChipActive,
                ]}
                onPress={() => setYearFilter(y)}
              >
                <Text
                  style={[
                    styles.filterChipText,
                    yearFilter === y && styles.filterChipTextActive,
                  ]}
                >
                  {y}
                </Text>
              </TouchableOpacity>
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
              <TouchableOpacity
                key={m}
                style={[
                  styles.filterChip,
                  monthFilter === idx && styles.filterChipActive,
                ]}
                onPress={() => setMonthFilter(idx)}
              >
                <Text
                  style={[
                    styles.filterChipText,
                    monthFilter === idx && styles.filterChipTextActive,
                  ]}
                >
                  {m.substring(0, 3)}
                </Text>
              </TouchableOpacity>
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
            <Text style={{ marginHorizontal: 8, color: colors.textSecondary }}>—</Text>
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
            <TouchableOpacity
              style={styles.clearFilters}
              onPress={() => {
                setCurrencyFilter("all");
                setMonthFilter(0);
                setYearFilter(null);
                setMinAmount("");
                setMaxAmount("");
                setSearchQuery("");
                setOnlyUncategorized(false);
                if (creditCards.length > 0) {
                  setSelectedCardId(creditCards[0].id);
                }
              }}
            >
              <Text style={styles.clearFiltersText}>Limpiar filtros</Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      {/* Summary bar */}
      <View style={styles.summaryBar}>
        <Text style={styles.summaryCount}>
          {totals.count} {totals.count === 1 ? "transacción" : "transacciones"}
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
              {totals.usd.toLocaleString("es-CL", { minimumFractionDigits: 2 })}
            </Text>
          )}
        </View>
        <TouchableOpacity
          style={styles.exportButton}
          onPress={async () => {
            setTimeout(async () => {
              try {
                await exportTransactionsToCSV(
                  filteredTransactions.map((t) => ({
                    ...t,
                    cardType: creditCards.find((c) => c.id === selectedCardId)
                      ?.cardType,
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
        >
          <Ionicons name="download-outline" size={20} color={colors.accent} />
          <Text style={styles.exportButtonText}>Exportar</Text>
        </TouchableOpacity>
      </View>
      <Text style={styles.exportInfo}>
        Solo se exportarán las transacciones filtradas actualmente.
      </Text>

      {/* Transactions list */}
      {loadingTransactions ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={colors.accent} />
        </View>
      ) : groupedTransactions.length === 0 ? (
        <View style={styles.centered}>
          <Ionicons name="receipt-outline" size={48} color={colors.textSubtle} />
          <Text style={styles.emptyText}>
            {searchQuery || activeFiltersCount > 0
              ? "Sin resultados para estos filtros"
              : "No hay transacciones"}
          </Text>
        </View>
      ) : (
        <ScrollView
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
        >
          {groupedTransactions.map((group) => (
            <View key={group.day} style={styles.dayGroup}>
              <View style={styles.dayHeader}>
                <Text style={styles.dayTitle}>
                  {group.day}
                  {/* Mostrar año al final si no está incluido */}
                  {(() => {
                    // group.day es como "Viernes, 30 de Enero"
                    // Tomamos el primer año de las transacciones del grupo
                    if (group.transactions.length > 0) {
                      const date = new Date(
                        group.transactions[0].transactionDate,
                      );
                      const year = date.getFullYear();
                      // Si el año no está ya en el string, lo agregamos
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
              {group.transactions.map((t) => (
                <TouchableOpacity
                  key={t.id}
                  style={styles.transaction}
                  activeOpacity={0.7}
                  onPress={() =>
                    router.push({
                      pathname: "/(screens)/transactionDetail",
                      params: {
                        creditCardId: selectedCardId!,
                        transactionId: t.id,
                      },
                    })
                  }
                >
                  <View style={styles.transactionLeft}>
                    <Text style={styles.merchant} numberOfLines={1}>
                      {t.merchant}
                    </Text>
                    <Text style={styles.transactionMeta}>
                      {formatDate(t.transactionDate)}
                    </Text>
                  </View>
                  <View style={{ alignItems: "flex-end" }}>
                    <Text style={styles.amount}>
                      {t.currency === "USD"
                        ? `US$${t.amount.toFixed(2)}`
                        : `$${t.amount.toLocaleString("es-CL")}`}
                    </Text>
                    <TouchableOpacity
                      style={styles.categoryBtn}
                      onPress={() => {
                        setCategoryModalMerchant(t.merchant);
                        setCategoryModalTransactionId(t.id);
                        setCategoryModalCreditCardId(selectedCardId);
                        setCategoryModalVisible(true);
                      }}
                    >
                      {t.categoryId ? (
                        <View
                          style={[
                            styles.categoryPill,
                            {
                              backgroundColor: t.categoryColor || colors.surface,
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
                            color={colors.warning}
                          />
                          <Text style={styles.uncategorizedText}>
                            Categorizar
                          </Text>
                        </View>
                      )}
                    </TouchableOpacity>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          ))}
          
          {/* Load More Button */}
          {hasMore && (
            <TouchableOpacity
              style={styles.loadMoreButton}
              onPress={loadMore}
              disabled={loadingMore}
            >
              {loadingMore ? (
                <ActivityIndicator size="small" color={colors.accent} />
              ) : (
                <View style={styles.loadMoreContent}>
                  <Ionicons name="download-outline" size={18} color={colors.accent} />
                  <Text style={styles.loadMoreText}>Cargar más transacciones</Text>
                </View>
              )}
            </TouchableOpacity>
          )}
          
          <View style={{ height: 20 }} />
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

              const res = await updateTransaction(creditCardId, transactionId, {
                categoryId: category.id,
              });

              const updated: Partial<Transaction> = res?.data ?? {};

              setTransactions((prev) =>
                prev.map((t) =>
                  t.id === transactionId
                    ? {
                        ...t,
                        categoryId: updated.categoryId ?? category.id,
                        categoryName: updated.categoryName ?? category.name,
                        categoryIcon: updated.categoryIcon ?? category.icon,
                        categoryColor: updated.categoryColor ?? category.color,
                      }
                    : t,
                ),
              );

              if (wasMissingCategory) {
                decrementCount();
              }
            } catch (e) {
              console.error("Error updating transaction category", e);
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
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  emptyText: {
    fontSize: 15,
    color: colors.textMuted,
    marginTop: 12,
    textAlign: "center",
  },
  // Card selector
  cardSelectorContainer: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  cardChip: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.06)",
    marginRight: 8,
    gap: 6,
  },
  cardChipActive: {
    backgroundColor: colors.accent,
  },
  // Category pill
  categoryPill: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
    gap: 4,
  },
  categoryEmoji: { fontSize: 12 },
  categoryName: {
    fontSize: 11,
    fontWeight: "600",
    color: colors.textPrimary,
    maxWidth: 90,
  },
  cardChipText: {
    fontSize: 13,
    fontWeight: "600",
    color: colors.textSecondary,
  },
  cardChipTextActive: {
    color: colors.textPrimary,
  },
  // Search
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: colors.surface,
    gap: 10,
  },
  searchInput: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.06)",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 8,
  },
  searchText: {
    flex: 1,
    fontSize: 14,
    color: colors.textPrimary,
  },
  filterButton: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: "rgba(255,255,255,0.06)",
    justifyContent: "center",
    alignItems: "center",
  },
  filterButtonActive: {
    backgroundColor: colors.accent,
  },
  filterBadge: {
    position: "absolute",
    top: -4,
    right: -4,
    backgroundColor: colors.destructive,
    width: 18,
    height: 18,
    borderRadius: 9,
    justifyContent: "center",
    alignItems: "center",
  },
  filterBadgeText: {
    fontSize: 10,
    fontWeight: "bold",
    color: colors.textPrimary,
  },
  // Filters panel
  filtersPanel: {
    backgroundColor: colors.surface,
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  filterLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: colors.textMuted,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginTop: 10,
    marginBottom: 6,
  },
  filterRow: {
    flexDirection: "row",
    gap: 8,
  },
  monthFilterScroll: {
    marginBottom: 4,
  },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: "rgba(255,255,255,0.06)",
    marginRight: 6,
  },
  filterChipActive: {
    backgroundColor: colors.accent,
  },
  filterChipText: {
    fontSize: 13,
    fontWeight: "500",
    color: colors.textSecondary,
  },
  filterChipTextActive: {
    color: colors.textPrimary,
  },
  clearFilters: {
    marginTop: 8,
    alignSelf: "flex-start",
  },
  clearFiltersText: {
    fontSize: 13,
    color: colors.destructive,
    fontWeight: "600",
  },
  // Summary bar
  summaryBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  summaryCount: {
    fontSize: 13,
    color: colors.textMuted,
    fontWeight: "500",
  },
  summaryTotals: {
    flexDirection: "row",
    gap: 12,
  },
  summaryAmount: {
    fontSize: 14,
    fontWeight: "700",
    color: colors.destructive,
  },
  summaryAmountUSD: {
    fontSize: 14,
    fontWeight: "700",
    color: colors.accent,
  },
  exportButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(59,130,246,0.1)",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginLeft: 10,
  },
  exportButtonText: {
    color: colors.accent,
    fontWeight: "700",
    fontSize: 14,
    marginLeft: 6,
  },
  exportInfo: {
    fontSize: 11,
    color: colors.textMuted,
    textAlign: "center",
    marginBottom: 2,
    marginTop: -8,
  },
  // Day groups
  dayGroup: {
    marginHorizontal: 16,
    marginBottom: 12,
    ...glassSurface(),
  },
  dayHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
    backgroundColor: "rgba(255,255,255,0.03)",
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
  },
  dayTitle: {
    fontSize: 13,
    fontWeight: "600",
    color: colors.textSecondary,
    textTransform: "capitalize",
  },
  dayTotals: {
    flexDirection: "row",
    gap: 10,
  },
  dayTotal: {
    fontSize: 13,
    fontWeight: "700",
    color: colors.destructive,
  },
  dayTotalUSD: {
    fontSize: 13,
    fontWeight: "700",
    color: colors.accent,
  },
  transaction: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  transactionLeft: {
    flex: 1,
    marginRight: 12,
  },
  merchant: {
    fontSize: 14,
    fontWeight: "500",
    color: colors.textPrimary,
  },
  transactionMeta: {
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 2,
  },
  amount: {
    fontSize: 15,
    fontWeight: "700",
    color: colors.destructive,
  },
  categoryBtn: {
    marginTop: 4,
  },
  uncategorizedPill: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.warning,
    borderStyle: "dashed",
    backgroundColor: "rgba(217,119,6,0.1)",
    gap: 4,
  },
  uncategorizedText: {
    fontSize: 11,
    fontWeight: "600",
    color: colors.warning,
  },
  amountInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    padding: 8,
    fontSize: 15,
    backgroundColor: colors.surface,
    color: colors.textPrimary,
    minWidth: 80,
    textAlign: "right",
  },
  loadMoreButton: {
    marginHorizontal: 14,
    marginVertical: 16,
    paddingVertical: 12,
    backgroundColor: colors.surface,
    borderRadius: 8,
    alignItems: "center",
  },
  loadMoreContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  loadMoreText: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.accent,
  },
});
