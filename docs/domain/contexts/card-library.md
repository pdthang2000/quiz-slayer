# Card Library

## Purpose
Personal flashcards that the user organises with tags. One card can have many tags; one tag can be on many cards.

Started fresh on 2026-10-20. The old Flex Card backend is reference only, not a source of rules.

## Model (confirmed 2026-10-22, C-16)
- **Card** aggregate: front, back, state (Active | Trashed), trashedAt (TRASH-12), and the set of tag ids it carries. The card owns its CardTags, because the rules about CardTags are card rules (state, max tags).
- **Tag** aggregate: name. Referenced by cards by id only.
- "Cards with tag X" and "tag card count" are queries, not something Tag protects.

## Events (confirmed 2026-10-22, C-16)
- `CardCreated`, `CardEdited`
- `CardTagged`, `CardUntagged`
- `CardMovedToTrash`, `CardRestored`, `CardDeletedPermanently`
- `TagCreated`, `TagRenamed`, `TagDeleted`
- `TagsMerged` (TAG-10; replaces per-card `CardTagged` / `CardUntagged` during a merge)

## Commands (confirmed 2026-10-23, C-23)
| Command | On | Notes |
|---|---|---|
| createCard(front, back, tagNames) | Card (+ new Tags) | Unknown tag names are created (TAG-05) |
| editCard(cardId, version, front, back, tagNames) | Card (+ new Tags) | One request from the card editor's Save (CARD-07). Active only (TRASH-02). `version` = the one the editor was shown (CARD-08) |
| moveToTrash(version) / restore(version) / deletePermanently(version) | Card | `version` = the one the screen showed (CONFLICT-01) |
| removeCardsFromTag(tagId, tagVersion, [{cardId, version}]) | Cards | Tag view: ✕ or ticked cards; all or nothing (CARDTAG-07, ADR-011) |
| addCardsToTag(tagId, tagVersion, [{cardId, version}]) | Cards | Tag view: card picker; all or nothing (CARDTAG-08, ADR-011) |
| emptyTrash(expectedCount, newestTrashedAt) | user's trashed cards | TRASH-07, TRASH-11 |
| renameTag(version, name, confirmMerge?) | Tag | Existing name → 409 preview, then merge (TAG-08, TAG-10, TAG-15) |
| deleteTag(version) | Tag | `version` = the one the screen showed (TAG-16) |
| replaceTagForMerge(A, B) | Card | Merge only (CARDTAG-04) |

Tags on one card change through the editor's Save (CARD-07); several cards change through a tag's card list (CARDTAG-07, CARDTAG-08). No createTag in v1 (UI-08).

---

## Rules

### Conflicts
**CONFLICT-01** `confirmed` — Any change made from an outdated view of a card, a tag or the Trash never goes through. The user sees the latest state and decides again. Every change sends what the screen showed (a version, or for the Trash a count and time); if the server has something newer, it answers 409 and changes nothing; the app reloads the screen with the message. One rule for every action, no exceptions. (C-44)
```
Phone shows Rex (v7) → Laptop edits Rex (v8) → Phone ✕ Rex in #Dog (sends v7)
→ 409 CardChanged "Rex was changed on another device" → reload → user decides again
```
Covered by: CARD-08 (cards), TAG-16 (tags), TRASH-11 (Trash), TAG-15 (merge target), C-40 (merge vs a card saved at the same moment).

### Cards
**CARD-01** `confirmed` — Front and back are both required. Empty after trimming = invalid.

**CARD-02** `confirmed` — Front: max 500 characters. Back: max 3000 characters. Counted in code points after NFC (`[...text].length`), not bytes, so Chinese isn't penalised.

**CARD-03** `confirmed` — Front and back are plain text in v1. Images and audio come later (backlog B-02).

**CARD-04** `confirmed` — Cards and tags are private to their owner. Public cards/tags come later (backlog B-06).
A card can only carry its owner's tags. Enforced twice (C-22): use cases check the tag ids with `tagRepo.findByIds(userId, ids)`, and the DB backstops it — `card_tag` stores `user_id`, with foreign keys on (card_id, user_id) and (tag_id, user_id).

