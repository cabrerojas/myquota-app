import { useCallback, useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { Href, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import {
  Category,
  getAllCategories,
  getMerchantCategoryHistory,
  MerchantCategoryHistoryItem,
} from "@/features/categories/services/categoryApi";

interface DebtRouteParams {
  editMode?: string;
  transactionId?: string;
  creditCardId?: string;
  merchant?: string;
  quotaAmount?: string;
  totalInstallments?: string;
  paidInstallments?: string;
  currency?: string;
  purchaseDate?: string;
  lastPaidMonth?: string;
  lastPaidYear?: string;
  selectedCategoryId?: string;
  selectedCategoryName?: string;
}

interface CategorySelectScreenProps {
  merchant: string;
  debtParams: DebtRouteParams;
}

export default function CategorySelectScreen({
  merchant,
  debtParams,
}: CategorySelectScreenProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState(merchant);
  const [categories, setCategories] = useState<Category[]>([]);
  const [history, setHistory] = useState<MerchantCategoryHistoryItem[]>([]);

  useFocusEffect(
    useCallback(() => {
      let isActive = true;

      const loadData = async () => {
        setLoading(true);
        try {
          const [allCategories, merchantHistory] = await Promise.all([
            getAllCategories(),
            merchant
              ? getMerchantCategoryHistory(merchant)
              : Promise.resolve([]),
          ]);

          if (!isActive) return;
          setCategories(allCategories);
          setHistory(merchantHistory);
        } finally {
          if (isActive) {
            setLoading(false);
          }
        }
      };

      loadData();

      return () => {
        isActive = false;
      };
    }, [merchant]),
  );

  const historyMap = useMemo(() => {
    const map = new Map<string, MerchantCategoryHistoryItem>();
    history.forEach((item) => map.set(item.categoryId, item));
    return map;
  }, [history]);

  const filteredCategories = useMemo(() => {
    const query = search.trim().toLowerCase();
    const filtered = query
      ? categories.filter((c) => c.name.toLowerCase().includes(query))
      : categories;

    return filtered.sort((a, b) => {
      const aHistoryCount = historyMap.get(a.id)?.count ?? 0;
      const bHistoryCount = historyMap.get(b.id)?.count ?? 0;

      if (aHistoryCount !== bHistoryCount) {
        return bHistoryCount - aHistoryCount;
      }

      return a.name.localeCompare(b.name);
    });
  }, [categories, historyMap, search]);

  const navigateBackToAddDebt = (
    categoryId?: string,
    categoryName?: string,
  ) => {
    const addDebtHref: Href = {
      pathname: "/(screens)/addDebt",
      params: {
        ...debtParams,
        selectedCategoryId: categoryId,
        selectedCategoryName: categoryName,
      },
    };

    router.replace(addDebtHref);
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#007BFF" />
        <Text style={styles.loadingText}>Cargando categorías...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.headerCard}>
        <Text style={styles.headerTitle}>Elegir categoría</Text>
        <Text style={styles.headerSubtitle}>
          Comercio: {merchant || "Sin nombre"}
        </Text>
        <View style={styles.searchRow}>
          <Ionicons name="search" size={16} color="#868E96" />
          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder="Buscar categoría..."
            style={styles.searchInput}
            placeholderTextColor="#ADB5BD"
          />
        </View>
      </View>

      <FlatList
        data={filteredCategories}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        renderItem={({ item }) => {
          const usage = historyMap.get(item.id);
          return (
            <TouchableOpacity
              style={styles.categoryItem}
              onPress={() => navigateBackToAddDebt(item.id, item.name)}
            >
              <View style={styles.categoryInfo}>
                <Text style={styles.categoryIcon}>{item.icon || "🏷️"}</Text>
                <View style={{ flex: 1 }}>
                  <Text style={styles.categoryName}>{item.name}</Text>
                  {usage ? (
                    <Text style={styles.categoryHint}>
                      Usada {usage.count} {usage.count === 1 ? "vez" : "veces"}
                    </Text>
                  ) : null}
                </View>
              </View>
              <Ionicons name="chevron-forward" size={18} color="#ADB5BD" />
            </TouchableOpacity>
          );
        }}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Ionicons name="pricetag-outline" size={42} color="#CED4DA" />
            <Text style={styles.emptyTitle}>Sin resultados</Text>
            <Text style={styles.emptySubtitle}>
              No encontramos categorías con ese texto.
            </Text>
          </View>
        }
      />

      <TouchableOpacity
        style={styles.skipButton}
        onPress={() =>
          navigateBackToAddDebt(
            debtParams.selectedCategoryId,
            debtParams.selectedCategoryName,
          )
        }
      >
        <Text style={styles.skipButtonText}>Volver sin cambiar</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8F9FA",
  },
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#F8F9FA",
  },
  loadingText: {
    marginTop: 10,
    color: "#6C757D",
  },
  headerCard: {
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#E9ECEF",
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#212529",
  },
  headerSubtitle: {
    fontSize: 13,
    color: "#6C757D",
  },
  searchRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderWidth: 1,
    borderColor: "#DEE2E6",
    backgroundColor: "#fff",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  searchInput: {
    flex: 1,
    color: "#212529",
    fontSize: 14,
  },
  listContent: {
    padding: 16,
    paddingBottom: 100,
  },
  categoryItem: {
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#E9ECEF",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 8,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  categoryInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    flex: 1,
  },
  categoryIcon: {
    fontSize: 18,
  },
  categoryName: {
    fontSize: 15,
    fontWeight: "600",
    color: "#212529",
  },
  categoryHint: {
    fontSize: 12,
    color: "#007BFF",
    marginTop: 2,
  },
  emptyState: {
    alignItems: "center",
    paddingTop: 40,
    gap: 8,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#495057",
  },
  emptySubtitle: {
    fontSize: 13,
    color: "#868E96",
  },
  skipButton: {
    position: "absolute",
    left: 16,
    right: 16,
    bottom: 20,
    borderRadius: 12,
    backgroundColor: "#6C757D",
    paddingVertical: 14,
    alignItems: "center",
  },
  skipButtonText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "700",
  },
});
