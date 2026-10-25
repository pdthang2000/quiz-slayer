# DDD review — Card Library after Phase 3

Scope: `apps/api/src/card-library`. Two skills:
- `ddd-validate` (ruvnet/ruflo), run 2026-10-25 on the Phase 3 code.
- `domain-driven-design` (wondelai), run 2026-10-25 on the Phase 3.1 code (after CARD-08). Its findings 3–10 below came from an earlier manual review using the same checklist and were re-checked in this run.

Verdicts: **fixed** · **false positive** (not a problem, reason given) · **later** (real, not worth fixing now; when to revisit).

## Score (domain-driven-design): 9/10
Quick Diagnostic 6/7. Failing row: "Domain events used for cross-aggregate communication" (finding 11).
Depth +3: behaviour-rich aggregates, invariants inside Card/Tag, one language across docs, code and tests.

## Findings

| # | Skill | Finding | Verdict | Reason |
|---|---|---|---|---|
| 1 | ddd-validate | EVENT: domain event fields were mutable. | fixed | All fields `readonly` (c1862db). |
| 2 | ddd-validate | INVARIANT: public `Card/Tag.reconstitute()` skips the rules. | false positive | Only the mappers call it, to rebuild stored rows; rules ran when the row was written. An ESLint rule now allows the call only in `infrastructure/` (0582efb). |
| 3 | domain-driven-design | The card mapper rebuilds text with `CardFront/CardBack.create`, so a stricter future limit would make old cards fail to load. | later | Limits are confirmed rules (CARD-02) and only get looser so far. Revisit if a limit ever gets stricter: add a non-validating path for stored text. |
| 4 | domain-driven-design | `Tag.mergeInto` only records `TagsMerged`; deleting the tag is up to the use case. | false positive | Same pattern as `Card.deletePermanently`: the aggregate decides and records the fact, the repository removes the row. |
| 5 | domain-driven-design | The read side casts `color as TagColorKey` without checking. | later | Tags are only written through `TagColor` (TAG-13). Revisit if anything else writes the tag table. |
| 6 | domain-driven-design | `RenameTag` (a command) uses the read-side queries for the merge preview counts. | false positive | The preview is screen data returned with the 409 (TAG-15), not used to decide anything. Reads stay in the query interface. |
| 7 | domain-driven-design | `UserId` and the `DomainError` base live in card-library; application errors extend `DomainError`. | later | Move to a shared kernel when the second context (Daily Practice, Phase 6) needs them. |
| 8 | domain-driven-design | `DomainErrorFilter` is registered globally inside `CardLibraryModule`. | later | Fine with one context. Move to a shared module with finding 7. |
| 9 | domain-driven-design | Events have no `eventId` / `occurredAt` and are published after commit (lost on a crash). | later | No listener exists yet. Backlog B-10 (outbox) before Daily Practice listens. |
| 10 | domain-driven-design | A TAG-14 same-name rename is a no-op but still calls `tags.save` (one useless write). | later | Harmless (same values). Fix when that code is next touched. |
| 11 | domain-driven-design | Diagnostic row failed: cross-aggregate changes (tag merge, Save with new tags, empty trash) run in one transaction instead of reacting to events. | later | Deliberate, Jackkie's choice: all-or-nothing behaviour (ADR-004, ADR-009, ADR-010). Events become the integration path for Daily Practice (B-10). |
| 12 | domain-driven-design | The application helper class `CardTags` is named after the glossary term CardTag (the card–tag link), but it resolves tag names and loads cards. | later | Internal name, no behaviour impact. Rename when the card use cases are next touched. |
| 13 | domain-driven-design | Tag merge vs a concurrent card Save: before CARD-08 the merge overwrote that Save's tags with its stale copy (lost update). | fixed | CARD-08: the merge's `saveAll` now fails with `CardChanged` and rolls back. The message the user sees in that case is open: C-40. |
| 14 | domain-driven-design | A card Save that adds tag A while a merge of A holds its lock can deadlock with the merge (Postgres aborts one → 500). Existed before CARD-08. | later | Not reproduced yet, rare (single user, two devices, same second). Backlog B-11. |
