# ADR-003: Unicode NFC normalization for text

- Date: 2026-10-20
- Status: accepted

## Context
The same Vietnamese letter can be stored in two ways depending on keyboard, OS or source (e.g. copied from a PDF on macOS):
```
"ộ" composed   = U+1ED9                    → 1 code point
"ộ" decomposed = o + U+0323 + U+0302       → 3 code points
'ộ' === 'ộ'               → false
```
Without normalization: duplicate tags that look identical, a unique constraint that doesn't catch them, search that misses half the cards, and length limits that differ by keyboard.

## Decision
- Normalize to NFC once, at the boundary, in value objects (e.g. `TagName.create`).
- Apply to tag names, card front/back, and search input.
- Do not use NFKC: it changes visible characters (`①` → `1`, full-width `Ａ` → `A`).
- Optional DB guard (PostgreSQL 13+): `CHECK (name IS NFC NORMALIZED)`.

## Consequences
- Identical-looking text is identical in the DB.
- English and Chinese are effectively unaffected.
