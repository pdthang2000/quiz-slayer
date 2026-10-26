# ADR-012: Mobile app stack — Expo SDK 58, Expo Router drawer, TanStack Query, i18next

- Date: 2026-10-26
- Status: accepted (technical, decided alone per CLAUDE.md; Jackkie reviews at Checkpoint 4a)

## Context
Phase 4 builds the Card Library app (ADR-006: React Native + Expo, UI only). Requirements: a left side drawer (UI-09), dark mode that follows the phone (UI-12), all text through i18n with English only for now (UI-11), screens that reload when you return to them, pull to refresh, "load more" lists, and every change sending the version the screen showed in `If-Match` (CONFLICT-01). Daily development runs in Expo Go on Jackkie's iPhone, so every native module must be one Expo Go bundles.

## Decision
- **Expo SDK 58** (current stable; the App Store's Expo Go runs the latest SDK only). It needs Node ≥ 22.13, so the repo pins Node 24 LTS in `.nvmrc`.
- **Navigation: Expo Router** (file-based, `src/app/`) with its **Drawer** layout (`expo-router/drawer`, on react-native-gesture-handler + reanimated, both in Expo Go). Stacks inside the drawer for editor / detail screens.
- **Server data: TanStack Query v5.** `useInfiniteQuery` for cursor paging ("load more"), `refetch` for pull to refresh, `useFocusEffect` → refetch so a screen reloads when you return to it, invalidation after each change.
- **API client: a small hand-written `fetch` wrapper** (`src/api/`). It reads the base URL from config, sets `If-Match: "<version>"` on versioned writes, and turns error responses into an `ApiError` with the server's `error` code. Types are written by hand for now; generating them from an OpenAPI spec into `packages/` (CLAUDE.md) waits until the API grows.
- **Forms: no form library.** The only form (card editor) has three fields; `useState` is enough. Validation is the server's (CLAUDE.md: the app has no business rules); its 400 codes are shown next to the field.
- **i18n: i18next + react-i18next**, one `en.json`. Error codes from the error table map to message keys (`errors.<Code>`); unknown codes fall back to "Something went wrong". `expo-localization` reads the phone language; v1 always resolves to English.
- **Theme:** `useColorScheme()` picks light or dark tokens; `app.json` `userInterfaceStyle: automatic`. The tag palette (UI-07, TAG-13) has a light and a dark hex per key in the app.
- **Tests: jest-expo + @testing-library/react-native** (unit tests for the API client and error mapping, component tests for screens with a mocked client). **Lint:** `eslint-config-expo` via `expo lint`. **Types:** TypeScript strict, `tsc --noEmit`.

## Options considered
- React Navigation directly instead of Expo Router: same drawer underneath, more wiring; Expo Router is Expo's default.
- SWR or hand-written fetch state instead of TanStack Query: TanStack has infinite queries, focus refetch and invalidation built in, which this app needs everywhere.
- react-hook-form: worth it for many fields or client-side rules; we have neither.
- Generated API types now: not worth the OpenAPI setup for ~20 endpoints yet.
- Expo SDK 54–57: would keep Node 20, but Expo Go from the App Store only runs the current SDK.

## Consequences
- Developers switch to Node 24 (`nvm use`) in this repo; the API runs on it too.
- Adding a native module that Expo Go lacks means moving to a development build (ADR-006 local build).
- Hand-written API types can drift from the server; e2e tests on the API side and the app's client tests catch the obvious cases. Revisit with OpenAPI generation.
