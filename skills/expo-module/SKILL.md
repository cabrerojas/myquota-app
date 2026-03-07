---
name: expo-module
description: >
  Patrones para crear features completos en MyQuota App: estructura, screens, services, components.
  Trigger: Cuando se crea un nuevo feature, pantalla, o estructura de módulo.
license: MIT
metadata:
  author: myquota
  version: "1.0"
  auto_invoke:
    - "Creating a new feature"
    - "Adding a new screen"
    - "Setting up feature structure"
---

## Propósito

Crear features completos en MyQuota App siguiendo la arquitectura feature-first.

---

## Estructura de un Feature

```
src/features/<feature>/
├── components/           # Componentes UI del feature
│   └── FeatureCard.tsx
├── hooks/                # Custom hooks del feature
│   └── useFeatureData.ts
├── screens/              # Pantallas completas
│   └── FeatureScreen.tsx
├── services/             # Llamadas API
│   └── featureApi.ts
└── types/                # Tipos específicos del feature
    └── feature.ts
```

---

## Checklist para Nuevo Feature

1. [ ] Crear carpeta `src/features/<feature>/`
2. [ ] Crear `screens/FeatureScreen.tsx`
3. [ ] Crear `services/featureApi.ts` (si consume API)
4. [ ] Crear thin wrapper en `src/app/(drawer)/<feature>.tsx`
5. [ ] Registrar en `src/app/(drawer)/_layout.tsx` si visible en drawer
6. [ ] Crear tipos en `types/` o usar `shared/types/`

---

## Template: Screen

```tsx
// src/features/myFeature/screens/MyFeatureScreen.tsx
import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
} from "react-native";
import { colors, spacing } from "@/shared/theme/tokens";
import { getMyFeatureData } from "../services/myFeatureApi";
import { MyFeatureItem } from "@/shared/types/myFeature";

export default function MyFeatureScreen() {
  const [data, setData] = useState<MyFeatureItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const result = await getMyFeatureData();
      setData(result);
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
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      {data.map((item) => (
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
  },
  errorText: {
    color: colors.danger,
    fontSize: 16,
  },
  item: {
    padding: spacing.md,
    backgroundColor: colors.white,
    marginBottom: spacing.sm,
  },
});
```

---

## Template: Service

```typescript
// src/features/myFeature/services/myFeatureApi.ts
import { requestWithAuth } from "@/features/auth/hooks/useAuth";
import { API_BASE_URL } from "@/config/api";
import { MyFeatureItem } from "@/shared/types/myFeature";

export const getMyFeatureData = async (): Promise<MyFeatureItem[]> => {
  const response = await requestWithAuth(`${API_BASE_URL}/myFeature`);
  if (!response.ok) {
    const data = await response.json().catch(() => null);
    const msg = data?.message || data?.error || `Error HTTP ${response.status}`;
    throw new Error(msg);
  }
  return response.json();
};

export const createMyFeatureItem = async (
  item: Omit<MyFeatureItem, "id">
): Promise<MyFeatureItem> => {
  const response = await requestWithAuth(`${API_BASE_URL}/myFeature`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(item),
  });
  if (!response.ok) {
    const data = await response.json().catch(() => null);
    const msg = data?.message || data?.error || `Error HTTP ${response.status}`;
    throw new Error(msg);
  }
  return response.json();
};
```

---

## Template: Thin Wrapper

```tsx
// src/app/(drawer)/myFeature.tsx
import MyFeatureScreen from "@/features/myFeature/screens/MyFeatureScreen";

export default function MyFeature() {
  return <MyFeatureScreen />;
}
```

---

## Template: Component

```tsx
// src/features/myFeature/components/MyFeatureCard.tsx
import React from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { colors, spacing } from "@/shared/theme/tokens";

interface MyFeatureCardProps {
  title: string;
  subtitle?: string;
  onPress?: () => void;
}

export default function MyFeatureCard({
  title,
  subtitle,
  onPress,
}: MyFeatureCardProps) {
  return (
    <TouchableOpacity style={styles.card} onPress={onPress} disabled={!onPress}>
      <Text style={styles.title}>{title}</Text>
      {subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.white,
    padding: spacing.md,
    borderRadius: 8,
    marginBottom: spacing.sm,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  title: {
    fontSize: 16,
    fontWeight: "600",
    color: colors.textPrimary,
  },
  subtitle: {
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
});
```

---

## Anti-patterns

```tsx
// ❌ Lógica en src/app/
// src/app/(drawer)/myFeature.tsx
export default function MyFeature() {
  const [data, setData] = useState([]); // NO — va en Screen
  return <View>...</View>;
}

// ❌ fetch directo sin requestWithAuth
const response = await fetch(`${API_BASE_URL}/items`); // NO

// ❌ Tipos inline no reusables
const [data, setData] = useState<{ id: string; name: string }[]>([]); // NO — crear interface

// ❌ Rutas relativas
import { MyType } from "../../shared/types/myType"; // NO — usar @/
```

---

## Cuándo Mover a Shared

| Situación | Ubicación |
|-----------|-----------|
| Componente usado solo en un feature | `features/<feature>/components/` |
| Componente usado en 2+ features | `shared/components/` |
| Interface usada solo en un feature | `features/<feature>/types/` |
| Interface usada en 2+ features | `shared/types/` |
| Hook usado solo en un feature | `features/<feature>/hooks/` |
| Hook usado en 2+ features | `shared/hooks/` |
