# Daily Practice

Core subdomain. Everything here is `draft` unless marked otherwise.

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

## Rules (all draft)
- **DP-01** One daily session per user, per track, per day. (Q-01: what is a day?)
- **DP-02** An item group is never split across sessions; a session may hold 9–11 items. (Q-02)
- **DP-03** An item is answered once; the answer can't change after it is submitted.
- **DP-04** Recently seen items aren't served again, except mistakes, which come back later. (Q-05)

## Aggregates (draft)
- **DailySession**: protects DP-01..DP-03. `answerItem` touches only the session; streaks and cards react to events.

## Integrations
- Reads published items from Question Bank and keeps a snapshot of what it served.
- Emits `MistakeRecorded`. Card Library decides what to do with it (Q-06).
