# Instrucciones para agentes (Copilot) — MyQuota App

Breve: guía **prescriptiva** para cualquier agente de IA que trabaje en `myquota-app`.  
Objetivo: que el proyecto crezca de forma coherente sin importar qué modelo o agente genere código.

---

## 1. Visión general del proyecto

| Dato       | Valor                                                                  |
| ---------- | ---------------------------------------------------------------------- |
| Stack      | React Native 0.81 + Expo SDK 54 + TypeScript 5.9 (strict)              |
| Routing    | `expo-router` v6 (file-based) — entry: `expo-router/entry`             |
| Backend    | REST API en `myquota-backend` (Node + Express + Firestore)             |
| Navegación | Stack raíz → Drawer principal (12 pantallas)                           |
| Estilos    | `StyleSheet.create()` (sin librerías CSS-in-JS externas)               |
| Tests      | Jest + `jest-expo` (preset ya configurado)                             |
| Estado     | Local con `useState` (sin store global aún — ver sección Estado)       |
| Auth       | Google Sign-In → JWT Bearer → refresh automático con `requestWithAuth` |

---

## 2. Arquitectura de carpetas (Feature-First)

```
src/
├── app/                          # Rutas (expo-router file-based)
│   ├── _layout.tsx               # Stack raíz: index | login | (drawer)
│   ├── index.tsx                 # Splash / redirige según token
│   ├── login.tsx                 # Pantalla login (usa LoginScreen)
│   └── (drawer)/
│       ├── _layout.tsx           # Drawer config (12 pantallas)
│       └── *.tsx                 # Archivos de ruta (thin wrappers)
│
├── config/
│   └── api.ts                    # API_BASE_URL (único punto de config de URL)
│
├── features/                     # Un folder por feature de negocio
│   └── <feature>/
│       ├── components/           # Componentes UI reutilizables del feature
│       ├── hooks/                # Custom hooks del feature
│       ├── screens/              # Pantallas completas (importadas por src/app/)
│       ├── services/             # Llamadas a API (funciones async)
│       └── types/                # Interfaces y tipos del feature ← NUEVO
│
└── shared/                       # Código compartido entre features
    ├── components/               # Componentes genéricos reutilizables ← NUEVO
    ├── hooks/                    # Hooks compartidos ← NUEVO
    ├── types/                    # Interfaces globales (CreditCard, User, etc.) ← NUEVO
    ├── theme/                    # Constantes de diseño (colores, spacing, typography) ← NUEVO
    └── utils/                    # Helpers puros (formatCurrency, formatDate, etc.) ← NUEVO
```

### Reglas de arquitectura (OBLIGATORIAS)

1. **Archivos en `src/app/` son thin wrappers** — solo importan y renderizan un Screen de `src/features/*/screens/`. NO deben contener lógica de negocio, estados, ni llamadas a API.

   ```tsx
   // ✅ src/app/(drawer)/dashboard.tsx
   import DashboardScreen from "@/features/dashboard/screens/DashboardScreen";
   export default function Dashboard() {
     return <DashboardScreen />;
   }
   ```

2. **Cada feature nuevo DEBE tener al menos**: `screens/` + `services/` (si consume API) + `types/` (si define interfaces).

3. **Componentes**: si un componente se usa en más de un feature → moverlo a `src/shared/components/`.

4. **Tipos**: las interfaces que se comparten entre features (como `CreditCard`, `User`, `Transaction`) DEBEN vivir en `src/shared/types/`. Las interfaces internas de un solo feature van en `src/features/<feature>/types/`.

5. **Utilidades puras** (`formatCurrency`, `formatDate`, helpers de arrays, etc.) van en `src/shared/utils/`. NUNCA duplicar helpers en múltiples archivos.

6. **Imports**: usar siempre el alias `@/` definido en `tsconfig.json` (`@/*` → `src/*`). Nunca usar rutas relativas con `../../`.

   ```tsx
   // ✅ Correcto
   import { CreditCard } from "@/shared/types/creditCard";
   import { formatCurrency } from "@/shared/utils/format";

   // ❌ Incorrecto
   import { CreditCard } from "../../shared/types/creditCard";
   ```

---

## 3. Capa de servicios (API)

### HTTP Client

Todas las llamadas autenticadas usan `requestWithAuth()` exportado desde `src/features/auth/hooks/useAuth.ts`. No usar `fetch()` directamente para endpoints que requieren auth.

```typescript
import { requestWithAuth } from "@/features/auth/hooks/useAuth";
import { API_BASE_URL } from "@/config/api";
```

