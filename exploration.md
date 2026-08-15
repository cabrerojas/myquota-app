# Exploration: "Etapa 0" Onboarding Flow

## Current State

When a new user signs up via Google Sign-In and lands on the app for the first time, they get dumped directly into `DashboardScreen` with zero credit cards, zero transactions, zero billing periods. The screen doesn't crash outright — it has guards like `selectedCardId &&` and `creditCards.length > 0` — but it shows a completely useless blank page. No guidance, no CTA, no explanation of what the app does or what the first step should be.

There is **zero onboarding infrastructure** in the entire codebase — no references to "onboarding", "firstTime", "wizard", or "pendingAction" beyond a stale `AsyncStorage` key that gets cleared on logout.

---

## 1. Post-Auth Redirect Mechanism

### Exact interception points

| File | Line | What it does |
|------|------|--------------|
| `src/app/index.tsx` | 18 | After checking token presence, redirects to `/(drawer)/dashboard` |
| `src/features/auth/hooks/useAuth.ts` | 92 | After successful Google Sign-In, calls `router.replace("/(drawer)/dashboard")` |

**To modify**: Both locations. The logic should be:

1. In `src/app/index.tsx`: after confirming the user has a token, **check if they have credit cards** before redirecting. If zero cards → redirect to `/(onboarding)`. If cards exist → redirect to `/(drawer)/dashboard` as before.
2. In `useAuth.ts` line 92: same check — after `persistSession`, check card count, redirect accordingly.

The ideal approach: **centralize the decision in `index.tsx`** since it already runs on every cold/warm start. The `useAuth.ts` redirect is only for the initial login moment.

### How to detect "new user" without a backend flag

The simplest approach: **`(await getCreditCards()).items.length === 0`** — no cards = new user. This avoids adding extra state (flags in storage, DB columns, etc.) and automatically re-triggers onboarding if a user somehow has zero cards (e.g., after deleting all of them).

If we want to be more explicit about "onboarding completed", we could store a key `hasCompletedOnboarding` in SecureStore, but the card-length check is simpler and self-healing.

---

## 2. Screen Structure — Adding a New Route

### Current routing architecture

```
src/app/
├── _layout.tsx          # Root Stack: index, login, (drawer), (screens)
├── index.tsx            # Splash/redirect logic
├── login.tsx            # Auth screen
├── (drawer)/
│   ├── _layout.tsx      # Drawer config (10 screens)
│   └── {screen}.tsx     # Thin 5-line wrappers
├── (screens)/
│   ├── _layout.tsx      # Stack for modals
│   └── {screen}.tsx     # Modal route wrappers
└── categories/
    └── select.tsx
```

### Adding the onboarding route group

**Recommended: create a new `(onboarding)/` route group** — same pattern as `(drawer)/` and `(screens)/`, but a standalone Stack (not Drawer) since we don't want the drawer visible during onboarding.

Steps:
1. Create `src/app/(onboarding)/_layout.tsx` — Stack layout with `headerShown: false`
2. Create `src/app/(onboarding)/index.tsx` — Step 1 screen (thin wrapper)
3. Optionally create `src/app/(onboarding)/step2.tsx`, `step3.tsx` if multi-step
4. Register in root `_layout.tsx`: add `<Stack.Screen name="(onboarding)" />`
5. After onboarding completes, `router.replace("/(drawer)/dashboard")`

### Why not a Modal?

A modal (`(screens)/`) would:
- Show on top of the drawer layout (confusing)
- Not prevent drawer access (user could swipe open drawer mid-onboarding)
- Be dismissible (user could swipe down to cancel)

A dedicated route group is the correct expo-router pattern: it gives full control, prevents navigation away, and the Stack layout can be styled however needed.

---

## 3. Form Patterns — Validation, Loading, Error Handling

### Existing patterns (from BillingPeriodFormModal & AddDebtScreen)

