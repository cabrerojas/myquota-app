import React, { useState, useEffect, useCallback } from "react";
import {
  Modal, View, Text, Pressable, TextInput, ActivityIndicator,
  StyleSheet, Alert, KeyboardAvoidingView, Platform, ScrollView,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import {
  getAllCategories, getMerchantCategoryHistory,
  createCategoryWithMerchant, Category, MerchantCategoryHistoryItem,
} from "@/features/categories/services/categoryApi";
import { colors } from "@/shared/theme/colors";

interface Props {
  visible: boolean; merchant: string; onClose: () => void;
  onCategorySelected: (category: Category) => void;
}

type ModalStep = "pick" | "create";

const PRESET_COLORS = [
  "#3B82F6","#E53935","#F9A825","#43A047","#FB8C00",
  "#8E24AA","#00ACC1","#6D4C41","#E91E63","#3949AB",
];

export default function CategorySuggestModal({ visible, merchant, onClose, onCategorySelected }: Props) {
  const [loading, setLoading] = useState(true);
  const [categories, setCategories] = useState<Category[]>([]);
  const [history, setHistory] = useState<MerchantCategoryHistoryItem[]>([]);
  const [step, setStep] = useState<ModalStep>("pick");
  const [searchText, setSearchText] = useState("");
  const [newName, setNewName] = useState("");
  const [emoji, setEmoji] = useState("");
  const [color, setColor] = useState(PRESET_COLORS[0]);
  const [creating, setCreating] = useState(false);
  const [selecting, setSelecting] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [cats, hist] = await Promise.all([getAllCategories(), getMerchantCategoryHistory(merchant)]);
      setCategories(cats); setHistory(hist);
    } catch { /* ignore */ }
    finally { setLoading(false); }
  }, [merchant]);

  useEffect(() => {
    if (!visible) return;
    setStep("pick"); setSearchText(""); setNewName(""); setEmoji(""); setColor(PRESET_COLORS[0]);
    setSelecting(false);
    loadData();
  }, [visible, loadData]);

  const handlePickCategory = (cat: Category) => {
    setSelecting(true);
    onCategorySelected(cat);
  };

  const handlePickFromHistory = (item: MerchantCategoryHistoryItem) => {
    setSelecting(true);
    onCategorySelected({ id: item.categoryId, name: item.categoryName, icon: item.categoryIcon, color: item.categoryColor });
  };

  const handleCreate = async () => {
    if (!newName.trim()) { Alert.alert("Nombre requerido", "Ingresá un nombre para la categoría"); return; }
    setCreating(true);
    try {
      const created = await createCategoryWithMerchant({
        name: newName.trim(), icon: emoji || "🏷️", color, isGlobal: true,
      });
      onCategorySelected(created);
    } catch { Alert.alert("Error", "No se pudo crear la categoría"); }
    finally { setCreating(false); }
  };

  const filtered = categories
    .filter((c, i, arr) => arr.findIndex((x) => x.id === c.id) === i)
    .filter((c) => !searchText.trim() || c.name.toLowerCase().includes(searchText.toLowerCase()))
    .sort((a, b) => a.name.localeCompare(b.name, "es"));

  const historyIds = new Set(history.map((h) => h.categoryId));

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={s.overlay}>
        <Pressable style={s.backdrop} onPress={onClose} />
        <View style={s.modal}>
          {/* Header */}
          <View style={s.header}>
            <Text style={s.title} numberOfLines={1}>Categorizar "{merchant}"</Text>
            <Pressable onPress={onClose} hitSlop={10} accessibilityLabel="Cerrar">
              <Ionicons name="close" size={22} color={colors.textMuted} />
            </Pressable>
          </View>

          {loading ? (
            <ActivityIndicator style={{ marginVertical: 40 }} size="large" color={colors.accent} />
          ) : step === "pick" ? (
            <>
              {/* History */}
              {history.length > 0 && (
                <View style={s.section}>
                  <Text style={s.sectionTitle}>Usadas antes</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.historyRow}>
                    {history.map((item) => (
                      <Pressable key={item.categoryId}
                        onPress={() => handlePickFromHistory(item)}
                        style={[s.historyChip, { backgroundColor: (item.categoryColor || colors.surface) + "1A" }]}
                        accessibilityLabel={item.categoryName}>
                        <Text style={s.historyEmoji}>{item.categoryIcon || "🏷️"}</Text>
                        <Text style={s.historyName} numberOfLines={1}>{item.categoryName}</Text>
                      </Pressable>
                    ))}
                  </ScrollView>
                </View>
              )}

              {/* Search */}
              <View style={s.searchBox}>
                <Ionicons name="search" size={16} color={colors.textMuted} />
                <TextInput style={s.searchInput} placeholder="Buscar categoría..." placeholderTextColor={colors.textSubtle}
                  value={searchText} onChangeText={setSearchText} />
                {searchText.length > 0 && (
                  <Pressable onPress={() => setSearchText("")}>
                    <Ionicons name="close-circle" size={16} color={colors.textMuted} />
                  </Pressable>
                )}
              </View>

              {/* List */}
              <ScrollView style={s.list} showsVerticalScrollIndicator={false}>
                {filtered.map((cat, i) => (
                  <Pressable key={cat.id || `cat-${i}`}
                    onPress={() => handlePickCategory(cat)}
                    style={({ pressed }) => [s.row, pressed && { opacity: 0.7 }]}
                    accessibilityLabel={cat.name}>
                    <View style={[s.rowIcon, { backgroundColor: (cat.color || colors.surface) + "20" }]}>
                      <Text style={s.rowEmoji}>{cat.icon || "🏷️"}</Text>
                    </View>
                    <Text style={s.rowName}>{cat.name}</Text>
                    {historyIds.has(cat.id) && (
                      <Ionicons name="time-outline" size={14} color={colors.textSubtle} />
                    )}
                  </Pressable>
                ))}
                {filtered.length === 0 && (
                  <Text style={s.emptyText}>No se encontraron categorías</Text>
                )}
              </ScrollView>

              {/* Create button */}
              <Pressable onPress={() => { setNewName(searchText || ""); setStep("create"); }}
                style={({ pressed }) => [s.createBtn, pressed && { opacity: 0.8 }]}>
                <Ionicons name="add-circle-outline" size={18} color={colors.accent} />
                <Text style={s.createBtnText}>Crear nueva categoría</Text>
              </Pressable>
            </>
          ) : (
            /* Create step */
            <ScrollView style={s.form} showsVerticalScrollIndicator={false} bounces={false}>
              <Text style={s.inputLabel}>Nombre</Text>
              <TextInput style={s.input} placeholder="Ej: Supermercado" placeholderTextColor={colors.textSubtle}
                value={newName} onChangeText={setNewName} autoFocus />

              <Text style={s.inputLabel}>Ícono</Text>
              <TextInput style={s.input} placeholder="🏷️" placeholderTextColor={colors.textSubtle}
                value={emoji} onChangeText={setEmoji} maxLength={2} />

              <Text style={s.inputLabel}>Color</Text>
              <View style={s.colorRow}>
                {PRESET_COLORS.map((c) => (
                  <Pressable key={c} onPress={() => setColor(c)}
                    style={[s.colorSwatch, { backgroundColor: c }, color === c && s.colorSwatchActive]}>
                    {color === c && <Ionicons name="checkmark" size={14} color="#fff" />}
                  </Pressable>
                ))}
              </View>

              <View style={s.createActions}>
                <Pressable onPress={() => setStep("pick")}
                  style={({ pressed }) => [s.btn, s.btnCancel, pressed && { opacity: 0.7 }]}>
                  <Text style={s.btnCancelText}>Volver</Text>
                </Pressable>
                <Pressable onPress={handleCreate} disabled={creating}
                  style={({ pressed }) => [s.btn, s.btnCreate, creating && { opacity: 0.6 }, pressed && { opacity: 0.85 }]}>
                  {creating ? <ActivityIndicator color={colors.textPrimary} size="small" /> :
                    <Text style={s.btnCreateText}>Crear</Text>}
                </Pressable>
              </View>
            </ScrollView>
          )}
        </View>

        {/* Loading overlay during category assignment */}
        {selecting && (
          <View style={s.selectingOverlay}>
            <ActivityIndicator size="large" color={colors.accent} />
            <Text style={s.selectingText}>Asignando categoría...</Text>
          </View>
        )}
      </KeyboardAvoidingView>
    </Modal>
  );
}