### Patrón obligatorio para funciones de servicio

```typescript
// src/features/<feature>/services/<feature>Api.ts

export const getItems = async (): Promise<Item[]> => {
  const response = await requestWithAuth(`${API_BASE_URL}/items`);
  if (!response.ok) {
    const data = await response.json().catch(() => null);
    const msg = data?.message || data?.error || `Error HTTP ${response.status}`;
    throw new Error(msg);
  }
  return response.json();
};
```

**Reglas:**

- Siempre tipar el retorno (`Promise<T>`). NUNCA devolver `Promise<any>`.
- Siempre intentar parsear el cuerpo de error del backend para mensajes descriptivos.
- Mantener un manejo de errores consistente (el patrón `.json().catch(() => null)` con fallback).
- Un archivo de servicio por feature: `<feature>Api.ts`.

---

## 4. Autenticación

### Flujo

1. `src/app/index.tsx` — revisa tokens en `SecureStore` / `AsyncStorage` → redirige a dashboard o login.
2. Google Sign-In → POST `/login/google` → recibe `{ accessToken, refreshToken }`.
3. Tokens se almacenan en `expo-secure-store` (primario) y `AsyncStorage` (legacy/fallback).
4. `requestWithAuth` adjunta `Authorization: Bearer <token>` y ante un 401 intenta refresh automático.
5. Si el refresh falla → limpia tokens → redirige a login.

### Importante para agentes

- **NO crear nuevos mecanismos de almacenamiento de tokens.** Usar los existentes en `useAuth.ts`.
- Si se modifica el flujo de auth, asegurarse de que tanto `SecureStore` como `AsyncStorage` se actualicen (hasta que se elimine la dependencia legacy de AsyncStorage).

---

## 5. Estado y manejo de datos

### Estado actual

- **State local** con `useState` + `useEffect` para fetch en cada pantalla.
- No existe Context, Redux, Zustand ni ningún store global.
- Datos del usuario se leen de `AsyncStorage` independientemente en cada pantalla que lo necesita.

### Patrón de pantalla con datos

```tsx
export default function SomeScreen() {
  const [data, setData] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const result = await getItems();
      setData(result);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Error inesperado";
      setError(message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  if (loading) return <ActivityIndicator />;
  if (error) return <ErrorView message={error} onRetry={loadData} />;
  return ( /* UI */ );
}
```

### Reglas de estado

- Extraer lógica de fetch a custom hooks (`useFetchItems`) cuando una pantalla tenga más de un efecto o cuando varios componentes necesiten los mismos datos.
- Si en el futuro se necesita estado global, preferir **React Context + useReducer** para datos simples (sesión/usuario) o **Zustand** si la complejidad crece. No introducir Redux.
- No leer `AsyncStorage` directamente en pantallas. Encapsular en un hook (`useUser`, `useSession`).

---

## 6. Tipado (TypeScript)

### Reglas estrictas

- `tsconfig.json` tiene `"strict": true`. No desactivar ninguna opción de strict.
- **Prohibido `any`**. Si un tipo externo lo requiere, usar `unknown` + type guard o un tipo temporal con un `// TODO: tipar correctamente` + issue.
- **Interfaces obligatorias** para: props de componentes, respuestas de API, params de funciones de servicio.
- Preferir `interface` sobre `type` para objetos. Usar `type` para uniones, intersecciones y utilidades.

### Interfaces compartidas (meta: consolidar)

Las siguientes interfaces se usan en múltiples features y DEBEN definirse una sola vez en `src/shared/types/`:

| Interface                             | Archivo sugerido                                         |
| ------------------------------------- | -------------------------------------------------------- |
| `CreditCard`                          | `src/shared/types/creditCard.ts`                         |
| `Transaction`, `ManualTransaction`    | `src/shared/types/transaction.ts`                        |
| `Quota`, `QuotaWithTransaction`       | `src/shared/types/quota.ts`                              |
| `BillingPeriod`                       | `src/shared/types/billingPeriod.ts`                      |
| `User`, `UserInfo`                    | `src/shared/types/user.ts`                               |
| `Category`, `CategoryMatch`           | `src/shared/types/category.ts`                           |
| DTOs (`CreateBillingPeriodDto`, etc.) | Junto a su interface principal o en `types/` del feature |

> **Nota para agentes**: actualmente estas interfaces están duplicadas en múltiples archivos de servicio y pantallas. Cuando trabajes en un feature que use una interface duplicada, muévela a `src/shared/types/` y actualiza todos los imports. No crear nuevas duplicaciones.

---

