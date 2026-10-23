# ADR-008: Transactions are carried by AsyncLocalStorage, not passed as a parameter

- Date: 2026-10-23
- Status: proposed

## Context
A tag merge (TAG-10, ADR-004) calls several repositories in one DB transaction: lock tags, load cards, save cards, delete a tag. The repository interfaces live in `domain/` and must not mention Prisma, so they cannot take a `Prisma.TransactionClient` parameter.

## Decision
- The application layer starts a transaction through a `TransactionRunner` port (`src/shared/application/transaction-runner.ts`): `transactions.run(async () => { ... })`.
- `PrismaService.runInTransaction` opens a Prisma interactive transaction and stores its client in an `AsyncLocalStorage`.
- Repositories always query through `prisma.db`: the current transaction's client if there is one, otherwise the root client.
- A nested `run` joins the outer transaction. `save` / `saveAll` open their own transaction when called outside one, so a card and its CardTags are always written together.

## Options considered
- **`tx` parameter on every repository method** (as the TAG-10 sketch first showed): explicit, but leaks a persistence type into domain interfaces, or forces an opaque `unknown` handle everywhere.
- **AsyncLocalStorage, hand-written** (~20 lines in `PrismaService`): domain interfaces stay clean; no new dependency. Chosen.
- **`@nestjs-cls/transactional`**: same idea, more features (propagation modes, decorators). Another dependency to learn for something we use in one place.

## Consequences
- Domain repository interfaces stay persistence-free.
- Which transaction a query runs in is implicit: code inside `run(...)` is transactional, code outside is not. Integration tests cover the merge rollback (TAG-10).
- `lockForMerge` refuses to run outside a transaction, because `FOR UPDATE` without one locks nothing useful.
- Revisit with `@nestjs-cls/transactional` if we need propagation modes or many transactional use cases.
