# Changelog

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
