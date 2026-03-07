---
name: expo-screens
description: >
  Patrones de screens con data fetching: loading, error states, useCallback, useEffect.
  Trigger: Cuando se crean screens con datos, se manejan estados loading/error.
license: MIT
metadata:
  author: myquota
  version: "1.0"
  auto_invoke:
    - "Creating screens with data"
    - "Handling loading states"
    - "Handling error states"
---

## Propósito

Crear screens con data fetching consistentes, manejando loading y error states.

---

## Patrón Base

```tsx
import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
} from "react-native";
import { colors, spacing } from "@/shared/theme/tokens";
import { getItems } from "../services/itemsApi";
import { Item } from "@/shared/types/item";

export default function ItemsScreen() {
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const result = await getItems();
      setItems(result);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Error inesperado";
      setError(message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={loadData}>
          <Text style={styles.retryText}>Reintentar</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      {items.map((item) => (
        <View key={item.id} style={styles.item}>
          <Text>{item.name}</Text>
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bgLight,
  },
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: spacing.lg,
  },
  errorText: {
    color: colors.danger,
    fontSize: 16,
    textAlign: "center",
    marginBottom: spacing.md,
  },
  retryButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: 8,
  },
  retryText: {
    color: colors.white,
    fontWeight: "600",
  },
  item: {
    padding: spacing.md,
    backgroundColor: colors.white,
    marginBottom: spacing.sm,
  },
});
```

---

## Estructura de Estados

```tsx
// Siempre estos 3 estados
const [data, setData] = useState<T[]>([]);      // o T | null
const [loading, setLoading] = useState(true);   // true inicial
const [error, setError] = useState<string | null>(null);
```

---

## loadData con useCallback

```tsx
const loadData = useCallback(async () => {
  try {
    setLoading(true);
    setError(null);           // Limpiar error previo
    const result = await getItems();
    setData(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Error inesperado";
    setError(message);
  } finally {
    setLoading(false);        // Siempre en finally
  }
}, [/* dependencies */]);

useEffect(() => {
  loadData();
}, [loadData]);
```

**¿Por qué useCallback?**
- Permite pasar `loadData` como prop a componentes hijos
- Permite usar `loadData` para retry
- Evita recrear la función en cada render

---

## UI de Loading

```tsx
if (loading) {
  return (
    <View style={styles.centered}>
      <ActivityIndicator size="large" color={colors.primary} />
    </View>
  );
}
```

O con texto:

```tsx
if (loading) {
  return (
    <View style={styles.centered}>
      <ActivityIndicator size="large" color={colors.primary} />
      <Text style={styles.loadingText}>Cargando...</Text>
    </View>
  );
}
```

---

## UI de Error con Retry

```tsx
if (error) {
  return (
    <View style={styles.centered}>
      <Text style={styles.errorText}>{error}</Text>
      <TouchableOpacity style={styles.retryButton} onPress={loadData}>
        <Text style={styles.retryText}>Reintentar</Text>
      </TouchableOpacity>
    </View>
  );
}
```

---

## Empty State

```tsx
if (!loading && !error && items.length === 0) {
  return (
    <View style={styles.centered}>
      <Text style={styles.emptyText}>No hay items</Text>
    </View>
  );
}
```

---

## Screen con Parámetros

```tsx
import { useLocalSearchParams } from "expo-router";

interface ItemDetailScreenProps {
  itemId?: string;  // Opcional por si viene como prop
}

export default function ItemDetailScreen({ itemId: propId }: ItemDetailScreenProps) {
  // Param puede venir de props o de route
  const { id: routeId } = useLocalSearchParams<{ id: string }>();
  const itemId = propId || routeId;

  const [item, setItem] = useState<Item | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    if (!itemId) {
      setError("ID no proporcionado");
      setLoading(false);
      return;
    }
    // ... fetch
  }, [itemId]);

  // ...
}
```

---

## Pull-to-Refresh

```tsx
import { RefreshControl, ScrollView } from "react-native";

export default function ItemsScreen() {
  const [refreshing, setRefreshing] = useState(false);
  // ... otros estados

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      const result = await getItems();
      setItems(result);
    } catch (err) {
      // Mostrar toast o alert
    } finally {
      setRefreshing(false);
    }
  }, []);

  return (
    <ScrollView
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      {/* content */}
    </ScrollView>
  );
}
```

---

## Anti-patterns

```tsx
// ❌ loading inicial false
const [loading, setLoading] = useState(false); // Debe ser true

// ❌ No limpiar error previo
const loadData = async () => {
  // Falta setError(null) al inicio
  const result = await getItems();
};

// ❌ setLoading fuera de finally
const loadData = async () => {
  setLoading(true);
  const result = await getItems();
  setLoading(false); // Si hay error, nunca se ejecuta
};

// ❌ async en useEffect directamente
useEffect(async () => {  // NO
  await loadData();
}, []);

// ✅ Correcto
useEffect(() => {
  loadData();
}, [loadData]);
```

---

## Checklist

- [ ] Estados: `data`, `loading: true`, `error: null`
- [ ] `loadData` envuelto en `useCallback`
- [ ] `setError(null)` al inicio de loadData
- [ ] `setLoading(false)` en `finally`
- [ ] Error extrae `message` con instanceof check
- [ ] UI de loading con ActivityIndicator
- [ ] UI de error con botón de retry
- [ ] Empty state si aplica
