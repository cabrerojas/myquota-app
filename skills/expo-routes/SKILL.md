---
name: expo-routes
description: >
  Patrones de expo-router: layouts, drawer config, navegación programática.
  Trigger: Cuando se crean rutas, se configura navegación, o se modifica el drawer.
license: MIT
metadata:
  author: myquota
  version: "1.0"
  auto_invoke:
    - "Creating routes"
    - "Configuring navigation"
    - "Adding drawer screens"
    - "Modifying layouts"
---

## Propósito

Configurar navegación en MyQuota App usando expo-router v6 (file-based routing).

---

## Estructura de Rutas

```
src/app/
├── _layout.tsx           # Stack raíz
├── index.tsx             # Splash / redirect
├── login.tsx             # Login (fuera del drawer)
└── (drawer)/
    ├── _layout.tsx       # Drawer config
    ├── dashboard.tsx     # Pantalla principal
    ├── creditCards.tsx
    ├── quotas.tsx
    └── ...
```

---

## Root Layout

```tsx
// src/app/_layout.tsx
import { Stack } from "expo-router";

export default function RootLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="login" />
      <Stack.Screen name="(drawer)" />
    </Stack>
  );
}
```

---

## Drawer Layout

```tsx
// src/app/(drawer)/_layout.tsx
import { Drawer } from "expo-router/drawer";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import CustomDrawerContent from "@/features/navigation/components/CustomDrawerContent";

export default function DrawerLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <Drawer
        drawerContent={(props) => <CustomDrawerContent {...props} />}
        screenOptions={{
          headerShown: true,
          drawerType: "front",
        }}
      >
        {/* Pantallas visibles en el drawer */}
        <Drawer.Screen
          name="dashboard"
          options={{
            drawerLabel: "Dashboard",
            title: "Dashboard",
          }}
        />
        <Drawer.Screen
          name="creditCards"
          options={{
            drawerLabel: "Tarjetas",
            title: "Tarjetas de Crédito",
          }}
        />
        
        {/* Pantallas ocultas del drawer */}
        <Drawer.Screen
          name="creditCardDetail"
          options={{
            drawerItemStyle: { display: "none" },
            title: "Detalle de Tarjeta",
          }}
        />
      </Drawer>
    </GestureHandlerRootView>
  );
}
```

---

## Agregar Nueva Pantalla

### 1. Crear Screen en features

```tsx
// src/features/myFeature/screens/MyFeatureScreen.tsx
export default function MyFeatureScreen() {
  return <View>...</View>;
}
```

### 2. Crear thin wrapper en app

```tsx
// src/app/(drawer)/myFeature.tsx
import MyFeatureScreen from "@/features/myFeature/screens/MyFeatureScreen";

export default function MyFeature() {
  return <MyFeatureScreen />;
}
```

### 3. Registrar en Drawer (si visible)

```tsx
// src/app/(drawer)/_layout.tsx
<Drawer.Screen
  name="myFeature"
  options={{
    drawerLabel: "Mi Feature",
    title: "Mi Feature",
  }}
/>
```

### 4. O ocultar del drawer (acceso vía push)

```tsx
<Drawer.Screen
  name="myFeature"
  options={{
    drawerItemStyle: { display: "none" },
    title: "Mi Feature",
  }}
/>
```

---

## Navegación Programática

```tsx
import { useRouter } from "expo-router";

export default function SomeScreen() {
  const router = useRouter();

  const goToDetail = (id: string) => {
    router.push(`/creditCardDetail?id=${id}`);
  };

  const goBack = () => {
    router.back();
  };

  const replaceScreen = () => {
    router.replace("/dashboard");
  };

  // ...
}
```

---

## Parámetros de Ruta

### Recibir params

```tsx
// src/app/(drawer)/creditCardDetail.tsx
import { useLocalSearchParams } from "expo-router";
import CreditCardDetailScreen from "@/features/creditCards/screens/CreditCardDetailScreen";

export default function CreditCardDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <CreditCardDetailScreen creditCardId={id} />;
}
```

### Pasar params

```tsx
router.push(`/creditCardDetail?id=${card.id}`);
// o
router.push({
  pathname: "/creditCardDetail",
  params: { id: card.id },
});
```

---

## Redirect en Index

```tsx
// src/app/index.tsx
import { useEffect, useState } from "react";
import { useRouter } from "expo-router";
import * as SecureStore from "expo-secure-store";
import { ActivityIndicator, View } from "react-native";

export default function Index() {
  const router = useRouter();
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const token = await SecureStore.getItemAsync("accessToken");
        if (token) {
          router.replace("/dashboard");
        } else {
          router.replace("/login");
        }
      } catch {
        router.replace("/login");
      } finally {
        setChecking(false);
      }
    };
    checkAuth();
  }, [router]);

  if (checking) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return null;
}
```

---

## Anti-patterns

```tsx
// ❌ navigation.navigate() de React Navigation
navigation.navigate("Dashboard"); // NO — usar router.push()

// ❌ Lógica en el thin wrapper
export default function MyFeature() {
  const [data, setData] = useState([]); // NO — va en Screen
  return <MyFeatureScreen data={data} />;
}

// ❌ Params sin tipar
const { id } = useLocalSearchParams(); // NO — tipar con <{ id: string }>
```

---

## Checklist

- [ ] Screen creado en `features/<feature>/screens/`
- [ ] Thin wrapper en `src/app/(drawer)/<name>.tsx`
- [ ] Drawer.Screen registrado en `_layout.tsx`
- [ ] Si pantalla oculta: `drawerItemStyle: { display: "none" }`
- [ ] Navegación usa `useRouter()` de expo-router
- [ ] Params tipados con `useLocalSearchParams<T>()`