## 7. Estilos y tema visual

### Sistema de diseño (tokens)

Definir en `src/shared/theme/tokens.ts` (crear si no existe):

```typescript
export const colors = {
  primary: "#007BFF",
  danger: "#DC3545",
  success: "#28A745",
  warning: "#FFC107",
  bgLight: "#F8F9FA",
  textPrimary: "#212529",
  textSecondary: "#495057",
  textMuted: "#868E96",
  white: "#FFFFFF",
  border: "#DEE2E6",
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
} as const;

export const fontSizes = {
  xs: 11,
  sm: 13,
  md: 15,
  lg: 18,
  xl: 22,
  xxl: 28,
} as const;
```

### Reglas de estilo

- **NUNCA hardcodear colores directamente.** Importar siempre desde `@/shared/theme/tokens`.
- Usar `StyleSheet.create()` al final de cada archivo. No inline styles salvo excepciones justificadas.
- Componentes reutilizables de UI (botones, cards, inputs) deben ir en `src/shared/components/`.

---

## 8. Manejo de errores

### Regla general por capa

| Capa            | Cómo manejar                                                                                             |
| --------------- | -------------------------------------------------------------------------------------------------------- |
| **Services**    | Lanzar `throw new Error(mensaje)` con texto descriptivo en español. Parsear body de error del backend.   |
| **Hooks**       | Capturar con try/catch, exponer estado `error: string \| null` + función `retry`.                        |
| **Screens**     | Mostrar UI de error (banner, card, o `Alert.alert()`). No `console.error` sin un UI feedback al usuario. |
| **Componentes** | Recibir `error` como prop si aplica. NO hacer fetch ni manejar errores directamente.                     |

### Error Boundary (meta futura)

Crear un `ErrorBoundary` en `src/shared/components/ErrorBoundary.tsx` que envuelva las pantallas principales y capture errores de render inesperados. Hasta entonces, manejar con try/catch en cada pantalla.

---

## 9. Navegación (expo-router)

### Estructura

- **Root**: `src/app/_layout.tsx` — `Stack` con 3 rutas: `index`, `login`, `(drawer)`.
- **Drawer**: `src/app/(drawer)/_layout.tsx` — 12 pantallas, algunas ocultas (accedidas vía `router.push()`).
- **CustomDrawerContent**: `src/features/navigation/components/CustomDrawerContent.tsx` — header con avatar/nombre, items del drawer, botón de cerrar sesión.

### Reglas de navegación

- Para agregar una pantalla: crear archivo en `src/app/(drawer)/nombre.tsx` (thin wrapper) + screen en `src/features/<feature>/screens/NombreScreen.tsx` + registrar en el Drawer layout si debe ser visible en el menú.
- Pantallas ocultas del drawer (accedidas solo mediante `router.push`): agregar `drawerItemStyle: { display: "none" }` en options.
- Navegación programática: usar `useRouter()` de `expo-router`. No usar `navigation.navigate()` de React Navigation directamente.

---

## 10. ESLint y calidad de código

### Config actual: `eslint.config.js` en la raíz (flat config)

```javascript
const { defineConfig } = require("eslint/config");
const expoConfig = require("eslint-config-expo/flat");
const prettierConfig = require("eslint-config-prettier");
const prettierPlugin = require("eslint-plugin-prettier");

module.exports = defineConfig([
  ...expoConfig,
  prettierConfig,
  { plugins: { prettier: prettierPlugin }, rules: { "prettier/prettier": "error" } },
  {
    rules: {
      "@typescript-eslint/no-explicit-any": "error",
      "@typescript-eslint/no-unused-vars": ["error", { argsIgnorePattern: "^_", varsIgnorePattern: "^_" }],
    },
  },
]);
```

### Reglas que el agente DEBE respetar

- **No `any`** — usar tipos concretos o `unknown`.
- **Return types explícitos** en funciones públicas de servicios y hooks exportados.
- **No variables sin usar** — eliminarlas o prefixear con `_` si son intencionales.
- **Dependencias de hooks correctas** — `useEffect`, `useCallback`, `useMemo` deben tener deps completas.
- Ejecutar `npm run lint` antes de commit. Corregir con `npx eslint "src/**/*.{ts,tsx}" --fix`.

---

## 11. Testing

### Situación actual

No existen tests aún. El framework está configurado (`jest` + `jest-expo` en devDependencies).

### Convención para nuevos tests

