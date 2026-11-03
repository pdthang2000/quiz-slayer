# Changelog

## 2026-11-03 — Save as card details
- Confirmed: "Save as card" only on single text questions; front = question + choices, back = answer + explanation, tag = track's tag; hidden if the front would exceed 500 characters (DP-40, G-3, G-4). Open: G-1, G-2, G-5, G-6.

## 2026-11-03 — Strategic docs confirmed
- Confirmed: subdomains; context map updated ("Save as card" is a user action calling createCard, not an event; QuizProgress reacts to QuizAnswered); Quiz Set owner System/User.
- Backlog: "published" flow goes with the import feature (B-17); Q-12 → B-21.

## 2026-11-03 — Fix
- question-bank.md: QB-11 text was missing (an edit didn't apply); now written.

## 2026-11-03 — Mistake schedule
- Confirmed: DP-33 schedule (next day → 3 days → 7 days → retired; wrong → next day again); DP-34 not-yet-due mistakes wait; DP-35 extra due mistakes before old quizzes; DP-36 half rounds down; DP-37 progress per user and quiz; DP-38 progress kept when a quiz leaves the pool. Set-building steps written out. Backlog B-19, B-20.
- Confirmed: a quiz appears at most once per day across tracks; a short set stays short (DP-39, X-2, X-3).

## 2026-11-03 — Picking details
- Confirmed: seen = answered (DP-27); pool starts over oldest-first (DP-28); a group with one wrong comes back whole (DP-29); due mistakes first, max half (DP-30); set chosen on Start (DP-31); "Saved ✓" (DP-32). Backlog B-18 "Practice more". P-3 under discussion.
- Workflow: Claude's code changes go to a branch + pull request; docs-only changes go straight to main; commits under Jackkie's name with a Claude co-author line.

## 2026-11-03 — Daily Practice rules complete
- Confirmed: a day of practice DP-20..DP-26 (feedback after each quiz, in order, resume the same day, finished = all answered, no timer, unlimited audio replay, history); DP-01 and DP-03 confirmed; DP-04 replaced by DP-08.
- Confirmed: no Test/Level/Section fields, everything is a question tag (QB-11, M-1, M-5). Glossary: Daily Practice and Question Bank terms confirmed (Test, Section dropped; Item → Question, Item Group → Group).
- Confirmed: Trash wording "Trashed … ago" with weeks after 14 days (TRASH-13, C-61).

## 2026-11-02 — Streaks and first questions
- Confirmed: per-track streaks plus one overall streak (any track finished) (DP-19).
- First questions for Phase 6: a sample file in the repo loaded by the dev seed (50 original HSK4 questions); the import feature stays in the backlog (B-17).

## 2026-11-02 — Import file later
- The import file feature moves to the backlog (B-17), with the I-1..I-6 proposals undecided.

## 2026-11-02 — Track settings
- Confirmed: per-track kinds and daily size 1–50, default 10 (DP-12); changes apply from the next set (DP-13); too few questions → what's there + message (DP-14); add/remove tracks anytime, history kept (DP-15); no "Save as card" on audio kinds (DP-16).
- Confirmed: a daily set counts quizzes, a group = 1 quiz (DP-17); progress in quizzes, result in questions (DP-18); glossary "Quiz" replaces "Slot".

## 2026-11-02 — Question Bank: kinds and tags
- Confirmed: kind is a fixed field (4 kinds, QB-06); question tags with Card-tag rules but a separate list (QB-07); a group's tags are on the group (QB-08); tags never repeat the kind (QB-09); pool = system + own (QB-10).
- Confirmed: a track is one question tag; filters later (DP-11, T-b, backlog B-16). Pending: M-1, M-5.

## 2026-10-31 — Daily Practice, first answers
- Confirmed: DP-05 day = phone timezone, session belongs to the day it started (Q-01); DP-06 missed day gone, streak resets (Q-03); DP-07 multiple choice only in v1 (Q-04); DP-08 unseen questions + mistakes back after 1/3/7 days (Q-05); v1 users = Jackkie only (Q-10); v1 content from an imported file (Q-14).
- Backlog B-14 streak freeze, B-15 more answer types.
- Confirmed: several tracks at once, each with its own daily set and streak (DP-09, Q-07); "Save as card" button on wrong answers (DP-10, Q-06). Open: Q-06a, Q-07a, Q-07b.

## 2026-10-31 — Study details (4d)
- Confirmed: STUDY-07..12 — Study button on the Cards screen and a tag's card list (disabled at 0); progress, Prev/Next and swipe; Shuffle reshuffles only unseen cards; front/back switch anytime, remembered on the phone; "Done!" screen; no resume; edited cards show as fetched (S-6..S-15).

## 2026-10-31 — Phase 4c review
- Confirmed: Trash rows show the front + "2 days ago", tap flips, ⋯ Restore · Delete permanently (TRASH-13, C-58); delete permanently asks first (TRASH-14, C-59); Trash texts (UI-16, C-60).

## 2026-10-29 — Phase 4b.1 review
- Confirmed: Undo of "+ Add cards" confirms with "Removed from #Dog", without Undo (CARDTAG-08, UI-16, C-57).

## 2026-10-29 — Phase 4b review
- Confirmed: tap on a tag opens its cards (UI-06, C-52); 4b app texts (UI-16, C-53); 101st tick refused with a toast (C-54); adding cards gets an Undo toast (CARDTAG-08, C-55); several tags open at once and rows flip in ⋯ → Tags (UI-14, C-56); Undo of a remove says "Put back in #Dog" (CARDTAG-07).

## 2026-10-29 — Phase 4b (mobile: Tags)
- Tag list: A–Z colored buttons with counts, long-press sheet Show cards · Rename · Delete (UI-03, UI-05, UI-06). Rename shows the merge preview and resends with confirmMerge (TAG-08, TAG-15); delete asks again with the new count after TagChanged (TAG-16).
- A tag's card list: ✕ per row, checkboxes + Remove (n) with Undo, "+ Add cards" picker with greyed cards at 20 tags, 100 per action (CARDTAG-07, CARDTAG-08). ⋯ → Tags expands a card's tags on demand (UI-14).
- New open questions C-52..C-56 (tap on a tag, app texts, the 101st tick, after adding, UI-14 details).

## 2026-10-27 — Theme option
- Confirmed: Settings at the bottom of the drawer with Appearance System / Light / Dark, kept on this phone only (UI-17, C-51). UI-09 and UI-12 updated to point to it.

## 2026-10-26 — Phase 4a review
- Confirmed: app drops a leading "#" in the chip input (UI-01, C-50); "Discard changes?" only with unsaved changes (UI-15, C-49); Undo toast 5 s (UI-13, C-48); app messages (UI-16, C-47).
- phase-3.1 tag stays where it is.

## 2026-10-26 — Phase 4a (mobile: Cards)
- apps/mobile scaffolded (Expo SDK 58); stack in ADR-012. Repo pins Node 24 (`.nvmrc`).
- Cards screen: front-only rows that flip on tap, ⋯ Edit · Tags · Delete, Undo toast, search, tag chip filter, load more, pull to refresh. Card editor with chip input and autocomplete. Versions sent in If-Match.
- rules:coverage also counts the app's tests (UI rules).
- New open questions C-47..C-50 (app text, toast time, discard prompt, leading "#").

## 2026-10-25 — Phase 3.3 (backend)
- Implemented TAG-16 for every path (C-45): editor Save, createCard, trash and restore change the versions of the tags whose Active cards changed, in the same transaction.
- Implemented C-46: tag-list add/remove check the tag's version.
- API (technical): every version travels in the If-Match header; tag-list remove is POST /tags/:id/cards/remove (no DELETE carries a body).

## 2026-10-25 — Phase 3.2 review
- Confirmed: a tag's version changes with its name or its list of Active cards, from any path (editor Save, trash/restore, tag list, merge) (TAG-16, C-45).
- Confirmed: adding/removing cards through a tag's list also sends the tag's version (TAG-16, CARDTAG-07/08, C-46).

## 2026-10-25 — Phase 3.2 (backend)
- Implemented CONFLICT-01: every card action sends its version (CARD-08), tags have versions (TAG-16, `TagChanged`), empty trash sends the newest "trashed at" (TRASH-11).
- Implemented CARDTAG-07 / CARDTAG-08 (ADR-011), the tag picker, Study reads (STUDY-01/02) and UI-14 reads.
- New open question C-45 (does a card Save change the tag's version?).

## 2026-10-25 — tag card lists and one conflict rule
- Confirmed: CONFLICT-01 — any change from an outdated view of a card, a tag or the Trash fails with 409 and nothing changes (C-44). Card actions all send the card version (CARD-08); tags get a version (TAG-16, `TagChanged`); empty trash also sends the newest "trashed at" (TRASH-11).
- Confirmed: a tag's card list can remove cards (✕ and checkboxes) and add cards (picker, full cards greyed out), all or nothing, max 100 per action (CARDTAG-07, CARDTAG-08, ADR-011, C-43). UI-05 and UI-14 updated.
- Backlog B-13: live updates between devices.

## 2026-10-25 — Phase 4 questions
- Confirmed: Study (STUDY-01..06): studies what the list shows; snapshot when Study is pressed; newest first + Shuffle; side choice (front default); flip + Next only; no limit. Loads ids first, content 20 at a time.
- Confirmed: UI-09 left side menu (Cards, Tags, Trash); UI-10 list shows front, tap flips, "⋯" menu Edit · Tags · Delete; UI-11 i18n with English default; UI-12 dark mode follows the phone.
- Backlog B-12: Quizlet-like study modes.
- Confirmed: UI-09 side drawer; UI-13 ⋯ → Delete moves to Trash at once with an Undo toast (C-42). 
- Confirmed: UI-14 ⋯ → Tags browses the card's tags with counts; cards load lazily on expand, 20 + Load more (C-41).

## 2026-10-25 — C-40 and B-11
- Answered C-40: a merge rolled back by a concurrent card save raises its own error `TagMergeFailed`, "Merge failed, try again." (glossary, Error handling).
- B-11 fixed now (Jackkie): transactions retry up to 3× on a Postgres deadlock, then 409 `TransactionConflict` "Try again." ADR-008 addendum. Removed from the backlog.

## 2026-10-25 — Phase 3.1
- Implemented CARD-08 (card version, `CardChanged` 409) and the revised C-38 (TAG-15 table).
- Commands table: editCard takes the version the editor was shown (CARD-08).
- New open question C-40 (merge failed by CARD-08: which message). Backlog B-11 (Save vs merge deadlock).
- DDD review written to docs/reviews/phase-3-ddd.md.

## 2026-10-25 — full review after Phase 3
- Confirmed: CARD-08 — a card save from an outdated view fails with `CardChanged` (Stale screen, 409); version per card (C-39).
- Revised C-38 (Jackkie): a confirmed merge only runs if the target is unchanged; anything else → 409 with a fresh preview (TAG-15).
- CLAUDE.md: "Decide alone vs ask Jackkie" section.
- plan.md: Phase 3/4 bullets match the confirmed commands (C-23, UI-08, TAG-15) and UI-06; Checkpoints 0–3 ticked. CARDTAG-06 says editCard, not tagCard.

## 2026-10-25 — Phase 3 review
- Confirmed: READ-06 — tags on a card shown A–Z, same dictionary order as READ-04 (C-37).
- Confirmed: error names `TagMergeNeedsConfirmation`, `TrashChanged`.
- Confirmed: C-33..C-36 as recorded (TRASH-12 paging, READ-05 AND, ADR-010, READ-04 dictionary order).
- CLAUDE.md: all times in UTC; query interfaces and read types live in application/; infrastructure may depend on domain/ and the application/ query interfaces only (lint rule updated).
- Backlog B-10: outbox for domain events before Daily Practice listens.
- Confirmed: a confirmed merge re-checks the tags after its lock; target renamed → always 409 with a fresh preview (TAG-15, C-38).
- Code (F1): a merge reloads both tags after the lock; F2: card-list cursor compared in UTC; F3: DTO guard of 100 tags (shape only, CARDTAG-03 stays in the domain).

## 2026-10-23 — Phase 3 (application + API)
- ADR-010 (accepted, C-35): empty trash in one transaction.
- Code: use cases createCard, editCard (CARD-07), moveToTrash, restore, deletePermanently, emptyTrash (TRASH-11), renameTag (TAG-15 preview, TAG-10 merge), deleteTag; queries for card list/search (READ-02/03/05), card detail, Trash (TRASH-12), Tag list (READ-04).
- Code: `card.setTags(tagIds)` applies a CARD-07 Save's tag list as a diff; `trashedAt` on Card (migration `card_trashed_at_search`, also enables `unaccent` for READ-03).
- Code: `TagRepository.findOrInsertByName` (INSERT ... ON CONFLICT DO NOTHING) for tag creation inside a transaction (ADR-009).
- HTTP: /cards, /trash, /tags; no POST /tags (UI-08). Domain errors mapped per the error table; `TagMergeNotAllowed` (otherUser) is answered as 404 `TagNotFound`.

## 2026-10-23 — Phase 3 questions
- Confirmed: Trash tab loads 20 at a time with the total count (TRASH-12, C-33).
- Confirmed: several tag chips = cards with all of them (READ-05, C-34).
- Confirmed: empty trash in one transaction, all or nothing (TRASH-11, C-35, ADR-010).
- Confirmed: Tag list A–Z in dictionary order, ignoring case and accents (READ-04, C-36).
- Confirmed: no "New tag" button in v1 (UI-08, C-24).
- Confirmed: rename onto an existing name → 409 with merge preview, resend with `confirmMerge`; counts Active only (TAG-15, C-25).
- Confirmed: empty trash checks the count the user saw (TRASH-11, C-26).
- Confirmed: card list newest created first (READ-02, C-27); search front/back, case- and accent-insensitive (READ-03, C-28); Tag list A–Z (READ-04, C-29).
- Confirmed: Trash tab most recently trashed first; card gets `trashedAt` (TRASH-12, C-30).
- Draft names: `TagMergeNeedsConfirmation`, `TrashChanged`.
- Confirmed: the card editor saves front, back and tags in one request (CARD-07, C-23); Commands table confirmed.
- Confirmed: card list paging is cursor-based "load more", 20 per page (READ-02, C-31).
- Confirmed: Save with new tags runs in one transaction, all or nothing (CARD-07, C-32, ADR-009).

## 2026-10-23 — Phase 2 review
- Confirmed: `TagNoLongerExists` (Stale screen, 409) when a card is saved with a tag deleted/merged meanwhile (C-21).
- Confirmed: CARD-04 enforced in use cases (`findByIds`) and by the DB (`card_tag.user_id` + composite FKs) (C-22).
- Confirmed: C-20 was answered by Jackkie.
- ADR-008 accepted.
- Code: `TagNoLongerExists` thrown by the card repository on a card_tag tag foreign-key failure; it carries the ids of the cards in the failed save, because the DB does not say which one.
- Code: migration `card_tag_owner` (card_tag.user_id, UNIQUE (id, user_id) on card and tag, composite FKs with cascade); existing rows get user_id from their card. `TagRepository.findByIds`.
- Code: TAG-10 performance — transactions get timeout 30 s / maxWait 5 s; `saveAll` writes CardTags in bulk (one deleteMany + one createMany). A 1000-card merge test passes.

## 2026-10-23 — Phase 2 (persistence)
- Confirmed: a TAG-03 race (DB unique constraint rejects a tag name) fails with `TagNameTaken`, Race, 409 (C-20). Added to the error table and glossary.
- ADR-008 (proposed): transactions are carried by AsyncLocalStorage, not a `tx` parameter. TAG-10 sketch updated to match.
- DB column for card state is `state` (glossary "Card state"), not `status`.

## 2026-10-22 — Phase 1 review
- Confirmed: `TagsMerged` is the only event of a merge and means tag A is gone; no `TagDeleted` for A (C-17).
- Confirmed: Card Library error names.
- Confirmed: Error handling table (kind, HTTP, message per error) in card-library.md (C-18).
- Confirmed: CARD-06 — a card is edited only if its content changes (C-19).
- Confirmed: C-09..C-16 were answered by Jackkie.
- Renamed `card.replaceTag` → `card.replaceTagForMerge` (CARDTAG-04, TAG-10, ADR-004) so the name says it is for merges only.

## 2026-10-22 — Phase 1 gaps (Card Library domain)
Questions found while writing the domain classes, answered by Jackkie:
- Confirmed: adding a tag the card has / removing one it lacks is a no-op (CARDTAG-05, C-09).
- Confirmed: move to trash on a trashed card / restore on an active card is an error (TRASH-10, C-10).
- Confirmed: front/back stored as NFC with the ends trimmed; length counted after trimming (CARD-05, C-11).
- Clarified TAG-01: "digits" means decimal digits (Unicode Nd) only (C-12).
- Confirmed: a tag stores a color key from 12 names; the app maps keys to light/dark colors (TAG-13, UI-07, C-13).
- Confirmed: duplicate tags in one input are kept once; the 20-tag limit is checked after (CARDTAG-06, C-14).
- Confirmed: renaming a tag to its current name is a no-op (TAG-14, C-15).
- Confirmed: Card Library Model and Events, plus `TagsMerged` (C-16).
- Glossary: Tag color, Card Library events and errors. Error names `InvalidCardFront`/`InvalidCardBack`, `InvalidTagColor`, `TagNotOnCard`, `TagMergeNotAllowed` are draft (name only).

## 2026-10-22 — repo layout
- ADR-007: one repo with pnpm workspaces (`apps/api`, `apps/mobile`, `packages/`, `docs/`).
- CLAUDE.md and plan Phase 0/4 updated for the new paths.

## 2026-10-22 — hosting
- H-01: API hosted on a VPS (Nest + Postgres in Docker). Lambda → backlog B-09.

## 2026-10-22 — mobile frontend
- ADR-006: React Native + Expo, UI only; iPhone first (local build), Android APK for friends.
- UI-06 adapted to mobile: long-press → bottom sheet.
- New open question H-01: API hosting.

## 2026-10-22 — naming
- Confirmed: a user's collection of questions is a **Quiz Set** (Q-13).

## 2026-10-22 — visibility, mobile direction
- Confirmed: Public/Private per set, Private by default, no copying in v1 (QB-01..05).
- Confirmed: cards and tags private per user (CARD-04).
- Confirmed v1 scope: mobile first (React Native), online-only, installed on own phone outside stores; web later.
- Backlog: B-05 copy permission, B-06 public cards, B-07 moderation, B-08 web app.
- New: Q-13 name for a user's set. Q-12 deferred.

## 2026-10-22 — auth and content source
- Confirmed: demo user only in v1 (Q-09); keep userId everywhere.
- Confirmed: content mostly user-provided, plus a system-provided set (Q-08).
- New open questions: Q-11 user content visibility, Q-12 origin of system content.

## 2026-10-22 — stack and plan
- ADR-005: NestJS + Prisma + PostgreSQL, modular monolith.
- CLAUDE.md: folder layout, strict "framework out of the domain" rules, test naming by rule ID.
- docs/plan.md: build plan with checkpoints.

## 2026-10-20 — tag merge design
- Confirmed: TAG-10 — merge in one transaction, each card through `card.replaceTag(A, B)`, tag rows locked (option A2).
- New: CARDTAG-04 `replaceTag` (only tag change allowed on a trashed card). TRASH-02 notes the exception.
- ADR-004 added. CLAUDE.md: rules checked in the domain before DB; cross-aggregate transaction only with an ADR.
- Card Library: no open questions, no drafts.

## 2026-10-20 — naming
- Confirmed: official terms are Card, CardTag, Card Library (C-06, C-07).
- Renamed "tagging" → CardTag in docs; rule IDs TAGGING-xx → CARDTAG-xx.

## 2026-10-20 — drafts resolved
- Confirmed: TAG-09 (merge moves trashed cards' tags), TRASH-07 (empty trash confirm), UI-03 (delete tag confirm), UI-06 (tag buttons + tooltip), UI-07 (fixed readable palette).
- Confirmed: no auto-purge in v1 (TRASH-08); 30-day auto-delete → backlog B-04.
- Confirmed: delete always goes to Trash (TRASH-09).
- TAG-10 risks written down; still draft.
- Pending: C-06 / C-07 naming (consistency check).

## 2026-10-20 — limits and tag color
- Confirmed: front max 500, back max 3000, counted in code points after NFC (CARD-02).
- Confirmed: max 20 tags per card (TAGGING-03).
- Confirmed: new tags get a random stored color; rename keeps it (TAG-12). User-chosen color → backlog B-03.
- Draft: random color from a fixed readable palette (UI-07).

## 2026-10-20 — where tags are edited
- Confirmed: on a card, tags can only be added or removed (UI-04).
- Confirmed: tags are renamed only from the Tag list; a rename applies to every card (TAG-11, UI-05).
- Draft: Tag list as colored buttons with a tooltip (Show cards, Rename, Delete) (UI-06). New question C-08 (tag color).

## 2026-10-20 — card content
- Confirmed: front and back required (CARD-01); plain text in v1 (CARD-03), images/audio in backlog (B-02).
- Confirmed: renaming a tag to an existing name merges, with an explicit UI confirmation (TAG-08).
- Draft: merge moves trashed cards' taggings too (TAG-09); merge is one transaction across aggregates (TAG-10).
- Still open: C-02 max length, C-04 max tags per card.

## 2026-10-20 — initial model
- Created the docs structure, CLAUDE.md and the `/domain-interview` skill.
- Card Library started fresh (old Flex Card backend is reference only).
- Confirmed: tag naming (NFC, allowed chars, case-sensitive, unique per user), empty tags kept, tags created on save, delete tag = tag + taggings (cards stay), remove tag from card = one tagging only.
- Confirmed: card Trash (move to trash, restore with tags, delete permanently, trashed = hidden + read-only).
- Confirmed: reads are named by card state; no DB view.
- Confirmed: chip input for tags; client-side autocomplete.
- Daily Practice, Question Bank, Content Ingestion: drafts from the planning chat.
- ADRs: 001 docs-first, 002 delete policy, 003 NFC.
