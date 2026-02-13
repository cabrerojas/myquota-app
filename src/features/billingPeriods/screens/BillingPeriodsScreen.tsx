import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  RefreshControl,
} from "react-native";
import { useEffect, useState, useCallback } from "react";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import {
  getBillingPeriodsByCreditCard,
  createBillingPeriod,
  updateBillingPeriod,
  deleteBillingPeriod,
  BillingPeriod,
} from "../services/billingPeriodsApi";
import BillingPeriodFormModal from "../components/BillingPeriodFormModal";

interface BillingPeriodsScreenProps {
  creditCardId: string;
  creditCardLabel: string;
}

const formatDisplayDate = (dateStr: string): string => {
  const date = new Date(dateStr);
  const day = date.getDate().toString().padStart(2, "0");
  const month = (date.getMonth() + 1).toString().padStart(2, "0");
  const year = date.getFullYear();
  return `${day}/${month}/${year}`;
};

export default function BillingPeriodsScreen({
  creditCardId,
  creditCardLabel,
}: BillingPeriodsScreenProps) {
  const router = useRouter();
  const [periods, setPeriods] = useState<BillingPeriod[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showFormModal, setShowFormModal] = useState(false);
  const [editingPeriod, setEditingPeriod] = useState<BillingPeriod | null>(
    null,
  );

  const loadPeriods = useCallback(async () => {
    try {
      const data = await getBillingPeriodsByCreditCard(creditCardId);
      setPeriods(data);
    } catch (error) {
      Alert.alert(
        "Error",
        error instanceof Error
          ? error.message
          : "Error al cargar períodos de facturación",
      );
    }
  }, [creditCardId]);

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    await loadPeriods();
    setIsRefreshing(false);
  }, [loadPeriods]);

  useEffect(() => {
    setIsLoading(true);
    loadPeriods().finally(() => setIsLoading(false));
  }, [loadPeriods]);

  const handleCreate = async (data: {
    month: string;
    startDate: string;
    endDate: string;
    dueDate: string;
  }) => {
    await createBillingPeriod(creditCardId, data);
    Alert.alert("Éxito", "Período de facturación creado correctamente.");
    await loadPeriods();
  };

  const handleUpdate = async (data: {
    month: string;
    startDate: string;
    endDate: string;
    dueDate: string;
  }) => {
    if (!editingPeriod) return;
    await updateBillingPeriod(creditCardId, editingPeriod.id, data);
    Alert.alert("Éxito", "Período de facturación actualizado correctamente.");
    setEditingPeriod(null);
    await loadPeriods();
  };

  const handleDelete = (period: BillingPeriod) => {
    Alert.alert(
      "Eliminar período",
      `¿Estás seguro de eliminar "${period.month}"?`,
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Eliminar",
          style: "destructive",
          onPress: async () => {
            try {
              await deleteBillingPeriod(creditCardId, period.id);
              Alert.alert(
                "Eliminado",
                "Período de facturación eliminado correctamente.",
              );
              await loadPeriods();
            } catch (error) {
              Alert.alert(
                "Error",
                error instanceof Error
                  ? error.message
                  : "Error al eliminar período",
              );
            }
          },
        },
      ],
    );
  };

  const openEditModal = (period: BillingPeriod) => {
    setEditingPeriod(period);
    setShowFormModal(true);
  };

  const openCreateModal = () => {
    setEditingPeriod(null);
    setShowFormModal(true);
  };

  const getInitialFormData = () => {
    if (editingPeriod) {
      return {
        month: editingPeriod.month,
        startDate: editingPeriod.startDate,
        endDate: editingPeriod.endDate,
        dueDate: editingPeriod.dueDate,
      };
    }
    // Sugerir siguiente período basado en el más reciente
    if (periods.length > 0) {
      const latest = periods[0]; // Ya vienen ordenados desc
      const latestEnd = new Date(latest.endDate);
      const nextStart = new Date(latestEnd);
      nextStart.setDate(nextStart.getDate() + 1);
      const nextEnd = new Date(nextStart);
      nextEnd.setMonth(nextEnd.getMonth() + 1);
      nextEnd.setDate(nextEnd.getDate() - 1);

      const monthNames = [
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

      return {
        month: `${monthNames[nextEnd.getMonth()]} ${nextEnd.getFullYear()}`,
        startDate: nextStart.toISOString(),
        endDate: nextEnd.toISOString(),
        dueDate: (() => {
          const d = new Date(nextEnd);
          d.setDate(d.getDate() + 20);
          return d.toISOString();
        })(),
      };
    }
    return undefined;
  };

  const renderPeriodItem = ({ item }: { item: BillingPeriod }) => (
    <TouchableOpacity
      style={styles.periodCard}
      onPress={() =>
        router.push({
          pathname: "/(drawer)/billingPeriodDetail",
          params: {
            creditCardId,
            periodMonth: item.month,
            periodStartDate: item.startDate,
            periodEndDate: item.endDate,
          },
        })
      }
      activeOpacity={0.7}
    >
      <View style={styles.periodInfo}>
        <Text style={styles.periodMonth}>{item.month}</Text>
        <Text style={styles.periodDates}>
          {formatDisplayDate(item.startDate)} —{" "}
          {formatDisplayDate(item.endDate)}
        </Text>
        {item.dueDate && (
          <Text style={styles.periodDueDate}>
            Vence: {formatDisplayDate(item.dueDate)}
          </Text>
        )}
      </View>
      <View style={styles.periodActions}>
        <TouchableOpacity
          style={styles.iconButton}
          onPress={(e) => {
            e.stopPropagation();
            openEditModal(item);
          }}
        >
          <Ionicons name="pencil" size={20} color="#007BFF" />
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.iconButton}
          onPress={(e) => {
            e.stopPropagation();
            handleDelete(item);
          }}
        >
          <Ionicons name="trash-outline" size={20} color="#DC3545" />
        </TouchableOpacity>
        <Ionicons name="chevron-forward" size={18} color="#ADB5BD" />
      </View>
    </TouchableOpacity>
  );

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007BFF" />
        <Text style={styles.loadingText}>Cargando períodos...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.cardLabel}>💳 {creditCardLabel}</Text>

      {periods.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="calendar-outline" size={64} color="#CED4DA" />
          <Text style={styles.emptyTitle}>Sin períodos de facturación</Text>
          <Text style={styles.emptyText}>
            Crea tu primer período para organizar tus transacciones.
          </Text>
        </View>
      ) : (
        <FlatList
          data={periods}
          keyExtractor={(item) => item.id}
          renderItem={renderPeriodItem}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={handleRefresh}
            />
          }
        />
      )}

      {/* Botón flotante para agregar */}
      <TouchableOpacity style={styles.fab} onPress={openCreateModal}>
        <Ionicons name="add" size={28} color="#fff" />
      </TouchableOpacity>

      {/* Modal de formulario */}
      <BillingPeriodFormModal
        visible={showFormModal}
        onClose={() => {
          setShowFormModal(false);
          setEditingPeriod(null);
        }}
        onSubmit={editingPeriod ? handleUpdate : handleCreate}
        initialData={getInitialFormData()}
        title={
          editingPeriod
            ? "Editar Período de Facturación"
            : "Nuevo Período de Facturación"
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8F9FA",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#F8F9FA",
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: "#6C757D",
  },
  cardLabel: {
    fontSize: 16,
    fontWeight: "600",
    color: "#495057",
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 8,
  },
  listContent: {
    padding: 16,
    paddingBottom: 80,
  },
  periodCard: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  periodInfo: {
    flex: 1,
  },
  periodMonth: {
    fontSize: 17,
    fontWeight: "bold",
    color: "#1A1A2E",
    marginBottom: 4,
  },
  periodDates: {
    fontSize: 14,
    color: "#6C757D",
  },
  periodDueDate: {
    fontSize: 13,
    color: "#E67E22",
    fontWeight: "500",
    marginTop: 2,
  },
  periodActions: {
    flexDirection: "row",
    gap: 12,
  },
  iconButton: {
    padding: 8,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 40,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#495057",
    marginTop: 16,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: "#6C757D",
    textAlign: "center",
    lineHeight: 20,
  },
  fab: {
    position: "absolute",
    right: 20,
    bottom: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "#007BFF",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 5,
    elevation: 5,
  },
});
