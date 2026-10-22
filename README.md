# QuizSlayer

Study app: flashcards + "10 Quizzes per day" for IELTS, TOEIC, HSK and more.

Status: domain modelling. No code yet.

## How we work
1. Model the business with the agent (`/domain-interview`), one question at a time.
2. Decisions go into `docs/domain/` as markdown.
3. Code is written from `confirmed` rules only, one aggregate at a time, tests first.
4. When code teaches us something, update the docs first.

## Map
- `apps/api` — NestJS backend (domain lives here); `apps/mobile` — Expo app (UI only). One repo, pnpm workspaces (ADR-007).
- `CLAUDE.md` — rules for the coding agent
- `docs/domain/00-vision.md` — why the app exists, v1 scope
- `docs/domain/glossary.md` — the shared vocabulary
- `docs/domain/subdomains.md`, `context-map.md` — the big picture
- `docs/domain/contexts/` — one file per bounded context: events, commands, rules
- `docs/domain/open-questions.md` — what we don't know yet
- `docs/domain/backlog.md` — ideas for later
- `docs/domain/decisions/` — ADRs
- `docs/domain/changelog.md` — what changed in the model, per session
- `docs/plan.md` — build plan with checkpoints
