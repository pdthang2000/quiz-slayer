# ADR-009: Card save with new tags runs in one transaction

- Date: 2026-10-23
- Status: accepted (Jackkie, C-32)

## Context
The card editor saves front, back and tags in one request (CARD-07). Tag names that don't exist yet are created (TAG-05). That writes new Tag aggregates and the Card. The default rule is "one command, one aggregate"; exceptions need an ADR (CLAUDE.md, ADR-004).

```
Save Dog + new #Animals
1. create tag Animals   ✓
2. save card Dog        ✗ (e.g. Dog was trashed on another device)
```

## Decision
`createCard` and `editCard` run in one transaction through the `TransactionRunner` (ADR-008): find or create the tags, check them with `findByIds` (CARD-04), change the card through its methods, save. Any failure rolls back everything, so no new empty tag is left behind.

## Options considered
- **One transaction (chosen)** — Save is all or nothing, as the user expects. Cost: a second documented exception to "one aggregate per transaction".
- **Tags first, then the card** — follows the rule; a failed card save leaves a new empty tag (allowed by TAG-04, but confusing).

## Consequences
- Rules are still checked in the domain classes (Card, Tag, TagName) before anything is written.
- A tag-name race inside the transaction (TAG-03) aborts it in Postgres: use "insert, or get the existing tag" (`ON CONFLICT DO NOTHING` + select) instead of catching `TagNameTaken` and continuing.