**CARD-05** `confirmed` — Front and back are stored as NFC with leading and trailing whitespace removed. Inner spaces and newlines are kept. Order: NFC → trim → empty check (CARD-01) → length check (CARD-02), so the length is counted after trimming. (C-11)
```
"  Dog \n"            → "Dog"
"a mammal\nthat barks" → "a mammal\nthat barks"   (inner newline kept)
```

**CARD-06** `confirmed` — A card counts as edited only if its content changes. Saving the same front and back (after CARD-05) is a no-op: nothing changes, no `CardEdited`. Same idea as CARDTAG-05 and TAG-14.
```
Dog | a mammal that barks → Save with no changes → no-op
Dog | a mammal that barks → Save "Dog | a mammal that barks " → trimmed → same → no-op
```

**CARD-07** `confirmed` — The card editor saves front, back and tags in one request when the user taps Save. The server compares with the stored card and applies only what changed: edit text (CARD-06), remove tags, add tags (creating new ones, TAG-05). Leaving the editor without Save changes nothing. (C-23)
```
Before: Dog | a mammal            #pitbull #English
Save:   Dog | a mammal that barks #English #Animals
→ back edited, #pitbull removed, #Animals added (created if new) — one request
```
New tags and the card are written in one transaction: if anything fails, nothing is saved and no new tag is left behind (C-32, ADR-009).
```
Save Dog + new #Animals → card save fails (Dog was trashed on another device)
→ rolled back: no #Animals tag, Dog unchanged
```

**CARD-08** `confirmed` — A change based on an outdated view of a card fails instead of overwriting newer changes. Each card has a version. Every card action — Save, move to trash, restore, delete permanently, add to / remove from a tag — sends the version the screen showed; out of date → `CardChanged` (Stale screen, 409), nothing is written (CONFLICT-01). (C-39, C-44)
```
Phone:  opens Dog's editor (Dog: Active)
Laptop: moves Dog to trash
Phone:  taps Save → 409 CardChanged "This card was changed on another device. Refresh." → Dog stays in the Trash
```

### Tags
**TAG-01** `confirmed` — A tag name is normalized before it is checked or saved:
1. Unicode NFC (see ADR-003)
2. trim both ends
3. collapse inner whitespace to one space
4. length 1–50 characters after normalization
5. allowed characters: letters in any language, combining marks, decimal digits (Unicode `Nd`: `0-9`, `٣`, ...; not `①`, `Ⅻ`, `½`; C-12), space, `-`, `_`. Everything else (`.`, `,`, `#`, `/`, ...) is rejected.

```
" pit   bull "   → "pit bull"     ok
"động vật"       → "động vật"     ok (NFC)
"动物"           → "动物"          ok
"HSK.1"          → rejected (.)
"a,b"            → rejected (,)
```

**TAG-02** `confirmed` — Tag names are case-sensitive. `Animals` and `animals` are two different tags.

**TAG-03** `confirmed` — A tag name is unique per user (after TAG-01). Enforced by a DB unique constraint on (user, name). If two requests race and the constraint rejects one, it fails with `TagNameTaken` (C-20).

**TAG-04** `confirmed` — Empty tags (0 cards) are kept. The user deletes them manually. A "remove all empty tags" action is planned for later (backlog B-01).

**TAG-05** `confirmed` — When a user types a tag name on a card that doesn't exist yet, the tag is created when the card is saved.
```
Animals exists, pitbull doesn't.
Create card [Dog | a mammal that barks] with #Animals #pitbull
→ Animals: link only. pitbull: created + linked.
```

**TAG-06** `confirmed` — Deleting a tag (from the Tag list) removes the tag and all its CardTags for good. Cards are never deleted because of a tag.
```
Animals on [Cat, Fish, Dog] → delete Animals
→ Cat, Fish, Dog still exist, without #Animals
```

**TAG-07** `confirmed` — A deleted tag's name can be reused immediately (hard delete, no tag trash).

**TAG-11** `confirmed` — Tags are renamed only from the Tag list. A rename changes the name on every card that has the tag. Cards hold the tag id, not the name, so a rename changes only the Tag; no card is touched.
```
Animals [Cat, Fish, Dog] → rename to "Mammals"
→ Cat, Fish, Dog now show #Mammals
```

