# ADR-011: Adding or removing many cards from a tag runs in one transaction

- Date: 2026-10-25
- Status: accepted (Jackkie, T-2)

## Context
A tag's card list can add several cards to the tag (picker) or remove several (checkboxes) in one action (CARDTAG-07, CARDTAG-08). Each card is its own aggregate. The default rule is "one command, one aggregate"; exceptions need an ADR (CLAUDE.md, ADR-004).

## Decision
`addCardsToTag` / `removeCardsFromTag` run in one transaction through the `TransactionRunner` (ADR-008): load the cards, check each version (CARD-08), call `card.addTag` / `card.removeTag` (rules such as CARDTAG-03 stay in Card), save all. Any failure — a full card, a changed card, a missing tag — rolls back everything.

## Options considered
- **One transaction (chosen)** — "Add 10 cards" is all or nothing; nothing half-done.
- **Card by card, skip failures** — follows the rule; partial results need a per-card report and confuse.

## Consequences
- Fourth documented exception (with ADR-004, 009, 010); rules still checked in Card.
- Max 100 cards per action keeps the transaction short (shape guard in the app and the API).
