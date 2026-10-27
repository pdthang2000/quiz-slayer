# QuizSlayer

Study app: flashcards + "10 Quizzes per day" for IELTS, TOEIC, HSK and more.

Status: Phase 4 (mobile app), slice 4a done. See `docs/plan.md`.

## Run locally
Node 24 (`nvm use`, reads `.nvmrc`).
```
pnpm install
cp apps/api/.env.example apps/api/.env
docker compose up -d               # Postgres 16 on localhost:5432
pnpm --filter @quizslayer/api exec prisma migrate dev
pnpm test && pnpm lint
pnpm test:int                      # integration tests, uses database quizslayer_test
pnpm test:e2e                      # HTTP tests, same database
pnpm --filter @quizslayer/api start:dev
```
Mobile app (iOS Simulator or iPhone with Expo Go): see `apps/mobile/README.md`.

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