- Archivo de test junto al archivo fuente: `SomeService.test.ts`, `SomeScreen.test.tsx`.
- Alternativamente, carpeta `__tests__/` dentro de cada feature.
- Nombrar con `.test.ts(x)`.
- Prioridad de tests:
  1. **Servicios** (funciones puras de API → mockear `requestWithAuth`).
  2. **Hooks** (con `@testing-library/react-native`).
  3. **Pantallas** (snapshot + interacciones clave).
- Ejecutar con `npm run test`.

---

## 12. Convenciones de código

### Naming

| Tipo                          | Convención                 | Ejemplo                                        |
| ----------------------------- | -------------------------- | ---------------------------------------------- |
| Archivos de componente/screen | PascalCase                 | `DashboardScreen.tsx`, `DebtIndicatorCard.tsx` |
| Archivos de servicio          | camelCase                  | `creditCardsApi.ts`, `statsApi.ts`             |
| Archivos de hook              | camelCase con `use` prefix | `useAuth.ts`, `useCreditCards.ts`              |
| Archivos de tipo              | camelCase                  | `creditCard.ts`, `transaction.ts`              |
| Interfaces                    | PascalCase                 | `CreditCard`, `BillingPeriod`                  |
| Funciones de servicio         | camelCase verbo+sustantivo | `getCreditCards()`, `createTransaction()`      |
| Componentes React             | PascalCase                 | `function MonthSummaryCard()`                  |
| Constantes                    | UPPER_SNAKE_CASE           | `API_BASE_URL`                                 |

### Componentes React

- Siempre **componentes funcionales** (nunca clases).
- Exportar como `export default function ComponentName()`.
- Definir `interface ComponentNameProps` para las props.
- Un componente por archivo.

### Imports (orden)

```typescript
// 1. React / React Native
import React, { useState, useEffect } from "react";
import { View, Text, StyleSheet } from "react-native";

// 2. Librerías externas
import { useRouter } from "expo-router";

// 3. Imports internos (@/ alias)
import { CreditCard } from "@/shared/types/creditCard";
import { getCreditCards } from "@/features/creditCards/services/creditCardsApi";
import { colors, spacing } from "@/shared/theme/tokens";
```

---

## 13. Dependencias y módulos nativos

- Usar **paquetes compatibles con Expo SDK 54**. Verificar compatibilidad antes de agregar.
- Preferir paquetes del ecosistema Expo (`expo-*`) sobre alternativas de comunidad.
- Para módulos nativos: `expo prebuild` + ajustar `android/` / `ios/`.
- Paquetes actuales relevantes: `expo-secure-store`, `expo-file-system`, `expo-notifications`, `expo-sharing`, `react-native-chart-kit`, `react-native-modal`.

---

## 14. Scripts

| Comando           | Descripción                  |
| ----------------- | ---------------------------- |
| `npm run start`   | Inicia Metro/Expo            |
| `npm run android` | Compila y ejecuta en Android |
| `npm run ios`     | Compila y ejecuta en iOS     |
| `npm run web`     | Versión web                  |
| `npm run test`    | Jest en watch mode           |
| `npm run lint`    | ESLint (expo lint)           |

---

## 15. Integración con backend

- URL de API: [src/config/api.ts](src/config/api.ts) — para desarrollo local: `http://localhost:3000/api`.
- Las interfaces del frontend deben **reflejar los modelos del backend** (ver `myquota-backend/src/modules/*/model.ts`).
- El backend usa `IBaseEntity` con `id`, `createdAt`, `updatedAt`, `deletedAt` (ISO strings). Las interfaces del frontend deben incluir al menos `id` y las fechas relevantes.

### Sincronización de tipos frontend ↔ backend (OBLIGATORIA)

| Modelo backend (`myquota-backend/src/modules/*/model.ts`) | Tipo frontend (`src/shared/types/`) |
| --------------------------------------------------------- | ----------------------------------- |
| `CreditCard` | `creditCard.ts` → `CreditCard` |
| `Transaction` | `transaction.ts` → `Transaction` |
| `Quota` | `quota.ts` → `Quota` |
| `BillingPeriod` | `billingPeriod.ts` → `BillingPeriod` |
| `User` | `user.ts` → `UserInfo` |
| `Category` | `category.ts` → `Category` |

**Regla**: cuando se agrega o renombra un campo en una entidad del backend, TAMBIÉN se debe actualizar la interface correspondiente en `src/shared/types/`. Documentar en el PR/commit qué tipos se sincronizaron.

---

## 16. Depuración

- Cache Metro corrupta: `expo start -c`.
- Problemas nativos Android: inspeccionar `android/` + `./gradlew assembleDebug`.
- Errores de red en dev: verificar que `api.ts` apunte a `localhost:3000` y que el emulador tenga acceso (en Android emulator usar `10.0.2.2` en lugar de `localhost`).

