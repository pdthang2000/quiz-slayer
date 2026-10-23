# Changelog

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
