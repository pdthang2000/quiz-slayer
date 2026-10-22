# Content Ingestion

Supporting subdomain. A pipeline, not a rich domain model.

- `confirmed` Questions and answers are extracted from tests and stored.
- `draft` Flow: draft → reviewed → published (manual review step; extraction from PDF/audio is error-prone).
- `draft` An Anti-Corruption Layer converts each source format into Question Bank's model.
- `confirmed` Content comes mostly from users, plus a system-provided set (Q-08).
- `draft` Two flows: users add/import their own tests; the system's set is added by an admin. Origin of system content must be settled first (Q-12).
- Precedent: the old Quizlet import script (`||` between cards, `|` between front and back, tagged with the file name). Reference only.
