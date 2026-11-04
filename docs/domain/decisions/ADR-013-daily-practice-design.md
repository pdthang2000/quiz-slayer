# ADR-013: Daily Practice design — aggregates, events, commands, streaks, the user's day

- Date: 2026-11-03
- Status: accepted (2026-11-04, Jackkie at Checkpoint 6; written during the continuous run, Phase 6a)

## Context
Phase 5 confirmed the Daily Practice rules (DP-01..DP-40) and the Question Bank rules (QB-06..QB-11). The rules say what happens; they leave open how the model is cut into aggregates, which events and commands exist, whether streaks are stored, and where the user's timezone lives (DP-05: "a day is a calendar day in the phone's timezone"). These choices shape the database (6b), the outbox (6c) and the API (6d), and are expensive to change once data exists.

## Decision

### Aggregates (one aggregate changed per transaction, CLAUDE.md)

| Aggregate | Identity | Holds | Protects |
|---|---|---|---|
| `Track` | id; unique per (user, tag name) | question tag name, kinds, daily size, Active/Removed | DP-11, DP-12 (size 1–50, default 10), DP-15 (remove keeps the id, re-adding reactivates the same track, so history and streak continue) |
| `DailySession` | id; unique per (user, track, day) | the day, the track's tag name, the daily size asked for, a **snapshot** of every quiz (question text, choices, correct choice, explanation, passage/audio), the answers, which questions were saved as cards, finished time | DP-01, DP-03, DP-05, DP-17, DP-18, DP-20..DP-23, DP-32, DP-40 |
| `QuizProgress` | (user, quiz) | last answered day and time, last session applied, mistake stage (1, 3 or 7 days) and due day, or none | DP-27, DP-29, DP-33, DP-37, DP-38 |

- A **quiz is answered as one unit**: a single question with one choice, a group with one choice per question, in one command. This makes DP-20 ("right or wrong right after each quiz"), DP-21 (in order, no skipping) and DP-29 (a group counts as one for mistakes) one check each.
- The snapshot is taken when the session starts (DP-31) and never changes, so a fixed answer key later does not change past results (QB-04, context map).
- `DailySet` building is a **domain service** (`buildDailySet`), a pure function over the pool's quiz ids and their progress. It follows the steps in daily-practice.md (DP-30, DP-34, DP-35, DP-36, DP-28, DP-14). The pool (DP-11, QB-10, kinds of DP-12) and the exclusion of today's other sets (DP-39) are inputs prepared by the use case.
- Streak length is a **pure function** over finished days (`streakLength`).

### Events

| Event | Raised by | Used by |
|---|---|---|
| `TrackAdded` / `TrackRemoved` / `TrackSettingsChanged` | `Track` | log only |
| `DailySessionStarted` | `DailySession.start` | log only |
| `QuizAnswered` (session, user, quiz, day, time, all correct or not) | `DailySession.answerQuiz` | `QuizProgress` (through the outbox, 6c) |
| `DailySessionFinished` | the answer that completes the set (DP-23) | log only (streaks are computed) |

The draft events in daily-practice.md are renamed: `DailySessionGenerated` → `DailySessionStarted` (the set is chosen at Start, DP-31), `ItemAnswered` → `QuizAnswered` (a quiz is the unit, DP-17), `DailySessionCompleted` → `DailySessionFinished` (DP-23 says "finished"). `MistakeRecorded`, `StreakExtended` and `StreakBroken` are dropped: "Save as card" is a user action, not a reaction (context map), and streaks are computed, so nothing would listen.

### Commands (one use case each, 6d)
`addTrack`, `removeTrack`, `changeTrackSettings`, `startDailySession` (resumes today's if it exists, DP-22), `answerQuiz`, `saveQuestionAsCard`. Queries: today overview (tracks, today's progress, streaks), a session, history per track (DP-26), question tags with quiz counts (G-2).

### Streaks are computed, not stored
A streak is the number of consecutive days, ending today or yesterday, with a finished set (DP-19, DP-23, DP-06). Per track: days with a finished session of that track. Overall: days with any finished session. Computed from `DailySession` rows (`day`, `finished_at`) on read.
- No streak table to keep in step; history (DP-15, DP-26) and streaks come from the same rows, so they can never disagree.
- Cost: one indexed query over finished days per user. A user doing 3 tracks for 10 years has ~11,000 rows; fine.

### The user's day: the phone sends its timezone with each request
- The app sends its IANA timezone in an `X-Time-Zone` header (e.g. `Asia/Ho_Chi_Minh`) on Daily Practice requests. The server computes today's date as the current UTC time in that zone (`LocalDate`, a value object in the domain using `Intl`).
- The session stores its `day` (a plain `YYYY-MM-DD`) and the timezone it was started in. Everything after that (DP-05 "belongs to the day it was started", streaks, history) compares `day` strings, never times, so a later trip abroad does not move old days.
- Why not a timezone on the user: DP-05 says the **phone's** timezone; a traveller's phone changes zone, and v1 has no user profile. Why not the phone sending the date itself: the server clock plus a timezone limits the date to ±14 hours of real time.
- A missing or unknown timezone is a request error (400 `InvalidTimeZone`), not a silent UTC fallback.

### Cross-context
- **Question Bank → Daily Practice:** Daily Practice calls Question Bank's public application service for the pool (quiz ids for a tag name, kinds and user: system + own, QB-10), the quiz content to snapshot, and the question tags with counts. It never reads Question Bank tables.
- **Daily Practice → Card Library ("Save as card", DP-10, DP-40):** the use case asks the session for the card text (checks DP-10, DP-32, DP-40), calls Card Library's public `CreateCard` (its own transaction), then marks the question saved in the session. If marking fails after the card was created, a retry could create a second card; acceptable for v1 (rare, harmless, the user can delete it).

### Concurrency
- DP-01: unique (user, track, day). Two Start taps at once: the second insert fails and the use case resumes the first session.
- DP-39 across tracks: `startDailySession` takes a per-user advisory lock (`pg_advisory_xact_lock`) inside its transaction, so two tracks started at the same moment cannot pick the same quiz.
- Each aggregate has a version (optimistic concurrency, like CARD-08) so two devices answering the same quiz cannot both succeed (DP-03).

## Options considered
- **One `DailyPractice` aggregate per user** (tracks + sessions + progress): simplest invariants, but every answer would lock and load everything; and DP-37 progress spans tracks anyway.
- **Progress inside `DailySession`**: DP-37 says progress is per user and quiz, across tracks and days; it outlives any session. Separate aggregate, updated by event (context map).
- **Answer per question instead of per quiz**: closer to the UI of a single question, but DP-20 gives feedback per quiz and DP-29 scores a group as one; per-question answers would need a "group complete" step.
- **Stored streak counters** (an aggregate updated by `DailySessionFinished`): fast reads, but a second source of truth that must be repaired if an event is lost, and DP-15 (re-adding a track) would need special cases.
- **Timezone on the user profile**: needs a profile and a way to change it; drifts from the phone (DP-05).

## Consequences
- Every Daily Practice request from the app carries `X-Time-Zone`. Tests fix the clock and the zone.
- Streak reads cost a query; if that ever matters, a cache can be added without changing the model.
- New glossary terms (draft until Jackkie confirms): the events and errors above, `DailySet`, `LocalDate` stays technical.
- Provisional behaviour found while designing is logged in open-questions.md (G-7..), not decided here.
