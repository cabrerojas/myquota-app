import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { useState, useEffect } from "react";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { getCreditCards } from "@/features/creditCards/services/creditCardsApi";
import { createManualTransaction } from "@/features/transactions/services/transactionsApi";

interface CreditCard {
  id: string;
  cardType: string;
  cardLastDigits: string;
}

const MONTHS = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
];

export default function AddDebtScreen() {
  const router = useRouter();
  const [cards, setCards] = useState<CreditCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Form state
  const [selectedCardId, setSelectedCardId] = useState<string>("");
  const [merchant, setMerchant] = useState("");
  const [purchaseDate, setPurchaseDate] = useState("");
  const [quotaAmount, setQuotaAmount] = useState("");
  const [totalInstallments, setTotalInstallments] = useState("");
  const [paidInstallments, setPaidInstallments] = useState("");
  const [lastPaidMonth, setLastPaidMonth] = useState<number>(new Date().getMonth()); // 0-11
  const [lastPaidYear, setLastPaidYear] = useState<number>(new Date().getFullYear());
  const [currency, setCurrency] = useState<"CLP" | "Dolar">("CLP");

  useEffect(() => {
    loadCards();
  }, []);

  const loadCards = async () => {
    try {
      const data = await getCreditCards();
      setCards(data);
      if (data.length > 0) setSelectedCardId(data[0].id);
    } catch (error) {
      Alert.alert("Error", "No se pudieron cargar las tarjetas");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    // Validaciones
    if (!selectedCardId) { Alert.alert("Error", "Selecciona una tarjeta"); return; }
    if (!merchant.trim()) { Alert.alert("Error", "Ingresa el nombre del comercio"); return; }
    if (!quotaAmount || isNaN(Number(quotaAmount)) || Number(quotaAmount) <= 0) {
      Alert.alert("Error", "Ingresa un monto de cuota válido"); return;
    }
    if (!totalInstallments || isNaN(Number(totalInstallments)) || Number(totalInstallments) <= 0) {
      Alert.alert("Error", "Ingresa el total de cuotas"); return;
    }
    if (paidInstallments === "" || isNaN(Number(paidInstallments)) || Number(paidInstallments) < 0) {
      Alert.alert("Error", "Ingresa las cuotas ya pagadas"); return;
    }
    if (Number(paidInstallments) >= Number(totalInstallments)) {
      Alert.alert("Error", "Las cuotas pagadas deben ser menor al total"); return;
    }

    const lastPaidMonthStr = `${lastPaidYear}-${String(lastPaidMonth + 1).padStart(2, "0")}`;

    // Calcular fecha de compra estimada si no se especificó
    const finalPurchaseDate = purchaseDate.trim()
      ? purchaseDate.trim()
      : `${lastPaidYear}-${String(lastPaidMonth + 1).padStart(2, "0")}-01`;

    setSubmitting(true);
    try {
      const result = await createManualTransaction(selectedCardId, {
        merchant: merchant.trim(),
        purchaseDate: finalPurchaseDate,
        quotaAmount: Number(quotaAmount),
        totalInstallments: Number(totalInstallments),
        paidInstallments: Number(paidInstallments),
        lastPaidMonth: lastPaidMonthStr,
        currency,
      });

      Alert.alert(
        "Deuda agregada",
        `${result.quotasCreated} cuotas creadas para "${merchant.trim()}"`,
        [{ text: "OK", onPress: () => router.back() }],
      );
    } catch (error) {
      Alert.alert(
        "Error",
        error instanceof Error ? error.message : "No se pudo crear la deuda",
      );
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#007BFF" />
      </View>
    );
  }

  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 5 }, (_, i) => currentYear - 2 + i);

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        {/* Card Selector */}
        <Text style={styles.sectionLabel}>Tarjeta de Crédito</Text>
        <View style={styles.cardSelector}>
          {cards.map((card) => (
            <TouchableOpacity
              key={card.id}
              style={[
                styles.cardChip,
                selectedCardId === card.id && styles.cardChipSelected,
              ]}
              onPress={() => setSelectedCardId(card.id)}
            >
              <Ionicons
                name="card"
                size={16}
                color={selectedCardId === card.id ? "#fff" : "#495057"}
              />
              <Text
                style={[
                  styles.cardChipText,
                  selectedCardId === card.id && styles.cardChipTextSelected,
                ]}
              >
                •{card.cardLastDigits}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Merchant */}
        <Text style={styles.label}>Comercio</Text>
        <TextInput
          style={styles.input}
          placeholder="Ej: TRAVEL TIENDA TCOMP"
          value={merchant}
          onChangeText={setMerchant}
          placeholderTextColor="#ADB5BD"
        />

        {/* Quota Amount */}
        <Text style={styles.label}>Monto de cada cuota</Text>
        <View style={styles.row}>
          <TextInput
            style={[styles.input, { flex: 1 }]}
            placeholder="Ej: 30249"
            value={quotaAmount}
            onChangeText={setQuotaAmount}
            keyboardType="numeric"
            placeholderTextColor="#ADB5BD"
          />
          <View style={styles.currencyToggle}>
            <TouchableOpacity
              style={[styles.currencyBtn, currency === "CLP" && styles.currencyBtnActive]}
              onPress={() => setCurrency("CLP")}
            >
              <Text style={[styles.currencyText, currency === "CLP" && styles.currencyTextActive]}>CLP</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.currencyBtn, currency === "Dolar" && styles.currencyBtnActive]}
              onPress={() => setCurrency("Dolar")}
            >
              <Text style={[styles.currencyText, currency === "Dolar" && styles.currencyTextActive]}>USD</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Installments */}
        <View style={styles.row}>
          <View style={{ flex: 1, marginRight: 8 }}>
            <Text style={styles.label}>Total cuotas</Text>
            <TextInput
              style={styles.input}
              placeholder="Ej: 24"
              value={totalInstallments}
              onChangeText={setTotalInstallments}
              keyboardType="numeric"
              placeholderTextColor="#ADB5BD"
            />
          </View>
          <View style={{ flex: 1, marginLeft: 8 }}>
            <Text style={styles.label}>Cuotas pagadas</Text>
            <TextInput
              style={styles.input}
              placeholder="Ej: 9"
              value={paidInstallments}
              onChangeText={setPaidInstallments}
              keyboardType="numeric"
              placeholderTextColor="#ADB5BD"
            />
          </View>
        </View>

        {/* Remaining info */}
        {totalInstallments && paidInstallments !== "" && Number(totalInstallments) > Number(paidInstallments) && (
          <View style={styles.infoBox}>
            <Ionicons name="information-circle" size={16} color="#007BFF" />
            <Text style={styles.infoText}>
              Te quedan {Number(totalInstallments) - Number(paidInstallments)} cuotas pendientes
              {quotaAmount ? ` = $${((Number(totalInstallments) - Number(paidInstallments)) * Number(quotaAmount)).toLocaleString("es-CL")} total` : ""}
            </Text>
          </View>
        )}

        {/* Last Paid Month */}
        <Text style={styles.label}>Mes del último pago realizado</Text>
        <View style={styles.monthPicker}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.monthScroll}>
            {MONTHS.map((m, idx) => (
              <TouchableOpacity
                key={idx}
                style={[styles.monthChip, lastPaidMonth === idx && styles.monthChipSelected]}
                onPress={() => setLastPaidMonth(idx)}
              >
                <Text
                  style={[styles.monthChipText, lastPaidMonth === idx && styles.monthChipTextSelected]}
                >
                  {m.substring(0, 3)}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
          <View style={styles.yearRow}>
            {years.map((y) => (
              <TouchableOpacity
                key={y}
                style={[styles.yearChip, lastPaidYear === y && styles.yearChipSelected]}
                onPress={() => setLastPaidYear(y)}
              >
                <Text
                  style={[styles.yearChipText, lastPaidYear === y && styles.yearChipTextSelected]}
                >
                  {y}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Purchase Date (optional) */}
        <Text style={styles.label}>Fecha de compra (opcional)</Text>
        <TextInput
          style={styles.input}
          placeholder="YYYY-MM-DD (ej: 2025-04-01)"
          value={purchaseDate}
          onChangeText={setPurchaseDate}
          placeholderTextColor="#ADB5BD"
        />

        {/* Submit */}
        <TouchableOpacity
          style={[styles.submitBtn, submitting && styles.submitBtnDisabled]}
          onPress={handleSubmit}
          disabled={submitting}
        >
          {submitting ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <Ionicons name="add-circle" size={20} color="#fff" />
              <Text style={styles.submitText}>Agregar Deuda</Text>
            </>
          )}
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F8F9FA" },
  content: { padding: 20, paddingBottom: 40 },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  sectionLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: "#495057",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 10,
  },
  label: {
    fontSize: 13,
    fontWeight: "600",
    color: "#495057",
    marginBottom: 6,
    marginTop: 16,
  },
  input: {
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#DEE2E6",
    borderRadius: 10,
    padding: 14,
    fontSize: 15,
    color: "#212529",
  },
  row: { flexDirection: "row", alignItems: "flex-end", gap: 8 },
  cardSelector: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  cardChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#DEE2E6",
  },
  cardChipSelected: {
    backgroundColor: "#007BFF",
    borderColor: "#007BFF",
  },
  cardChipText: { fontSize: 14, fontWeight: "600", color: "#495057" },
  cardChipTextSelected: { color: "#fff" },
  currencyToggle: { flexDirection: "row", gap: 4 },
  currencyBtn: {
    paddingHorizontal: 14,
    paddingVertical: 14,
    borderRadius: 10,
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#DEE2E6",
  },
  currencyBtnActive: {
    backgroundColor: "#007BFF",
    borderColor: "#007BFF",
  },
  currencyText: { fontSize: 13, fontWeight: "700", color: "#495057" },
  currencyTextActive: { color: "#fff" },
  infoBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#E7F5FF",
    padding: 12,
    borderRadius: 10,
    marginTop: 12,
  },
  infoText: { fontSize: 13, color: "#1864AB", flex: 1 },
  monthPicker: { marginTop: 4 },
  monthScroll: { marginBottom: 8 },
  monthChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#DEE2E6",
    marginRight: 6,
  },
  monthChipSelected: {
    backgroundColor: "#007BFF",
    borderColor: "#007BFF",
  },
  monthChipText: { fontSize: 13, fontWeight: "600", color: "#495057" },
  monthChipTextSelected: { color: "#fff" },
  yearRow: { flexDirection: "row", gap: 6 },
  yearChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#DEE2E6",
  },
  yearChipSelected: {
    backgroundColor: "#007BFF",
    borderColor: "#007BFF",
  },
  yearChipText: { fontSize: 13, fontWeight: "600", color: "#495057" },
  yearChipTextSelected: { color: "#fff" },
  submitBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#007BFF",
    paddingVertical: 16,
    borderRadius: 12,
    marginTop: 28,
  },
  submitBtnDisabled: { opacity: 0.6 },
  submitText: { fontSize: 16, fontWeight: "700", color: "#fff" },
});
