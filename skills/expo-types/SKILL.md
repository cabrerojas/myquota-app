---
name: expo-types
description: >
  Patrones de TypeScript: interfaces, tipos compartidos, strict mode.
  Trigger: Cuando se definen interfaces, se trabaja con tipos compartidos, o se sigue TypeScript patterns.
license: MIT
metadata:
  author: myquota
  version: "1.0"
  auto_invoke:
    - "Defining interfaces"
    - "Working with shared types"
    - "Using TypeScript patterns"
---

## Propósito

Mantener tipado consistente en MyQuota App con TypeScript strict mode.

---

## Ubicación de Tipos

```
src/
├── shared/types/           # Interfaces usadas en múltiples features
│   ├── creditCard.ts
│   ├── transaction.ts
│   ├── quota.ts
│   ├── billingPeriod.ts
│   ├── user.ts
│   └── category.ts
│
└── features/<feature>/types/  # Interfaces de un solo feature
    └── featureSpecific.ts
```

---

## Regla de Ubicación

| Situación | Ubicación |
|-----------|-----------|
| Interface usada en 1 feature | `features/<feature>/types/` |
| Interface usada en 2+ features | `shared/types/` |
| DTOs para crear/actualizar | Junto a la interface principal |

---

## Template: Interface de Entidad

```typescript
// src/shared/types/creditCard.ts

export interface CreditCard {
  id: string;
  createdAt: string;     // ISO string (el backend devuelve strings)
  updatedAt: string;
  deletedAt?: string | null;

  name: string;
  lastFourDigits: string;
  color: string;
  closingDay: number;
  paymentDay: number;
}

// DTO para crear
export interface CreateCreditCardDto {
  name: string;
  lastFourDigits: string;
  color: string;
  closingDay: number;
  paymentDay: number;
}

// DTO para actualizar (parcial)
export type UpdateCreditCardDto = Partial<CreateCreditCardDto>;
```

---

## Template: Props de Componente

```typescript
// Definir interface para props
interface CreditCardItemProps {
  card: CreditCard;
  onPress?: () => void;
  showActions?: boolean;
}

export default function CreditCardItem({
  card,
  onPress,
  showActions = false,
}: CreditCardItemProps) {
  // ...
}
```

---

## Fechas

**El backend devuelve ISO strings**, no objetos `Date`:

```typescript
// ✅ Correcto
export interface BillingPeriod {
  id: string;
  startDate: string;    // "2025-03-01T00:00:00.000Z"
  endDate: string;
  closingDate: string;
}

// ❌ Incorrecto
export interface BillingPeriod {
  startDate: Date;      // NO — la API devuelve strings
}
```

---

## Opcionales

```typescript
// Propiedad puede no existir
deletedAt?: string | null;

// Propiedad requerida pero puede ser null
description: string | null;

// Propiedad opcional con default
showActions?: boolean;  // En props, con default en destructuring
```

---

## Uniones y Literales

```typescript
// Tipo unión para estados
type TransactionStatus = "pending" | "completed" | "cancelled";

// En interface
export interface Transaction {
  id: string;
  status: TransactionStatus;
  type: "purchase" | "payment" | "refund";
}
```

---

## Interfaces vs Types

```typescript
// ✅ Preferir interface para objetos
interface CreditCard {
  id: string;
  name: string;
}

// ✅ Usar type para uniones/intersecciones
type PaymentMethod = CreditCard | BankAccount;
type CreditCardWithStats = CreditCard & { totalDebt: number };

// ✅ Usar type para utilidades
type UpdateDto = Partial<CreateDto>;
type IdOnly = Pick<CreditCard, "id">;
```

---

## Sincronización con Backend

Ver skill `sync-types` para detalles.

**Regla**: Los campos deben reflejar los modelos del backend:

| Backend (model.ts) | Frontend (types/) |
|--------------------|-------------------|
| `CreditCard` | `CreditCard` |
| `Transaction` | `Transaction` |
| `BillingPeriod` | `BillingPeriod` |

---

## Reglas Estrictas

### PROHIBIDO `any`

```typescript
// ❌ NUNCA
const data: any = response.json();

// ✅ Correcto
const data: CreditCard[] = await response.json();

// ✅ Si necesitas tipo desconocido
const data: unknown = await response.json();
if (isValidResponse(data)) {
  // type guard
}
```

### Return Types Explícitos

```typescript
// ✅ En funciones exportadas de servicios
export const getCards = async (): Promise<CreditCard[]> => {
  // ...
};

// ✅ En hooks exportados
export function useCreditCards(): {
  cards: CreditCard[];
  loading: boolean;
  error: string | null;
  refresh: () => void;
} {
  // ...
}
```

---

## Anti-patterns

```typescript
// ❌ any
const items: any[] = [];

// ❌ Interfaces duplicadas en múltiples archivos
// creditCardsApi.ts
interface CreditCard { ... }
// transactionsApi.ts
interface CreditCard { ... }  // Duplicada

// ❌ Types inline repetidos
const [cards, setCards] = useState<{ id: string; name: string }[]>([]);

// ❌ Sin tipar props
function MyComponent(props) { // Falta tipado

// ❌ Fechas como Date
startDate: Date;  // El backend devuelve strings
```

---

## Checklist

- [ ] Interfaces en `shared/types/` si se usan en múltiples features
- [ ] Fechas son `string` (ISO format)
- [ ] Sin `any` — usar tipos concretos o `unknown`
- [ ] Props de componentes tienen interface
- [ ] Funciones exportadas tienen return type explícito
- [ ] DTOs definidos junto a la interface principal
- [ ] `interface` para objetos, `type` para uniones