| Pattern | Implementation | Found in |
|---------|---------------|----------|
| **Validation** | `if (!field) { Alert.alert("Error", "msg"); return; }` — inline checks in submit handler | Both |
| **Loading state** | `isSubmitting` boolean → `ActivityIndicator` replaces button text + `disabled` | Both |
| **Error handling** | `try/catch` → `error instanceof Error ? error.message : "fallback"` | Both |
| **User feedback** | `Alert.alert("Éxito", "msg")` on success | Both |
| **Date picking** | `DateTimePicker` from `@react-native-community/datetimepicker` with button trigger | Both |
| **Keyboard** | `KeyboardAvoidingView` with `behavior={Platform.OS === "ios" ? "padding" : "height"}` | Both |
| **Scroll** | `ScrollView` inside modal | BillingPeriodFormModal |
| **Button disabled** | `opacity: 0.6` style when submitting | Both |

### Modal pattern for forms (BillingPeriodFormModal)

```tsx
<Modal visible transparent animationType="slide" onRequestClose={onClose}>
  <KeyboardAvoidingView behavior={...} style={overlay}>
    <View style={modalContainer}>
      <ScrollView>
        <Text style={title}>{title}</Text>
        {/* Form fields */}
        {showPicker && <DateTimePicker ... />}
        <ButtonRow>
          <TouchableOpacity onPress={onClose}>Cancelar</TouchableOpacity>
          <TouchableOpacity onPress={handleSubmit} disabled={isSubmitting}>
            {isSubmitting ? <ActivityIndicator /> : <Text>Guardar</Text>}
          </TouchableOpacity>
        </ButtonRow>
      </ScrollView>
    </View>
  </KeyboardAvoidingView>
</Modal>
```

### Screen pattern for forms (AddDebtScreen)

```tsx
<KeyboardAvoidingView>
  <ScrollView style={container} contentContainerStyle={content}>
    {/* Form fields */}
    <TouchableOpacity style={submitBtn} onPress={handleSubmit} disabled={submitting}>
      {submitting ? <ActivityIndicator /> : <Text>Action</Text>}
    </TouchableOpacity>
  </ScrollView>
</KeyboardAvoidingView>
```

**Recommendation**: Use the **Screen pattern** for onboarding steps (full-screen, not modal) since we want the user to feel like they're going through a guided flow, not filling out a dialog.

---

## 4. Dashboard Crash Points — Empty Data Analysis

### Component-by-component breakdown with zero cards

| Component | Guard | Behavior when empty |
|-----------|-------|---------------------|
| `FinancialHealthIndicator` | `!budget` → returns null | **Safe** — returns null if no budget |
| `CardsSection` | `cardCount === 0` → shows `EmptyCards` | **Safe** — renders "Sin tarjetas registradas" |
| `CreditCardAlertBanner` | `creditCards.length > 0` | **Safe** — not rendered |
| "Import" button | `selectedCardId &&` | **Safe** — not rendered |
| Categorize banner | `uncategorizedCount > 0` | **Safe** — not rendered |
| `MonthSummaryCard` | `selectedCardId &&` | **Safe** — not rendered |
| `DebtIndicatorCard` | `!summary` → returns null | **Safe** — returns null |
| `MonthlyStats` | `selectedCardId &&` | **Safe** — not rendered |
| Transactions section | `transactions.length === 0` | **Safe** — shows "No hay transacciones aún" |

**Verdict**: The DashboardScreen is remarkably resilient — it doesn't **crash** with zero data. But it renders: just a welcome message + "Sin tarjetas registradas" + "No hay transacciones aún". That's the **usability problem**, not a crash.

### Real crash vectors (not empty, but edge cases)

| Risk | File | Why |
|------|------|-----|
| `debtSummary?.nextMonthCLP` being `undefined` | `DashboardScreen.tsx:249-250` | Passed as `debtSummary?.nextMonthCLP` which defaults to 0 — safe |
| `creditCards[0].id` on empty array | `DashboardScreen.tsx:68` | Guarded by `creditCards.length > 0` |
| `useDebtSummary()` fetch failure | `DashboardScreen.tsx:59` | React Query handles errors gracefully |
| `selectedCardId` null | `DashboardScreen.tsx:96` | Guarded at top of `loadTransactions` |

**No critical crashes found with empty data.** The problem is purely UX: a completely blank, useless home screen.

