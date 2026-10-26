# Open questions

Status: `open` / `answered` (move the answer into the context file, then mark answered).

## Card Library
| ID | Question | Status |
|---|---|---|
| C-01 | Are front and back both required? | answered: yes → CARD-01 |
| C-02 | Max length of front/back? | answered: 500 / 3000 → CARD-02 |
| C-03 | Plain text only, or rich text / images / audio? | answered: plain text in v1, images/audio later → CARD-03, B-02 |
| C-04 | Max tags per card? | answered: 20 → CARDTAG-03 |
| C-05 | Renaming a tag to an existing name: error or merge? | answered: merge, shown explicitly in UI → TAG-08 |
| C-06 | Business name for the card–tag link? | answered: CardTag |
| C-07 | "Card" or "Flashcard" as the official term? | answered: Card (consistent with CardTag, Card Library) |
| C-08 | Tag color: chosen and stored per tag, or derived from the name? | answered: random for now, user chooses later → TAG-12, B-03 |
| T-01 | Auto-purge trashed cards: never, or after N days (e.g. 30)? | answered: not in v1; later 30 days → TRASH-08, B-04 |
| T-03 | Can a card be deleted permanently without going through the Trash? | answered: no, always Trash → TRASH-09 |
| C-09 | Adding a tag the card already has, or removing a tag it doesn't have: no-op or error? | answered: no-op, no event → CARDTAG-05 |
| C-10 | Move to trash on a trashed card, or restore on an active card: error or no-op? | answered: error (`CardIsTrashed` / `CardIsNotTrashed`) → TRASH-10 |
| C-11 | Front/back: stored trimmed or exactly as typed (after NFC)? Is the length counted before or after trimming? | answered: NFC + trim ends, inner whitespace kept, length after trim → CARD-05 |
| C-12 | TAG-01 "digits": decimal digits only (`0-9`, `٣`), or every number character (`①`, `Ⅻ`, `½`)? | answered: decimal digits only (Unicode Nd) → TAG-01 |
| C-13 | UI-07 palette: which colors? Does the tag store a color key (e.g. `blue`) or a hex value? | answered: a color key from 12 names; the app maps keys to light/dark hex → TAG-13, UI-07 |
| C-14 | The same tag name twice in one createCard/tagCard input: dedupe silently or error? | answered: dedupe silently, limit checked after → CARDTAG-06 |
| C-15 | Rename a tag to its current name: no-op or error? | answered: no-op, no event → TAG-14 |
| C-17 | Merge events: does `TagsMerged` also mean tag A is deleted, or is `TagDeleted` raised too? | answered: `TagsMerged` only; it means A is gone → TAG-10, glossary |
| C-18 | Error handling: kind, HTTP status and user message per error | answered: confirmed as in card-library.md → Error handling |
| C-19 | Saving a card with the same front/back: edit or no-op? | answered: no-op, no event → CARD-06 |
| C-20 | TAG-03 race: two requests create the same tag name at once, both pass the name check, and the DB unique constraint rejects one. Which error does the user get? | answered: new error `TagNameTaken` (Race, 409); the transaction rolls back and a retry links the existing tag → Error handling, TAG-03 |
| C-21 | A card is saved with a tag that was deleted or merged meanwhile (FK fails). Which error? | answered: `TagNoLongerExists`, Stale screen, 409 |
| C-22 | How is "a card only carries its owner's tags" enforced? | answered: use-case check via `findByIds` + DB backstop (`card_tag.user_id`, composite FKs) → CARD-04 |
| C-23 | Commands table is `draft`. Does the card editor save front, back and tags in one command, or as separate edit / tag / untag calls? | answered: one request from Save; server applies the changes → CARD-07, Commands table |
| C-24 | createTag with a name that already exists (not a race): return the existing tag, or fail? | answered: no "New tag" button in v1; tags come only from cards → UI-08 |
| C-25 | Rename onto an existing name (TAG-08): how does the API ask for confirmation, and do preview counts include trashed cards? | answered: one endpoint; 409 with preview, resend with confirmMerge; counts Active only → TAG-15 |
| C-26 | Empty trash (TRASH-07): if a card is trashed on another device after the count was shown, delete it too or fail? | answered: send the count shown; mismatch → 409, nothing deleted → TRASH-11 |
| C-27 | Card list: order and paging? | answered: newest created first → READ-02; paging → C-31 |
| C-28 | Search: what matches (front/back/tags), case- and accent-sensitivity? | answered: front + back, any part, case- and accent-insensitive → READ-03 |
| C-29 | Tag list: order? | answered: A–Z → READ-04 |
| C-31 | Card list paging: "load more" while scrolling (cursor-based, 20 per page) or page numbers? | answered: load more, cursor-based, 20 per page → READ-02 |
| C-32 | CARD-07 Save creates new tags and saves the card: one transaction (all or nothing; another ADR-004-style exception), or tags first and then the card (a failed card save can leave a new empty tag, allowed by TAG-04)? | answered: one transaction, all or nothing → CARD-07, ADR-009 |
| C-30 | Trash tab: order? | answered: most recently trashed first; card stores trashedAt → TRASH-12 |
| C-33 | Trash tab paging: "load more" 20 at a time like READ-02, or all trashed cards at once? | answered: load more, 20 at a time, with the total count → TRASH-12 |
| C-34 | Card list with several tag chips selected: cards with all of them, or with any of them? | answered: cards with all selected chips (AND) → READ-05 |
| C-35 | Empty trash deletes many cards: one transaction, all or nothing (another exception to "one aggregate per transaction", needs an ADR)? | answered: one transaction, all or nothing → TRASH-11, ADR-010 |
| C-36 | Tag list "A–Z" (READ-04): ignore case and accents (Animals, apple, động vật next to dog), or plain character order (all capitals first, accented letters after z)? | answered: dictionary order, ignoring case and accents → READ-04 |
| C-37 | In which order are the tags on a card shown? | answered: A–Z, same dictionary order as READ-04 → READ-06 |
| C-38 | A confirmed merge finds the target renamed or deleted after the preview. What happens? | answered (revised 2026-10-25): anything changed → 409 with a fresh preview; only an unchanged target merges → TAG-15 |
| C-39 | Two devices change the same card: last save wins, or the outdated save fails? | answered: outdated save fails with `CardChanged` (version per card) → CARD-08 |
| C-41 | Card "⋯" → Tags: what opens? (e.g. a sheet with the chip input for this card's tags only, saved with the same Save as CARD-07) | answered: browse this card's tags with Active counts; a tag's cards load only when expanded, 20 + Load more → UI-14 |
| C-42 | Card "⋯" → Delete: move to Trash at once (it can be restored), or ask first? (was U-5) | answered: Trash at once + \"Moved to Trash · Undo\" toast → UI-13 |
| C-43 | Change which cards a tag is on from the tag's card list, not only from the card editor? | answered: yes — remove (✕ / checkboxes) and add (picker); full cards greyed out; all or nothing; max 100 per action → CARDTAG-07, CARDTAG-08, ADR-011 |
| C-44 | Conflicts: which actions must fail when made from an outdated view? | answered: all of them — one rule for cards, tags and the Trash → CONFLICT-01, CARD-08, TAG-16, TRASH-11 |
| C-45 | TAG-16 says a tag's version changes when cards are added/removed *through the tag*. Should a card editor Save that adds or removes #Dog (CARD-07) change #Dog's version too? Today it doesn't, so "Delete #Dog? It's on 3 cards" still goes through if a card got #Dog in the editor meanwhile. | answered: yes — any change to the tag's name or its Active cards bumps its version (incl. editor Save and trash/restore) → TAG-16 |
| C-46 | Adding/removing cards through a tag's list: check the tag's version too, or only the cards'? | answered: both → TAG-16, CARDTAG-07, CARDTAG-08 |
| C-47 | App text not in the error table (phase 4a, written by the agent, please confirm or reword): no network "Can't reach the server. Check your connection."; `CardNotFound` "Card not found"; empty list "No cards yet. Tap + to add one." / with a filter "No cards match."; after Undo "Card restored". | open |
| C-48 | How long does the "Moved to Trash · Undo" toast stay (UI-13)? Provisional: 5 seconds. | open |
| C-49 | Card editor: Cancel with unsaved changes — leave at once, or ask "Discard changes?" first? Provisional: leave at once. | open |
| C-50 | Chip input: the user types "#Dog". Provisional: sent as typed, so the server answers `InvalidTagName` ("#" is not allowed, TAG-01). Or should the app drop a leading "#" since it is display only (UI-01)? | open |
| C-40 | A tag merge fails because one of its cards was saved on another device at the same moment (CARD-08). Which message? | answered: the merge's own error `TagMergeFailed`, "Merge failed, try again." (409, Race) → Error handling |
| C-16 | The Model and Events sections of card-library.md are `draft` (incl. `TagsMerged`). Confirm them as the Phase 1 design? | answered: confirmed as listed, plus `TagsMerged` |

## Daily Practice
| ID | Question | Status |
|---|---|---|
| Q-01 | What is a "day"? User's timezone or fixed? What if a session starts at 23:55? | open |
| Q-02 | Is 10 strict? What if a group of 3 items comes when only 2 slots are left? | open |
| Q-03 | Missed day: can it be made up? Does it break the streak? | open |
| Q-04 | Which answer types are in v1? (Writing/Speaking need human or AI grading) | open |
| Q-05 | How are items selected: random, difficulty, weak areas, spaced repetition of mistakes? | open |
| Q-06 | Do quiz mistakes become cards: automatically, suggested, or never? | open |
| Q-07 | Can a user study several tracks at once, each with its own daily set? | open |

## Infrastructure
| ID | Question | Status |
|---|---|---|
| H-01 | Hosting the API so the app works outside home Wi-Fi: AWS Lambda, tunnel, or VPS? | answered: VPS (Nest + Postgres in Docker). Lambda as a possible learning project later (B-09) |

## Cross-cutting
| ID | Question | Status |
|---|---|---|
| Q-08 | Content source? | answered: mostly user-provided; the system also provides a decent set of ready tests/questions. Follow-ups Q-11, Q-12 |
| Q-09 | Real login in v1, or a single demo user? | answered: demo user only in v1 |
| Q-10 | Target users: only Jackkie at first, or public? | open |
| Q-11 | User-provided content: private or shareable? | answered: Public/Private per set, Private by default → QB-01..05 |
| Q-13 | Name for a user's collection of questions? | answered: Quiz Set |
| Q-12 | Where does system-provided content come from: written originally in the test's format, licensed, or public domain? Official IELTS/TOEIC/HSK material belongs to its publishers; serving it to other users is likely infringement (not legal advice). | deferred: Jackkie provides it later; check origin then |
