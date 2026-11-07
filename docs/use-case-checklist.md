# New or changed use case: checklist

Go through this for every new or changed command, query, aggregate method or screen.
`/ddd-review` checks the staged diff against it before each commit (`.claude/skills/ddd-review/SKILL.md`).
Mark each item ✓, ✗ (with file:line) or n/a.

## Rules and language
1. Every rule the code enforces is `confirmed` in `docs/domain/contexts/<context>.md`. Missing or `draft` → `docs/domain/open-questions.md` and ask Jackkie (in a continuous run: `provisional, built: <what>`).
2. Every class, method, event and table name matches `docs/domain/glossary.md`. A new term goes into the glossary first.
3. Methods use business words: `card.moveToTrash()`, not `card.softDelete()`.

## Where the logic lives
4. The rule is checked inside an aggregate or value object, before anything is saved. The use case only loads, calls the aggregate and saves.
   ```ts
   // ✗ use case decides
   if (name.length > 30) throw new TagNameTooLong();
   // ✓ value object decides
   const tagName = TagName.create(name);
   ```
5. The controller and its DTO only check the request shape (types, required fields). No business `if`.
6. `domain/` throws domain errors (`CardIsTrashed`), never `Error` or `HttpException`. The exception filter in `api/` maps them to HTTP status codes.

## Boundaries
7. One command changes one aggregate in one transaction. Other aggregates react to domain events. A change across aggregates in one transaction needs an ADR (e.g. ADR-004).
8. Another context is reached only through its public application service or an event, never its `domain/`, repository or tables.
9. Only repositories touch `PrismaService`. A mapper converts rows ↔ domain objects. Repositories never return Prisma types.
10. Reads that return or count cards name the state: `findActive`, `findTrashed`. No `findAll`.
11. Times are stored and compared in UTC.
12. `apps/mobile` has no business rule: it calls the API and shows the result. It never imports from `apps/api`.

## Tests and docs
13. Each rule ID has a test whose name starts with the ID, and that test fails if the rule is removed (not only a matching name).
14. Domain tests are plain unit tests: no Nest testing module, no DB.
15. If the code revealed or changed a rule, the docs change in the same commit (context file, glossary, changelog; ADR if hard to reverse).

## Impact outside the diff
16. Old data still loads: stored rows through the mappers, and unsent outbox events with the old payload.
17. An older installed app still works: API changes are backward compatible.
18. Every affected caller outside the diff has a test. One without a test gets a new test named by its rule ID.
