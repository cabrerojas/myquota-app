# MyQuota App — AI Agent Guidelines

Guía para agentes de IA que trabajan en `myquota-app`. Para patrones detallados, invoca el skill correspondiente.

---

## How to Use This Guide

- Start here for project-wide norms (arquitectura, convenciones, TypeScript).
- For detailed patterns, invoke the skill listed in the tables below.
- Each skill contains templates, examples, and checklists específicos.

---

## Available Skills

### Expo/React Native Skills

| Skill           | Descripción                                              | URL                                       |
| --------------- | -------------------------------------------------------- | ----------------------------------------- |
| `expo-module`   | Crear features completos (screens, services, components) | [SKILL.md](skills/expo-module/SKILL.md)   |
| `expo-routes`   | expo-router patterns, layouts, drawer config             | [SKILL.md](skills/expo-routes/SKILL.md)   |
| `expo-services` | Servicios API con requestWithAuth                        | [SKILL.md](skills/expo-services/SKILL.md) |
| `expo-auth`     | useAuth hook, token management, Google Sign-In           | [SKILL.md](skills/expo-auth/SKILL.md)     |
| `expo-screens`  | Screens con data fetching, loading/error states          | [SKILL.md](skills/expo-screens/SKILL.md)  |
| `expo-types`    | TypeScript patterns, interfaces compartidas              | [SKILL.md](skills/expo-types/SKILL.md)    |
| `expo-theme`    | Theme tokens, StyleSheet patterns                        | [SKILL.md](skills/expo-theme/SKILL.md)    |
| `sync-types`    | Sincronizar tipos backend→frontend                       | [SKILL.md](skills/sync-types/SKILL.md)    |

### Meta Skills

| Skill        | Descripción                                | URL                                    |
| ------------ | ------------------------------------------ | -------------------------------------- |
| `skill-sync` | Sincroniza Auto-invoke tables en AGENTS.md | [SKILL.md](skills/skill-sync/SKILL.md) |

### Auto-invoke Skills

When performing these actions, ALWAYS invoke the corresponding skill FIRST:

| Action                       | Skill           |
| ---------------------------- | --------------- |
| Creating a new feature       | `expo-module`   |
| Adding a new screen          | `expo-module`   |
| Setting up feature structure | `expo-module`   |
| Creating routes              | `expo-routes`   |
| Configuring navigation       | `expo-routes`   |
| Adding drawer screens        | `expo-routes`   |
| Modifying layouts            | `expo-routes`   |
| Creating API services        | `expo-services` |
| Making HTTP requests         | `expo-services` |
| Using requestWithAuth        | `expo-services` |
| Working with authentication  | `expo-auth`     |
| Managing tokens              | `expo-auth`     |
| Implementing Google Sign-In  | `expo-auth`     |
| Creating screens with data   | `expo-screens`  |
| Handling loading states      | `expo-screens`  |
| Handling error states        | `expo-screens`  |
| Defining interfaces          | `expo-types`    |
| Working with shared types    | `expo-types`    |
| Using TypeScript patterns    | `expo-types`    |
| Styling components           | `expo-theme`    |
| Using theme tokens           | `expo-theme`    |
| Creating StyleSheets         | `expo-theme`    |
| Modifying shared types       | `sync-types`    |
| Syncing with backend models  | `sync-types`    |

## <!-- Skills extracted from metadata.auto_invoke in each SKILL.md -->

## Tech Stack (Quick Reference)

| Dato      | Valor                           |
| --------- | ------------------------------- |
| Framework | React Native 0.81 + Expo SDK 54 |
| Language  | TypeScript 5.9 (strict)         |
| Routing   | expo-router v6 (file-based)     |
| Backend   | REST API en myquota-backend     |
| Estilos   | StyleSheet.create()             |
| Auth      | Google Sign-In → JWT Bearer     |

**Entry point**: `src/app/_layout.tsx` — Stack raíz con index, login, (drawer)

---

## Project Structure

```
src/
├── app/                          # Rutas (expo-router file-based)
│   ├── _layout.tsx               # Stack raíz
│   ├── index.tsx                 # Splash / redirect
│   ├── login.tsx                 # Login screen
│   └── (drawer)/
│       ├── _layout.tsx           # Drawer config
│       └── *.tsx                 # Thin wrappers
│
├── config/
│   └── api.ts                    # API_BASE_URL
│
├── features/                     # Feature-based modules
│   └── <feature>/
│       ├── components/           # Feature UI components
│       ├── hooks/                # Custom hooks
│       ├── screens/              # Full screens
│       ├── services/             # API calls
│       └── types/                # Feature-specific types
│
└── shared/                       # Shared code
    ├── components/               # Reusable UI components
    ├── hooks/                    # Shared hooks
    ├── types/                    # Global interfaces
    ├── theme/                    # Design tokens
    └── utils/                    # Pure helpers
```

---

## Critical Rules (ALWAYS / NEVER)

### ALWAYS

