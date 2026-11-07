---
name: ddd-review
description: Review QuizSlayer's staged diff against its DDD setup (CLAUDE.md, docs/use-case-checklist.md, ddd-validate, domain-driven-design) before a commit, then record the pass so `git commit` is allowed. Use before every commit that touches apps/ or packages/, when a commit is blocked by the DDD review gate, or when Jackkie says /ddd-review.
---

# DDD review (before each commit)

Reviews **only what is staged**. The pass belongs to that exact diff: stage anything new afterwards and the review runs again.

## 1. Scope
- `git diff --cached --name-only`. Nothing staged → stop and say "Stage the files first."
- Group the files: each `apps/api/src/<context>/`, `apps/mobile/`, `docs/`.
- No file under `apps/` or `packages/` → no review needed. Say so and stop (the gate lets docs-only commits through).

## 2. Read
- The whole `git diff --cached`. For each changed file, open enough of it to judge the change (e.g. the aggregate a use case calls, the value object a DTO mirrors).
- `docs/use-case-checklist.md`, `docs/domain/glossary.md`, and `docs/domain/contexts/<context>.md` for each touched context.
- `.claude/skills/ddd-validate/SKILL.md` steps 2–5, and the Common Mistakes and Quick Diagnostic tables in `.claude/skills/domain-driven-design/SKILL.md`. Open a `references/` file only when a finding needs it.

## 3. Review the changed code with three lenses
1. **Checklist**: every item ✓, ✗ (file:line) or n/a.
2. **ddd-validate**: BOUNDARY, INVARIANT, EVENT, REPOSITORY on the touched contexts.
3. **domain-driven-design**: the Common Mistakes and Quick Diagnostic rows this change could break (logic moving out of aggregates into use cases, technical names, an aggregate growing, a foreign model entering without a translation layer).

Skip what lint, tsc and rules:coverage already enforce. Don't re-report findings already in `docs/reviews/` unless this change makes them worse.

## 4. Impact: what this change breaks outside the diff
Catches a change that is correct on its own but breaks code that is not in the diff.

1. List what the diff changes beyond its own lines: aggregate or value object behaviour, domain events (names, fields), repository and query interfaces, application service inputs and outputs, API DTOs and responses, the Prisma schema and migrations, rule text in `docs/domain/`.
2. For each one, find every user outside the diff (grep plus TypeScript references), across all contexts and `apps/mobile`. Read them.
3. Answer three questions with proof (file:line, a test, or a command's output):
   - **Does old data still load?** Stored rows through the mappers, and unsent outbox events with the old payload.
   - **Does an older installed app still work?** The API stays backward compatible (CLAUDE.md).
   - **Do other rules that depend on this one still hold?** Check `docs/domain/contexts/`.
4. Run `pnpm test:int` when the impact reaches infrastructure, events, the outbox or migrations. Run `pnpm test:e2e` when it reaches the API.
5. An affected user with no test is a **must fix**: add a test named by its rule ID.

Worked examples from this codebase:
- **`CardFront` limit 500 → 300.** The diff is one constant and its tests pass, but `card.mapper.ts` rebuilds rows with `CardFront.create`, so a stored 420-char card fails to load.
- **`QuizAnswered { day }` → `{ answerDay }`.** It compiles everywhere, but old outbox events still carry `day`, so `QuizProgress` reads `undefined`.

Nothing outside the diff is affected → say so in one line and move on.

## 5. Verdicts (same words as `docs/reviews/phase-3-ddd.md`)
- **must fix**: breaks CLAUDE.md, a `confirmed` rule or a checklist item. Fix it, re-stage, go back to step 1.
- **later**: real, not worth fixing in this commit. Add a row to `docs/reviews/<context>-ddd.md` (create it with the header of `phase-3-ddd.md`) saying when to revisit, and stage that file.
- **false positive**: one line saying why. Not written anywhere.
- **business question**: the code needs a rule that is missing or only `draft`. That is a must fix: add it to `docs/domain/open-questions.md` and ask Jackkie. In a continuous run, build the recommended choice and log it as `provisional, built: <what>` (CLAUDE.md → Continuous run).

## 6. Record the pass
Only when no **must fix** is left and everything from step 5 is staged:
```
node .claude/hooks/ddd-review-gate.mjs --mark
```
Never run `--mark` without doing steps 1–5.

## 7. Report and commit
Show Jackkie a short table (findings only; skip it when there are none):

| # | Lens | File:line | Finding | Verdict |
|---|---|---|---|---|

Then the impact table (skip it when nothing outside the diff is affected):

| Changed | Used by (outside the diff) | Still OK? | Proof |
|---|---|---|---|

Put one summary line in the commit body:
```
DDD review: checklist 13 ✓ · 5 n/a · impact 2 ok · 0 must fix · 1 later (daily-practice-ddd.md #2)
```
Commit in its own command: no `git add … && git commit`, no `-a`, no `--no-verify`.
