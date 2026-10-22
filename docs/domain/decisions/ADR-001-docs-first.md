# ADR-001: Docs-first domain modelling

- Date: 2026-10-20
- Status: accepted

## Context
QuizSlayer is built to learn DDD and to be used for real. Business rules must be clear before code, and must be maintained as the app grows. Jackkie works with an AI agent, which will invent plausible rules if nothing stops it.

## Decision
- Business knowledge lives in `docs/domain/` as markdown in the repo.
- Workflow: interview with the agent → update docs → write code from `confirmed` rules (tests first, one aggregate at a time) → when code teaches something, update docs first.
- Docs and code change in the same commit.
- The agent never adds a business rule that isn't in the docs; it adds an open question instead.

## Consequences
- Git history shows how the model evolved.
- Docs can rot if code changes without them; CLAUDE.md and reviews guard against this.
