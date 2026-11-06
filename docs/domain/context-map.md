# Context map

`confirmed` 2026-11-03.

```
Content Ingestion ──imports──> Question Bank ──pools read by──> Daily Practice
   (v1: seed file)                                                    │
                                                                      │ "Save as card" (user taps, DP-10)
                                                                      │ → calls Card Library's createCard
                                                                      v
                                                                Card Library

Identity ──(user id)──> all contexts
```

- Daily Practice keeps its own snapshot of the quizzes it served, so fixing an answer key later doesn't change past results (QB-04). `confirmed`
- "Save as card" is a user action: Daily Practice calls Card Library's public use case `createCard`; it never writes Card Library tables. It is not a reaction to an event. `confirmed`
- Question Bank raises `QuestionsDeleted` when questions leave it; Daily Practice deletes their notes through the outbox (DP-51).
- Inside Daily Practice, `QuizProgress` reacts to answers through an event (`QuizAnswered`, DP-37, DP-33); that is where the outbox (B-10) is needed. `confirmed`
- Daily Practice never reads Card Library tables directly; it goes through a Card Library API that only returns Active cards (READ-01). `confirmed`