---

## 5. API Client Structure & Patterns

### Architecture

```typescript
// 1. Raw fetch with auth — in useAuth.ts
export async function requestWithAuth(input: RequestInfo, init?: RequestInit) {
  // Adds Bearer token, auto-refreshes on 401, emits session expired on failure
}

// 2. Service functions — per feature
export const getCreditCards = async (): Promise<PaginatedResponse<CreditCard>> => {
  const response = await requestWithAuth(`${API_BASE_URL}/creditCards`);
  // Parse, validate, throw on !ok
};

// 3. React Query hooks — in same service file
export const useCreditCards = () => {
  return useQuery({
    queryKey: ["creditCards"],
    queryFn: () => getCreditCards().then(r => r.items),
  });
};
```

### API endpoints relevant to onboarding

| Endpoint | Method | What it needs | File |
|----------|--------|---------------|------|
| `/creditCards` | GET | Nothing | `creditCardsApi.ts` |
| `/creditCards/{id}` | GET | card ID | `creditCardsApi.ts` |
| `/creditCards/{id}/transactions/import-bank-transactions` | POST | card ID | `transactionsApi.ts` |
| `/creditCards/{id}/transactions/manual` | POST | card ID + payload | `transactionsApi.ts` |
| `/users/me` | GET | Nothing | `userApi.ts` |

