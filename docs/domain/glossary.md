# Glossary

The shared vocabulary. Code names must match this file exactly.
Status: `confirmed` = decided by Jackkie, `draft` = proposed.

## Card Library

| Term | Meaning | Example | Status |
|---|---|---|---|
| Card | A flashcard owned by one user, with a front and a back. Official term: "Card", not "Flashcard". | `Dog` / `a mammal that barks` | confirmed |
| Tag | A label the user attaches to cards. Owned by one user. A tag can exist with 0 cards. | `Animals`, `pit bull`, `HSK1` | confirmed |
| CardTag | The link between one card and one tag. Owned by the Card. | Dog ↔ Animals | confirmed |
| Tag name | The text of a tag after normalization (TAG-01). | `" pit   bull "` → `pit bull` | confirmed |
| Active | Card state: normal, visible everywhere. | | confirmed |
| Trashed | Card state: in the Trash tab, hidden everywhere else, read-only, can be restored. | | confirmed |
| Trash | The tab listing the user's trashed cards. Not an entity; it is a query over cards in the Trashed state. | | confirmed |
| Merge tags | Renaming a tag to an existing name: its cards move to the existing tag and it is deleted. | pitbull → Dogs | confirmed |
| Move to trash | Delete a card from the normal view. The card becomes Trashed. | | confirmed |
| Restore | Bring a trashed card back to Active, with its tags. | | confirmed |
| Trashed at | When a card was moved to the Trash; cleared on restore (TRASH-12). Code: `trashedAt`. | | confirmed |
| Delete permanently | Remove a trashed card and its CardTags for good. No undo. | | confirmed |
| Study session | Flipping through a snapshot of the cards the list showed when Study was pressed (STUDY-01, STUDY-02). Nothing is stored in v1. | Study #HSK1 → 50 cards | confirmed |
| Tag color | A key from a fixed palette, stored on the tag (TAG-12, TAG-13). Code: `TagColor`. | `blue` | confirmed |

### Card Library events (C-16)
| Event | Raised when | Status |
|---|---|---|
| `CardCreated` | A card is created (with its initial tags). | confirmed |
| `CardEdited` | Front or back changed. | confirmed |
| `CardTagged` / `CardUntagged` | One tag added to / removed from a card. | confirmed |
| `CardMovedToTrash` / `CardRestored` | Card goes Active → Trashed / Trashed → Active. | confirmed |
| `CardDeletedPermanently` | A trashed card is removed for good. | confirmed |
| `TagCreated` / `TagRenamed` / `TagDeleted` | Tag lifecycle. | confirmed |
| `TagsMerged` | Tag A was merged into tag B (TAG-08, TAG-10). Also means tag A no longer exists: no `TagDeleted` is raised for A. No per-card events during a merge. Listeners of `TagDeleted` / `CardTagged` / `CardUntagged` must also handle `TagsMerged`. | confirmed |

### Card Library errors (C-16)
Names confirmed 2026-10-22. How each error is handled: card-library.md → Error handling.

| Error | Rule | Status |
|---|---|---|
| `InvalidCardFront` / `InvalidCardBack` | CARD-01, CARD-02 | confirmed |
| `InvalidTagName` | TAG-01 | confirmed |
| `InvalidTagColor` | TAG-13 (key not in the palette) | confirmed |
| `TooManyTags` | CARDTAG-03 | confirmed |
| `CardIsTrashed` | TRASH-02, CARDTAG-02, TRASH-10 | confirmed |
| `CardIsNotTrashed` | TRASH-10 | confirmed |
| `TagMergeNeedsConfirmation` | TAG-15 (rename onto an existing name without `confirmMerge`) | confirmed |
| `TrashChanged` | TRASH-11 (empty trash count no longer matches) | confirmed |
| `CardNotFound` / `TagNotFound` | No such card / tag for this user (application layer, 404) | confirmed |
| `TagNameTaken` | TAG-03 (DB unique constraint hit by a race, C-20) | confirmed |
| `CardChanged` | CARD-08 (card saved from an outdated view, C-39) | confirmed |
| `TagChanged` | TAG-16 (tag renamed or deleted from an outdated view, C-44) | confirmed |
| `TagNoLongerExists` | Card saved with a tag deleted/merged meanwhile (C-21) | confirmed |
| `TagMergeFailed` | A confirmed merge rolled back because one of its cards was saved on another device at the same moment (C-40) | confirmed |
| `TagNotOnCard` | CARDTAG-04 (replaceTagForMerge when the card lacks A) | confirmed |
| `TagMergeNotAllowed` | Merging a tag into itself or into another user's tag (TAG-08, CARD-04) | confirmed |

## Daily Practice

| Term | Meaning | Status |
|---|---|---|
| Track | A question tag the user follows (e.g. `#HSK4`), with its own settings, daily set and streak (DP-09, DP-11, DP-12). | confirmed |
| Daily Session | One track's set of quizzes for one day; belongs to the day it was started (DP-01, DP-05, DP-17). | confirmed |
| Quiz | One unit of a daily set: a single question, or a group (one passage or audio + its questions) (DP-17). | confirmed |
| Attempt | The user's answer to one question in a daily session; can't be changed (DP-03). | confirmed |
| Mistake | A question answered wrong; it comes back after 1, 3 and 7 days (DP-08). | confirmed |
| Streak | Consecutive days with a finished daily set: one per track, plus one overall (any track) (DP-19, DP-23). | confirmed |

## Question Bank

| Term | Meaning | Status |
|---|---|---|
| Kind | Fixed field on a question or group telling the app how to show it: single, single audio, reading group, audio group (QB-06). | confirmed |
| Question tag | A label on a question or group (`#HSK3`, `#mock`); same name rules as Card tags, separate list (QB-07). Never repeats the kind (QB-09). | confirmed |
| Pool | All questions with a given question tag that the user can use: system + own (QB-10). | confirmed |


| Term | Meaning | Status |
|---|---|---|
| Quiz Set | A collection of questions owned by a user (or the system), Public or Private. One uploaded test; its questions carry question tags (QB-07, QB-11). | confirmed |
| Visibility | Public or Private, per Quiz Set. | confirmed |
| Group | Questions that share one passage or audio and are always served together; one quiz (QB-06, DP-17). | confirmed |
| Passage / Audio | The shared material of a group (QB-06). | confirmed |
| Question | One multiple-choice question: 2–6 choices, one correct (DP-07). | confirmed |
| Answer Key | The correct choice of a question. | confirmed |
