#!/usr/bin/env node
// Imports cards into QuizSlayer through the running API (POST /cards), one card at a time.
// Every card goes through the createCard use case and the Card aggregate's rules
// (CARD-01/02/05, TAG-01, TAG-05). Nothing here touches the database directly.
//
// Usage:
//   node import-cards.mjs --file cards.json --tag CN_Vocab_10 [--expected 35] [--set "Chinese basic 10"]
//                         [--api http://localhost:3000] [--invalid-file path]
//                         [--dry-run] [--allow-existing-tag]
//
// cards.json: [{ "term": "...", "definition": "..." }, ...]  or  { "cards": [ ... ] }
// term → front, definition → back, both sent exactly as given.
//
// Invalid cards never stop the import. A card that is empty or over a limit (CARD-01, CARD-02),
// or that the API refuses with a 400, goes to the invalid file for Jackkie to edit; the rest are
// imported. The invalid file is only written by a real run, never by --dry-run.
//
// Exit codes: 0 ok, invalid cards included · 1 bad input / API down · 2 bad arguments or tag name
//             3 tag already has cards · 4 the API failed (cards before it ARE created)
//             5 verification mismatch · 6 --expected differs from the file

import { existsSync } from 'node:fs';
import { readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../../../..');

const { values: args } = parseArgs({
  options: {
    file: { type: 'string' },
    tag: { type: 'string' },
    api: { type: 'string', default: process.env.QUIZSLAYER_API_URL ?? 'http://localhost:3000' },
    expected: { type: 'string' },
    set: { type: 'string' },
    'invalid-file': { type: 'string', default: resolve(repoRoot, 'quizlet-invalid-cards.json') },
    'dry-run': { type: 'boolean', default: false },
    'allow-existing-tag': { type: 'boolean', default: false },
  },
});

if (!args.file || !args.tag) {
  console.error('Usage: node import-cards.mjs --file cards.json --tag <TagName> [--api URL] [--dry-run] [--allow-existing-tag]');
  process.exit(2);
}

const api = args.api.replace(/\/+$/, '');
const norm = (s) => s.normalize('NFC').trim(); // same order as CARD-05 / TAG-01 start
const out = (obj) => console.log(JSON.stringify(obj, null, 2));

// Same order and counting as the domain (CARD-05, CARD-01, CARD-02). The API stays the authority.
const MAX_FRONT = 500;
const MAX_BACK = 3000;
const length = (s) => [...norm(s)].length;
function problemOf(card) {
  const problems = [];
  if (length(card.term) === 0) problems.push('front is empty');
  if (length(card.definition) === 0) problems.push('back is empty');
  if (length(card.term) > MAX_FRONT) problems.push(`front is ${length(card.term)}/${MAX_FRONT} characters`);
  if (length(card.definition) > MAX_BACK) problems.push(`back is ${length(card.definition)}/${MAX_BACK} characters`);
  return problems.join('; ');
}

// ---- 1. Read and check the file ----------------------------------------------------
const raw = JSON.parse(await readFile(args.file, 'utf8'));
const cards = Array.isArray(raw) ? raw : raw.cards;
if (!Array.isArray(cards) || cards.length === 0) {
  console.error('No cards in file (expected an array, or { "cards": [...] }).');
  process.exit(1);
}
const malformed = cards
  .map((c, i) => ({ i: i + 1, c }))
  .filter(({ c }) => typeof c?.term !== 'string' || typeof c?.definition !== 'string');
if (malformed.length) {
  out({ error: 'Cards without a term or definition string: the file is wrong, fix the parser step', cards: malformed });
  process.exit(1);
}
if (args.expected !== undefined && cards.length !== Number(args.expected)) {
  out({ error: `The set has ${args.expected} cards but the file has ${cards.length}. Nothing imported.` });
  process.exit(6);
}

// ---- 2. API up? Tag already used? ----------------------------------------------------
async function call(method, path, body) {
  const res = await fetch(api + path, {
    method,
    headers: body ? { 'Content-Type': 'application/json' } : {},
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let json;
  try { json = JSON.parse(text); } catch { json = text; }
  return { ok: res.ok, status: res.status, json };
}

try {
  const h = await call('GET', '/health');
  if (!h.ok) throw new Error(`HTTP ${h.status}`);
} catch (e) {
  console.error(`QuizSlayer API not reachable at ${api} (${e.message}). Start it: docker compose up -d && pnpm --filter @quizslayer/api start:dev`);
  process.exit(1);
}

const tagsBefore = (await call('GET', '/tags')).json;
const existing = Array.isArray(tagsBefore) ? tagsBefore.find((t) => t.name === norm(args.tag)) : undefined;
const countBefore = existing?.cardCount ?? 0;
if (existing && countBefore > 0 && !args['allow-existing-tag']) {
  out({
    error: 'Tag already has cards. Importing again would create duplicates (nothing de-duplicates).',
    tag: existing,
    hint: 'Ask Jackkie. Re-run with --allow-existing-tag only if he says so.',
  });
  process.exit(3);
}

const multiLine = cards.map((c, i) => ({ i: i + 1, term: c.term })).filter(({ term }) => term.includes('\n'));
// Valid, so imported, but worth Jackkie's eye: nothing but dots on a side.
const placeholders = cards
  .map((c, i) => ({ i: i + 1, term: c.term, definition: c.definition }))
  .filter(({ term, definition }) => [term, definition].some((side) => /^\s*[.…][.…\s]*$/.test(side)));
const invalid = [];
const toInvalid = (card, position, problem) =>
  invalid.push({
    set: args.set ?? args.file,
    position,
    problem,
    front: card.term,
    back: card.definition,
    tags: [args.tag],
  });
const valid = [];
cards.forEach((card, i) => {
  const problem = problemOf(card);
  if (problem) toInvalid(card, i + 1, problem);
  else valid.push({ card, position: i + 1 });
});

if (args['dry-run']) {
  out({
    dryRun: true,
    api,
    tag: args.tag,
    tagExists: !!existing,
    countBefore,
    cards: cards.length,
    wouldImport: valid.length,
    invalid: invalid.map(({ position, problem }) => ({ position, problem })),
    placeholders,
    multiLineFronts: multiLine,
  });
  process.exit(0);
}

async function saveInvalid() {
  if (invalid.length === 0) return;
  const file = args['invalid-file'];
  const saved = existsSync(file) ? JSON.parse(await readFile(file, 'utf8')) : [];
  const key = (c) => JSON.stringify([c.front, c.back, c.tags]);
  const known = new Set(saved.map(key));
  await writeFile(file, `${JSON.stringify([...saved, ...invalid.filter((c) => !known.has(key(c)))], null, 2)}\n`);
}

// ---- 3. Create the cards, in file order ----------------------------------------------
const created = [];
const createdFrom = [];
for (const { card, position } of valid) {
  const r = await call('POST', '/cards', { front: card.term, back: card.definition, tags: [args.tag] });
  if (r.ok) {
    created.push(r.json);
    createdFrom.push(card);
    continue;
  }
  if (r.json?.error === 'InvalidTagName') {
    out({ error: `Tag name refused (TAG-01): ${args.tag}. Nothing imported.`, response: r.json });
    process.exit(2);
  }
  if (r.status === 400) {
    toInvalid(card, position, r.json?.message ?? r.json?.error ?? 'refused by the API');
    continue;
  }
  await saveInvalid();
  out({
    error: `The API failed on card ${position}; stopped. Cards before it WERE created. Do not re-run as is (duplicates).`,
    card,
    status: r.status,
    response: r.json,
    createdIds: created.map((c) => c.id),
  });
  process.exit(4);
}
await saveInvalid();
if (created.length === 0) {
  out({ imported: 0, tag: args.tag, invalid: invalid.length, invalidFile: invalid.length ? args['invalid-file'] : undefined });
  process.exit(invalid.length ? 0 : 5);
}

// ---- 4. Verify by reading back ---------------------------------------------------------
const t0 = created[0].tags?.[0];
const tagsAfter = (await call('GET', '/tags')).json;
const tag = tagsAfter.find((t) => (t0 && typeof t0 === 'object' && t0.id ? t.id === t0.id : t.name === norm(args.tag)));

const inTag = [];
let cursor = null;
let pages = 0;
do {
  const q = new URLSearchParams({ tag: tag.id });
  if (cursor) q.set('cursor', cursor);
  const r = (await call('GET', `/cards?${q}`)).json;
  inTag.push(...(r.items ?? []));
  cursor = r.nextCursor ?? null;
} while (cursor && ++pages < 1000);

const ids = new Set(inTag.map((c) => c.id));
const missing = created.filter((c) => !ids.has(c.id)).map((c) => c.id);
const frontsOk = created.every(
  (c, i) => c.front === norm(createdFrom[i].term) && c.back === norm(createdFrom[i].definition),
);
const result = {
  imported: created.length,
  tag: { id: tag.id, name: tag.name, color: tag.color, cardCount: tag.cardCount },
  expectedCardCount: countBefore + created.length,
  missingFromTag: missing,
  storedTextMatchesFile: frontsOk,
  invalid: invalid.map(({ position, problem }) => ({ position, problem })),
  invalidFile: invalid.length ? args['invalid-file'] : undefined,
  placeholders,
  multiLineFronts: multiLine,
};
out(result);
process.exit(tag.cardCount === countBefore + created.length && missing.length === 0 && frontsOk ? 0 : 5);