1. **Thin wrappers** en `src/app/` — solo importan Screen de features
2. **requestWithAuth** para llamadas autenticadas
3. **Imports con alias** `@/` (`@/*` → `src/*`)
4. **StyleSheet.create()** para estilos
5. **Colores desde tokens** `@/shared/theme/tokens`
6. **Interfaces en shared/types** si se usan en múltiples features
7. **try/catch** en screens con data fetching
8. **Loading + Error states** en screens con datos

### NEVER

1. **`any`** — usar tipos concretos o `unknown`
2. **fetch() directo** — usar `requestWithAuth`
3. **Rutas relativas** (`../../`) — usar alias `@/`
4. **Colores hardcodeados** — importar de tokens
5. **Lógica en src/app/** — va en features/
6. **Interfaces duplicadas** — consolidar en shared/types

---

## Naming Conventions

| Tipo                  | Convención                 | Ejemplo               |
| --------------------- | -------------------------- | --------------------- |
| Componentes/Screens   | PascalCase                 | `DashboardScreen.tsx` |
| Servicios             | camelCase                  | `creditCardsApi.ts`   |
| Hooks                 | camelCase + use            | `useAuth.ts`          |
| Archivos de tipos     | camelCase                  | `creditCard.ts`       |
| Interfaces            | PascalCase                 | `CreditCard`          |
| Funciones de servicio | camelCase verbo+sustantivo | `getCreditCards()`    |
| Constantes            | UPPER_SNAKE                | `API_BASE_URL`        |

---

## Import Order

```typescript
// 1. React / React Native
import React, { useState, useEffect } from "react";
import { View, Text, StyleSheet } from "react-native";

// 2. Librerías externas
import { useRouter } from "expo-router";

// 3. Imports internos (@/)
import { CreditCard } from "@/shared/types/creditCard";
import { getCreditCards } from "@/features/creditCards/services/creditCardsApi";
import { colors, spacing } from "@/shared/theme/tokens";
```

---

## Commands

```bash
npm run start    # Inicia Metro/Expo
npm run android  # Android
npm run ios      # iOS
npm run web      # Web
npm run lint     # ESLint
npm run test     # Jest
```

---

## QA Checklist

Before delivering code:

- [ ] Files follow feature-first architecture
- [ ] `src/app/` files are thin wrappers only
- [ ] Services use `requestWithAuth` with explicit return types
- [ ] Interfaces in `shared/types/` if used across features
- [ ] Colors from `@/shared/theme/tokens`
- [ ] Imports use `@/` alias
- [ ] No `any` introduced
- [ ] Screens handle loading + error states
- [ ] `npm run lint` passes
- [ ] Types synced with backend models if modified

# Skills & Docs QA

- [ ] Ejecutar `skill-audit` antes de entregar cambios en skills o AGENTS.md
- [ ] Usar `skill-creator` al crear skills nuevos
- [ ] Ejecutar `./skills/skill-sync/assets/sync.sh` antes de PR si cambiaste skills o AGENTS.md

---

## Technical Debt (DO NOT ADD MORE)

1. **Colores hardcodeados** — 349+ usos de hex directos, migrar a tokens
2. **AsyncStorage legacy** — Auth usa SecureStore + AsyncStorage, migrar solo a SecureStore

---

## Key Files

| File                                 | Purpose                                 |
| ------------------------------------ | --------------------------------------- |
| `src/app/_layout.tsx`                | Root layout, navigation structure       |
| `src/app/(drawer)/_layout.tsx`       | Drawer configuration                    |
| `src/config/api.ts`                  | API_BASE_URL                            |
| `src/features/auth/hooks/useAuth.ts` | requestWithAuth, Google Sign-In, tokens |
| `src/shared/theme/tokens.ts`         | Design tokens (colors, spacing)         |
| `src/shared/types/`                  | Shared interfaces                       |
| `src/shared/utils/format.ts`         | formatCurrency, formatDate              |

---

## Git Workflow

### ALWAYS

1. **Crear rama** para cada desarrollo — NUNCA commitear directo a `master`
2. **Branch naming**: `feat/<nombre>`, `fix/<nombre>`, `refactor/<nombre>`, `chore/<nombre>`
3. **Crear PR** con `gh pr create` al terminar el desarrollo
4. **Commits descriptivos** con prefijo: `feat:`, `fix:`, `refactor:`, `chore:`, `docs:`
5. **Volver a `master`** después de crear el PR
6. **Verificar rama actual** antes de empezar cualquier desarrollo

### NEVER

1. **Push directo a `master`** — siempre via PR
2. **`git push --force`** sin confirmación explícita del usuario
3. **Mezclar scopes** en un PR — un PR = un tema

### Flujo

```bash
# Antes de empezar: verificar rama
git branch --show-current
# Si no estoy en master → evaluar si la rama es del mismo tema
# Si es otro tema → git checkout master

git checkout -b feat/mi-feature       # 1. Crear rama desde master
# ... hacer cambios ...
git add <archivos>                    # 2. Stage cambios relevantes
git commit -m "feat: descripción"     # 3. Commit descriptivo
git push -u origin feat/mi-feature    # 4. Push rama
gh pr create --base master            # 5. Crear PR
git checkout master                   # 6. Volver a master
```