**TAG-14** `confirmed` — Renaming a tag to its current name (after TAG-01) is a no-op: nothing changes, no event, not a merge. (C-15)
```
"Animals" → rename to " Animals " → normalized "Animals" → no-op
```

**TAG-12** `confirmed` — A new tag gets a random color, stored on the tag so it stays the same. A rename keeps the color. After a merge (TAG-08) the result keeps the existing tag's color. Letting the user choose a color comes later (backlog B-03).

**TAG-13** `confirmed` — A tag stores a color key, not a hex value. Keys: `red`, `orange`, `amber`, `green`, `teal`, `cyan`, `blue`, `indigo`, `purple`, `pink`, `brown`, `slate`. The app maps each key to a light-mode and a dark-mode color (UI-07). (C-13)

**TAG-08** `confirmed` — Renaming tag A to the name of an existing tag B merges A into B: every card with A gets B, and A is deleted. The UI shows the merge explicitly and asks for confirmation before it happens.
```
pitbull [Dog, Rex, Max]    Dogs [Dog, Fido]
rename pitbull → "Dogs"
UI: "Dogs already exists (2 cards). Merge pitbull (3 cards) into Dogs? Result: 4 cards."
→ Dogs [Dog, Rex, Max, Fido], pitbull gone. Dog had both → one CardTag.
```
Because names are case-sensitive (TAG-02), renaming `animals` → `Animals` when both exist is also a merge.
A merge never increases a card's tag count, so it can't break CARDTAG-03.

**TAG-09** `confirmed` — A merge also moves the CardTags of trashed cards, so a restored card shows the merged tag.

**TAG-10** `confirmed` — A merge runs in one transaction. Every affected card goes through the Card class: `card.replaceTagForMerge(A, B)`. The DB only stores what Card approved. This spans many aggregates in one transaction: a documented exception (ADR-004). Event: `TagsMerged`.
```ts
await transactions.run(async () => {                   // ADR-008
  await tagRepo.lockForMerge(userId, [A.id, B.id]);    // SELECT ... FOR UPDATE
  const cards = await cardRepo.findByTag(userId, A.id); // Active + Trashed (TAG-09)
  for (const c of cards) c.replaceTagForMerge(A.id, B.id); // throw → rollback, nothing changes
  await cardRepo.saveAll(cards);
  A.mergeInto(B);                                      // records TagsMerged
  await tagRepo.delete(A);
});
```
- Any failure (rule, race, DB) → rollback → nothing changed → UI: "Merge failed, try again".
- `TagsMerged` is the only event of a merge: it also means tag A is gone. No `TagDeleted` for A, no per-card `CardTagged` / `CardUntagged`. Listeners of those events must also handle `TagsMerged`. (C-17)
- No undo; covered by the UI confirmation (TAG-08).
- If a merge ever gets slow (thousands of cards), revisit with set-based SQL (see ADR-004).

**TAG-15** `confirmed` — Renaming onto an existing name never merges silently. The rename request without confirmation fails with 409 and the merge preview; the app shows the dialog (TAG-08) and sends the same request again with `confirmMerge: true`. Preview counts are Active cards only (TRASH-03), even though the merge also moves trashed cards (TAG-09). (C-25)
```
PATCH rename pitbull → "Dogs"
← 409 { into: "Dogs", intoCount: 2, fromCount: 3, resultCount: 4 }
app: "Dogs already exists (2 cards). Merge pitbull (3 cards) into Dogs? Result: 4 cards."
PATCH rename pitbull → "Dogs", confirmMerge: true → merged
```
If the tags changed between the preview and the confirmed request, the merge re-checks them after taking its lock. What you confirmed is exactly what happens, or you are asked again (C-38, revised 2026-10-25):
| After the lock | Result |
|---|---|
| pitbull is gone | 404 `TagNotFound` |
| Dogs unchanged (same tag, same name) | merge, as confirmed |
| Anything else: Dogs renamed or deleted, another tag now holds "Dogs", or "Dogs" is free | 409 `TagMergeNeedsConfirmation` with a fresh preview: against the tag that holds "Dogs" now, or with no merge target if nobody does (the app then asks "Rename pitbull to Dogs?" and resends without `confirmMerge`) |

