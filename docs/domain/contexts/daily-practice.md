# Daily Practice

Core subdomain. Rules are `confirmed` unless marked otherwise. Events, Commands and Aggregates follow ADR-013 (accepted 2026-11-04).

## Purpose
- `confirmed` Each day the user does a set of quizzes (X per day, 10 by default) loaded from stored questions of a test.
- `confirmed` Quiz types include question/answer and listening; the full list is open (Q-04).

## Events (ADR-013)
`DailySessionStarted` → `QuizAnswered` → ... → `DailySessionFinished` (DP-23)
`QuizAnswered` → `QuizProgress` applies DP-33 (through the outbox, B-10)
`TrackAdded` / `TrackRemoved` / `TrackSettingsChanged`
(Dropped: `MistakeRecorded`, `StreakExtended`, `StreakBroken`: Save as card is a user action and streaks are computed.)

## Commands (ADR-013)
- `addTrack(user, tagName)`, `removeTrack(track)`, `changeTrackSettings(track, kinds, dailySize)`
- `startDailySession(user, track)` (today in the phone's timezone; resumes today's, DP-22)
- `answerQuiz(session, quiz, choices)` (a whole quiz at once: one choice per question)
- `saveQuestionAsCard(session, question, edited front/back/tags?)` (DP-10, DP-40, DP-64 → Card Library `createCard`)
- `writeQuestionNote(session, question, text, version)` (DP-41..DP-51; built in 6f)

## Rules
- **DP-01** `confirmed` — One daily session per user, per track, per day (DP-05, DP-09).
- ~~DP-02~~ replaced by DP-17 (count quizzes; a group is never split).
- **DP-03** `confirmed` — A question is answered once; the answer can't change after it is submitted. (D-5)
- ~~DP-04~~ replaced by DP-08.

