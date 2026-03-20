import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  Alert,
  Modal,
} from "react-native";
import { WhatIfProduct, WhatIfResponse } from "../types/whatIf";
import ProductEditor from "../components/ProductEditor";
import { postWhatIf } from "../services/whatIfApi";
import { formatCurrency } from "@/shared/utils/format";

export default function WhatIfScreen() {
  const [products, setProducts] = useState<WhatIfProduct[]>([]);
  const [editing, setEditing] = useState<WhatIfProduct | null>(null);
  const [editorVisible, setEditorVisible] = useState(false);
  const [result, setResult] = useState<WhatIfResponse | null>(null);
  const [loading, setLoading] = useState(false);

  const handleAdd = () => {
    setEditing(null);
    setEditorVisible(true);
  };

  const handleSave = (p: WhatIfProduct) => {
    // assign temporary id
    const withId = { ...p, id: String(Date.now()) };
    if (editing) {
      setProducts((prev) =>
        prev.map((x) => (x.id === editing.id ? withId : x)),
      );
    } else {
      setProducts((prev) => [...prev, withId]);
    }
    setEditorVisible(false);
  };

  const handleDelete = (id?: string) => {
    if (!id) return;
    Alert.alert("Confirmar", "Eliminar producto?", [
      { text: "Cancelar", style: "cancel" },
      {
        text: "Eliminar",
        style: "destructive",
        onPress: () => setProducts((p) => p.filter((x) => x.id !== id)),
      },
    ]);
  };

  const handleEdit = (item: WhatIfProduct) => {
    setEditing(item);
    setEditorVisible(true);
  };

  const handleCalculate = async () => {
    if (products.length === 0) {
      Alert.alert("Info", "Agrega al menos un producto para calcular");
      return;
    }
    setLoading(true);
    try {
      const res = await postWhatIf({ products });
      setResult(res);
    } catch (e) {
      Alert.alert("Error", e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.wrapper}>
      <View style={styles.header}>
        <Text style={styles.title}>Simular Compra</Text>
        <Text style={styles.banner}>Simulación temporal — no se guarda</Text>
      </View>

      <View style={styles.container}>
        <FlatList
          data={products}
          keyExtractor={(item) => item.id ?? JSON.stringify(item)}
          ListEmptyComponent={() => (
            <View style={styles.empty}>
              <Text>No hay productos agregados</Text>
            </View>
          )}
          renderItem={({ item }) => (
            <View style={styles.productRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.merchant}>{item.merchant}</Text>
                <Text style={styles.meta}>
                  {formatCurrency(item.amount, item.currency)} •{" "}
                  {item.totalInstallments} cuotas
                </Text>
              </View>
              <View style={styles.actions}>
                <TouchableOpacity
                  onPress={() => handleEdit(item)}
                  style={styles.actionBtn}
                >
                  <Text style={styles.actionText}>Editar</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => handleDelete(item.id)}
                  style={styles.actionBtn}
                >
                  <Text style={[styles.actionText, { color: "#DC3545" }]}>
                    Eliminar
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        />

        <View style={styles.footer}>
          <TouchableOpacity style={styles.addBtn} onPress={handleAdd}>
            <Text style={styles.addText}>Agregar producto</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.calcBtn}
            onPress={handleCalculate}
            disabled={loading}
          >
            <Text style={styles.calcText}>
              {loading ? "Calculando..." : "Calcular"}
            </Text>
          </TouchableOpacity>
        </View>

        {result && (
          <View style={styles.resultBox}>
            <Text style={styles.sectionTitle}>
              Proyección ({result.meta.months} meses)
            </Text>
            {result.projection.slice(0, 12).map((m, i) => (
              <View key={i} style={styles.resultRow}>
                <Text>
                  {m.year}-{String(m.month).padStart(2, "0")}
                </Text>
                <Text>
                  {formatCurrency(m.amountCLP, "CLP")}{" "}
                  {m.amountUSD > 0
                    ? `+ ${formatCurrency(m.amountUSD, "USD")}`
                    : ""}
                </Text>
              </View>
            ))}
          </View>
        )}
      </View>

      <Modal visible={editorVisible} animationType="slide">
        <View style={{ flex: 1, padding: 16 }}>
          <ProductEditor
            initial={editing ?? undefined}
            onSave={handleSave}
            onCancel={() => setEditorVisible(false)}
          />
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { flex: 1, backgroundColor: "#F8F9FA" },
  header: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#E9ECEF",
    backgroundColor: "#fff",
  },
  title: { fontSize: 18, fontWeight: "700" },
  banner: { marginTop: 6, fontSize: 12, color: "#6C757D" },
  container: { flex: 1, padding: 12 },
  empty: { alignItems: "center", padding: 24 },
  productRow: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    backgroundColor: "#fff",
    borderRadius: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: "#E9ECEF",
  },
  merchant: { fontSize: 15, fontWeight: "700" },
  meta: { fontSize: 12, color: "#6C757D", marginTop: 4 },
  actions: { flexDirection: "row", gap: 8 },
  actionBtn: { paddingHorizontal: 8, paddingVertical: 6 },
  actionText: { fontSize: 13, color: "#007BFF", fontWeight: "600" },
  footer: {
    flexDirection: "row",
    justifyContent: "space-between",
    padding: 12,
  },
  addBtn: {
    backgroundColor: "#fff",
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#E9ECEF",
  },
  addText: { color: "#007BFF", fontWeight: "700" },
  calcBtn: { backgroundColor: "#007BFF", padding: 12, borderRadius: 8 },
  calcText: { color: "#fff", fontWeight: "700" },
  resultBox: {
    marginTop: 12,
    backgroundColor: "#fff",
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: "#E9ECEF",
  },
  sectionTitle: { fontWeight: "700", marginBottom: 8 },
  resultRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 6,
  },
});
