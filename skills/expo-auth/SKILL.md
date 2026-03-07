---
name: expo-auth
description: >
  Patrones de autenticación: useAuth hook, token management, Google Sign-In, requestWithAuth.
  Trigger: Cuando se trabaja con autenticación, tokens, o Google Sign-In.
license: MIT
metadata:
  author: myquota
  version: "1.0"
  auto_invoke:
    - "Working with authentication"
    - "Managing tokens"
    - "Implementing Google Sign-In"
---

## Propósito

Entender y trabajar con el sistema de autenticación de MyQuota App.

---

## Flujo de Autenticación

```
1. Usuario abre app
   └── src/app/index.tsx revisa SecureStore

2. Si hay token → /dashboard
   Si no hay token → /login

3. En login:
   └── Google Sign-In → POST /login/google → { accessToken, refreshToken }

4. Tokens se guardan:
   └── SecureStore (primario)
   └── AsyncStorage (legacy/fallback)

5. Requests autenticadas:
   └── requestWithAuth adjunta Bearer token
   └── Si 401 → refresh automático
   └── Si refresh falla → limpiar tokens → /login
```

---

## Archivo Clave

`src/features/auth/hooks/useAuth.ts` exporta:

- `requestWithAuth` — HTTP client autenticado
- `signInWithGoogle` — Flujo de Google Sign-In
- `signOut` — Logout
- `getAccessToken` — Obtener token actual

---

## requestWithAuth

```typescript
import { requestWithAuth } from "@/features/auth/hooks/useAuth";

// Uso básico
const response = await requestWithAuth(`${API_BASE_URL}/items`);

// Con opciones
const response = await requestWithAuth(`${API_BASE_URL}/items`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(data),
});
```

**Comportamiento automático:**
1. Adjunta `Authorization: Bearer <accessToken>`
2. Si 401 con `code: "token_expired"` → intenta refresh
3. Si refresh OK → reintenta request original
4. Si refresh falla → limpia tokens → redirige a login

---

## Almacenamiento de Tokens

```typescript
import * as SecureStore from "expo-secure-store";

// Guardar
await SecureStore.setItemAsync("accessToken", token);
await SecureStore.setItemAsync("refreshToken", refreshToken);

// Leer
const token = await SecureStore.getItemAsync("accessToken");

// Eliminar
await SecureStore.deleteItemAsync("accessToken");
```

**Nota**: Actualmente también se usa AsyncStorage como fallback (deuda técnica).

---

## Google Sign-In

Desde el hook `useAuth`:

```typescript
import { useAuth } from "@/features/auth/hooks/useAuth";

export default function LoginScreen() {
  const { signInWithGoogle, loading, error } = useAuth();

  const handleLogin = async () => {
    try {
      await signInWithGoogle();
      // Si éxito, redirige automáticamente a /dashboard
    } catch (err) {
      // Error ya manejado por el hook
    }
  };

  return (
    <Button title="Iniciar con Google" onPress={handleLogin} disabled={loading} />
  );
}
```

---

## Logout

```typescript
import { useAuth } from "@/features/auth/hooks/useAuth";

const { signOut } = useAuth();

const handleLogout = async () => {
  await signOut();
  // Automáticamente redirige a /login
};
```

---

## Verificar Token en Splash

```typescript
// src/app/index.tsx
import { useEffect, useState } from "react";
import { useRouter } from "expo-router";
import * as SecureStore from "expo-secure-store";

export default function Index() {
  const router = useRouter();
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const token = await SecureStore.getItemAsync("accessToken");
        router.replace(token ? "/dashboard" : "/login");
      } catch {
        router.replace("/login");
      } finally {
        setChecking(false);
      }
    };
    checkAuth();
  }, [router]);

  if (checking) {
    return <ActivityIndicator />;
  }

  return null;
}
```

---

## Reglas Importantes

### SIEMPRE

- Usar `requestWithAuth` para llamadas autenticadas
- Guardar tokens en `SecureStore`
- Manejar el estado de loading durante auth

### NUNCA

- Crear nuevos mecanismos de almacenamiento de tokens
- Usar `fetch()` directo para endpoints autenticados
- Hardcodear tokens

---

## Anti-patterns

```typescript
// ❌ fetch directo
const response = await fetch(url, {
  headers: { Authorization: `Bearer ${token}` },
});

// ❌ Nuevo almacenamiento
const token = localStorage.getItem("token"); // NO — usar SecureStore

// ❌ Token hardcodeado
const token = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...";

// ❌ Manejar refresh manualmente
if (response.status === 401) {
  // NO — requestWithAuth ya lo hace
}
```

---

## Checklist

- [ ] Usar `requestWithAuth` para requests autenticadas
- [ ] Tokens guardados en SecureStore
- [ ] Login usa `signInWithGoogle` del hook
- [ ] Logout usa `signOut` del hook
- [ ] Splash verifica token antes de redirect
