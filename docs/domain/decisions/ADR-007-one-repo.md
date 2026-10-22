# ADR-007: One repo (pnpm workspaces) for API, mobile app and docs

- Date: 2026-10-22
- Status: accepted

## Context
QuizSlayer has a NestJS API, an Expo mobile app, and domain docs that both depend on. Jackkie is the only developer and works with Claude Code.

## Decision
One repo with pnpm workspaces:
```
apps/api/      NestJS (domain lives here)
apps/mobile/   Expo (UI only)
packages/      shared packages only if needed (e.g. generated API types)
docs/          domain docs, plan
```

## Options considered
- **One repo** — one place for docs; a feature touching both apps is one commit; one Claude Code session sees everything; API types can be shared and checked at compile time. Cost: Expo/Metro may need monorepo config; CI needs path filters. Chosen.
- **Two repos** — each repo simple and independent; clean history. Cost: docs live in one repo only; every cross-cutting feature is two commits kept in sync by hand; contract mismatches show up at runtime. Fits separate teams, not a solo developer.

## Consequences
- `apps/mobile` never imports `apps/api`.
- Each app gets its own CLAUDE.md; the root CLAUDE.md holds shared rules.
- API changes stay backward compatible, because an installed app can be older than the server (true in either layout).
