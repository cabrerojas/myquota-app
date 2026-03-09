import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import { useState, useEffect, useCallback } from "react";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { getCreditCards } from "@/features/creditCards/services/creditCardsApi";
import {
  getManualTransactions,
  deleteManualTransaction,
  ManualTransaction,
} from "@/features/transactions/services/transactionsApi";
import { CreditCardBasic } from "@/shared/types/creditCard";
import { isSessionExpired } from "@/shared/utils/authEvents";

interface ManualDebtItem extends ManualTransaction {
  cardLabel: string;
}

export default function ManualDebtsScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [debts, setDebts] = useState<ManualDebtItem[]>([]);
  const [_cards, setCards] = useState<CreditCardBasic[]>([]);

  const fetchDebts = useCallback(async () => {
    try {
      const cardList = await getCreditCards();
      setCards(cardList);

      const allDebts: ManualDebtItem[] = [];
      for (const card of cardList) {
        const txs = await getManualTransactions(card.id);
        allDebts.push(
          ...txs.map((tx) => ({
            ...tx,
            cardLabel: `${card.cardType} •${card.cardLastDigits}`,
          })),
        );
      }

      // Sort by merchant
      allDebts.sort((a, b) => a.merchant.localeCompare(b.merchant));
      setDebts(allDebts);
    } catch (error) {
      if (!isSessionExpired()) console.error("Error fetching manual debts:", error);
    }
  }, []);

  useEffect(() => {
    setLoading(true);
    fetchDebts().finally(() => setLoading(false));
  }, [fetchDebts]);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchDebts();
    setRefreshing(false);
  };

  const handleDelete = (debt: ManualDebtItem) => {
    Alert.alert(
      "Eliminar deuda",
      `¿Eliminar "${debt.merchant}" y todas sus cuotas?\n\nEsta acción no se puede deshacer.`,
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Eliminar",
          style: "destructive",
          onPress: async () => {
            try {
              const result = await deleteManualTransaction(
                debt.creditCardId,
                debt.id,
              );
              Alert.alert(
                "Eliminada",
                `Se eliminaron ${result.deletedQuotas} cuotas`,
              );
              fetchDebts();
            } catch (error) {
              Alert.alert(
                "Error",
                error instanceof Error ? error.message : "No se pudo eliminar",
              );
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
        currency: debt.currency,
        purchaseDate: debt.transactionDate,
      },
    });
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#007BFF" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={debts}
        keyExtractor={(item) => item.id}
        contentContainerStyle={
          debts.length === 0 ? styles.emptyList : styles.list
        }
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="document-text-outline" size={56} color="#CED4DA" />
            <Text style={styles.emptyTitle}>Sin deudas manuales</Text>
            <Text style={styles.emptySubtitle}>
              Agrega deudas desde la Proyección de Deuda
            </Text>
          </View>
        }
        renderItem={({ item }) => {
          const remaining = item.totalInstallments - item.paidInstallments;
          const totalDebt = remaining * item.amount;
          const prefix = item.currency === "Dolar" ? "US$" : "$";

          return (
            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <View style={styles.cardInfo}>
                  <Text style={styles.merchant} numberOfLines={1}>
                    {item.merchant}
                  </Text>
                  <Text style={styles.cardLabel}>{item.cardLabel}</Text>
                </View>
                <View style={styles.actions}>
                  <TouchableOpacity
                    style={styles.actionBtn}
                    onPress={() => handleEdit(item)}
                  >
                    <Ionicons name="create-outline" size={20} color="#007BFF" />
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.actionBtn}
                    onPress={() => handleDelete(item)}
                  >
                    <Ionicons name="trash-outline" size={20} color="#DC3545" />
                  </TouchableOpacity>
                </View>
              </View>

              <View style={styles.details}>
                <View style={styles.detailItem}>
                  <Text style={styles.detailLabel}>Cuota</Text>
                  <Text style={styles.detailValue}>
                    {prefix}
                    {item.amount.toLocaleString("es-CL")}
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
                  <Text style={[styles.detailValue, { color: "#DC3545" }]}>
                    {prefix}
                    {totalDebt.toLocaleString("es-CL")}
                  </Text>
                </View>
              </View>

              {/* Progress bar */}
              <View style={styles.progressBg}>
                <View
                  style={[
                    styles.progressFill,
                    {
                      width: `${(item.paidInstallments / item.totalInstallments) * 100}%`,
                    },
                  ]}
                />
              </View>
              <Text style={styles.progressText}>
                {remaining} cuotas restantes
              </Text>
            </View>
          );
        }}
      />

      {/* FAB */}
      <TouchableOpacity
        style={styles.fab}
        onPress={() => router.push("/(screens)/addDebt")}
        activeOpacity={0.8}
      >
        <Ionicons name="add" size={28} color="#fff" />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F8F9FA" },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  list: { padding: 16, paddingBottom: 80 },
  emptyList: { flex: 1, justifyContent: "center", alignItems: "center" },
  emptyContainer: { alignItems: "center" },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#495057",
    marginTop: 16,
  },
  emptySubtitle: { fontSize: 14, color: "#868E96", marginTop: 6 },
  card: {
    backgroundColor: "#fff",
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#E9ECEF",
    elevation: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 12,
  },
  cardInfo: { flex: 1, marginRight: 8 },
  merchant: { fontSize: 15, fontWeight: "700", color: "#212529" },
  cardLabel: { fontSize: 12, color: "#868E96", marginTop: 2 },
  actions: { flexDirection: "row", gap: 4 },
  actionBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#F8F9FA",
    alignItems: "center",
    justifyContent: "center",
  },
  details: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  detailItem: { alignItems: "center" },
  detailLabel: {
    fontSize: 11,
    color: "#868E96",
    textTransform: "uppercase",
    letterSpacing: 0.3,
    marginBottom: 2,
  },
  detailValue: { fontSize: 14, fontWeight: "700", color: "#212529" },
  progressBg: {
    height: 6,
    backgroundColor: "#F1F3F5",
    borderRadius: 3,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    backgroundColor: "#28A745",
    borderRadius: 3,
  },
  progressText: {
    fontSize: 11,
    color: "#868E96",
    marginTop: 4,
    textAlign: "right",
  },
  fab: {
    position: "absolute",
    right: 20,
    bottom: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "#007BFF",
    alignItems: "center",
    justifyContent: "center",
    elevation: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
});
