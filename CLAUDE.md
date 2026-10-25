# QuizSlayer — agent rules

QuizSlayer is a study app with two main features: flashcards (Card Library) and "10 Quizzes per day" (Daily Practice) for tests like IELTS, TOEIC and HSK. It is built docs-first with Domain-Driven Design, both to learn DDD and to be used for real.

## Source of truth
- Business knowledge lives in `docs/domain/`. Code follows the docs, never the reverse.
- Before working on a context, read `docs/domain/glossary.md` and `docs/domain/contexts/<context>.md`.
- Rule status: `confirmed` = Jackkie decided it. `draft` = proposed, not approved yet.
- Only `confirmed` rules may be implemented.

## Never invent business rules
- If a rule is missing, unclear, or only `draft`: add it to `docs/domain/open-questions.md` and ask Jackkie. Do not guess.
- When you propose a rule, mark it `draft`. Only Jackkie moves it to `confirmed`.

## Language
- Code names (classes, methods, events, tables) must match `glossary.md` exactly.
- New term: add it to `glossary.md` first, then use it.
- Use business words in code: `card.moveToTrash()`, not `card.softDelete()`.

## Keeping docs current
- A code change that reveals or changes a rule updates the docs in the same commit.
- After each modelling session, add an entry to `docs/domain/changelog.md`.
- Significant, hard-to-reverse decisions get an ADR in `docs/domain/decisions/`.
- Ideas for later go to `docs/domain/backlog.md`.

## Stack (ADR-005)
- NestJS + Prisma + PostgreSQL, TypeScript. One app, one Nest module per bounded context (modular monolith). No microservices.

- Mobile app: React Native with Expo (ADR-006). The app is UI only: it calls the API and contains no business rules.

## Repo layout (ADR-007: one repo, pnpm workspaces)
```
QuizSlayer/
  apps/api/        NestJS backend — the domain lives here
  apps/mobile/     Expo app — UI only (has its own CLAUDE.md once created)
  packages/        shared packages, only if needed (e.g. generated API types). Never domain code.
  docs/            domain docs, plan
  docker-compose.yml
```
- `apps/mobile` must never import from `apps/api`. If shared API types are needed, generate them from the API's OpenAPI spec into `packages/`.
- Keep API changes backward compatible: an installed app can be older than the server.

## Folder layout per bounded context
```
apps/api/src/<context>/
  domain/           aggregates, value objects, domain events, domain errors, repository interfaces
  application/      use cases (one class per command/query), transactions, query interfaces + read types (screen data)
  infrastructure/   Prisma repositories + mappers
  api/              Nest controllers, DTOs, exception filters
  <context>.module.ts
```
Dependencies point inward only: api → application → domain; infrastructure → domain, plus the application/ query interfaces (`application/*-queries.ts`) it implements, nothing else from application/. Never domain → anything else. Enforced by ESLint `no-restricted-imports` on `domain/` and `infrastructure/`.

## Keep the framework out of the domain (strict)
NestJS and Prisma make it tempting to mix framework code into the domain. Don't:
- `domain/` must not import `@nestjs/*`, `@prisma/client`, `class-validator`, `class-transformer`, or anything from `application/`, `infrastructure/`, `api/`. Enforced by an ESLint `no-restricted-imports` rule on `apps/api/src/**/domain/**`; never disable it.
- No decorators on domain classes: no `@Injectable`, `@Entity`, `@IsString`, `@ApiProperty`.
- A domain entity is not a Prisma model. Repositories never return Prisma types; a mapper converts rows ↔ domain objects.
- DTOs (`class-validator`) live in `api/` and only check request shape. Business rules (e.g. TAG-01 tag name) live in value objects, even if the DTO also checks length.
- The domain throws domain errors (e.g. `CardIsTrashed`), never `HttpException` or plain `Error`. An exception filter in `api/` maps domain errors to HTTP status codes.
- Only repositories touch `PrismaService`. Controllers and use cases never do.
- Repository interfaces are defined in `domain/`, implemented in `infrastructure/`, bound with Nest DI tokens.
- No business logic in controllers, Prisma middleware/extensions, or DB triggers.

## Code rules
- Business rules are checked in the domain class before anything is written to the DB. No raw SQL that changes data behind an aggregate's back. (Raw SQL for locking, e.g. `SELECT ... FOR UPDATE`, is fine.)
- One command changes one aggregate in one transaction. Other aggregates react to domain events.
- Exception: when the business needs a change across many aggregates to be all-or-nothing, it may run in one transaction, still through each aggregate's methods. Only with an ADR (e.g. ADR-004: tag merge).
- Every rule ID (e.g. `TAG-03`) has at least one test whose name starts with the rule ID: `it('TAG-03: rejects a duplicate tag name for the same user')`.
- Domain tests are plain unit tests: no Nest testing module, no DB.
- Reads that return or count cards must say which card state they want (`findActive`, `findTrashed`). No `findAll`.
- All times are stored and compared in UTC. The app converts to local time for display.
- Contexts talk through public application services or events, never through each other's tables or repositories.

## Work plan
- Follow `docs/plan.md`. Stop at each checkpoint and let Jackkie review before moving on.

## Modelling sessions
- Use `/domain-interview` to run a session: one question at a time, docs updated after each answer.
