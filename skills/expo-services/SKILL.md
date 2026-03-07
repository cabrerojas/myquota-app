---
name: expo-services
description: >
  Patrones de servicios API: requestWithAuth, manejo de errores, tipado.
  Trigger: Cuando se crean servicios, se hacen llamadas HTTP, o se usa requestWithAuth.
license: MIT
metadata:
  author: myquota
  version: "1.0"
  auto_invoke:
    - "Creating API services"
    - "Making HTTP requests"
    - "Using requestWithAuth"
---

## Propósito

Crear servicios API consistentes en MyQuota App usando `requestWithAuth`.

---

## HTTP Client

**SIEMPRE** usar `requestWithAuth` para endpoints autenticados:

```typescript
import { requestWithAuth } from "@/features/auth/hooks/useAuth";
import { API_BASE_URL } from "@/config/api";
```

**NUNCA** usar `fetch()` directamente para endpoints que requieren auth.

---

## Patrón Base

```typescript
// src/features/<feature>/services/<feature>Api.ts

import { requestWithAuth } from "@/features/auth/hooks/useAuth";
import { API_BASE_URL } from "@/config/api";
import { MyItem } from "@/shared/types/myItem";

export const getItems = async (): Promise<MyItem[]> => {
  const response = await requestWithAuth(`${API_BASE_URL}/items`);
  if (!response.ok) {
    const data = await response.json().catch(() => null);
    const msg = data?.message || data?.error || `Error HTTP ${response.status}`;
    throw new Error(msg);
  }
  return response.json();
};
```

---

## Templates por Operación

### GET All

```typescript
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

### GET by ID

```typescript
export const getItemById = async (id: string): Promise<Item> => {
  const response = await requestWithAuth(`${API_BASE_URL}/items/${id}`);
  if (!response.ok) {
    const data = await response.json().catch(() => null);
    const msg = data?.message || data?.error || `Error HTTP ${response.status}`;
    throw new Error(msg);
  }
  return response.json();
};
```

### POST Create

```typescript
export const createItem = async (item: CreateItemDto): Promise<Item> => {
  const response = await requestWithAuth(`${API_BASE_URL}/items`, {
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

### PUT Update

```typescript
export const updateItem = async (
  id: string,
  item: UpdateItemDto
): Promise<Item> => {
  const response = await requestWithAuth(`${API_BASE_URL}/items/${id}`, {
    method: "PUT",
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

### DELETE

```typescript
export const deleteItem = async (id: string): Promise<void> => {
  const response = await requestWithAuth(`${API_BASE_URL}/items/${id}`, {
    method: "DELETE",
  });
  if (!response.ok) {
    const data = await response.json().catch(() => null);
    const msg = data?.message || data?.error || `Error HTTP ${response.status}`;
    throw new Error(msg);
  }
};
```

---

## Rutas Anidadas

Para endpoints como `/creditCards/:id/transactions`:

```typescript
export const getTransactions = async (
  creditCardId: string
): Promise<Transaction[]> => {
  const response = await requestWithAuth(
    `${API_BASE_URL}/creditCards/${creditCardId}/transactions`
  );
  if (!response.ok) {
    const data = await response.json().catch(() => null);
    const msg = data?.message || data?.error || `Error HTTP ${response.status}`;
    throw new Error(msg);
  }
  return response.json();
};
```

---

## Query Parameters

```typescript
export const getFilteredItems = async (
  status: string,
  page: number
): Promise<Item[]> => {
  const params = new URLSearchParams({
    status,
    page: String(page),
  });
  const response = await requestWithAuth(
    `${API_BASE_URL}/items?${params.toString()}`
  );
  if (!response.ok) {
    const data = await response.json().catch(() => null);
    const msg = data?.message || data?.error || `Error HTTP ${response.status}`;
    throw new Error(msg);
  }
  return response.json();
};
```

---

## Reglas

1. **Siempre tipar retorno**: `Promise<T>`, nunca `Promise<any>`
2. **Parsear errors del backend**: usar patrón `.json().catch(() => null)`
3. **Un archivo por feature**: `<feature>Api.ts`
4. **Ubicación**: `src/features/<feature>/services/`
5. **Importar interfaces** de `shared/types/` o `features/<feature>/types/`

---

## Anti-patterns

```typescript
// ❌ fetch() directo
const response = await fetch(`${API_BASE_URL}/items`);

// ❌ Sin tipar retorno
export const getItems = async () => { // Falta Promise<Item[]>

// ❌ Error sin parsear body
if (!response.ok) {
  throw new Error("Error"); // Mensaje no descriptivo
}

// ❌ any en retorno
export const getItems = async (): Promise<any> => {

// ❌ Hardcodear URL
const response = await requestWithAuth("http://localhost:3000/api/items");
```

---

## Cómo Funciona requestWithAuth

1. Adjunta `Authorization: Bearer <accessToken>`
2. Si recibe 401 con `code: "token_expired"`:
   - Intenta refresh automático con refreshToken
   - Reintenta la request original
3. Si refresh falla → limpia tokens → redirige a login

**No necesitas manejar** refresh manualmente — `requestWithAuth` lo hace.

---

## Checklist

- [ ] Usar `requestWithAuth` (no `fetch` directo)
- [ ] Importar `API_BASE_URL` de `@/config/api`
- [ ] Tipar retorno explícitamente (`Promise<T>`)
- [ ] Parsear body de error con `.json().catch(() => null)`
- [ ] Interfaces importadas de `shared/types/` o `features/*/types/`
- [ ] Archivo ubicado en `features/<feature>/services/`
