# QuizSlayer mobile — agent rules

Read the root `CLAUDE.md` first; it applies here too. This file adds the app-specific rules.
`AGENTS.md` (from the Expo template) has Expo command tips; check the docs for the installed SDK, not memory.

## The app is UI only
- No business rules in the app. The API decides (limits, tag names, merges, conflicts). The app shows what the API returns and maps error codes to messages.
- The app may do shape checks for convenience (e.g. disable Save while a field is empty), but the server's answer always wins.
- Never import from `apps/api`. Shared API types, when needed, are generated from the API's OpenAPI spec into `packages/`.
- Use glossary words in UI code and strings: Card, Tag, Trash, Move to trash, Restore, Delete permanently.

## Talking to the API
- All requests go through `src/api/` (the base URL comes from config: `EXPO_PUBLIC_API_URL`).
- Every change sends the version the screen showed in `If-Match` (CONFLICT-01). Never send a version the screen did not show.
- On 409 `CardChanged` / `TagChanged` / `TrashChanged`: show the message and reload that screen.
- Screens reload when you return to them; every list has pull to refresh.

## Text, time, theme
- All text goes through i18n (`src/i18n/`, UI-11). No literal UI strings in components. English is the only language in v1.
- Error messages are looked up by the server's error code (`errors.<Code>`); the server's `message` is for logs only.
- Times arrive in UTC; convert to local time only for display.
- Dark mode follows the phone by default (UI-12); the user can pick Light or Dark in Settings (UI-17). Colors come from the theme, never hard-coded in screens.
- Navigation pieces (`ThemeProvider`, `DarkTheme`, `Drawer`, `DrawerItemList`, `usePreventRemove`…) come from `expo-router` or `expo-router/drawer`, never from `@react-navigation/*`: expo-router ships its own copy, and the other copy is silently ignored (ADR-012).

## Decide alone vs ask
- Follow the root `CLAUDE.md`. Layout, spacing, typography and the exact palette hex values are yours to decide.
- Behaviour the user notices (what happens when…, wording of messages, limits) is Jackkie's: write it in `docs/domain/open-questions.md`, keep going on what is not blocked.

## Checks before a commit
`pnpm --filter @quizslayer/mobile lint`, `typecheck`, `test`.
