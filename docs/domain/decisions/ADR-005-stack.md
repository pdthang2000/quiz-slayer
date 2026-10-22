# ADR-005: Stack — NestJS + Prisma + PostgreSQL, modular monolith

- Date: 2026-10-22
- Status: accepted

## Context
In DDD the domain is pure TypeScript, so the framework only matters at the edges (`api/`, `infrastructure/`). Jackkie wants energy spent on the domain, not on tooling.

## Decision
- Backend: NestJS (TypeScript). One Nest module per bounded context.
- Persistence: Prisma + PostgreSQL.
- Shape: modular monolith (one deployable app). No microservices.
- Frontend: not decided yet.

## Options considered
- NestJS — known stack; modules map to bounded contexts; DI makes repositories swappable in tests. Risk: decorators leaking into the domain. Chosen.
- Fastify/Hono without DI framework — very transparent, more wiring by hand.
- Laravel — known, but Eloquent (Active Record) works against DDD.
- Spring / .NET — DDD's traditional home, but a new language.
- Prisma — known; row locks (TAG-10) need `$queryRaw`. Chosen.
- Drizzle — supports `FOR UPDATE` natively; new to learn.
- TypeORM — decorators on entities mix domain and persistence. Rejected.

## Consequences
- Strict rules in CLAUDE.md keep Nest and Prisma out of `domain/`, enforced by an ESLint rule.
- Repositories map Prisma rows ↔ domain objects (extra mapper code, on purpose).
- TAG-10's row lock uses one raw query inside the tag repository.
