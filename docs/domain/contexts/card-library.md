# Card Library

## Purpose
Personal flashcards that the user organises with tags. One card can have many tags; one tag can be on many cards.

Started fresh on 2026-10-20. The old Flex Card backend is reference only, not a source of rules.

## Model (confirmed 2026-10-22, C-16)
- **Card** aggregate: front, back, state (Active | Trashed), and the set of tag ids it carries. The card owns its CardTags, because the rules about CardTags are card rules (state, max tags).
- **Tag** aggregate: name. Referenced by cards by id only.
- "Cards with tag X" and "tag card count" are queries, not something Tag protects.

## Events (confirmed 2026-10-22, C-16)
- `CardCreated`, `CardEdited`
- `CardTagged`, `CardUntagged`
- `CardMovedToTrash`, `CardRestored`, `CardDeletedPermanently`
- `TagCreated`, `TagRenamed`, `TagDeleted`
- `TagsMerged` (TAG-10; replaces per-card `CardTagged` / `CardUntagged` during a merge)

## Commands (draft)
| Command | On | Notes |
|---|---|---|
| createCard(front, back, tagNames) | Card | Unknown tag names are created (TAG-05) |
| editCard(front, back) | Card | Active only (TRASH-02) |
| tagCard(tagName) / untagCard(tagId) | Card | Active only |
| moveToTrash() / restore() / deletePermanently() | Card | |
| emptyTrash() | user's trashed cards | Confirm with count (TRASH-07) |
| createTag(name) / deleteTag() | Tag | |
| renameTag(name) | Tag | Existing name → merge (TAG-08, TAG-10) |
| replaceTag(A, B) | Card | Merge only (CARDTAG-04) |

---

## Rules

### Cards
**CARD-01** `confirmed` — Front and back are both required. Empty after trimming = invalid.

**CARD-02** `confirmed` — Front: max 500 characters. Back: max 3000 characters. Counted in code points after NFC (`[...text].length`), not bytes, so Chinese isn't penalised.

**CARD-03** `confirmed` — Front and back are plain text in v1. Images and audio come later (backlog B-02).

**CARD-04** `confirmed` — Cards and tags are private to their owner. Public cards/tags come later (backlog B-06).

**CARD-05** `confirmed` — Front and back are stored as NFC with leading and trailing whitespace removed. Inner spaces and newlines are kept. Order: NFC → trim → empty check (CARD-01) → length check (CARD-02), so the length is counted after trimming. (C-11)
```
"  Dog \n"            → "Dog"
"a mammal\nthat barks" → "a mammal\nthat barks"   (inner newline kept)
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

**TAG-03** `confirmed` — A tag name is unique per user (after TAG-01). Enforced by a DB unique constraint on (user, name).

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

**TAG-10** `confirmed` — A merge runs in one transaction. Every affected card goes through the Card class: `card.replaceTag(A, B)`. The DB only stores what Card approved. This spans many aggregates in one transaction: a documented exception (ADR-004). Event: `TagsMerged`.
```ts
await db.transaction(async (tx) => {
  // lock tag A and tag B rows first (SELECT ... FOR UPDATE)
  const cards = await cardRepo.findByTag(A, tx);       // Active + Trashed (TAG-09)
  for (const c of cards) c.replaceTag(A, B);           // throw → rollback, nothing changes
  await cardRepo.saveAll(cards, tx);
  await tagRepo.delete(A, tx);
});
```
- Any failure (rule, race, DB) → rollback → nothing changed → UI: "Merge failed, try again".
- Listeners of `CardTagged` / `CardUntagged` must also handle `TagsMerged` (no per-card events).
- No undo; covered by the UI confirmation (TAG-08).
- If a merge ever gets slow (thousands of cards), revisit with set-based SQL (see ADR-004).

### CardTags
**CARDTAG-01** `confirmed` — Removing a tag from a card removes only that one CardTag. The tag stays (even with 0 cards) and other cards keep it. No soft delete: the user can add it again in seconds.

**CARDTAG-02** `confirmed` — A trashed card can't be tagged or untagged. Restore it first.

**CARDTAG-03** `confirmed` — A card has at most 20 tags. Raise later if someone actually hits it (raising is free, lowering is not).

**CARDTAG-04** `confirmed` — `card.replaceTag(A, B)` removes A and adds B in one step, used only by a tag merge (TAG-08, TAG-10):
| Card has | Result |
|---|---|
| A, not B | A → B, count unchanged |
| A and B | A removed, count −1 (not an error) |
| not A | throw (race or bug) → merge rolls back |
It is the only tag change allowed on a trashed card (supports TAG-09). It never increases the tag count, so CARDTAG-03 always holds.

**CARDTAG-05** `confirmed` — Adding a tag the card already has, or removing a tag it doesn't have, is a no-op: nothing changes, no event. A double-tap or a retried request is harmless. (C-09)

**CARDTAG-06** `confirmed` — The same tag twice in one input (createCard, tagCard) is kept once. CARDTAG-03 is checked after removing duplicates. Names are compared after TAG-01, case-sensitive (TAG-02). (C-14)
```
#Animals #Animals #animals → Animals, animals (2 tags)
```

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

### Reads
**READ-01** `confirmed` — Every read that returns or counts cards states which state it wants. Repository methods are named by state (`findActive`, `findTrashed`); there is no `findAll`. No DB view. Each read path gets a test: "trashed card not returned".

| Read | State |
|---|---|
| Card list, search, cards in tag, tag card count | Active |
| Card detail | Active (Trashed only from the Trash tab) |
| Trash tab | Trashed |
| Other contexts (Daily Practice) | Active, via Card Library API only |

### UI
**UI-01** `confirmed` — Tags are entered with a chip input. Enter commits a chip. Spaces are allowed inside a chip. `#` is display only, not part of the name.

**UI-02** `confirmed` — Tag autocomplete: load all of the user's tags once, filter on the client, case-insensitive match (so `Animals` shows up before the user creates `animals`). Refresh the list after a tag is created, renamed or deleted. Server-side search with debounce only if a user gets thousands of tags.

**UI-04** `confirmed` — On a card, the user can only add or remove tags. No renaming from the card.

**UI-05** `confirmed` — The Tag list is where tags are renamed (TAG-11) and deleted (TAG-06).

**UI-06** `confirmed` — Tag list shows tags as colored buttons. Long-press on a tag opens a bottom sheet with: Show cards, Rename, Delete (mobile form of the original tooltip idea). Tag color: TAG-12.

**UI-07** `confirmed` — The random color is picked from a fixed palette of readable colors (good contrast in light and dark mode), not any hex value. The palette keys are in TAG-13; the app owns the light/dark hex for each key.

**UI-03** `confirmed` — Deleting a tag asks for confirmation showing how many cards have it ("Animals is on 312 cards. Delete?").

---

## Open questions
None open.
