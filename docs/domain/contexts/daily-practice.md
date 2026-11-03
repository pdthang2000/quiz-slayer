# Daily Practice

Core subdomain. Rules are `confirmed` unless marked otherwise; Events, Commands and Aggregates below are still `draft` design (Phase 6 proposes them).

## Purpose
- `confirmed` Each day the user does a set of quizzes (X per day, 10 by default) loaded from stored questions of a test.
- `confirmed` Quiz types include question/answer and listening; the full list is open (Q-04).

## Events (draft)
`DailySessionGenerated` → `ItemAnswered` → ... → `DailySessionCompleted`
`ItemAnswered` → `MistakeRecorded` → (Card Library may suggest a card)
`StreakExtended` / `StreakBroken`

## Commands (draft)
- `generateDailySession(user, track, day)`
- `answerItem(session, item, answer)`

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
- **DP-40** `confirmed` — "Save as card" (DP-10) appears only on single questions that make sense on their own: kind single, text only (no image, no audio, not part of a group). The card: front = the question and its choices, back = the correct answer and the explanation, tag = the track's tag. If the front would be longer than 500 characters (CARD-02), the button is hidden. (G-3, G-4)
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

## Aggregates (draft)
- **DailySession**: protects DP-01..DP-03. `answerItem` touches only the session; streaks and cards react to events.

## Integrations
- Reads published items from Question Bank and keeps a snapshot of what it served.
- Emits `MistakeRecorded`. Card Library decides what to do with it (Q-06).