**TAG-16** `confirmed` — Each tag has a version: it changes whenever the tag's name or its list of Active cards changes — rename, merge (the target), cards added or removed through the tag's list, an editor Save that adds or removes the tag, and moving to trash or restoring a card that has the tag. Rename, delete, and adding or removing cards through the tag's list send the tag version the screen showed; out of date → `TagChanged` (Stale screen, 409), nothing changes (CONFLICT-01). (C-44, C-45, C-46)
```
Phone: "Delete #Dog? It's on 3 cards." → Laptop adds 10 cards to #Dog → Phone confirms
→ 409 TagChanged → reload → "Delete #Dog? It's on 13 cards."
```

### CardTags
**CARDTAG-01** `confirmed` — Removing a tag from a card removes only that one CardTag. The tag stays (even with 0 cards) and other cards keep it. No soft delete: the user can add it again in seconds.

**CARDTAG-02** `confirmed` — A trashed card can't be tagged or untagged. Restore it first.

**CARDTAG-03** `confirmed` — A card has at most 20 tags. Raise later if someone actually hits it (raising is free, lowering is not).

**CARDTAG-04** `confirmed` — `card.replaceTagForMerge(A, B)` removes A and adds B in one step, used only by a tag merge (TAG-08, TAG-10):
| Card has | Result |
|---|---|
| A, not B | A → B, count unchanged |
| A and B | A removed, count −1 (not an error) |
| not A | throw (race or bug) → merge rolls back |
It is the only tag change allowed on a trashed card (supports TAG-09). It never increases the tag count, so CARDTAG-03 always holds.

**CARDTAG-05** `confirmed` — Adding a tag the card already has, or removing a tag it doesn't have, is a no-op: nothing changes, no event. A double-tap or a retried request is harmless. (C-09)

**CARDTAG-06** `confirmed` — The same tag twice in one input (createCard, editCard) is kept once. CARDTAG-03 is checked after removing duplicates. Names are compared after TAG-01, case-sensitive (TAG-02). (C-14)
```
#Animals #Animals #animals → Animals, animals (2 tags)
```

**CARDTAG-07** `confirmed` — A tag's card list can remove cards from the tag: ✕ at the right end of a row removes that card; checkboxes at the left select several, then "Remove (n)". It removes only that tag from those cards. All or nothing (ADR-011); each card sends its version (CARD-08) and the action sends the tag's version (TAG-16). A toast "Removed from #Dog · Undo" puts them back. Max 100 cards per action, checked by the app and by the API (shape guard). (T-4)
```
#Dog (4) ▾                      [Remove (2)]
 ☑ Rex                       ✕
 ☐ Max                       ✕
 ☑ Fido                      ✕
 [+ Add cards]
```

**CARDTAG-08** `confirmed` — "+ Add cards" opens a picker: Active cards not already in the tag, with search (READ-03), newest first, 20 at a time + Load more. Cards that already have 20 tags are greyed out and can't be ticked (CARDTAG-03). Adding is all or nothing (ADR-011): if a card filled up or changed meanwhile, or the tag changed, nothing is added (`TooManyTags` naming the card, `CardChanged`, or `TagChanged`). Max 100 cards per action, checked by the app and by the API. (T-1, T-2, T-4)

### Trash
**TRASH-01** `confirmed` — Deleting a card moves it to the Trash. It is not gone.

**TRASH-02** `confirmed` — A trashed card is read-only: no edit, no tag changes. Restore first. Only exception: a tag merge (CARDTAG-04).

**TRASH-03** `confirmed` — A trashed card is hidden everywhere except the Trash tab: card list, search, tag card counts, cards-in-tag, Daily Practice.

**TRASH-04** `confirmed` — CardTags are kept while a card is in the Trash, so restore brings its tags back.
```
你好 [HSK1, greeting] → move to trash → HSK1 count 2 → 1
restore → 你好 [HSK1, greeting]
```

**TRASH-05** `confirmed` — Deleting permanently removes the card and its CardTags. No undo.

**TRASH-06** `confirmed` — If a tag is deleted while a card is in the Trash, that CardTag is gone too (follows from TAG-06). The card restores without that tag.

**TRASH-07** `confirmed` — "Empty trash" asks for confirmation with the count ("Delete 47 cards forever?").

