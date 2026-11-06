# QuizSlayer — build plan

Status (2026-11-03): Phases 0–3 done; Phase 4 slices 4a–4d done; Phase 5 done; Phase 6 slices 6a–6e done (ADR-013 proposed, ADR-014 outbox); continuous run finished, waiting for Checkpoint 6 review; Checkpoint 6 review done (2026-11-04); continuous run 6e.1 → 6f next. **Continuous run** from 4d through Phase 6 (see below and CLAUDE.md → Continuous run).
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

Built in four slices. After each: tests, lint, tsc, commit, tag. 4a–4d are done (tags phase-4a..phase-4d).
- **4a Cards** — list (front only, tap flips, ⋯ Edit · Tags · Delete, UI-10; Undo toast, UI-13), search + tag chip filter (READ-02/03/05), load more, editor with chip input + autocomplete (UI-01, UI-02, CARD-07, CARD-08). → tag `phase-4a`
- **4b Tags** — Tag list A–Z as colored buttons, long-press bottom sheet Show cards · Rename · Delete (UI-03, UI-05, UI-06, TAG-15 merge dialog), ⋯ → Tags view (UI-14), a tag's card list with ✕ / checkboxes / Remove (n) and the "+ Add cards" picker (CARDTAG-07/08, 100 cap in the app). → tag `phase-4b`
- **4c Trash** — newest trashed first, load more, total, restore, delete permanently, empty trash dialog with count (TRASH-07, TRASH-11, TRASH-12). → tag `phase-4c`
- **4d Study** (STUDY-01..12) — Study button on the Cards screen and a tag's card list; ids first then content 20 at a time; progress, Prev/Next + swipe; newest first + Shuffle (unseen only); front/back switch remembered on the phone; "Done!" screen; no resume. → tag `phase-4d`

🔍 **Checkpoint 4**
- [ ] You use it yourself for real study for a week.
- [ ] Every friction you hit is written into `open-questions.md` or `backlog.md`, not fixed silently.
- [ ] Commit tagged `phase-4` (Card Library v1).

---

## Phase 5 — Model Daily Practice, docs only (M)
Done 2026-11-03. All business rules are `confirmed`: DP-01..DP-40, QB-06..QB-11, glossary terms for both contexts, subdomains and context map. First questions: `apps/api/prisma/seed/questions/hsk4-sample.json` (50 original HSK4 questions: 38 single, 3 reading groups).
Design (events, commands, aggregate boundaries) is proposed in Phase 6a as an ADR; Jackkie reviews it whenever he likes — work does not wait.

🔍 **Checkpoint 5**
- [x] `daily-practice.md` rules all `confirmed`; no open question blocks the aggregates.
- [x] Glossary terms for Daily Practice and Question Bank confirmed.
- [ ] Commit tagged `phase-5` (tag the current docs commit at the start of the run).

---

## Continuous run (6e.1 → 6f)
The first run (4d → 6e) is done. Claude Code now works through 6e.1 and 6f without stopping for questions:
- Each slice ends with: tests, lint, tsc, rules coverage → commit → tag → next slice. No stop between slices.
- A behaviour question that comes up: build the recommended/provisional choice, log it in `open-questions.md` as "provisional, built", keep going.
- Stop only (a) after 6f, (b) if something can't be built provisionally because it's irreversible or destructive (data loss, schema change that drops data, pushing to a remote), or (c) if tests can't be made green.
- Jackkie's Checkpoint 4 (a week of real use) runs in parallel; his findings come back as new questions later.
- Everything 6e.1 and 6f need is confirmed (DP-41..DP-62, CONFLICT-01); a new question is still built provisionally and logged.