### Key gap
There is **NO credit card creation API** in the frontend (`createCreditCard` doesn't exist). The only way to get cards is through email import or manual creation (which needs a card first). This is a critical constraint for onboarding.

### Pattern to follow when adding new API calls

```typescript
export const createCreditCard = async (data: CreateCreditCardDto): Promise<CreditCard> => {
  const response = await requestWithAuth(`${API_BASE_URL}/creditCards`, {
    method: "POST",
    body: JSON.stringify(data),
  });
  if (!response.ok) {
    const err = await response.json().catch(() => null);
    throw new Error(err?.message || `HTTP ${response.status}`);
  }
  return response.json();
};

// React Query mutation hook
export const useCreateCreditCard = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createCreditCard,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["creditCards"] }),
  });
};
```

---

## 6. Theme & Styling Conventions

### Design tokens (`@/shared/theme/tokens.ts`)

| Category | Values |
|----------|--------|
| **Primary** | `#007BFF` blue |
| **Background** | `#F8F9FA` (light), `#FFFFFF` |
| **Text** | `#212529` primary, `#495057` secondary, `#868E96` muted |
| **Border** | `#DEE2E6`, `#E9ECEF` |
| **Semantic** | `#DC3545` danger, `#28A745` success, `#FFC107` warning |
| **Spacing** | `4/8/16/24/32` (xs/sm/md/lg/xl) |
| **Font sizes** | `11/13/15/18/22/28` |
| **Border radius** | `6/10/14/18/999` |

### Style conventions

- All styles use `StyleSheet.create()` at bottom of file
- Colors should come from tokens (but 349+ hardcoded hexes exist as tech debt)
- Shadows: `elevation: 2-4` on Android, `shadowColor/shadowOffset/shadowOpacity/shadowRadius` on iOS
- Card radius: typically `14-16`
- Form inputs: `borderWidth: 1, borderColor: "#DEE2E6", borderRadius: 10, padding: 12-14`
- Button primary: `backgroundColor: "#007BFF", borderRadius: 10-12, padding: 14-16`

### For onboarding: design consistency checklist

- [ ] Use `colors.bgLight` (`#F8F9FA`) for screen background
- [ ] Use `colors.primary` (`#007BFF`) for action buttons
- [ ] Use `spacing.md` (16) for content padding
- [ ] Use `borderRadius.md` (10) for cards and inputs
- [ ] Import from `@/shared/theme/tokens`, avoid hex literals

---

## 7. Existing Empty States

| Screen | Empty state | Pattern |
|--------|-------------|---------|
| `CreditCardsScreen` (standalone) | Centered: icon + "Sin tarjetas" + subtitle | `centered` View with `Ionicons` + `Text` |
| `CardsSection` (dashboard) | SVG illustration + "Sin tarjetas registradas" + CTA subtitle | SVG card + stacked Text + `emptyStyles` StyleSheet |
| Dashboard transactions | `Ionicons receipt-outline` + "No hay transacciones aún" | Centered View |
| `ManualDebtsScreen` | Icon + "Sin deudas manuales" + subtitle | `FlatList.ListEmptyComponent` + centered View |

All follow the same pattern: **icon (64px, `#CED4DA` gray) + title (bold, 16-20px) + subtitle (14px, muted color)**.

---

## 8. Recommended Approach

### Onboarding Wizard Architecture

**Create a new `(onboarding)/` route group:**

```
src/app/
├── (onboarding)/
│   ├── _layout.tsx         # Stack without drawer
│   └── index.tsx           # OnboardingScreen (thin wrapper)
├── _layout.tsx             # Add Stack.Screen name="(onboarding)"
```

**No multi-step routes needed** — a single `OnboardingScreen` with internal step state (wizard pattern, not route-per-step) keeps it simple:

```typescript
const [step, setStep] = useState(0);
const steps = [
  { title: "Bienvenido", component: WelcomeStep },
  { title: "Tu primera tarjeta", component: AddCardStep },
  { title: "¡Listo!", component: DoneStep },
];
```

### Step Design

| Step | Content | Action |
|------|---------|--------|
| **1 — Welcome** | App logo + "Bienvenido a MyQuota" + explanation (controla tus gastos, importa transacciones, organiza cuotas) | "Comenzar" → next |
| **2 — Add card** | Form: card type, last 4 digits, card holder name, limits. Needs backend endpoint `POST /creditCards` | "Guardar tarjeta" → API call → next |
| **3 — Done** | Success illustration + "Tu tarjeta fue agregada" + what to do next (import transactions) | "Ir al Dashboard" → `router.replace("/(drawer)/dashboard")` |

### Backend dependency

Step 2 requires either:
- **Option A (recommended)**: Add `POST /creditCards` to the backend with a `createCreditCard` DTO
- **Option B (fallback)**: Skip Step 2, make onboarding purely informational, and guide user to login screen → "You'll create your first card when you import transactions"

### Redirect logic change

**In `src/app/index.tsx`**, replace:
```typescript
return isAuthenticated ? <Redirect href="/(drawer)/dashboard" /> : <Redirect href="/login" />;
```
with:
```typescript
return isAuthenticated ? <Redirect href="/(onboarding)" /> : <Redirect href="/login" />;
```
And in `OnboardingScreen`, on mount, check if user already has cards → if yes, redirect to dashboard immediately. This makes the check self-healing.

### Files to modify

| File | Change |
|------|--------|
| `src/app/index.tsx` | Change redirect target to `/(onboarding)` or keep forwarding to dashboard after card check |
| `src/app/_layout.tsx` | Add `<Stack.Screen name="(onboarding)" />` |
| **NEW** `src/app/(onboarding)/_layout.tsx` | Create Stack layout |
| **NEW** `src/app/(onboarding)/index.tsx` | Create thin wrapper → OnboardingScreen |
| **NEW** `src/features/onboarding/screens/OnboardingScreen.tsx` | Main wizard |
| **NEW** `src/features/onboarding/services/creditCardsOnboardingApi.ts` | `createCreditCard` API call |
| **NEW** `src/features/onboarding/components/` | Step components for wizard |

### Risks

| Risk | Mitigation |
|------|------------|
| No `POST /creditCards` backend endpoint | Option B: informational-only onboarding, or implement endpoint first |
| User refreshes mid-onboarding | `index.tsx` checks card count → if 0, redirects back to `(onboarding)` |
| User closes app mid-onboarding | Same as above — card count check is idempotent |
| Onboarding feels long | Keep to 3 steps max, each step is one screen tap |
| Hardcoded hex values in new components | Enforce `@/shared/theme/tokens` imports via this skill's instructions |

### Ready for Proposal

**Yes.** This exploration has all the data needed to write a detailed SDD proposal. Key open question: does the backend have or can it get a `POST /creditCards` endpoint? The orchestrator should verify with the user before proceeding to spec/design.
