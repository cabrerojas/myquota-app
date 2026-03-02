import React, { useState, useEffect, useCallback } from "react";
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import {
  getAllCategories,
  getMerchantCategoryHistory,
  createCategoryWithMerchant,
  Category,
  MerchantCategoryHistoryItem,
} from "@/features/categories/services/categoryApi";

interface Props {
  visible: boolean;
  merchant: string;
  onClose: () => void;
  onCategorySelected: (category: Category) => void;
}

type ModalStep = "pick" | "create";

export default function CategorySuggestModal({
  visible,
  merchant,
  onClose,
  onCategorySelected,
}: Props) {
  const [loading, setLoading] = useState(true);
  const [categories, setCategories] = useState<Category[]>([]);
  const [history, setHistory] = useState<MerchantCategoryHistoryItem[]>([]);
  const [step, setStep] = useState<ModalStep>("pick");
  const [searchText, setSearchText] = useState("");

  // Create form state
  const [newName, setNewName] = useState("");
  const [emoji, setEmoji] = useState("🏷️");
  const [color, setColor] = useState("#1E88E5");
  const [creating, setCreating] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [cats, hist] = await Promise.all([
        getAllCategories(),
        getMerchantCategoryHistory(merchant),
      ]);
      setCategories(cats);
      setHistory(hist);
    } catch (e) {
      console.warn("Error loading categories for modal", e);
    } finally {
      setLoading(false);
    }
  }, [merchant]);

  useEffect(() => {
    if (!visible) return;
    setStep("pick");
    setSearchText("");
    setNewName("");
    setEmoji("🏷️");
    setColor("#1E88E5");
    loadData();
  }, [visible, loadData]);

  const handlePickCategory = (cat: Category) => {
    onCategorySelected(cat);
  };

  const handlePickFromHistory = (item: MerchantCategoryHistoryItem) => {
    onCategorySelected({
      id: item.categoryId,
      name: item.categoryName,
      icon: item.categoryIcon,
      color: item.categoryColor,
    });
  };

  const handleCreate = async () => {
    if (!newName.trim()) {
      Alert.alert("Nombre requerido", "Ingresa un nombre para la categoría");
      return;
    }
    setCreating(true);
    try {
      const created = await createCategoryWithMerchant({
        name: newName.trim(),
        icon: emoji.trim() || "🏷️",
        color: color.trim() || "#1E88E5",
        isGlobal: true,
      });
      onCategorySelected(created);
    } catch {
      Alert.alert("Error", "No se pudo crear la categoría");
    } finally {
      setCreating(false);
    }
  };

  const filteredCategories = categories
    .filter((c) => {
      if (!searchText.trim()) return true;
      return c.name.toLowerCase().includes(searchText.toLowerCase());
    })
    .sort((a, b) => a.name.localeCompare(b.name, "es"));

  // Set of category IDs already in history, to visually mark them in the full list
  const historyIds = new Set(history.map((h) => h.categoryId));

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        style={styles.overlay}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={Platform.OS === "ios" ? 40 : 0}
      >
        <View style={styles.content}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title} numberOfLines={1}>
              Categoría para {merchant}
            </Text>
            <TouchableOpacity
              onPress={onClose}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Ionicons name="close" size={24} color="#495057" />
            </TouchableOpacity>
          </View>

          {loading ? (
            <ActivityIndicator
              style={{ marginVertical: 40 }}
              size="large"
              color="#007BFF"
            />
          ) : step === "pick" ? (
            <>
              {/* History section */}
              {history.length > 0 && (
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>Usadas antes</Text>
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.historyRow}
                  >
                    {history.map((item) => (
                      <TouchableOpacity
                        key={item.categoryId}
                        style={[
                          styles.historyChip,
                          {
                            backgroundColor: item.categoryColor
                              ? `${item.categoryColor}18`
                              : "#F1F3F5",
                          },
                        ]}
                        onPress={() => handlePickFromHistory(item)}
                      >
                        <Text style={styles.historyEmoji}>
                          {item.categoryIcon || "🏷️"}
                        </Text>
                        <Text
                          style={[
                            styles.historyName,
                            item.categoryColor
                              ? { color: item.categoryColor }
                              : undefined,
                          ]}
                          numberOfLines={1}
                        >
                          {item.categoryName}
                        </Text>
                        <Text style={styles.historyCount}>({item.count})</Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>
              )}

              {/* Search */}
              <View style={styles.searchContainer}>
                <Ionicons name="search" size={16} color="#ADB5BD" />
                <TextInput
                  style={styles.searchInput}
                  placeholder="Buscar categoría..."
                  placeholderTextColor="#ADB5BD"
                  value={searchText}
                  onChangeText={setSearchText}
                />
                {searchText.length > 0 && (
                  <TouchableOpacity onPress={() => setSearchText("")}>
                    <Ionicons name="close-circle" size={16} color="#ADB5BD" />
                  </TouchableOpacity>
                )}
              </View>

              {/* All categories list */}
              <ScrollView
                style={styles.categoryList}
                showsVerticalScrollIndicator={false}
              >
                {filteredCategories.map((cat) => (
                  <TouchableOpacity
                    key={cat.id}
                    style={styles.categoryRow}
                    onPress={() => handlePickCategory(cat)}
                  >
                    <View
                      style={[
                        styles.categoryIconBg,
                        {
                          backgroundColor: cat.color
                            ? `${cat.color}18`
                            : "#F1F3F5",
                        },
                      ]}
                    >
                      <Text style={styles.categoryEmoji}>
                        {cat.icon || "🏷️"}
                      </Text>
                    </View>
                    <Text style={styles.categoryName}>{cat.name}</Text>
                    {historyIds.has(cat.id) && (
                      <Ionicons
                        name="time-outline"
                        size={14}
                        color="#ADB5BD"
                        style={{ marginLeft: "auto" }}
                      />
                    )}
                  </TouchableOpacity>
                ))}
                {filteredCategories.length === 0 && (
                  <Text style={styles.emptyText}>
                    No se encontraron categorías
                  </Text>
                )}
              </ScrollView>

              {/* Create new button */}
              <TouchableOpacity
                style={styles.createNewBtn}
                onPress={() => {
                  setNewName(searchText || "");
                  setStep("create");
                }}
              >
                <Ionicons name="add-circle-outline" size={18} color="#007BFF" />
                <Text style={styles.createNewBtnText}>
                  Crear nueva categoría
                </Text>
              </TouchableOpacity>
            </>
          ) : (
            /* Create category step */
            <View style={styles.createForm}>
              <TextInput
                style={styles.input}
                placeholder="Nombre de la categoría"
                value={newName}
                onChangeText={setNewName}
                autoFocus
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
                    style={[
                      styles.input,
                      { backgroundColor: color, color: "#212529" },
                    ]}
                    placeholder="#AABBCC"
                    value={color}
                    onChangeText={setColor}
                  />
                  <View style={styles.colorRow}>
                    {[
                      "#E53935",
                      "#1E88E5",
                      "#F9A825",
                      "#43A047",
                      "#FB8C00",
                      "#8E24AA",
                      "#00897B",
                      "#6D4C41",
                    ].map((c) => (
                      <TouchableOpacity
                        key={c}
                        style={[
                          styles.colorSwatch,
                          {
                            backgroundColor: c,
                            borderColor: color === c ? "#007BFF" : "#fff",
                          },
                        ]}
                        onPress={() => setColor(c)}
                      />
                    ))}
                  </View>
                </View>
              </View>
              <View style={styles.createActions}>
                <TouchableOpacity
                  style={styles.backBtn}
                  onPress={() => setStep("pick")}
                >
                  <Text style={styles.backBtnText}>Volver</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.confirmCreateBtn}
                  onPress={handleCreate}
                  disabled={creating}
                >
                  {creating ? (
                    <ActivityIndicator color="#fff" size="small" />
                  ) : (
                    <Text style={styles.confirmCreateBtnText}>Crear</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          )}
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  content: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: 24,
    maxHeight: "80%",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F3F5",
  },
  title: {
    fontSize: 17,
    fontWeight: "700",
    color: "#212529",
    flex: 1,
    marginRight: 12,
  },
  section: {
    paddingHorizontal: 20,
    paddingTop: 12,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: "700",
    color: "#868E96",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  historyRow: {
    gap: 8,
    paddingBottom: 4,
  },
  historyChip: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 4,
  },
  historyEmoji: {
    fontSize: 14,
  },
  historyName: {
    fontSize: 13,
    fontWeight: "600",
    color: "#212529",
    maxWidth: 100,
  },
  historyCount: {
    fontSize: 11,
    color: "#495057",
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: 20,
    marginTop: 12,
    backgroundColor: "#F8F9FA",
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
    gap: 6,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: "#212529",
    padding: 0,
  },
  categoryList: {
    maxHeight: 280,
    marginTop: 8,
  },
  categoryRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 10,
    gap: 10,
  },
  categoryIconBg: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
  },
  categoryEmoji: {
    fontSize: 16,
  },
  categoryName: {
    fontSize: 15,
    color: "#212529",
    fontWeight: "500",
  },
  emptyText: {
    textAlign: "center",
    color: "#868E96",
    paddingVertical: 20,
    fontSize: 14,
  },
  createNewBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    marginHorizontal: 20,
    marginTop: 8,
    borderTopWidth: 1,
    borderTopColor: "#F1F3F5",
    gap: 6,
  },
  createNewBtnText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#007BFF",
  },
  createForm: {
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  rowInputs: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 8,
  },
  inputLabel: {
    fontSize: 13,
    color: "#868E96",
    marginBottom: 2,
    marginLeft: 2,
  },
  input: {
    backgroundColor: "#F8F9FA",
    padding: 10,
    borderRadius: 8,
    marginBottom: 12,
    fontSize: 15,
    color: "#212529",
  },
  colorRow: {
    flexDirection: "row",
    gap: 4,
    marginTop: 4,
  },
  colorSwatch: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    marginRight: 2,
  },
  createActions: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 8,
    gap: 12,
  },
  backBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#DEE2E6",
    alignItems: "center",
  },
  backBtnText: {
    fontWeight: "600",
    color: "#495057",
    fontSize: 15,
  },
  confirmCreateBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: "#28A745",
    alignItems: "center",
  },
  confirmCreateBtnText: {
    fontWeight: "700",
    color: "#fff",
    fontSize: 15,
  },
});
