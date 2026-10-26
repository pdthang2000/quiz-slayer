# QuizSlayer — build plan

Status: Phases 0–3 done (tags phase-0..phase-3); updated 2026-10-25. Jackkie reviews at every checkpoint (🔍) before the next phase starts.
Sizes are rough effort, not dates: S = a sitting, M = a few sittings, L = a week or more of evenings.

Order: finish Card Library end-to-end first (small, fully modelled), then model and build Daily Practice (the core).

```
Phase 0 Setup ─► 1 Card domain ─► 2 Persistence ─► 3 API ─► 4 Frontend
                                                                │
              7 Ingestion ◄─ 6 Daily Practice code ◄─ 5 Daily Practice model
```

---

## Phase 0 — Project setup (S)
- `git init`, first commit with the docs.
- pnpm workspace at the root (ADR-007): `apps/api` now; `apps/mobile` is scaffolded at the start of Phase 4.
- Nest app scaffold in `apps/api`, strict TypeScript, Jest.
- PostgreSQL via `docker-compose.yml` at the root; Prisma initialised in `apps/api` (empty schema).
- ESLint `no-restricted-imports` rule on `apps/api/src/**/domain/**` (blocks `@nestjs/*`, `@prisma/client`, `class-validator`, `class-transformer`, and imports from other layers).
- Folder skeleton for `apps/api/src/card-library/` (domain, application, infrastructure, api).

🔍 **Checkpoint 0**
- [x] `npm test` and `npm run lint` pass.
- [x] Proof the guard works: add `import { Injectable } from '@nestjs/common'` in a domain file → lint fails → remove it.
- [x] `docker compose up` starts Postgres; `npx prisma migrate dev` runs.
- [x] Commit tagged `phase-0`.

---

## Phase 1 — Card Library domain, pure TypeScript (M)
Source: `docs/domain/contexts/card-library.md`. Tests first, named by rule ID.
- Value objects: `TagName` (TAG-01), `CardFront` / `CardBack` (CARD-01, CARD-02), `TagColor` (TAG-12, UI-07 palette).
- `Card` aggregate: create, edit, addTag, removeTag, replaceTagForMerge (CARDTAG-04), moveToTrash, restore, state rules (TRASH-*, CARDTAG-*).
- `Tag` aggregate: create, rename.
- Domain errors (`CardIsTrashed`, `TooManyTags`, `InvalidTagName`, ...).
- Domain events (`CardMovedToTrash`, `TagsMerged`, ...).
- Repository interfaces (no implementation yet).
- Small script `npm run rules:coverage`: lists every rule ID in `card-library.md` and whether a test name starts with it.

🔍 **Checkpoint 1**
- [x] `rules:coverage` shows every domain-level `confirmed` rule covered (UI-* and READ-01 are covered in later phases).
- [x] No imports from Nest or Prisma in `domain/` (lint passes).
- [x] You read `Card.ts` and can map every public method to rule IDs. Anything you can't map is either missing from the docs or shouldn't be there.
- [x] Commit tagged `phase-1`.

---

## Phase 2 — Persistence (M)
- Prisma schema: `card` (state, front, back), `tag` (name, color), `card_tag`; unique `(user_id, name)` on tag (TAG-03); cascade delete of `card_tag` (TAG-06, TRASH-05).
- Optional DB guard: `CHECK (name IS NFC NORMALIZED)` (ADR-003).
- Repositories + mappers: `findActive`, `findTrashed`, `findByTag` (Active + Trashed, for merge), `save`, `saveAll`, `delete`.
- Row lock for merge via `$queryRaw` (`SELECT ... FOR UPDATE`) in the tag repository (TAG-10).
- Integration tests against real Postgres (not mocks).

🔍 **Checkpoint 2**
- [x] READ-01: a trashed card is not returned by any Active read (one test per read).
- [x] TAG-03: inserting a duplicate tag name fails at the DB too.
- [x] TAG-10: a merge where one card throws rolls back completely (cards and both tags unchanged).
- [x] TRASH-04 / TRASH-06: restore brings tags back; a tag deleted while the card was trashed is gone after restore.
- [x] No Prisma type leaks outside `infrastructure/`.
- [x] Commit tagged `phase-2`.

---

## Phase 3 — Application + API (M)
- Use cases (Commands table, C-23): createCard, editCard (front, back and tags in one Save, CARD-07), moveToTrash, restore, deletePermanently, emptyTrash, renameTag (merge: TAG-08, TAG-10, TAG-15), deleteTag; list/search queries. No tagCard/untagCard/createTag (C-23, UI-08).
- Controllers + DTOs; exception filter mapping domain errors → HTTP (e.g. `CardIsTrashed` → 409, `InvalidTagName` → 400).
- User: single demo user (Q-09, confirmed). Keep `userId` on every aggregate and query so real login can be added later.
- Merge confirmation: rename onto an existing name → 409 with the preview counts, resend with `confirmMerge` (TAG-15).

