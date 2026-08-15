---
name: expo-theme
description: >
  Patrones de estilos: theme tokens, StyleSheet.create, colores, spacing.
  Trigger: Cuando se estilizan componentes, se usan tokens de tema, o se crean StyleSheets.
license: MIT
metadata:
  author: myquota
  version: "1.0"
  auto_invoke:
    - "Styling components"
    - "Using theme tokens"
    - "Creating StyleSheets"
---

## Propósito

Mantener estilos consistentes usando theme tokens y StyleSheet.create().

---

## Theme Tokens

Ubicación: `src/shared/theme/tokens.ts`

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

export const borderRadius = {
  sm: 4,
  md: 8,
  lg: 12,
  full: 9999,
} as const;
```

---

## Importar Tokens

```typescript
import { colors, spacing, fontSizes } from "@/shared/theme/tokens";
```

**NUNCA** hardcodear colores:

```typescript
// ❌ Incorrecto
backgroundColor: "#007BFF",

// ✅ Correcto
backgroundColor: colors.primary,
```

---

## StyleSheet Pattern

```tsx
import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { colors, spacing, fontSizes } from "@/shared/theme/tokens";

export default function MyComponent() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Título</Text>
      <Text style={styles.subtitle}>Subtítulo</Text>
    </View>
  );
}

// Siempre al final del archivo
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bgLight,
    padding: spacing.md,
  },
  title: {
    fontSize: fontSizes.xl,
    fontWeight: "700",
    color: colors.textPrimary,
    marginBottom: spacing.sm,
  },
  subtitle: {
    fontSize: fontSizes.md,
    color: colors.textSecondary,
  },
});
```

---

## Patrones Comunes

### Container Centrado

```typescript
centered: {
  flex: 1,
  justifyContent: "center",
  alignItems: "center",
},
```

### Card

```typescript
card: {
  backgroundColor: colors.white,
  borderRadius: borderRadius.md,
  padding: spacing.md,
  marginBottom: spacing.sm,
  shadowColor: "#000",
  shadowOffset: { width: 0, height: 1 },
  shadowOpacity: 0.1,
  shadowRadius: 2,
  elevation: 2,
},
```

### Row con Space Between

```typescript
row: {
  flexDirection: "row",
  justifyContent: "space-between",
  alignItems: "center",
},
```

### Separator

```typescript
separator: {
  height: 1,
  backgroundColor: colors.border,
  marginVertical: spacing.sm,
},
```

### Button Primario

```typescript
button: {
  backgroundColor: colors.primary,
  paddingVertical: spacing.sm,
  paddingHorizontal: spacing.lg,
  borderRadius: borderRadius.md,
  alignItems: "center",
},
buttonText: {
  color: colors.white,
  fontSize: fontSizes.md,
  fontWeight: "600",
},
buttonDisabled: {
  backgroundColor: colors.textMuted,
},
```

### Input

```typescript
input: {
  backgroundColor: colors.white,
  borderWidth: 1,
  borderColor: colors.border,
  borderRadius: borderRadius.md,
  paddingVertical: spacing.sm,
  paddingHorizontal: spacing.md,
  fontSize: fontSizes.md,
  color: colors.textPrimary,
},
inputFocused: {
  borderColor: colors.primary,
},
```

---

## Estilos Condicionales

```tsx
<View style={[styles.button, disabled && styles.buttonDisabled]}>
  <Text style={styles.buttonText}>Guardar</Text>
</View>

// Con condición
<Text style={[styles.text, isError && { color: colors.danger }]}>
  {message}
</Text>
```

---

## Estilos Dinámicos

Si el estilo depende de props, usar función:

```tsx
const getDynamicStyle = (color: string) => ({
  backgroundColor: color,
  padding: spacing.md,
});

// Uso
<View style={getDynamicStyle(card.color)} />
```

---

## Inline Styles

**Solo usar** para valores dinámicos que no pueden ir en StyleSheet:

```tsx
// ✅ OK — color dinámico del modelo
<View style={{ backgroundColor: card.color }} />

// ❌ Evitar — debería ser StyleSheet
<View style={{ padding: 16, backgroundColor: "#007BFF" }} />
```

---

## Extender Tokens

Si necesitas un color no definido, agrégalo a tokens:

```typescript
// src/shared/theme/tokens.ts
export const colors = {
  // ... existentes
  newColor: "#6C757D",  // Agregar aquí
} as const;
```

**NUNCA** hardcodear colores nuevos en componentes.

---

## Anti-patterns

```typescript
// ❌ Color hardcodeado
backgroundColor: "#007BFF",

// ❌ Spacing hardcodeado
padding: 16,

// ❌ Estilos inline extensos
<View style={{ flex: 1, padding: 16, backgroundColor: "#fff" }} />

// ❌ StyleSheet al inicio del archivo
const styles = StyleSheet.create({...});
export default function Component() {...}

// ❌ Importar de ruta relativa
import { colors } from "../../shared/theme/tokens";  // Usar @/
```

---

## Regla: Dónde Van los Componentes

| Tipo | Ubicación |
|------|-----------|
| Componente de un solo feature | `features/<feature>/components/` |
| Componente UI reutilizable (Button, Card, Input) | `shared/components/` |

---

## Checklist

- [ ] Colores importados de `@/shared/theme/tokens`
- [ ] Spacing importado de tokens
- [ ] StyleSheet al final del archivo
- [ ] No inline styles excepto valores dinámicos
- [ ] Imports usan `@/` alias
- [ ] Nuevos colores/espacios agregados a tokens.ts
