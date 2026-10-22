# ADR-002: Delete policy — Trash for cards, hard delete for tags and CardTags

- Date: 2026-10-20
- Status: accepted

## Context
Deleting can lose data. Soft delete everywhere "just in case" costs a state filter on every read and makes uniqueness harder.

Cost to redo a mistake:
```
Remove tag from card     1 CardTag          retype tag: seconds
Delete tag               many CardTags      confirm dialog protects it
Delete card              front + back text  content is lost
```

## Decision
- Remove tag from card: hard delete the CardTag.
- Delete tag: hard delete the tag and its CardTags. Cards stay. The name can be reused immediately.
- Delete card: move it to the Trash (a card state, not an entity). Restore brings its tags back. Delete permanently removes the card and its CardTags.

## Options considered
- Hard delete everything — simplest, but losing card content by mistake is costly.
- Soft delete everything — every read filters state; tag uniqueness needs partial indexes; no user-facing benefit for tags.
- Trash for cards only — chosen. Soft delete backed by a real feature (the Trash tab).

## Consequences
- Every card read states which state it wants (READ-01).
- Tag uniqueness is a plain DB unique constraint.
- Revisit if users ask for undo on tags, or if offline sync needs tombstones.
