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