🔍 **Checkpoint 3**
- [x] End-to-end scenario passes via HTTP:
  1. create [Dog | a mammal that barks] with #Animals #pitbull → both tags exist
  2. rename pitbull → Animals → merge preview, then merge → Dog has only #Animals
  3. move Dog to trash → hidden from list and tag count
  4. restore → Dog back with #Animals
- [x] No domain rule in controllers (spot-check every controller).
- [x] Run a DDD review skill (`ddd-validate` or `wondelai`) on `src/card-library`; fix or document every finding.
- [x] Commit tagged `phase-3`.

---

## Phase 4 — Card Library mobile app (M–L)
React Native with Expo (ADR-006), online-only. Scaffold `apps/mobile` in the workspace and give it its own CLAUDE.md (UI only; no business rules; never import `apps/api`). Test on Jackkie's iPhone (local build, free Apple ID); friends get an Android APK.
UI-06 is already in mobile form (long-press + bottom sheet).
Hosting for testing outside home Wi-Fi: a VPS running Nest + Postgres in Docker (H-01). At home, the phone uses the Mac's LAN IP.
Stack: ADR-012 (Expo SDK 58, Expo Router drawer, TanStack Query, i18next). API client sends versions in `If-Match` (CONFLICT-01), maps every error code to an i18n message (UI-11), reloads the screen on `CardChanged` / `TagChanged` / `TrashChanged`; screens reload on return; pull to refresh on every list.

Built in four slices. After each: tests, lint, tsc, commit, tag, then stop so Jackkie tries it on his iPhone (Expo Go).
- **4a Cards** — list (front only, tap flips, ⋯ Edit · Tags · Delete, UI-10; Undo toast, UI-13), search + tag chip filter (READ-02/03/05), load more, editor with chip input + autocomplete (UI-01, UI-02, CARD-07, CARD-08). → tag `phase-4a`
- **4b Tags** — Tag list A–Z as colored buttons, long-press bottom sheet Show cards · Rename · Delete (UI-03, UI-05, UI-06, TAG-15 merge dialog), ⋯ → Tags view (UI-14), a tag's card list with ✕ / checkboxes / Remove (n) and the "+ Add cards" picker (CARDTAG-07/08, 100 cap in the app). → tag `phase-4b`
- **4c Trash** — newest trashed first, load more, total, restore, delete permanently, empty trash dialog with count (TRASH-07, TRASH-11, TRASH-12). → tag `phase-4c`
- **4d Study** (STUDY-01..06) — from the current list filter, ids first then content 20 at a time, newest first + Shuffle, choose the starting side, flip + Next. → tag `phase-4d`

🔍 **Checkpoint 4**
- [ ] You use it yourself for real study for a week.
- [ ] Every friction you hit is written into `open-questions.md` or `backlog.md`, not fixed silently.
- [ ] Commit tagged `phase-4` (Card Library v1).

---

## Phase 5 — Model Daily Practice, docs only (M)
Run `/domain-interview`. Order:
1. Q-12 origin of system content when Jackkie provides it.
2. Q-01 what is a day, Q-02 is 10 strict, Q-03 missed days / streak.
3. Q-04 answer types in v1, Q-05 selection, Q-06 mistakes → cards, Q-07 several tracks.
4. Event storming for one full day of practice.

🔍 **Checkpoint 5**
- [ ] `daily-practice.md` rules for `DailySession` all `confirmed`; no open question blocks the aggregate.
- [ ] Glossary terms for Daily Practice and Question Bank confirmed.
- [ ] Commit tagged `phase-5`.

---

## Phase 6 — Daily Practice + minimal Question Bank (L)
- `DailySession` aggregate, tests first (DP-*).
- Question Bank with a small hand-entered set (e.g. 50 items) — no ingestion yet.
- `MistakeRecorded` → Card Library via event (per Q-06).
- API + UI for today's session.

🔍 **Checkpoint 6**
- [ ] You do one full daily session per day for a week.
- [ ] Rule coverage for DP-* complete.
- [ ] Commit tagged `phase-6`.

---

## Phase 7 — Content Ingestion (L, later)
Depends on Q-08. Pipeline draft → reviewed → published; Anti-Corruption Layer per source format.

---

## Decisions still needed for this plan
| Needed by | Decision |
|---|---|
| Phase 5 | Q-12: origin of system content (when provided) |
