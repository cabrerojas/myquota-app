---
name: sync-types
description: >
  Sincronización de tipos entre backend y frontend. Mapeo de modelos a interfaces.
  Trigger: Cuando se modifican tipos compartidos o se sincronizan con modelos del backend.
license: MIT
metadata:
  author: myquota
  version: "1.0"
  auto_invoke:
    - "Modifying shared types"
    - "Syncing with backend models"
---

## Propósito

Mantener sincronizados los tipos entre `myquota-backend` y `myquota-app`.

---

## Mapeo de Tipos

| Modelo Backend (`myquota-backend/src/modules/*/model.ts`) | Tipo Frontend (`src/shared/types/`) |
|-----------------------------------------------------------|-------------------------------------|
| `CreditCard` | `creditCard.ts` → `CreditCard` |
| `Transaction` | `transaction.ts` → `Transaction` |
| `Quota` | `quota.ts` → `Quota` |
| `BillingPeriod` | `billingPeriod.ts` → `BillingPeriod` |
| `User` | `user.ts` → `UserInfo` |
| `Category` | `category.ts` → `Category` |

---

## Regla Principal

> Cuando se agrega, renombra o elimina un campo en una entidad del backend, 
> **TAMBIÉN** se debe actualizar la interface correspondiente en `src/shared/types/`.

---

## Diferencias Backend ↔ Frontend

| Aspecto | Backend (model.ts) | Frontend (types/) |
|---------|-------------------|-------------------|
| Sintaxis | `class` con `!:` | `interface` |
| Fechas | `Date` | `string` (ISO 8601) |
| IBaseEntity | `implements` | Copiar campos |

### Conversión de Fechas

La API serializa `Date` a ISO strings:

```typescript
// Backend
createdAt!: Date;

// Frontend
createdAt: string;  // "2025-03-15T00:00:00.000Z"
```

---

## Ejemplo: Agregar Campo

### 1. Backend modifica modelo

```typescript
// myquota-backend/src/modules/creditCard/creditCard.model.ts
export class CreditCard implements IBaseEntity {
  id!: string;
  createdAt!: Date;
  updatedAt!: Date;
  deletedAt?: Date | null;

  name!: string;
  lastFourDigits!: string;
  color!: string;
  newField!: string;  // ← NUEVO
}
```

### 2. Frontend actualiza interface

```typescript
// myquota-app/src/shared/types/creditCard.ts
export interface CreditCard {
  id: string;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string | null;

  name: string;
  lastFourDigits: string;
  color: string;
  newField: string;  // ← SINCRONIZAR
}
```

---

## Template de Interface

```typescript
// src/shared/types/myEntity.ts

export interface MyEntity {
  // Campos de IBaseEntity (siempre presentes)
  id: string;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string | null;

  // Campos específicos de la entidad
  name: string;
  // ...
}

// DTO para crear
export interface CreateMyEntityDto {
  name: string;
  // Campos requeridos para crear (sin id, sin fechas)
}

// DTO para actualizar
export type UpdateMyEntityDto = Partial<CreateMyEntityDto>;
```

---

## Campos de IBaseEntity

Todos los modelos del backend tienen estos campos base:

```typescript
// Estos campos siempre existen
id: string;
createdAt: string;
updatedAt: string;
deletedAt?: string | null;  // null si no eliminado
```

---

## Cuándo Sincronizar

1. **Al agregar campo** en backend → agregar en frontend
2. **Al renombrar campo** en backend → renombrar en frontend
3. **Al cambiar tipo** en backend → actualizar en frontend
4. **Al eliminar campo** en backend → eliminar en frontend

---

## Rutas de Archivos

### Backend

```
myquota-backend/src/modules/
├── creditCard/creditCard.model.ts
├── transaction/transaction.model.ts
├── quota/quota.model.ts
├── billingPeriod/billingPeriod.model.ts
├── user/user.model.ts
└── category/category.model.ts
```

### Frontend

```
myquota-app/src/shared/types/
├── creditCard.ts
├── transaction.ts
├── quota.ts
├── billingPeriod.ts
├── user.ts
└── category.ts
```

---

## Anti-patterns

```typescript
// ❌ Fechas como Date en frontend
createdAt: Date;  // La API devuelve strings

// ❌ Nombres distintos
// Backend: dueDate
// Frontend: due_date

// ❌ No sincronizar
// Backend tiene newField, frontend no lo tiene

// ❌ Interface solo en un archivo de servicio
// Mover a shared/types/
```

---

## Checklist

- [ ] Al modificar backend model → actualizar frontend interface
- [ ] Fechas son `string` en frontend (no `Date`)
- [ ] Campos opcionales usan `?:`
- [ ] Nombres idénticos en backend y frontend
- [ ] Documentar en commit qué tipos se sincronizaron