**TRASH-08** `confirmed` — v1: trashed cards are never deleted automatically. Auto-delete after 30 days comes later (backlog B-04).

**TRASH-09** `confirmed` — Deleting a card always moves it to the Trash. There is no "delete permanently" outside the Trash tab (one delete button, no confusion).

**TRASH-10** `confirmed` — Moving a trashed card to the trash fails with `CardIsTrashed`. Restoring or deleting permanently an active card fails with `CardIsNotTrashed` (the latter follows from TRASH-09). The UI never offers these, so if one happens it is a bug or a stale screen. (C-10)

**TRASH-11** `confirmed` — "Empty trash" sends the count the user saw and the newest "trashed at" time the screen showed. If the Trash now holds a different number of cards, or a newer trashed card, nothing is deleted and it fails with 409 (Stale screen): "Trash changed, check again." (C-26, C-44)
```
Dialog: "Delete 2 cards forever?" (A, B) → Laptop restores A, trashes C → still 2, but C is newer → 409
```
```
Dialog: "Delete 47 cards forever?" → another device trashes 1 more → 48 in Trash
→ confirm sends 47 → 409, nothing deleted → app refreshes the Trash
```
The count check and every `card.deletePermanently()` run in one transaction: any failure deletes nothing (C-35, ADR-010).

**TRASH-12** `confirmed` — The Trash tab shows the most recently trashed card first. A card stores `trashedAt`: set by move to trash, cleared by restore. (C-30; also what B-04 auto-delete needs.) It loads 20 at a time ("load more", like READ-02), and the response carries the total count for the TRASH-07 dialog. (C-33)

### Reads
**READ-01** `confirmed` — Every read that returns or counts cards states which state it wants. Repository methods are named by state (`findActive`, `findTrashed`); there is no `findAll`. No DB view. Each read path gets a test: "trashed card not returned".

| Read | State |
|---|---|
| Card list, search, cards in tag, tag card count | Active |
| Card detail | Active (Trashed only from the Trash tab) |
| Trash tab | Trashed |
| Other contexts (Daily Practice) | Active, via Card Library API only |

**READ-02** `confirmed` — The card list shows the newest created card first, 20 at a time; scrolling to the bottom loads the next 20 (cursor-based "load more", no page numbers). (C-27, C-31)

**READ-03** `confirmed` — Search matches any part of the front or back, ignoring case and accents. Tags are filtered with tag chips, not by text search. Tag names themselves stay case-sensitive (TAG-02). (C-28)
```
"dog"      → finds "Dog"
"dong vat" → finds "động vật"
```

**READ-04** `confirmed` — The Tag list is sorted A–Z in dictionary order, ignoring case and accents. (C-29, C-36)
```
animals, Animals, apple, dog, động vật, HSK1, 动物
```

**READ-05** `confirmed` — With several tag chips selected, the card list shows cards that have all of them (AND); each chip narrows the list. Combined with search (READ-03), both must match. (C-34)

**READ-06** `confirmed` — The tags on a card are shown A–Z, in the same dictionary order as READ-04 (ignoring case and accents). (C-37)
```
Dog [pitbull, Animals, động vật, apple] → Animals, apple, động vật, pitbull
```

### UI
**UI-01** `confirmed` — Tags are entered with a chip input. Enter commits a chip. Spaces are allowed inside a chip. `#` is display only, not part of the name. The app drops any leading `#` the user types (`#Dog` → `Dog`, `##Dog` → `Dog`). (C-50)

**UI-02** `confirmed` — Tag autocomplete: load all of the user's tags once, filter on the client, case-insensitive match (so `Animals` shows up before the user creates `animals`). Refresh the list after a tag is created, renamed or deleted. Server-side search with debounce only if a user gets thousands of tags.

**UI-04** `confirmed` — On a card, the user can only add or remove tags. No renaming from the card.

**UI-05** `confirmed` — The Tag list is where tags are renamed (TAG-11) and deleted (TAG-06). A tag's card list (from the Tag list or ⋯ → Tags) is where cards are added to or removed from that tag (CARDTAG-07, CARDTAG-08).

**UI-06** `confirmed` — Tag list shows tags as colored buttons. Long-press on a tag opens a bottom sheet with: Show cards, Rename, Delete (mobile form of the original tooltip idea). Tag color: TAG-12.