---

## 17. Deuda técnica conocida (no introducir más)

Estos problemas existen y deben resolverse progresivamente. **No agregar más instancias:**

1. ~~**Interfaces duplicadas**~~ — ✅ Resuelto. `CreditCard`, `UserInfo`, `MonthlyStat` consolidadas en `src/shared/types/`.
2. ~~**Helpers duplicados**~~ — ✅ Resuelto. `formatCurrency`, `formatDate`, `formatShortDate`, `getDayKey`, `getMonthIndex` en `src/shared/utils/format.ts`.
3. **Colores hardcodeados** — Tokens creados en `src/shared/theme/tokens.ts` pero 349+ usos de colores hex directos aún no migrados. Migrar progresivamente al importar desde `@/shared/theme/tokens`.
4. ~~**Código legacy de auth**~~ — ✅ Resuelto. `LoginForm.tsx` y `authApi.ts` eliminados.
5. **AsyncStorage legacy** — El flujo de auth guarda tokens tanto en `SecureStore` como en `AsyncStorage`. Plan: migrar todo a `SecureStore` y eliminar la dependencia de `AsyncStorage` para auth.
6. ~~**`any` en servicios**~~ — ✅ Resuelto. Servicios tipados correctamente (`creditCardsApi`, `transactionsApi`, `categoryApi`, `statsApi`).
7. ~~**`src/shared/utils/` vacío**~~ — ✅ Resuelto. Poblado con `format.ts`.

---

## 18. Qué revisar antes de cambios de diseño

- **Cambios en `useAuth.ts`** (tokens, requestWithAuth) afectan TODA llamada autenticada a la API.
- **Cambios en `src/shared/types/`** deben reflejar los modelos del backend. Si el backend cambia un campo, actualizar aquí.
- **Cambios en `src/shared/theme/tokens.ts`** afectan los colores/espaciado de toda la app.
- **Cambios en `src/shared/utils/format.ts`** afectan cómo se muestran monedas y fechas en toda la app.
- **Nuevas pantallas**: crear thin wrapper en `src/app/(drawer)/`, screen en `src/features/*/screens/`, y registrar en el Drawer layout.
- **Cambios en layout** (`_layout.tsx`): afectan navegación y estructura de toda la app.

---

## 19. Checklist para agentes antes de entregar código

- [ ] ¿Los archivos nuevos siguen la arquitectura de carpetas descrita? (feature-first, thin wrappers en `src/app/`)
- [ ] ¿Las interfaces están en `src/shared/types/` o `src/features/<feature>/types/` sin duplicar?
- [ ] ¿Los servicios usan `requestWithAuth` y tienen tipos de retorno explícitos?
- [ ] ¿Los colores vienen de `@/shared/theme/tokens` (o el equivalente existente)?
- [ ] ¿Se usan imports con `@/` y no rutas relativas con `../../`?
- [ ] ¿No se introdujo `any`?
- [ ] ¿Los errores se manejan correctamente (try/catch en hooks/screens, throw en services)?
- [ ] ¿`npm run lint` pasa sin errores nuevos?
- [ ] ¿Si se tocó deuda técnica, se mejoró en lugar de empeorar?
- [ ] ¿Si se modificó un tipo compartido, se sincronizó con el modelo del backend?

---

## 20. Archivos clave (dónde mirar primero)

| Archivo                                                                                                                  | Propósito                                           |
| ------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------- |
| [src/app/\_layout.tsx](src/app/_layout.tsx)                                                                              | Layout raíz y navegación principal                  |
| [src/app/(drawer)/\_layout.tsx](<src/app/(drawer)/_layout.tsx>)                                                          | Configuración del Drawer                            |
| [src/config/api.ts](src/config/api.ts)                                                                                   | URL base de la API                                  |
| [src/features/auth/hooks/useAuth.ts](src/features/auth/hooks/useAuth.ts)                                                 | `requestWithAuth`, Google Sign-In, manejo de tokens |
| [src/features/navigation/components/CustomDrawerContent.tsx](src/features/navigation/components/CustomDrawerContent.tsx) | Menú lateral personalizado                          |
| `src/features/*/services/*Api.ts`                                                                                        | Llamadas a todos los endpoints del backend          |
| [package.json](package.json)                                                                                             | Scripts y dependencias                              |
| [tsconfig.json](tsconfig.json)                                                                                           | Config de TypeScript (strict + path aliases)        |
