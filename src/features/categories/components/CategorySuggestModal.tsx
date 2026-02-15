import React, { useState, useEffect } from "react";
import { Modal, View, Text, TouchableOpacity, TextInput, ActivityIndicator, StyleSheet, Alert, KeyboardAvoidingView, Platform } from "react-native";
import { matchCategoryByMerchant, createCategoryWithMerchant, Category } from "@/features/categories/services/categoryApi";

interface Props {
  visible: boolean;
  merchant: string;
  onClose: () => void;
  onCategorySelected: (category: Category) => void;
}

export default function CategorySuggestModal({ visible, merchant, onClose, onCategorySelected }: Props) {
  const [loading, setLoading] = useState(true);
  const [suggestion, setSuggestion] = useState<{ categoryId: string; categoryName: string } | null>(null);
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState(merchant);
  // Emoji y color para la nueva categoría
  const getDefaultEmoji = (text: string) => {
    // Sugerir emoji por palabras clave simples
    if (!text) return "🏷️";
    const lower = text.toLowerCase();
    if (lower.includes("super")) return "🛒";
    if (lower.includes("farmacia")) return "💊";
    if (lower.includes("rest")) return "🍽️";
    if (lower.includes("viaje") || lower.includes("travel")) return "✈️";
    if (lower.includes("auto") || lower.includes("bencina")) return "🚗";
    if (lower.includes("ropa")) return "👕";
    if (lower.includes("hogar")) return "🏠";
    if (lower.includes("tecnolog")) return "💻";
    if (lower.includes("deporte")) return "🏃";
    if (lower.includes("luz") || lower.includes("agua") || lower.includes("gas")) return "💡";
    // Por defecto, usar la primera letra como emoji
    return text.trim() ? text.trim()[0].toUpperCase() : "🏷️";
  };
  const getDefaultColor = (text: string) => {
    // Generar color pastel simple basado en el texto
    let hash = 0;
    for (let i = 0; i < text.length; i++) hash = text.charCodeAt(i) + ((hash << 5) - hash);
    const h = Math.abs(hash) % 360;
    return `hsl(${h}, 70%, 80%)`;
  };
  const [emoji, setEmoji] = useState(getDefaultEmoji(merchant));
  const [color, setColor] = useState(getDefaultColor(merchant));

  useEffect(() => {
    if (!visible) return;
    setLoading(true);
    setSuggestion(null);
    setNewName(merchant);
    setEmoji(getDefaultEmoji(merchant));
    setColor(getDefaultColor(merchant));
    matchCategoryByMerchant(merchant)
      .then((s) => setSuggestion(s))
      .finally(() => setLoading(false));
  }, [visible, merchant]);

  useEffect(() => {
    if (!visible) return;
    setLoading(true);
    setSuggestion(null);
    setNewName(merchant);
    matchCategoryByMerchant(merchant)
      .then((s) => setSuggestion(s))
      .finally(() => setLoading(false));
  }, [visible, merchant]);

  const handleUseSuggestion = async () => {
    if (!suggestion) return;
    setLoading(true);
    try {
      // Llamar al endpoint que asocia el comercio a la categoría y propaga la categoría
      console.log('[CategorySuggestModal] using suggestion, calling createCategoryWithMerchant', {
        name: suggestion.categoryName,
        merchantName: merchant,
        pattern: merchant,
        isGlobal: true,
      });
      const created = await createCategoryWithMerchant({
        name: suggestion.categoryName,
        merchantName: merchant,
        pattern: merchant,
        isGlobal: true,
      });

      // created puede ser la categoría existente reutilizada o la recién creada
      onCategorySelected({ id: created.id ?? suggestion.categoryId, name: created.name ?? suggestion.categoryName, icon: created.icon, color: created.color });
      onClose();
    } catch (e) {
      Alert.alert("Error", "No se pudo asignar la categoría sugerida");
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async () => {
    if (!newName.trim()) {
      Alert.alert("Nombre requerido", "Ingresa un nombre para la categoría");
      return;
    }
    if (!emoji.trim()) {
      Alert.alert("Emoji requerido", "Elige un emoji para la categoría");
      return;
    }
    if (!color.trim()) {
      Alert.alert("Color requerido", "Elige un color para la categoría");
      return;
    }
    setCreating(true);
    try {
      console.log("[CategorySuggestModal] Creating category with", {
        name: newName.trim(),
        icon: emoji.trim(),
        color: color.trim(),
        merchantName: merchant,
        pattern: merchant,
        isGlobal: true,
      });
      const created = await createCategoryWithMerchant({
        name: newName.trim(),
        icon: emoji.trim(),
        color: color.trim(),
        merchantName: merchant,
        pattern: merchant,
        isGlobal: true,
      });
      onCategorySelected(created);
      onClose();
    } catch (e) {
      Alert.alert("Error", "No se pudo crear la categoría");
    } finally {
      setCreating(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={styles.overlay}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={Platform.OS === "ios" ? 40 : 0}
      >
        <View style={styles.content}>
          <Text style={styles.title}>Categoría para {merchant}</Text>
          {loading ? (
            <ActivityIndicator style={{ marginVertical: 24 }} />
          ) : suggestion ? (
            <>
              <Text style={styles.suggestLabel}>Sugerencia</Text>
              <Text style={styles.suggestName}>{suggestion.categoryName}</Text>
              <TouchableOpacity style={styles.suggestBtn} onPress={handleUseSuggestion}>
                <Text style={styles.suggestBtnText}>Usar esta categoría</Text>
              </TouchableOpacity>
            </>
          ) : (
            <>
              <Text style={styles.noSuggest}>No hay sugerencias para este comercio.</Text>
              <TextInput
                style={styles.input}
                placeholder="Nombre de la nueva categoría"
                value={newName}
                onChangeText={t => {
                  setNewName(t);
                  setEmoji(getDefaultEmoji(t));
                  setColor(getDefaultColor(t));
                }}
              />
              <View style={styles.rowInputs}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.inputLabel}>Emoji</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="Ej: 🏷️"
                    value={emoji}
                    onChangeText={setEmoji}
                    maxLength={2}
                  />
                </View>
                <View style={{ flex: 1, marginLeft: 8 }}>
                  <Text style={styles.inputLabel}>Color</Text>
                  <TextInput
                    style={[styles.input, { backgroundColor: color, color: '#212529' }]}
                    placeholder="#AABBCC o hsl()"
                    value={color}
                    onChangeText={setColor}
                  />
                  <View style={styles.colorRow}>
                    {['#F7CAC9','#92A8D1','#F9E79F','#B5EAD7','#FFDAC1','#BFD8B8','#E2F0CB','#C7CEEA'].map((c) => (
                      <TouchableOpacity
                        key={c}
                        style={[styles.colorSwatch, { backgroundColor: c, borderColor: color === c ? '#007BFF' : '#fff' }]}
                        onPress={() => setColor(c)}
                      />
                    ))}
                  </View>
                </View>
              </View>
              <TouchableOpacity style={styles.createBtn} onPress={handleCreate} disabled={creating}>
                {creating ? <ActivityIndicator color="#fff" /> : <Text style={styles.createBtnText}>Crear categoría</Text>}
              </TouchableOpacity>
            </>
          )}
          <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
            <Text style={styles.closeBtnText}>Cancelar</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
    rowInputs: { flexDirection: 'row', gap: 8, marginBottom: 8 },
    inputLabel: { fontSize: 13, color: '#868E96', marginBottom: 2, marginLeft: 2 },
    colorRow: { flexDirection: 'row', gap: 4, marginTop: 4 },
    colorSwatch: { width: 24, height: 24, borderRadius: 12, borderWidth: 2, marginRight: 2 },
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  content: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 24,
    minHeight: 260,
  },
  title: { fontSize: 18, fontWeight: "700", marginBottom: 16 },
  suggestLabel: { fontWeight: "700", color: "#007BFF", marginBottom: 4 },
  suggestName: { fontSize: 16, marginBottom: 12 },
  suggestBtn: { backgroundColor: "#007BFF", padding: 12, borderRadius: 8, marginBottom: 16 },
  suggestBtnText: { color: "#fff", textAlign: "center", fontWeight: "700" },
  noSuggest: { color: "#888", marginBottom: 12 },
  input: { backgroundColor: "#f6f6f6", padding: 10, borderRadius: 8, marginBottom: 12 },
  createBtn: { backgroundColor: "#28A745", padding: 12, borderRadius: 8, marginBottom: 16 },
  createBtnText: { color: "#fff", textAlign: "center", fontWeight: "700" },
  closeBtn: { alignSelf: "center", marginTop: 8 },
  closeBtnText: { color: "#007BFF", fontWeight: "600" },
});