**UI-07** `confirmed` — The random color is picked from a fixed palette of readable colors (good contrast in light and dark mode), not any hex value. The palette keys are in TAG-13; the app owns the light/dark hex for each key.

**UI-03** `confirmed` — Deleting a tag asks for confirmation showing how many cards have it ("Animals is on 312 cards. Delete?").

---

**UI-08** `confirmed` — No "New tag" button in v1. Tags are created only by typing them on a card (TAG-05). (C-24)

**UI-09** `confirmed` — Navigation is a menu on the left (a side drawer opened with ☰), with three items: Cards, Tags, Trash. No bottom tab bar. (U-1)
```
☰ ┌──────────┐
  │ Cards    │
  │ Tags     │
  │ Trash    │
  └──────────┘
```

**UI-10** `confirmed` — The card list shows the front only. Tapping a card flips it in place to show the back. Each card has a "⋯" button that opens a menu: Edit, Tags, Delete. (U-2)
```
[ 你好      ⋯ ]  tap → [ xin chào  ⋯ ]
                 ⋯   → Edit · Tags · Delete
```
**UI-14** `confirmed` — "⋯ → Tags" shows this card's tags, each with its count of Active cards (TRASH-03), in READ-06 order. It loads only the tags and their counts. Expanding a tag loads that tag's cards (Active, newest first, READ-02) 20 at a time with a "Load more" button — fetched only when expanded. An expanded tag's card list also allows removing and adding cards (CARDTAG-07, CARDTAG-08). (C-41)
```
[ 你好  ⋯ ] → Tags →  ▸ #greeting (12)   ▸ #HSK1 (50)
tap ▸ #greeting  →  loads: Hello, 你好, Xin chào … (20)  [Load more]
```

**UI-13** `confirmed` — "⋯ → Delete" moves the card to the Trash at once, without a dialog (it can be restored, TRASH-01). A short toast shows "Moved to Trash · Undo"; Undo restores the card (TRASH-04). (C-42) The toast stays 5 seconds. (C-48)

