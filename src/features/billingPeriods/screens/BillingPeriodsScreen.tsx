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
import { useState } from "react";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import {
  BillingPeriod,
  useBillingPeriods,
  useCreateBillingPeriod,
  useUpdateBillingPeriod,
  useDeleteBillingPeriod,
} from "../services/billingPeriodsApi";
import BillingPeriodFormModal from "../components/BillingPeriodFormModal";
import ErrorState from "@/shared/components/ErrorState";
import { colors } from "@/shared/theme/colors";
import { spacing, borderRadius } from "@/shared/theme/tokens";
import { shadows } from "@/shared/theme/effects";

interface BillingPeriodsScreenProps {
  creditCardId: string;
  creditCardLabel: string;
}

const formatDisplayDate = (dateStr: string): string => {
  try {
    const date = new Date(dateStr);
    return date.toLocaleDateString("es-CL", {
      timeZone: "America/Santiago",
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  } catch {
    return "";
  }
};

/** Converts YYYY-MM (DB format) to human-readable, e.g. "jul 2026". */
const formatMonthDisplay = (month: string): string => {
  if (/^\d{4}-\d{2}$/.test(month)) {
    const [year, m] = month.split("-");
    const date = new Date(Number(year), Number(m) - 1, 1);
    const label = date.toLocaleDateString("es-CL", {
      month: "short",
      year: "numeric",
      timeZone: "America/Santiago",
    });
    return label.charAt(0).toUpperCase() + label.slice(1);
  }
  return month;
};

export default function BillingPeriodsScreen({
  creditCardId,
  creditCardLabel,
}: BillingPeriodsScreenProps) {
  const router = useRouter();
  const { data, isLoading, isFetching, refetch, isError } =
    useBillingPeriods(creditCardId);
  const periods = data?.items ?? [];
  const createMutation = useCreateBillingPeriod();
  const updateMutation = useUpdateBillingPeriod();
  const deleteMutation = useDeleteBillingPeriod();
  const [showFormModal, setShowFormModal] = useState(false);
  const [editingPeriod, setEditingPeriod] = useState<BillingPeriod | null>(
    null,
  );

  const handleRefresh = async () => {
    await refetch();
  };

  const handleCreate = (data: {
    creditCardId: string;
    month: string;
    startDate: string;
    endDate: string;
    dueDate: string;
  }) => {
    createMutation.mutate(
      { creditCardId, data },
      {
        onSuccess: () => {
          Alert.alert("Éxito", "Período de facturación creado correctamente.");
          setShowFormModal(false);
        },
        onError: (err) =>
          Alert.alert(
            "Error",
            err instanceof Error ? err.message : "Error al crear",
          ),
      },
    );
  };

  const handleUpdate = (data: {
    creditCardId: string;
    month: string;
    startDate: string;
    endDate: string;
    dueDate: string;
  }) => {
    if (!editingPeriod) return;
    updateMutation.mutate(
      { creditCardId, billingPeriodId: editingPeriod.id, data },
      {
        onSuccess: () => {
          Alert.alert(
            "Éxito",
            "Período de facturación actualizado correctamente.",
          );
          setEditingPeriod(null);
          setShowFormModal(false);
        },
        onError: (err) =>
          Alert.alert(
            "Error",
            err instanceof Error ? err.message : "Error al actualizar",
          ),
      },
    );
  };

  const handleDelete = (period: BillingPeriod) => {
    Alert.alert(
      "Eliminar período",
      `¿Estás seguro de eliminar "${formatMonthDisplay(period.month)}"?`,
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Eliminar",
          style: "destructive",
          onPress: () => {
            deleteMutation.mutate(
              { creditCardId, billingPeriodId: period.id },
              {
                onSuccess: () => {
                  Alert.alert(
                    "Eliminado",
                    "Período de facturación eliminado correctamente.",
                  );
                },
                onError: (err) => {
                  Alert.alert(
                    "Error",
                    err instanceof Error
                      ? err.message
                      : "Error al eliminar período",
                  );
                },
              },
            );
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
        creditCardId: editingPeriod.creditCardId,
        month: editingPeriod.month,
        startDate: editingPeriod.startDate,
        endDate: editingPeriod.endDate,
        dueDate: editingPeriod.dueDate,
      };
    }
    if (periods.length > 0) {
      const latest = periods[0];
      const latestEndUtc = new Date(latest.endDate);
      const chileParts = latestEndUtc
        .toLocaleDateString("es-CL", { timeZone: "America/Santiago" })
        .split("-")
        .map(Number);
      const latestEnd = new Date(
        chileParts[2],
        chileParts[1] - 1,
        chileParts[0],
        12,
        0,
        0,
      );
      const nextStart = new Date(latestEnd);
      nextStart.setDate(nextStart.getDate() + 1);
      const nextEnd = new Date(nextStart);
      nextEnd.setMonth(nextEnd.getMonth() + 1);
      nextEnd.setDate(nextEnd.getDate() - 1);

      return {
        creditCardId,
        month: `${nextEnd.getFullYear()}-${(nextEnd.getMonth() + 1).toString().padStart(2, "0")}`,
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
          pathname: "/(screens)/billingPeriodDetail",
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
        <Text style={styles.periodMonth}>{formatMonthDisplay(item.month)}</Text>
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
          <Ionicons name="pencil" size={20} color={colors.secondary} />
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.iconButton}
          onPress={(e) => {
            e.stopPropagation();
            handleDelete(item);
          }}
        >
          <Ionicons name="trash-outline" size={20} color={colors.destructive} />
        </TouchableOpacity>
        <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
      </View>
    </TouchableOpacity>
  );

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.secondary} />
        <Text style={styles.loadingText}>Cargando períodos...</Text>
      </View>
    );
  }

  if (isError) {
    return (
      <ErrorState
        message="No se pudieron cargar los períodos."
        onRetry={() => refetch()}
      />
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.cardLabel}>💳 {creditCardLabel}</Text>

      {periods.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="calendar-outline" size={64} color={colors.border} />
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
            <RefreshControl refreshing={isFetching} onRefresh={refetch} />
          }
        />
      )}

      <TouchableOpacity style={styles.fab} onPress={openCreateModal}>
        <Ionicons name="add" size={28} color="#FFFFFF" />
      </TouchableOpacity>

      <BillingPeriodFormModal
        visible={showFormModal}
        onClose={() => {
          setShowFormModal(false);
          setEditingPeriod(null);
        }}
        onSubmit={(data) =>
          Promise.resolve(
            editingPeriod ? handleUpdate(data) : handleCreate(data),
          )
        }
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
    backgroundColor: colors.bg,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: colors.bg,
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: colors.textMuted,
  },
  cardLabel: {
    fontSize: 16,
    fontWeight: "600",
    color: colors.textSecondary,
    paddingHorizontal: spacing.md2,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
  },
  listContent: {
    padding: spacing.md,
    paddingBottom: 80,
  },
  periodCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.card,
    padding: spacing.md,
    marginBottom: spacing.sm2,
    borderWidth: 1,
    borderColor: colors.border,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    ...shadows.pressed,
  },
  periodInfo: {
    flex: 1,
  },
  periodMonth: {
    fontSize: 17,
    fontWeight: "700",
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  periodDates: {
    fontSize: 14,
    color: colors.textMuted,
  },
  periodDueDate: {
    fontSize: 13,
    color: colors.warning,
    fontWeight: "500",
    marginTop: spacing.xxs,
  },
  periodActions: {
    flexDirection: "row",
    gap: spacing.sm2,
  },
  iconButton: {
    padding: spacing.sm,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: spacing.xxl,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: colors.textSecondary,
    marginTop: spacing.md,
    marginBottom: spacing.sm,
  },
  emptyText: {
    fontSize: 14,
    color: colors.textMuted,
    textAlign: "center",
    lineHeight: 20,
  },
  fab: {
    position: "absolute",
    right: spacing.md2,
    bottom: spacing.lg,
    width: 56,
    height: 56,
    borderRadius: borderRadius.full,
    backgroundColor: colors.secondary,
    justifyContent: "center",
    alignItems: "center",
    ...shadows.floating,
  },
});