## Phase 6 — Daily Practice + minimal Question Bank (L)
Source: `daily-practice.md` (DP-01..DP-40), `question-bank.md` (QB-06..QB-11), context map.
- **6a Domain + design ADR (ADR-013)** — pure TypeScript, tests first by rule ID. Aggregates (proposal): `Track` (tag, kinds, daily size — DP-11, DP-12), `DailySession` (one per track per day; quizzes snapshot; answers can't change; finished = all answered — DP-01, DP-03, DP-17, DP-18, DP-21..DP-23), `QuizProgress` (one per user and quiz; the 1-3-7 schedule — DP-33, DP-37, DP-38). Set-building as a domain service (DP-27..DP-31, DP-34..DP-36, DP-39, steps written in daily-practice.md). Streaks per track + overall (DP-19, DP-23): computed or an aggregate — the ADR decides. Day = the user's timezone (DP-05): where the timezone lives — the ADR decides. → tag `phase-6a`
- **6b Question Bank + persistence** — Prisma models for quiz sets, quizzes (kind, single / group with passage or audio, questions, 2–6 choices, one correct, optional explanation), question tags (separate from Card tags, same rules — QB-07), owner System/User, tracks, sessions, progress. Seed script loads `hsk4-sample.json` as System content. Integration tests. → tag `phase-6b`
- **6c Outbox + QuizProgress reaction (B-10)** — `QuizAnswered` saved in the same transaction as the answer; delivered after commit; `QuizProgress` applies DP-33 idempotently. Integration test: crash between commit and delivery loses nothing. → tag `phase-6c`
- **6d API** — start today (DP-31, resume DP-22), answer (feedback DP-20), finish, today overview (tracks + streaks), history (DP-26), track list/add/remove/settings (DP-12..DP-15), "Save as card" → Card Library `createCard` (DP-10, DP-40; no event). Errors through the error table pattern. e2e tests. → tag `phase-6d`
- **6e Mobile** — "Today" screen as the first drawer item and the start screen (G-1), overall + per-track streaks (G-5), quiz screen for single and reading-group kinds (audio kinds: show a simple player only if content exists; the seed has none), feedback + explanation, result "23 / 28", history, Settings → Tracks (add from question tags with quiz counts, G-2; kinds; daily size). i18n texts provisional (log them). → tag `phase-6e`, then STOP.
- **6e.1 Review fixes** — (1) DP-52: answering after the end of the session's next day → `DailySessionClosed`; the app opens such a set view only (also from History). DP-63: Today shows yesterday's unfinished set ("Finish yesterday's set · 3 / 10", Continue) while it can still be finished (not for removed tracks). DP-65: the streak shows 0 while yesterday is unfinished (test it). DP-69: best streak per track and overall, computed; History header "Best: 12 days", small "Best 21" under the overall streak on Today. (2) DP-33: the mistake schedule counts from the day of the answer (phone's timezone at answer time, `X-Time-Zone`), not the session's day; `QuizAnswered.day` = answer day. (3) DP-53: track settings and remove send `If-Match` (missing → 428, malformed → 400, outdated → 409 `TrackChanged`), the app reloads on 409. (4) Outbox: failing events must not block newer ones (e.g. retry with backoff via a next-attempt time). (5) QuizProgress ignores an event older than its last applied answer. (6) Daily Practice must not import Card Library's domain (`card-library/domain/ids`); use what `CreateCard`'s public input takes. Tests named by rule ID for (1)–(3); integration tests for (4)–(5). → tag `phase-6e.1`
- **6f Notes (DP-41..DP-51)** — after 6e.1. Domain: `QuestionNote` (per user and question, text, version; DP-43, DP-46, DP-50, DP-51). Write: `PUT /practice/sessions/:id/questions/:qid/note` { text } with `If-Match` (empty text removes it; only for a question answered in that session, DP-45). Session read returns each answered question's note (DP-45, DP-48). Save as card adds the note to the back (DP-49). DP-64: when the card doesn't fit (front over 500 or back over 3,000 — with or without a note), Save as card opens the card editor filled in (front, back, the track's tag; all editable; red counter; Save off until it fits; Cancel saves nothing); Save creates the card through the same save-as-card endpoint (edited text optional in the body) and marks it saved (DP-32); back to the quiz/result with "Saved ✓", no pop-up. Note UI: DP-66 ("📝 Add note", Edit, counter), DP-67 (discard prompt), DP-68 (editable on closed sets). Texts: daily-practice.md after DP-68. Migration only adds a table. App: note box with Save on the feedback screen, the result screen and a History day (DP-45, DP-47); reload on 409. Tests named by rule ID. → tag `phase-6f`

🔍 **Checkpoint 6**
- [x] Jackkie reviews ADR-013 and the provisional choices logged during the run (2026-11-04).
- [ ] You do one full daily session per day for a week.
- [ ] Rule coverage for DP-* complete.
- [ ] Commit tagged `phase-6`.

---

## Phase 7 — Content Ingestion (L, later)
The import feature (B-17: JSON file + media, re-import by id, draft → reviewed → published) and the origin of system content (B-21). Anti-Corruption Layer per source format.

---

## Decisions still needed for this plan
None blocking. Provisional choices during the continuous run are logged in `open-questions.md`.
