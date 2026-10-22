# Question Bank

Supporting subdomain.

- `confirmed` Questions and answers are stored in the DB, grouped by test.
- `confirmed` Two sources of content: mostly provided by users themselves, plus a decent set of ready tests/questions provided by the system (Q-08).
- `draft` Every Quiz Set has an owner: System or a User. Origin of system content: Q-12 (deferred).

## Visibility (Q-11)
- **QB-01** `confirmed` — Visibility is per Quiz Set, not per question: Public or Private.
- **QB-02** `confirmed` — A new Quiz Set is Private by default.
- **QB-03** `confirmed` — Public = other users can view and practice it. They can't copy it in v1; letting the owner allow copying comes later (B-05).
- **QB-04** `confirmed` — If the owner edits a public Quiz Set, others see the change from then on; their past scores don't change (Daily Practice keeps snapshots).
- **QB-05** `confirmed` — If the owner makes a Quiz Set Private or deletes it, others lose access; their past practice history stays.
```
Linh: Quiz Set "HSK3 Listening A" → Public
Nam practices it in Daily Practice
Linh fixes Q5's key   → Nam's next practice uses the fix; Nam's old score unchanged
Linh makes it Private → Nam can't practice it anymore; his history stays
```
- Reporting / moderation of public Quiz Sets: backlog B-07, needed before any public launch.
- Note: v1 has only the demo user, so Public has no audience yet. `visibility` goes into the model now; sharing features come later.
- `draft` Content is organised as Test → Section → Item Group → Item. An Item Group shares one Stimulus.
  ```
  TOEIC Part 3, group #42
  Stimulus: audio_42.mp3
    Q1 Where are the speakers?      key B
    Q2 What does the man want?      key D
    Q3 What will the woman do next? key A
  ```
- `draft` Only published items are visible to Daily Practice.
- `draft` Fixing an answer key doesn't change past scores (Daily Practice keeps snapshots).