### Confirmed (2026-10-31)
- **DP-05** `confirmed` — A day is a calendar day in the phone's timezone. A session belongs to the day it was **started**, even if it is finished after midnight. (Q-01)
```
Start 23:55 Sat, finish 00:05 Sun → counts for Saturday
```
- **DP-06** `confirmed` — A missed day is gone: no making it up later, and the streak resets. (Q-03; a "streak freeze" is backlog B-14)
```
Mon ✓  Tue —  Wed ✓  → streak 1 (restarted Wed); Tue can't be done on Wed
```
- **DP-07** `confirmed` — v1 answer type: multiple choice only. The question may be text, an image or audio. Fill in the blank, writing and speaking come later (backlog B-15). (Q-04)
- **DP-08** `confirmed` — Questions are picked from ones the user has not seen yet; questions answered wrong come back after 1, 3 and 7 days. (Q-05)
- **DP-09** `confirmed` — A user can follow several tracks at once (e.g. TOEIC and HSK). Each track has its own daily set and its own streak. Daily size per track and adding/removing tracks: open (Q-07a, Q-07b). (Q-07)
```
Home:  TOEIC 3/10 🔥5   ·   HSK 0/10 🔥2
```
- **DP-10** `confirmed` — A wrong answer shows a "Save as card" button; tapping it creates a Card (front = question, back = correct answer, tagged with the track's name). Nothing is saved automatically. For audio questions: open (Q-06a). (Q-06)
- **DP-11** `confirmed` — A track is one question tag (e.g. `#HSK3`): its pool is every question with that tag (QB-10). Narrowing ("must also have #grammar") and excluding ("must not have #mock") come later (backlog B-16). Studying two exams = two tracks (DP-09). (T-b)

- **DP-12** `confirmed` — Each track has its own settings: which kinds it includes (QB-06) and its daily size (default 10, allowed 1–50). (Q-02a, Q-07a)
```
Track #HSK3   Daily: [10]   Kinds: [✓] single [✓] single audio [✓] reading group [ ] audio group
```
- **DP-13** `confirmed` — Changing a track's settings applies from the next daily set; a set already started today stays as it is. (Q-02c)
- **DP-14** `confirmed` — If the settings leave fewer questions than the daily size, the set has what is there, with "Only 4 questions match your settings." (Q-02d)
- **DP-15** `confirmed` — Tracks can be added and removed anytime. Removing keeps the history; adding the same tag again continues it (the streak stays broken for the missed days, DP-06). (Q-07b)
- **DP-16** `confirmed` — "Save as card" (DP-10) is hidden for audio kinds until cards support audio (B-02). (Q-06a)

- **DP-17** `confirmed` — A daily set counts **quizzes**, not questions: a quiz is a single question or a whole group (one passage or audio + its questions). The daily size (DP-12) is always met exactly when enough quizzes match; a group is never split. (Q-02b)
```
Daily size 10 → Q1 Q2 G1(3 q) Q3 G2(4 q) Q4 Q5 Q6 Q7 Q8 = 10 quizzes, 15 questions
```
- **DP-18** `confirmed` — Progress counts quizzes ("4 / 10"); the result counts questions ("23 / 28 correct"). (Q-02b)

- **DP-19** `confirmed` — Two kinds of streak: each track has its own (DP-09), and there is one overall study streak: a day counts if at least one track's daily set was finished. (2026-11-02)
```
        Mon Tue Wed Thu
HSK3     ✓   ✓   —   ✓     → HSK3 🔥1
TOEIC    ✓   —   ✓   ✓     → TOEIC 🔥2
Overall  ✓   ✓   ✓   ✓     → 🔥4
```

### A day of practice (2026-11-03)
```
Home: HSK4 0/10 🔥5 → Start → quiz 1 → answer → ✓/✗ + correct answer + explanation → Next … → Done 23/28 · 🔥6
```
- **DP-20** `confirmed` — Right or wrong is shown right after each quiz, with the correct answer and the explanation if there is one. (D-1)
- **DP-21** `confirmed` — Quizzes are answered in order; no skipping. (D-2)
- **DP-22** `confirmed` — Leaving in the middle keeps the progress; the user continues where they stopped, the same day. (D-3)
- **DP-23** `confirmed` — A day's set is finished when every quiz is answered, whatever the score; only finished sets count for streaks (DP-19). (D-4)
- **DP-24** `confirmed` — No timer. (D-6)
- **DP-25** `confirmed` — Audio can be replayed any number of times. (D-7)
- **DP-26** `confirmed` — History: past days per track with their result; tapping a day shows the questions and the user's answers. (D-8)

### Picking and mistakes (2026-11-03)
- **DP-27** `confirmed` — A question counts as seen only when it was answered; shown but not answered doesn't count. (P-1)
- **DP-28** `confirmed` — When every quiz in the pool has been answered and no mistake is due, the pool starts over, oldest-answered first. (P-2)
- **DP-29** `confirmed` — A group counts as one quiz for mistakes too: if any of its questions is wrong, the whole group comes back. (P-4)
- **DP-30** `confirmed` — Today's set: mistakes that are due come first, at most half of the daily size; the rest are quizzes not seen yet (then DP-28). (P-5)
```
Daily size 10, 7 mistakes due → 5 mistakes (oldest due first) + 5 new
```
- **DP-31** `confirmed` — Today's set is chosen when the user taps Start, not at midnight. (P-6)
- **DP-32** `confirmed` — After a "Save as card" tap the button shows "Saved ✓"; it can't create a second card for that question in that session. (P-8)
- **DP-33** `confirmed` — Mistake schedule, counted from the day of each answer: wrong → comes back the next day; right on its comeback → in 3 days; right again → in 7 days; right again → retired. Wrong at any comeback → back to the next day. (P-3)
```
Mon 3 wrong → Tue 4 · right → Fri 7 · wrong → Sat 8 · right → Tue 11 · right → Tue 18 · right → retired
```
- **DP-34** `confirmed` — A mistake that is not due yet never fills a short day; it waits for its day. (2026-11-03)
- **DP-35** `confirmed` — When never-answered quizzes run out, extra due mistakes are used before already-seen quizzes (the half limit of DP-30 only keeps room for new ones while there are new ones). (2026-11-03)
- **DP-36** `confirmed` — "Half" rounds down: daily size 5 → at most 2 mistakes. (2026-11-03)
- **DP-37** `confirmed` — Progress is kept per user and quiz, not per track: a quiz in two tracks (e.g. tagged #HSK4 and #grammar) has one schedule. (2026-11-03)
- **DP-38** `confirmed` — A quiz that leaves every pool (tag removed, deleted, or its kind switched off in the track) keeps its progress, unused; it counts again if it comes back. (2026-11-03)
- **DP-39** `confirmed` — A quiz appears at most once per day across all tracks: a set skips quizzes already in today's other sets. If that leaves it short, it stays short (DP-14 message); quizzes are never reused the same day. (X-2, X-3)
```
Q7 tagged #HSK4 #grammar · 07:00 Track #HSK4 has Q7 · 07:10 Track #grammar skips Q7
```
- **DP-40** `confirmed` — "Save as card" (DP-10) appears only on single questions that make sense on their own: kind single, text only (no image, no audio, not part of a group). The card: front = the question and its choices, back = the correct answer and the explanation, tag = the track's tag. If the card would not fit (CARD-02: front over 500 or back over 3,000 characters), Save as card opens the card editor instead of saving at once (DP-64). (G-3, G-4, R-3) The note is added to the back too (DP-49).
```
Front: 我___学生。  A 是  B 在  C 有  D 去
Back:  是 — 是 = to be
Tag:   #HSK4
```

How a day's set is built (DP-30, DP-35, DP-28, DP-14):
```
0. Today's set exists → resume (DP-22)
1. Pool: the track's tag, allowed kinds, system + own, minus quizzes in today's other sets (DP-39)
2. Due mistakes, oldest due first, up to half (rounded down)
3. Never answered, random, up to the daily size
4. More due mistakes, if still short
5. Already seen and not waiting as a mistake, oldest answered first
6. Still short → what's there + "Only N quizzes match your settings"
7. Save the chosen quiz ids as today's set
```

### Settled at Checkpoint 6 (2026-11-04)
- **DP-53** `confirmed` — Changing a track's settings or removing it follows CONFLICT-01: the app sends the track's version; outdated → `TrackChanged`, nothing is written, the app shows the latest. Tracks show on Today in the order they were added. History lists every day with a set, today included, newest first. (G-13)
```
Phone A: size 10 → 20 ✓ · Phone B (shows 10) turns off "reading group" → "This track changed." shows size 20
```
- **DP-54** `confirmed` — A group is answered as one quiz: pick an answer for each of its questions, then Check; feedback shows for all of them (DP-20, DP-29). (G-7)
- **DP-55** `confirmed` — A track has at least one kind switched on; a new track has every kind on. (G-8)
- **DP-56** `confirmed` — If nothing matches a track at all, Start creates no set: "No quizzes match your settings." No set means no streak day. (G-9)
- **DP-57** `confirmed` — Adding a tag that is already an Active track does nothing; the existing track stays. (G-10)
- **DP-58** `confirmed` — Quizzes in a set keep the build order: due mistakes, new, more mistakes, seen. Not shuffled. (G-11)
- **DP-59** `confirmed` — A track is added by picking a question tag that has quizzes, shown with its quiz count ("#HSK4 · 41 quizzes"). (G-2)
- **DP-60** `confirmed` — Streaks show on Today: the overall streak at the top, each track's next to it. (G-5)
- **DP-61** `confirmed` — Quiz flow: tap a choice (one per question in a group), then Check; feedback stays until Next ("See result" after the last quiz); the result screen shows the score, then every quiz with the answers (the same screen for a History day, DP-26). Save as card is in the feedback and on the result list. Track settings: a −/+ stepper and kind checkboxes, one Save button; Remove asks first. (G-15)
- **DP-62** `confirmed` — Today is the first item of the drawer and the app opens on it (UI-09). (G-1)

### Notes (2026-11-04)
- **DP-41** `confirmed` — The user can write a **Note** on any question they answered, right or wrong: free text, e.g. why an answer is right or wrong. It is the user's own text; the **Explanation** is the author's. (N-11)
- **DP-42** `confirmed` — A note is private: only the user who wrote it sees it, also on System or public quizzes. (N-1)
- **DP-43** `confirmed` — One note per user and question, kept across days and tracks. When the question comes back, the same note shows and can be edited. (N-2)
```
Mon  我___学生。 wrong → note "是 joins two nouns, 在 is for places"
Thu  same question (mistake comeback) → answered → the same note shows, editable
```
- **DP-44** `confirmed` — In a group (reading or audio), each question has its own note. (N-3)
- **DP-45** `confirmed` — A note is shown and can be written only after the question is answered in that session: on the feedback screen, the result screen and a History day. Never before answering, so a note can't give the answer away on a comeback. (N-4, N-6)
- **DP-46** `confirmed` — A note is up to 1,000 characters (counted like CARD-02: code points after NFC), spaces trimmed at both ends. Saving an empty note removes it. (N-5)
- **DP-47** `confirmed` — A note is saved with a **Save** button; no autosave. (N-6)
- **DP-48** `confirmed` — History shows the latest note, not the note as it was that day. (N-7)
- **DP-49** `confirmed` — "Save as card" (DP-40) copies the note onto the card's back, below the explanation, if a note exists when Save as card is tapped. It is a copy: editing the note later doesn't change the card. If the back would be longer than 3,000 characters (CARD-02), the card editor opens instead (DP-64). (N-8, R-2)
```
Back:  是 — 是 = to be
       📝 是 joins two nouns, 在 is for places
```
- **DP-50** `confirmed` — Notes follow CONFLICT-01: saving a note sends what the screen showed; if the server has a newer note, nothing is written and the app shows the latest. (N-9)
```
Phone A saves "X" · Phone B, still showing the old note, saves "Y" → "This note changed." and shows "X"
```
- **DP-51** `confirmed` — A note stays when its question's content is fixed (e.g. a corrected answer key, QB-04). Deleting the question deletes its notes. (N-10)

### Finishing a set late (2026-11-04)
- **DP-52** `confirmed` — A started set can be finished until the end of the next day (phone's timezone, DP-05); it still counts for the day it was started. After that it can only be viewed: answered quizzes and their results, no more answers. Refines DP-05, DP-06, DP-22. Quizzes not answered yet in that set are not seen (DP-27), so the next day's set may pick one of them too. (G-17)
```
Mon 21:00 Start, answer 3 · Tue 20:00 answer the other 7 → Monday finished ✓, counts for Monday
Mon 21:00 Start, answer 3 · Wed 08:00 open Monday in History → view only, Monday stays unfinished
```
- **DP-63** `confirmed` — While yesterday's set can still be finished (DP-52), Today shows it under its track: "Finish yesterday's set · 3 / 10" with Continue. At most one such row per track; the day before yesterday never shows (it is closed); a day never started has no set, so nothing shows. (R-1)
```
Today (Tue)
  #HSK4  🔥0   Not started   [Start]
  ↳ Finish yesterday's set · 3 / 10   [Continue]
```
- **DP-64** `confirmed` — "Save as card" when the card fits: one tap saves it (DP-10). When it doesn't fit (front over 500 or back over 3,000, CARD-02): the card editor opens, filled in with the front, the back and the track's tag; all three can be changed; a counter turns red over the limit and Save stays off until the card fits. Save → the card is created and the button shows "Saved ✓" (DP-32). Cancel → nothing is saved, the button still reads "Save as card". (R-2, R-3, R-4, R-5)
```
Back   是 — (long explanation) …   🔴 3,400 / 3,000   [Save] off
```

## Aggregates (ADR-013)
- **Track** (unique per user and tag name): kinds, daily size, Active/Removed. DP-11, DP-12, DP-15.
- **DailySession** (unique per user, track, day): snapshot of the quizzes, answers, saved-as-card questions. DP-01, DP-03, DP-05, DP-17, DP-18, DP-20..DP-23, DP-32, DP-40. `answerQuiz` touches only the session; progress reacts to `QuizAnswered`.
- **QuizProgress** (per user and quiz): last answered, mistake stage and due day. DP-27, DP-29, DP-33, DP-37, DP-38.
- **QuestionNote** (per user and question; proposal for 6f): the note's text and a version. DP-41..DP-51.
- `buildDailySet` (domain service) and `streakLength` (computed, nothing stored) are pure functions.

## API (built in 6d)
Every call that depends on the day sends the phone's timezone in `X-Time-Zone` (DP-05, ADR-013).
```
GET    /practice/today                              tracks, today's progress, streaks (G-5)
POST   /practice/tracks/:id/start                   Start (DP-31) or resume (DP-22)
GET    /practice/sessions/:id                       quizzes; the key only for answered ones (DP-20)
POST   /practice/sessions/:id/quizzes/:quizId/answer  { choices: [i, …] } one per question (G-7)
POST   /practice/sessions/:id/questions/:qid/save-as-card  DP-10, DP-32, DP-40
GET    /practice/tracks/:id/history                 DP-26, newest day first
GET    /practice/tracks · POST /practice/tracks { tagName } · PATCH /practice/tracks/:id { kinds, dailySize } · DELETE /practice/tracks/:id
GET    /practice/track-options                      question tags with quiz counts (G-2)
```

## Error handling (G-14)
| Error | Rule | When | Kind | HTTP | Message to the user |
|---|---|---|---|---|---|
| `InvalidTimeZone` | DP-05 | No or unknown `X-Time-Zone` | Bug | 400 | generic "Something went wrong" |
| `InvalidDailySize` | DP-12 | Not 1–50 | User input | 400 | "Daily size is 1 to 50" |
| `InvalidTrackKinds` | DP-12 | No kind on, or an unknown kind | User input | 400 | "Pick at least one kind" |
| `NoQuizzesMatch` | DP-14 | Nothing matches the track at all (G-9) | Info | 422 | "No quizzes match your settings." |
| `TrackIsRemoved` | DP-15 | Start on a removed track | Stale screen | 409 | "This track was removed. Refresh." |
| `QuizAlreadyAnswered` | DP-03 | Answered on another device meanwhile | Stale screen | 409 | "Already answered. Refresh." |
| `QuizOutOfOrder` | DP-21 | Not the next quiz | Stale screen | 409 | "Already answered. Refresh." |
| `CannotSaveAsCard` | DP-10, DP-32, DP-40 | Button not allowed (e.g. already saved) | Stale screen | 409 | "Already saved." |
| `InvalidNoteText` | DP-46 | Note longer than 1,000 characters | User input | 400 | "A note is at most 1,000 characters" |
| `CannotWriteNote` | DP-45 | Question not answered in that session | Stale screen | 409 | "Answer the question first. Refresh." |
| `NoteChanged` | DP-50 | The note changed on another device | Stale screen | 409 | "This note changed." |
| `DailySessionClosed` | DP-52 | Answer after the end of the next day | Stale screen | 409 | "This day is over." |
| `TrackChanged` | DP-53 | Track settings or removal from an outdated screen | Stale screen | 409 | "This track changed." |
| `PracticeChanged` | — | Two devices at the same moment | Race | 409 | "Changed on another device. Refresh." |
| `InvalidAnswer` | — | Wrong number of choices or an unknown choice | Bug | 400 | generic |
| `DailySessionNotFound` / `TrackNotFound` / `QuestionTagNotFound` | — | No such item for this user | Stale screen | 404 | "Not found. Refresh." |

## Integrations
- Reads pools and quiz content from Question Bank's public application service and keeps a snapshot of what it served (QB-04).
- "Save as card" calls Card Library's `createCard` (context map). No event.