const s = StyleSheet.create({
  overlay: { flex: 1, justifyContent: "flex-end" },
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(0,0,0,0.6)" },
  modal: { backgroundColor: colors.surface, borderTopLeftRadius: 20, borderTopRightRadius: 20,
    paddingBottom: 30, maxHeight: "85%", borderTopWidth: 1, borderColor: colors.border },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center",
    paddingHorizontal: 20, paddingTop: 20, paddingBottom: 14, borderBottomWidth: 1, borderBottomColor: colors.borderLight },
  title: { fontSize: 17, fontWeight: "700", color: colors.textPrimary, flex: 1, marginRight: 12 },
  section: { paddingHorizontal: 20, paddingTop: 14 },
  sectionTitle: { fontSize: 11, fontWeight: "700", color: colors.textMuted,
    textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 8 },
  historyRow: { gap: 8, paddingBottom: 4 },
  historyChip: { flexDirection: "row", alignItems: "center", paddingHorizontal: 14,
    paddingVertical: 9, borderRadius: 20, gap: 5 },
  historyEmoji: { fontSize: 14 },
  historyName: { fontSize: 13, fontWeight: "600", color: colors.textPrimary, maxWidth: 100 },
  searchBox: { flexDirection: "row", alignItems: "center", marginHorizontal: 20, marginTop: 14,
    backgroundColor: "rgba(255,255,255,0.04)", borderRadius: 10, paddingHorizontal: 12,
    paddingVertical: 10, gap: 8, borderWidth: 1, borderColor: colors.border },
  searchInput: { flex: 1, fontSize: 14, color: colors.textPrimary },
  list: { maxHeight: 260, marginTop: 6 },
  row: { flexDirection: "row", alignItems: "center", paddingHorizontal: 20, paddingVertical: 11, gap: 12 },
  rowIcon: { width: 34, height: 34, borderRadius: 10, justifyContent: "center", alignItems: "center" },
  rowEmoji: { fontSize: 16 },
  rowName: { fontSize: 15, color: colors.textPrimary, fontWeight: "500", flex: 1 },
  emptyText: { textAlign: "center", color: colors.textMuted, paddingVertical: 20, fontSize: 14 },
  createBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center",
    paddingVertical: 14, marginHorizontal: 20, marginTop: 8, borderTopWidth: 1,
    borderTopColor: colors.borderLight, gap: 6 },
  createBtnText: { fontSize: 14, fontWeight: "600", color: colors.accent },
  form: { paddingHorizontal: 20, paddingTop: 16 },
  inputLabel: { fontSize: 11, fontWeight: "600", color: colors.textMuted,
    textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 6, marginTop: 12 },
  input: { backgroundColor: "rgba(255,255,255,0.04)", borderWidth: 1, borderColor: colors.border,
    padding: 12, borderRadius: 10, fontSize: 15, color: colors.textPrimary, marginBottom: 4 },
  colorRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 4 },
  colorSwatch: { width: 34, height: 34, borderRadius: 10, justifyContent: "center",
    alignItems: "center", borderWidth: 2, borderColor: "transparent" },
  colorSwatchActive: { borderColor: colors.textPrimary },
  createActions: { flexDirection: "row", gap: 12, marginTop: 24 },
  btn: { flex: 1, paddingVertical: 13, borderRadius: 12, alignItems: "center" },
  btnCancel: { backgroundColor: "rgba(255,255,255,0.04)", borderWidth: 1, borderColor: colors.border },
  btnCancelText: { fontWeight: "600", color: colors.textSecondary, fontSize: 15 },
  btnCreate: { backgroundColor: colors.accent },
  btnCreateText: { fontWeight: "700", color: colors.textPrimary, fontSize: 15 },
  selectingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(15,23,42,0.85)",
    justifyContent: "center",
    alignItems: "center",
    gap: 14,
    zIndex: 10,
  },
  selectingText: {
    fontSize: 15,
    color: colors.textSecondary,
    fontWeight: "500",
  },
});
