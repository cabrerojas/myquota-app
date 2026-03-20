import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
} from "react-native";
import DateTimePicker from "@react-native-community/datetimepicker";
import { WhatIfProduct, Currency } from "../types/whatIf";
import { getCreditCards } from "@/features/creditCards/services/creditCardsApi";
import { CreditCard } from "@/shared/types/creditCard";

interface Props {
  initial?: WhatIfProduct;
  onSave: (p: WhatIfProduct) => void;
  onCancel: () => void;
}

export default function ProductEditor({ initial, onSave, onCancel }: Props) {
  const [merchant, setMerchant] = useState(initial?.merchant ?? "");
  const [amount, setAmount] = useState(
    initial?.amount ? String(initial.amount) : "",
  );
  const [currency, setCurrency] = useState<Currency>(
    initial?.currency ?? "CLP",
  );
  const [totalInstallments, setTotalInstallments] = useState(
    initial?.totalInstallments ? String(initial.totalInstallments) : "1",
  );
  const [firstDueDate, setFirstDueDate] = useState(
    initial?.firstDueDate ? new Date(initial.firstDueDate) : new Date(),
  );
  const [showDate, setShowDate] = useState(false);
  const [creditCardId, setCreditCardId] = useState<string | undefined>(
    initial?.creditCardId ?? undefined,
  );
  const [cards, setCards] = useState<{ id: string; label: string }[]>([]);

  const loadCards = useCallback(() => {
    getCreditCards()
      .then((creditCards: CreditCard[] | null) => {
        if (!creditCards) return;
        const mapped = creditCards.map((cc: CreditCard) => ({
          id: cc.id,
          label: `${cc.cardType} •${cc.cardLastDigits}`,
        }));
        setCards(mapped);
      })
      .catch(() => {});
  }, []);

  React.useEffect(() => {
    loadCards();
  }, [loadCards]);

  const validate = (): boolean => {
    if (!merchant.trim()) {
      Alert.alert("Validación", "Ingrese un comercio");
      return false;
    }
    const a = Number(amount);
    if (isNaN(a) || a <= 0) {
      Alert.alert("Validación", "Ingrese un monto válido > 0");
      return false;
    }
    const ti = parseInt(totalInstallments, 10);
    if (isNaN(ti) || ti < 1) {
      Alert.alert("Validación", "Ingrese cantidad de cuotas válida (>=1)");
      return false;
    }
    if (!firstDueDate) {
      Alert.alert("Validación", "Seleccione fecha de vencimiento");
      return false;
    }
    return true;
  };

  const handleSave = () => {
    if (!validate()) return;
    const product: WhatIfProduct = {
      merchant: merchant.trim(),
      amount: Number(amount),
      currency,
      totalInstallments: parseInt(totalInstallments, 10),
      firstDueDate: firstDueDate.toISOString(),
      creditCardId,
    };
    onSave(product);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.label}>Comercio</Text>
      <TextInput
        style={styles.input}
        value={merchant}
        onChangeText={setMerchant}
      />

      <Text style={styles.label}>Monto</Text>
      <TextInput
        style={styles.input}
        keyboardType="numeric"
        value={amount}
        onChangeText={setAmount}
        placeholder="Ej: 50000"
      />

      <Text style={styles.label}>Moneda</Text>
      {/* basic picker fallback */}
      <View style={styles.pickerRow}>
        <TouchableOpacity
          style={[
            styles.pickerOption,
            currency === "CLP" && styles.pickerActive,
          ]}
          onPress={() => setCurrency("CLP")}
        >
          <Text>CLP</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.pickerOption,
            currency === "USD" && styles.pickerActive,
          ]}
          onPress={() => setCurrency("USD")}
        >
          <Text>USD</Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.label}>Cuotas</Text>
      <TextInput
        style={styles.input}
        keyboardType="numeric"
        value={totalInstallments}
        onChangeText={setTotalInstallments}
      />

      <Text style={styles.label}>Primer vencimiento</Text>
      <TouchableOpacity onPress={() => setShowDate(true)} style={styles.input}>
        <Text>{firstDueDate.toDateString()}</Text>
      </TouchableOpacity>
      {showDate && (
        <DateTimePicker
          value={firstDueDate}
          mode="date"
          display="default"
          onChange={(_, d) => {
            setShowDate(false);
            if (d) setFirstDueDate(d);
          }}
        />
      )}

      <Text style={styles.label}>Tarjeta (opcional)</Text>
      {/* simple picker */}
      <View style={styles.pickerRow}>
        <TouchableOpacity
          style={[styles.pickerOption, !creditCardId && styles.pickerActive]}
          onPress={() => setCreditCardId(undefined)}
        >
          <Text>Ninguna</Text>
        </TouchableOpacity>
        {cards.map((c) => (
          <TouchableOpacity
            key={c.id}
            style={[
              styles.pickerOption,
              creditCardId === c.id && styles.pickerActive,
            ]}
            onPress={() => setCreditCardId(c.id)}
          >
            <Text>{c.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <View style={styles.actions}>
        <TouchableOpacity style={styles.cancelBtn} onPress={onCancel}>
          <Text>Cancelar</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.saveBtn} onPress={handleSave}>
          <Text style={{ color: "#fff" }}>Agregar</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { padding: 12, backgroundColor: "#fff", borderRadius: 10 },
  label: { fontSize: 13, fontWeight: "600", marginTop: 8, marginBottom: 6 },
  input: {
    borderWidth: 1,
    borderColor: "#DEE2E6",
    borderRadius: 8,
    padding: 10,
    backgroundColor: "#fff",
  },
  pickerRow: { flexDirection: "row", gap: 8, marginTop: 6, marginBottom: 6 },
  pickerOption: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#E9ECEF",
    backgroundColor: "#fff",
  },
  pickerActive: { backgroundColor: "#F0F7FF", borderColor: "#007BFF" },
  actions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 8,
    marginTop: 12,
  },
  cancelBtn: { paddingVertical: 10, paddingHorizontal: 14 },
  saveBtn: {
    backgroundColor: "#007BFF",
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 8,
  },
});
