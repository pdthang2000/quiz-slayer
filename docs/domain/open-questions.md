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
| C-47 | App text not in the error table (phase 4a, written by the agent, please confirm or reword): no network "Can't reach the server. Check your connection."; `CardNotFound` "Card not found"; empty list "No cards yet. Tap + to add one." / with a filter "No cards match."; after Undo "Card restored". | answered: confirmed; "Card not found" → "This card no longer exists." → UI-16 |
| C-48 | How long does the "Moved to Trash · Undo" toast stay (UI-13)? Provisional: 5 seconds. | answered: 5 seconds → UI-13 |
| C-49 | Card editor: Cancel with unsaved changes — leave at once, or ask "Discard changes?" first? Provisional: leave at once. | answered: ask "Discard changes?" only if something changed → UI-15 |
| C-50 | Chip input: the user types "#Dog". Provisional: sent as typed, so the server answers `InvalidTagName` ("#" is not allowed, TAG-01). Or should the app drop a leading "#" since it is display only (UI-01)? | answered: the app drops leading "#" → UI-01 |
| C-51 | Theme option: the user picks Light, Dark or System (follow the phone) inside the app. This changes UI-12 (dark mode follows the phone) and possibly UI-09 (drawer has only Cards, Tags, Trash). Where does the option live, and is the choice kept per phone or per account? Proposed (`draft`): a "Settings" item at the bottom of the drawer with Appearance: System (default) / Light / Dark, kept on this phone only. | answered: Settings item at the bottom of the drawer, System / Light / Dark, kept on this phone → UI-17 |
| C-52 | Tag list: what does a plain tap on a tag do? UI-06 only defines long-press (Show cards · Rename · Delete). Provisional: a tap shows the tag's cards (same as Show cards). | answered: tap opens the tag's cards → UI-06 |
| C-53 | Slice 4b app texts not written in the docs. Provisional: empty Tag list "No tags yet. Add tags on a card."; empty tag card list "No cards with this tag."; empty picker "No cards to add."; a card with no tags (⋯ → Tags) "This card has no tags."; rename dialog title "Rename #Dog"; picker title "Add to #Dog" and button "Add (n)"; greyed picker row "Has 20 tags"; merge/rename/delete dialog buttons "Merge", "Rename", "Delete". Confirm or reword. | answered: confirmed as listed, plus "Put back in #Dog" after Undo of a remove → UI-16, CARDTAG-07 |
| C-54 | Ticking a 101st card (CARDTAG-07/08 cap of 100). Provisional: the tick is refused and a toast says "You can select up to 100 cards at a time." | answered: refused + toast "You can select up to 100 cards at a time." → CARDTAG-07, CARDTAG-08 |
| C-55 | After "+ Add cards" succeeds. Provisional: the picker closes and a toast says "Added to #Dog" with no Undo (CARDTAG-08 defines no Undo; only removing has one). | answered: picker closes, toast "Added to #Dog · Undo" → CARDTAG-08 |
| C-56 | ⋯ → Tags (UI-14): can several tags be expanded at once? Provisional: yes, each tag opens and closes on its own. Do rows in a tag's card list flip on tap like the Cards screen (UI-10)? Provisional: yes. | answered: several open at once; rows flip on tap → UI-14 |
| C-57 | Undo of "+ Add cards" (CARDTAG-08, C-55) removes the cards again. Which toast confirms it? Provisional: "Removed from #Dog" (the remove text, without Undo), mirroring "Put back in #Dog" for the Undo of a remove. | answered: "Removed from #Dog", no Undo → CARDTAG-08, UI-16 |
| C-58 | Trash tab: how are Restore and Delete permanently reached on a card? Provisional: each row has "⋯" → Restore · Delete permanently (like UI-10); a tap flips the row to the back. Is the trashed date shown on a row? Provisional: no. | answered: ⋯ Restore · Delete permanently, tap flips, plus a small "2 days ago" → TRASH-13 |
| C-59 | Delete permanently of one card (TRASH-05, no undo): ask first? Provisional: yes, "Delete this card forever?" with Cancel / Delete. | answered: yes, "Delete this card forever?" → TRASH-14 |
| C-60 | Slice 4c app texts not written in the docs. Provisional: total above the list "47 cards" / "1 card"; button "Empty trash" (hidden when the Trash is empty); empty Trash "Trash is empty."; TRASH-07 dialog "Delete 47 cards forever?" with Cancel / Delete; toasts "Card restored" (same as UI-13 Undo), "Card deleted permanently", "Trash emptied". | answered: confirmed as listed → UI-16 |
| C-61 | TRASH-13 wording of the relative time. Provisional: "Trashed just now" (under 1 min, or a time slightly in the future), "Trashed 5 min ago" (under 1 hour), "Trashed 1 hour ago" / "Trashed 3 hours ago" (under 1 day), "Trashed 1 day ago" / "Trashed 2 days ago" (no weeks or months). Should the "Trashed" word be shown, or only "2 days ago"? | answered: keep "Trashed"; just now / min / hours / days, weeks after 14 days → TRASH-13 |
| C-62 | Slice 4d Study texts not written in the docs. | answered: accepted as built (texts in the app's i18n file) |
| C-63 | Shuffle pressed on the very first card (nothing moved yet): STUDY-09 says only unseen cards move, so card 1 would stay first. | answered: accepted as built → STUDY-13 |
| C-64 | "Study again" after Done (STUDY-11): which cards and order? | answered: accepted as built → STUDY-14 |
| C-40 | A tag merge fails because one of its cards was saved on another device at the same moment (CARD-08). Which message? | answered: the merge's own error `TagMergeFailed`, "Merge failed, try again." (409, Race) → Error handling |
| C-16 | The Model and Events sections of card-library.md are `draft` (incl. `TagsMerged`). Confirm them as the Phase 1 design? | answered: confirmed as listed, plus `TagsMerged` |

## Daily Practice
| ID | Question | Status |
|---|---|---|
| Q-01 | What is a "day"? User's timezone or fixed? What if a session starts at 23:55? | answered: phone's timezone; a session belongs to the day it started → DP-05 |
| Q-02 | Is 10 strict? What if a group of 3 items comes when only 2 slots are left? | answered: see Q-02a–d → DP-12..DP-17 |
| Q-03 | Missed day: can it be made up? Does it break the streak? | answered: missed day is gone, streak resets → DP-06, B-14 |
| Q-04 | Which answer types are in v1? (Writing/Speaking need human or AI grading) | answered: multiple choice only (text, image or audio question) → DP-07, B-15 |
| Q-05 | How are items selected: random, difficulty, weak areas, spaced repetition of mistakes? | answered: not seen yet + mistakes come back after 1, 3, 7 days → DP-08 |
| Q-06 | Do quiz mistakes become cards: automatically, suggested, or never? | answered: a \"Save as card\" button on wrong answers → DP-10 |
| Q-07 | Can a user study several tracks at once, each with its own daily set? | answered: yes, each track has its own daily set and streak → DP-09 |
| Q-14 | Where do questions come from in v1? | answered: a JSON/CSV file Jackkie writes, imported by a script; in-app editor later → content-ingestion.md |
| D-1..D-8 | A day of practice: feedback, order, resume, finish, changing answers, timer, audio replay, history | answered: → DP-20..DP-26, DP-03 |
| P-1 | When does a question count as seen? | answered: only when answered → DP-27 |
| P-2 | Pool used up, no mistakes due? | answered: start over, oldest-answered first → DP-28 |
| P-3 | Mistake schedule: right on comeback → day 3, day 7, retired; wrong again → back to day 1? | answered: yes → DP-33 |
| P-4 | A group with one wrong question? | answered: the whole group comes back → DP-29 |
| P-5 | Mix of mistakes and new? | answered: due mistakes first, max half → DP-30 |
| P-6 | When is today's set chosen? | answered: when Start is tapped → DP-31 |
| P-7 | More practice after finishing? | answered: not in v1 → B-18 |
| P-8 | "Save as card" twice? | answered: "Saved ✓", no duplicate → DP-32 |
| X-1 | A quiz in two tracks: one progress or one per track? | answered: one per user and quiz → DP-37 |
| X-2 | Can the same quiz be in two tracks' sets on the same day? Proposed: no, the second set skips it. | answered: no, skipped → DP-39 |
| X-3 | If skipping leaves the second set short: reuse the quiz, or show fewer? | answered: strict, show fewer → DP-39 |
| G-3 | "Save as card" on a reading-group question? | answered: no; only single text questions → DP-40 |
| G-4 | What does a saved card contain? | answered: front = question + choices, back = answer + explanation, tag = track's tag → DP-40 |
| G-1 | Where is Daily Practice in the app? Proposed: a first drawer item "Today", and the app opens on it. | answered: accepted → DP-62, UI-09 updated |
| G-2 | How is a track added? Proposed: pick from question tags that have quizzes, with counts. | answered: accepted → DP-59 |
| G-5 | Where do streaks show? Proposed: "Today" screen, overall at the top, each track with its own. | answered: accepted → DP-60 |
| G-6 | Daily reminder notification? Proposed: backlog. | answered: backlog B-22 |
| G-7 | A reading/audio group: are its questions answered one by one with feedback after each, or all together with feedback for the whole group (DP-20 "after each quiz")? | answered: accepted → DP-54 |
| G-8 | Track kinds: can a track have no kind switched on? Which kinds are on when a track is added? | answered: accepted → DP-55 |
| G-9 | Start when nothing matches the track at all (0 quizzes): an empty set (and a free streak day?) or no set? | answered: accepted → DP-56 |
| G-10 | Adding a tag that is already an Active track? | answered: accepted → DP-57 |
| G-11 | Order of quizzes inside a day's set? | answered: accepted → DP-58 |
| G-12 | QB-09 says no tag repeats the kind (no #listening, #audio). Which names exactly are refused? | answered: accepted → QB-12 |
| G-13 | Track settings and removal from two devices: send a version and fail when outdated (like CONFLICT-01), or last change wins? Order of tracks on Today? Does History include today? | answered: CONFLICT-01 applies to tracks (`TrackChanged`); tracks in the order added; History includes today → DP-53 |
| G-14 | Daily Practice error messages (daily-practice.md → Error handling). | answered: accepted as in the error table |
| G-15 | Quiz screen flow: how is an answer given, and what after the last quiz? | answered: accepted → DP-61 |
| G-16 | Slice 6e app texts not in the docs. | answered: accepted as built (texts in the app's i18n file) |
| G-17 | (Review of the run) An unfinished set can be finished days later from History, and that day then counts for the streak. DP-05 allows finishing after midnight; DP-06 says no making up. Until when can a started set be finished? A) until the end of the next day (recommended), B) until 04:00 the next morning, C) anytime, but it counts only if finished by the end of the next day | answered: A, until the end of the next day → DP-52 |
| N-1 | Who sees a note? | answered: only the user who wrote it → DP-42 |
| N-2 | One note per question, or a new note each day? | answered: one per user and question, kept and editable → DP-43 |
| N-3 | In a group: one note per question or per group? | answered: per question → DP-44 |
| N-4 | When can a note be seen and written? | answered: only after answering, right or wrong → DP-45 |
| N-5 | Note length? | answered: up to 1,000 characters, trimmed; empty removes it → DP-46 |
| N-6 | Where is it edited, and how? | answered: feedback, result, History day; Save button, no autosave → DP-45, DP-47 |
| N-7 | What does History show? | answered: the latest note → DP-48 |
| N-8 | Does Save as card copy the note? | answered: yes, a copy on the back below the explanation; button hidden if the back would pass 3,000 → DP-49 |
| N-9 | Two devices editing a note? | answered: CONFLICT-01 → DP-50 |
| N-10 | Question fixed or deleted? | answered: fixed → note stays; deleted → note deleted → DP-51 |
| N-11 | Name? | answered: "Note" (the user's), not "Explanation" (the author's) → glossary, DP-41 |
| R-1 | (Review 2026-11-06) DP-52: where does the user find yesterday's unfinished set? | answered: on Today, "Finish yesterday's set · 3 / 10" under its track → DP-63 |
| R-2 | A card too long for CARD-02 (e.g. a 3,400-character explanation): raise the limit, cut it, hide the button, or open the editor? | answered: open the card editor with a red counter; Save off until it fits → DP-64 |
| R-3 | The front too (DP-40 hid the button over 500)? | answered: yes, same editor for both sides → DP-40, DP-64 |
| R-4 | In that editor, can front, back and tag be changed? | answered: yes, all three → DP-64 |
| R-5 | Cancel in that editor? | answered: nothing saved, the button still reads "Save as card" → DP-64 |
| R-6 | Streak while yesterday's set can still be finished: 0, or the streak with a hint? | answered: reset — show 0 (DP-65); show the best streak somewhere else (R-16) |
| R-7 | Yesterday's set on a removed track: show on Today? | answered: no → DP-63 |
| R-8 | What a note looks like before / after it exists | answered: "📝 Add note" link; existing note with "Edit" → DP-66 |
| R-9 | A typed note not saved, then Next | answered: ask "Discard your note?" → DP-67 |
| R-10 | Note counter | answered: always shown while typing, red over 1,000, Save off → DP-66 |
| R-11 | Notes on a closed set | answered: still editable from History → DP-68 |
| R-12 | A "My notes" page | answered: later → backlog B-23 |
| R-13 | After Save in the Save as card editor | answered: back to the quiz/result, "Saved ✓", no pop-up → DP-64 |
| R-14 | Removing the track's tag in that editor | answered: allowed, same rules as any new card → DP-64 |
| R-15 | Texts for 6e.1 and 6f | answered: as written in daily-practice.md (after DP-68) |
| R-16 | Best streak (R-6): what it counts and where it shows | answered: longest run ever, per track and overall; History header + small line under the overall streak on Today → DP-69 |
| R-17 | (Found building 6e.1) DP-65's example says "Sun and before ✓ (5 days)" and then 🔥5 after finishing Monday, but 5 days + Monday is 6. Is the example off by one, or does Monday not add a day? | provisional, built: the rule as written, consecutive finished days, so 5 days + Monday = 🔥6 and Tuesday = 🔥7; the tests use 4 days before Monday |
| R-18 | (Found building 6e.1) Best streak of 0 or 1: DP-69 only shows "Best: 12 days" and "Best 21". | provisional, built: always shown, "Best 0", "Best: 0 days", "Best: 1 day" |
| Q-06a | "Save as card" on an audio question (cards are text only, CARD-03): hide the button, or save the question text only? | answered: hidden for audio kinds → DP-16 |
| Q-07a | Daily size per track: fixed 10, or set per track (default 10)? | answered: per track, default 10, allowed 1–50 → DP-12 |
| Q-07b | Add/remove tracks anytime from Settings? | answered: yes; removing keeps history, re-adding continues it → DP-15 |
| Q-02d | Settings leave too few questions? | answered: give what's there + message → DP-14 |
| Q-02c | Settings changed while today's set is started? | answered: applies from the next set → DP-13 |
| Q-02b | With groups on: exactly 10, or 10–12 (a group is never split)? Or count a group as one? | answered: count quizzes (a group = 1); progress in quizzes, result in questions → DP-17, DP-18 |
| Q-02a | Kinds on/off per track or one setting for all? | answered: per track → DP-12 |
| M-1 | Drop Test/Level fields: a track is defined by question tags instead? | answered: confirmed → QB-11 |
| M-2 | Question kinds in v1 | answered: single, single audio, reading group, audio group; a field, not a tag → QB-06 |
| M-3 | Which questions go into a pool? | answered: system + the user's own → QB-10 |
| M-4 | Sections ("Part 3") | answered: no Section concept; a part can be a tag if wanted |
| M-5 | Topic tags on questions | answered: confirmed, topics are plain tags → QB-11 |
| T-a | Question tags vs Card tags | answered: same rules, separate list → QB-07 |
| T-b | A track = one tag, or a combination of tags? | answered: one tag per track; must-have / must-not-have filters later → DP-11, B-16 |
| T-c | Tags on a group or on each question? | answered: on the group → QB-08 |

## Infrastructure
| ID | Question | Status |
|---|---|---|
| H-01 | Hosting the API so the app works outside home Wi-Fi: AWS Lambda, tunnel, or VPS? | answered: VPS (Nest + Postgres in Docker). Lambda as a possible learning project later (B-09) |

## Cross-cutting
| ID | Question | Status |
|---|---|---|
| Q-08 | Content source? | answered: mostly user-provided; the system also provides a decent set of ready tests/questions. Follow-ups Q-11, Q-12 |
| Q-09 | Real login in v1, or a single demo user? | answered: demo user only in v1 |
| Q-10 | Target users: only Jackkie at first, or public? | answered: v1 only Jackkie → 00-vision.md |
| Q-11 | User-provided content: private or shareable? | answered: Public/Private per set, Private by default → QB-01..05 |
| Q-13 | Name for a user's collection of questions? | answered: Quiz Set |
| Q-12 | Where does system-provided content come from: written originally in the test's format, licensed, or public domain? Official IELTS/TOEIC/HSK material belongs to its publishers; serving it to other users is likely infringement (not legal advice). | moved to backlog B-21 |
