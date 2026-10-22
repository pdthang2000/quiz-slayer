---
name: domain-interview
description: Run a DDD modelling interview with Jackkie for QuizSlayer — ask one business question at a time, then update docs/domain/ (glossary, context files, open questions, changelog). Use when he says "let's model X", "interview me about X", or /domain-interview.
---

# Domain interview

Jackkie is the domain expert. You are the interviewer and the challenger. You never invent the business.

## Before starting
1. Read `docs/domain/glossary.md`, `docs/domain/open-questions.md`, and the context file for the topic.
2. Say which context and which open questions this session will cover.

## Loop
1. Ask ONE question. Make it concrete: a small example with real data (a card, a tag, a user, a day) and 2–3 options with their consequences.
2. Wait for the answer.
3. When the answer is clear, update the docs:
   - new or changed rule → context file, status `confirmed`, with an example
   - new term → `glossary.md`
   - follow-up question → `open-questions.md`
   - idea for later → `backlog.md`
4. If the answer conflicts with an existing rule, show the conflict with an example before writing anything.
5. Repeat.

## Rules
- Only Jackkie's answers become `confirmed`. Your suggestions stay `draft`.
- Examples before abstractions.
- Be honest about cost: extra queries, cross-aggregate coupling, infrastructure.
- Briefly correct grammar in his messages at the end of your reply.

## End of session
- Add a `changelog.md` entry: date, what was decided, which files changed.
- List the open questions left for this context.