**UI-11** `confirmed` — All app text goes through i18n, ready for more languages; English is the default and only language in v1. Messages for errors are app strings looked up by error code (the server's message is for logs). Card content can be in any language. (U-3)

**UI-12** `confirmed` — Dark mode follows the phone's setting. (U-4)

**UI-15** `confirmed` — Leaving the card editor (Cancel or Back) with unsaved changes asks "Discard changes?" first. With no changes it leaves at once. (C-49)

**UI-16** `confirmed` — App messages that are not in the error table (C-47):
| When | Message |
|---|---|
| No network / no answer | "Can't reach the server. Check your connection." |
| `CardNotFound` | "This card no longer exists." |
| Empty card list | "No cards yet. Tap + to add one." |
| Empty card list with a filter | "No cards match." |
| After Undo | "Card restored" |

### Study
Flip through cards one by one. v1 has no scoring and stores nothing.
```
Cards → filter #HSK1 → Study → 你好 → tap → xin chào → Next → …
```

**STUDY-01** `confirmed` — Study uses exactly the cards the card list shows: the selected tag chips (READ-05) and the search (READ-03). Nothing selected → all Active cards. (S-1)

**STUDY-02** `confirmed` — A study session uses the cards that matched when Study was pressed. Cards added later are not in it; a card trashed or deleted meanwhile is skipped. (S-1)
```
Start Study #HSK1 (50 cards) → add a new #HSK1 card on the laptop → not in this session
```

**STUDY-03** `confirmed` — Order: newest first by default (like the list); a Shuffle button randomizes the order over all cards of the session. (S-2)

**STUDY-04** `confirmed` — The user chooses which side is shown first; the default is the front. (S-3)

**STUDY-05** `confirmed` — v1: flip and Next only. No "know / don't know", no score, nothing stored. A Quizlet-like study experience comes later (backlog B-12). (S-4)

**STUDY-06** `confirmed` — No limit on cards per session; the user can stop anytime. (S-5)

How a session loads (technical, C): the app first loads only the matching card ids (small even for thousands of cards), orders or shuffles them on the phone, then fetches card content 20 at a time, fetching the next batch before it is needed.

## Error handling

Every rule violation throws a named domain error (never a plain `Error` or `HttpException`). An exception filter in `api/` maps each error to an HTTP status; the app maps it to a message.

Names, kinds, HTTP statuses and messages `confirmed` (C-18).

| Error | Rule | When | Kind | HTTP | Message to the user |
|---|---|---|---|---|---|
| `InvalidCardFront` (empty / tooLong) | CARD-01, CARD-02, CARD-05 | Front empty after trim, or > 500 chars | User input | 400 | "Front is required" / "Front is max 500 characters" |
| `InvalidCardBack` (empty / tooLong) | CARD-01, CARD-02, CARD-05 | Back empty after trim, or > 3000 chars | User input | 400 | "Back is required" / "Back is max 3000 characters" |
| `InvalidTagName` (length / character) | TAG-01 | Name not 1–50 chars, or a forbidden character | User input | 400 | "Tags use letters, numbers, spaces, - and _ (max 50)" |
| `InvalidTagColor` | TAG-13 | Color key not in the palette | Bug (users can't pick colors yet) | 400 | generic "Something went wrong" |
| `TooManyTags` | CARDTAG-03 | 21st tag on a card | User input | 422 | "A card can have at most 20 tags" |
| `CardIsTrashed` | TRASH-02, CARDTAG-02, TRASH-10 | Edit / tag / trash a card that is in the Trash | Stale screen | 409 | "This card is in the Trash. Restore it first." + refresh |
| `CardIsNotTrashed` | TRASH-10 | Restore / delete permanently an active card | Stale screen | 409 | "This card is no longer in the Trash." + refresh |
| `TagNoLongerExists` | CARD-04, TAG-06, TAG-10 | Saving a card with a tag that was deleted or merged away meanwhile (DB foreign key fails) (C-21) | Stale screen | 409 | "This tag no longer exists. Refresh." |
| `TagMergeNeedsConfirmation` | TAG-15 | Rename onto an existing name without `confirmMerge` | Confirmation | 409 | Merge dialog with the preview counts (TAG-08) |
| `TrashChanged` | TRASH-11 | Empty trash with a count that no longer matches | Stale screen | 409 | "Trash changed, check again." + refresh |
| `CardChanged` | CARD-08 | Any card action from a view older than the card (another device or tab) (C-39, C-44) | Stale screen | 409 | "This card was changed on another device. Refresh." |
| `TagChanged` | TAG-16 | Rename or delete a tag that changed since the screen loaded it (C-44) | Stale screen | 409 | "This tag was changed on another device. Refresh." |
| `TagNameTaken` | TAG-03 | Two requests create the same tag name at once; the DB unique constraint rejects the second (C-20) | Race | 409 | "This tag already exists. Try again." (rolled back; a retry links the existing tag) |
| `TagMergeFailed` | TAG-10, CARD-08 | A confirmed merge finds one of its cards saved on another device meanwhile (C-40) | Race | 409 | "Merge failed, try again." (merge rolled back; a retry almost always works) |
| `TransactionConflict` (technical) | — | Postgres kept aborting the transaction (deadlock), even after 3 automatic retries (B-11, ADR-008) | Race | 409 | "Try again." |
| `TagNotOnCard` | CARDTAG-04 | Merge finds a card without tag A (race) | Race | 409 | "Merge failed, try again" (merge rolled back) |
| `TagMergeNotAllowed` (sameTag) | TAG-08 | Merge a tag into itself | Bug (TAG-14 makes same-name rename a no-op) | 409 | generic "Something went wrong" |
| `TagMergeNotAllowed` (otherUser) | TAG-08, CARD-04 | Merge into another user's tag | Bug / tampering | 404 | "Tag not found" (don't reveal other users' tags) |

Kinds:
- **User input** — the user can fix it; show the message next to the field.
- **Stale screen** — the screen is out of date (e.g. changed on another device); show the message and refresh.
- **Race** — two actions at once; the operation rolled back; safe to retry.
- **Bug** — the app should never send this; log it, show a generic message.
- **Confirmation** — not a failure: the server needs the user to confirm first; the app shows a dialog and resends.

Not-found errors (`CardNotFound`, `TagNotFound`) come from the application layer in Phase 3 → 404.

## Open questions
None open.
