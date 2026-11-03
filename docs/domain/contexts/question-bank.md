# Question Bank

Supporting subdomain.

- `confirmed` Questions and answers are stored in the DB, grouped by Quiz Set (one uploaded test).
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
## Kinds and tags (2026-11-02)
A general model: no per-exam fields. An uploaded test is split into questions; tags say which pool they belong to; the kind says how the app shows them.
```
Upload "HSK3 Mock Jan" → tags #HSK3 #mock
  Q1  kind: single        tags #HSK3 #mock
  G1  kind: audio group   tags #HSK3 #mock      (audio + Q2, Q3, Q4)
  Q5  kind: single audio  tags #HSK3 #mock
Pool #HSK3 = every question/group tagged #HSK3, from every upload
```
- **QB-06** `confirmed` — Every question (or group) has a **kind**, a fixed field the app uses to show it. v1 kinds: single (text or image), single audio, reading group (one passage → 2–4 questions), audio group (one audio → 2–4 questions). (M-2)
- **QB-07** `confirmed` — Questions carry **question tags** (e.g. `#HSK3`, `#mock`, `#grammar`). They follow the same name rules as Card tags (TAG-01, TAG-02) but are a separate list from Card tags. (T-a)
- **QB-08** `confirmed` — A group's tags are on the group; its questions are always served together. (T-c)
- **QB-09** `confirmed` — A tag never repeats what a field already says. No `#listening` or `#audio` tags: that is the kind. Tags are for what the kind doesn't express (which exam, source, topic). (2026-11-02, Jackkie)
- **QB-10** `confirmed` — A pool (for a Daily Practice track) uses system-provided questions and the user's own; other users' public Quiz Sets come later. (M-3)
- A track = one tag (DP-11).
- **QB-11** `confirmed` — No Test, Level or Section fields: an exam, a level, a part or a topic is a question tag (`#HSK4`, `#part3`, `#grammar`). A track is one tag (DP-11). (M-1, M-4, M-5)

- ~~Content is organised as Test → Section → Item Group → Item~~ — dropped (QB-11). A group shares one passage or audio (QB-06).
  ```
  TOEIC Part 3, group #42
  Stimulus: audio_42.mp3
    Q1 Where are the speakers?      key B
    Q2 What does the man want?      key D
    Q3 What will the woman do next? key A
  ```
- `draft` Only published items are visible to Daily Practice.
- `draft` Fixing an answer key doesn't change past scores (Daily Practice keeps snapshots).
