# ADR-014: Transactional outbox for domain events (B-10)

- Date: 2026-11-03
- Status: accepted (technical, decided alone during the continuous run; reviewed by Jackkie 2026-11-04). Review fixes in 6e.1: a failing event must not block newer ones; an event older than the progress it would change is ignored.

## Context
Until now events were published after commit and only logged. Daily Practice is the first context where something depends on an event: `QuizProgress` must apply DP-33 for every `QuizAnswered` (context map, ADR-013). If the process stopped between the answer's commit and the reaction, the mistake schedule would silently miss an answer.

## Decision
- An `outbox_event` table. A use case writes its aggregate and its events in **one transaction** through the `Outbox` port (`src/shared/application/outbox.ts`): `outbox.add(session.pullEvents())`.
- After commit the use case calls `outbox.deliverSoon()`. An `OutboxRelay` (`src/prisma/outbox-relay.ts`, next to `PrismaTransactionRunner`) also polls every 5 s (`OUTBOX_POLL_MS`, 0 = off) for anything left over.
- Each event is delivered in its own transaction that locks the row (`FOR UPDATE SKIP LOCKED`), runs the handlers, and marks it delivered. A handler's change and "delivered" commit together; a failing handler rolls back, the attempt and error are recorded, and the event is tried again at the next poll.
- Delivery is **at least once**; handlers are idempotent. `QuizProgress` remembers the last session it applied, so a repeated `QuizAnswered` changes nothing.
- Contexts register handlers by event type at startup (`OutboxHandlers.register`). Events without a handler are just marked delivered. Card Library keeps its logging publisher (nothing listens to its events yet).

## Options considered
- **Publish after commit, in memory** (what Card Library does): simplest, loses events on a crash.
- **Update QuizProgress in the answer's transaction**: no outbox, but two aggregates per transaction without a business reason (CLAUDE.md), and DP-37 progress would be locked by every answer of every track.
- **A message broker** (Redis, RabbitMQ): more moving parts than one app on one VPS needs.

## Consequences
- Every event a context wants delivered reliably goes through `outbox.add` inside its transaction; `add` refuses to run outside one.
- Delivered rows stay in the table. Cleaning up old rows can come later (a delete of rows delivered more than N days ago).
- Integration tests cover: event stored with the answer, crash before delivery, rollback, double delivery, failing handler.
