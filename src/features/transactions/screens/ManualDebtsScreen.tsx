import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Pressable,
  Alert,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import { useState, useCallback } from "react";
import { useRouter } from "expo-router";
import { useFocusEffect } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { getCreditCards } from "@/features/creditCards/services/creditCardsApi";
import {
  getManualTransactions,
  deleteManualTransaction,
  ManualTransaction,
} from "@/features/transactions/services/transactionsApi";
import { getQuotasByTransaction } from "@/features/quotas/services/quotasApi";
import { CreditCardBasic } from "@/shared/types/creditCard";
import { isSessionExpired } from "@/shared/utils/authEvents";
import { colors } from "@/shared/theme/colors";
import { borderRadius } from "@/shared/theme/tokens";
import { glassSurface } from "@/shared/theme/effects";
import ErrorState from "@/shared/components/ErrorState";

interface ManualDebtItem extends ManualTransaction {
  cardLabel: string;
  lastPaidMonth: number; // 0-11, derived from last paid quota
  lastPaidYear: number;
}

export default function ManualDebtsScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [debts, setDebts] = useState<ManualDebtItem[]>([]);
  const [_cards, setCards] = useState<CreditCardBasic[]>([]);

  const fetchDebts = useCallback(async () => {
    try {
      setError(null);
      const cardListResponse = await getCreditCards();
      const cardList = cardListResponse.items;
      setCards(cardList);

      const allDebts: ManualDebtItem[] = [];
      for (const card of cardList) {
        const txs = await getManualTransactions(card.id);
        for (const tx of txs) {
          // Derive lastPaidMonth from quotas
          let lastPaidMonth = new Date().getMonth();
          let lastPaidYear = new Date().getFullYear();
          if (tx.paidInstallments > 0) {
            try {
              const quotas = await getQuotasByTransaction(card.id, tx.id);
              const paidQuotas = quotas
                .filter((q) => q.status === "paid")
                .sort((a, b) => new Date(b.dueDate).getTime() - new Date(a.dueDate).getTime());
              if (paidQuotas.length > 0) {
                const lastPaidDate = new Date(paidQuotas[0].dueDate);
                lastPaidMonth = lastPaidDate.getMonth();
                lastPaidYear = lastPaidDate.getFullYear();
              }
            } catch { /* keep defaults */ }
          }
          allDebts.push({
            ...tx,
            cardLabel: `${card.cardType} •${card.cardLastDigits}`,
            lastPaidMonth,
            lastPaidYear,
          });
        }
      }
      allDebts.sort((a, b) => a.merchant.localeCompare(b.merchant));
      setDebts(allDebts);
    } catch (error) {
      setError(error instanceof Error ? error.message : "Error al cargar los datos");
      if (!isSessionExpired())
        console.error("Error fetching manual debts:", error);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      fetchDebts().finally(() => setLoading(false));
    }, [fetchDebts]),
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchDebts();
    setRefreshing(false);
  };

  const handleDelete = (debt: ManualDebtItem) => {
    Alert.alert(
      "Eliminar deuda",
      `¿Eliminar "${debt.merchant}" y todas sus cuotas?`,
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Eliminar",
          style: "destructive",
          onPress: async () => {
            try {
              const result = await deleteManualTransaction(debt.creditCardId, debt.id);
              Alert.alert("Eliminada", `Se eliminaron ${result.deletedQuotas} cuotas`);
              fetchDebts();
            } catch (error) {
              Alert.alert("Error", error instanceof Error ? error.message : "No se pudo eliminar");
            }
          },
        },
      ],
    );
  };

  const handleEdit = (debt: ManualDebtItem) => {
    router.push({
      pathname: "/(screens)/addDebt",
      params: {
        editMode: "true",
        transactionId: debt.id,
        creditCardId: debt.creditCardId,
        merchant: debt.merchant,
        quotaAmount: String(debt.amount),
        totalInstallments: String(debt.totalInstallments),
        paidInstallments: String(debt.paidInstallments),
        lastPaidMonth: String(debt.lastPaidMonth),
        lastPaidYear: String(debt.lastPaidYear),
        currency: debt.currency,
        purchaseDate: debt.transactionDate,
        source: debt.source,
        readOnlyFields: debt.source !== "manual" ? "true" : undefined,
      },
    });
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.accent} />
      </View>
    );
  }

  if (error) {
    return <ErrorState message="No se pudieron cargar las compras en cuotas." onRetry={fetchDebts} />;
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={debts}
        keyExtractor={(item) => item.id}
        contentContainerStyle={debts.length === 0 ? styles.emptyList : styles.list}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh}
            tintColor={colors.accent} colors={[colors.accent]} />
        }
        ListEmptyComponent={
          <View style={styles.emptyCard}>
            <View style={styles.emptyIconWrap}>
              <Ionicons name="document-text-outline" size={36} color={colors.textMuted} />
            </View>
            <Text style={styles.emptyTitle}>Sin compras en cuotas</Text>
              <Text style={styles.emptySubtitle}>
               Registra compras en cuotas o divide{"\n"}transacciones importadas
             </Text>
          </View>
        }
        renderItem={({ item }) => {
          const remaining = item.totalInstallments - item.paidInstallments;
          const totalDebt = remaining * item.amount;
          const prefix = item.currency === "USD" ? "US$" : "$";
          const progress = (item.paidInstallments / item.totalInstallments) * 100;
          const isComplete = progress >= 100;

          return (
            <View style={styles.card}>
              {/* Header */}
              <View style={styles.cardHeader}>
                <View style={styles.cardInfo}>
                  <Text style={styles.merchant} numberOfLines={1}>
                    {item.merchant}
                  </Text>
                  <Text style={styles.cardLabel}>{item.cardLabel}</Text>
                  <View
                    style={[
                      styles.sourceBadge,
                      item.source === "manual" ? styles.sourceBadgeManual : styles.sourceBadgeImported,
                    ]}
                  >
                    <Text
                      style={[
                        styles.sourceBadgeText,
                        item.source === "manual" ? styles.sourceBadgeManualText : styles.sourceBadgeImportedText,
                      ]}
                    >
                      {item.source === "manual" ? "Manual" : "Importado"}
                    </Text>
                  </View>
                </View>
                <View style={styles.actions}>
                  <Pressable
                    onPress={() => handleEdit(item)}
                    style={({ pressed }) => [styles.actionBtn, pressed && styles.actionBtnPressed]}
                    accessibilityLabel={item.source === "manual" ? "Editar deuda" : "Editar cuotas"}
                    accessibilityRole="button"
                  >
                    <Ionicons
                      name={item.source === "manual" ? "create-outline" : "clipboard-outline"}
                      size={18}
                      color={colors.accent}
                    />
                  </Pressable>
                  {item.source === "manual" && (
                    <Pressable
                      onPress={() => handleDelete(item)}
                      style={({ pressed }) => [styles.actionBtn, pressed && styles.actionBtnPressed]}
                      accessibilityLabel="Eliminar deuda"
                      accessibilityRole="button"
                    >
                      <Ionicons name="trash-outline" size={18} color={colors.destructive} />
                    </Pressable>
                  )}
                </View>
              </View>

              {/* Detail columns */}
              <View style={styles.details}>
                <View style={styles.detailItem}>
                  <Text style={styles.detailLabel}>Cuota</Text>
                  <Text style={styles.detailValue}>
                    {prefix}{item.amount.toLocaleString("es-CL")}
                  </Text>
                </View>
                <View style={styles.detailItem}>
                  <Text style={styles.detailLabel}>Progreso</Text>
                  <Text style={styles.detailValue}>
                    {item.paidInstallments}/{item.totalInstallments}
                  </Text>
                </View>
                <View style={styles.detailItem}>
                  <Text style={styles.detailLabel}>Pendiente</Text>
                  <Text style={[styles.detailValue, isComplete && styles.detailDone]}>
                    {isComplete ? "Completo" : `${prefix}${totalDebt.toLocaleString("es-CL")}`}
                  </Text>
                </View>
              </View>

              {/* Progress bar */}
              <View style={styles.progressBg}>
                <View style={[styles.progressFill, { width: `${progress}%` }, isComplete && styles.progressFillDone]} />
              </View>
              <Text style={[styles.progressText, isComplete && styles.progressTextDone]}>
                {isComplete ? "Todas las cuotas pagadas" : `${remaining} cuotas restantes`}
              </Text>
            </View>
          );
        }}
      />

      {/* FAB */}
      <Pressable
        onPress={() => router.push("/(screens)/addDebt")}
        style={({ pressed }) => [styles.fab, pressed && styles.fabPressed]}
        accessibilityLabel="Registrar compra en cuotas"
        accessibilityRole="button"
      >
        <Ionicons name="add" size={26} color={colors.textPrimary} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  center: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: colors.bg },
  list: { padding: 24, paddingBottom: 80 },
  emptyList: { flex: 1, justifyContent: "center", alignItems: "center", padding: 24 },

  // Empty
  emptyCard: {
    ...glassSurface(false),
    alignItems: "center",
    paddingVertical: 50,
    paddingHorizontal: 24,
    gap: 8,
  },
  emptyIconWrap: {
    width: 64,
    height: 64,
    borderRadius: borderRadius.full,
    backgroundColor: "rgba(255,255,255,0.04)",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 4,
  },
  emptyTitle: { fontSize: 17, fontWeight: "600", color: colors.textSecondary, marginTop: 8 },
  emptySubtitle: { fontSize: 13, color: colors.textMuted, textAlign: "center", lineHeight: 19 },

  // Card
  card: {
    ...glassSurface(false),
    padding: 16,
    marginBottom: 12,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 14,
  },
  cardInfo: { flex: 1, marginRight: 8 },
  merchant: { fontSize: 15, fontWeight: "700", color: colors.textPrimary },
  cardLabel: { fontSize: 12, color: colors.textMuted, marginTop: 3 },
  actions: { flexDirection: "row", gap: 6 },
  actionBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: "rgba(255,255,255,0.04)",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: colors.border,
  },
  actionBtnPressed: { opacity: 0.7 },

  // Details
  details: { flexDirection: "row", justifyContent: "space-between", marginBottom: 14 },
  detailItem: { alignItems: "center", flex: 1 },
  detailLabel: {
    fontSize: 10,
    fontWeight: "600",
    color: colors.textMuted,
    textTransform: "uppercase",
    letterSpacing: 0.4,
    marginBottom: 4,
  },
  detailValue: { fontSize: 14, fontWeight: "700", color: colors.textPrimary },
  detailDone: { color: colors.success },

  // Progress
  progressBg: {
    height: 4,
    backgroundColor: "rgba(255,255,255,0.06)",
    borderRadius: 2,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    backgroundColor: colors.accent,
    borderRadius: 2,
  },
  progressFillDone: { backgroundColor: colors.success },
  progressText: { fontSize: 11, color: colors.textMuted, marginTop: 6, textAlign: "right" },
  progressTextDone: { color: colors.success },

  // FAB
  fab: {
    position: "absolute",
    right: 24,
    bottom: 28,
    width: 52,
    height: 52,
    borderRadius: 16,
    backgroundColor: colors.accent,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 6,
  },
  fabPressed: { opacity: 0.85 },

  // Source badge
  sourceBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    alignSelf: "flex-start",
    marginTop: 2,
  },
  sourceBadgeText: {
    fontSize: 10,
    fontWeight: "600",
  },
  sourceBadgeManual: {
    backgroundColor: "rgba(59,130,246,0.12)",
  },
  sourceBadgeManualText: {
    color: colors.secondary,
  },
  sourceBadgeImported: {
    backgroundColor: "rgba(255,255,255,0.06)",
  },
  sourceBadgeImportedText: {
    color: colors.textMuted,
  },
});
