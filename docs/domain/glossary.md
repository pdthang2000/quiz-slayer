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
| Delete permanently | Remove a trashed card and its CardTags for good. No undo. | | confirmed |
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
| `TagNameTaken` | TAG-03 (DB unique constraint hit by a race, C-20) | confirmed |
| `TagNotOnCard` | CARDTAG-04 (replaceTagForMerge when the card lacks A) | confirmed |
| `TagMergeNotAllowed` | Merging a tag into itself or into another user's tag (TAG-08, CARD-04) | confirmed |

## Daily Practice (all draft)

| Term | Meaning | Status |
|---|---|---|
| Track | The test a user practises for (TOEIC, IELTS, HSK...). | draft |
| Daily Session | One user's set of quizzes for one track on one day. | draft |
| Slot | One place in a daily session (10 per day by default). | draft |
| Attempt | A user's answer to one item in a daily session. | draft |
| Mistake | An item answered wrong; may come back later. | draft |
| Streak | Consecutive days with a completed daily session. | draft |

## Question Bank (all draft)

| Term | Meaning | Status |
|---|---|---|
| Test | A source exam format (TOEIC, IELTS, HSK). | draft |
| Quiz Set | A collection of questions owned by a user (or the system), Public or Private. Belongs to a Test (e.g. a TOEIC Quiz Set). | confirmed |
| Visibility | Public or Private, per Quiz Set. | confirmed |
| Section | A part of a test (TOEIC Part 3, IELTS Listening). | draft |
| Item Group | Items that share one stimulus; served together. | draft |
| Stimulus | Shared material: audio, passage, image. | draft |
| Item | One question with its answer key. | draft |
| Answer Key | The correct answer(s) for an item. | draft |
