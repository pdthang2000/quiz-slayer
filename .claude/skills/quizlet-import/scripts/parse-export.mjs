#!/usr/bin/env node
// Turns text from Quizlet's Export box into cards.json for import-cards.mjs.
//
// Usage:
//   node parse-export.mjs export.txt [--term-sep "|"] [--row-sep "||"] > cards.json
//
// Defaults match the old QuizSlayer import script: "|" between term and definition,
// "||" between cards. Custom separators are needed because a term or definition can
// span several lines, so "new line" between cards would break them apart.
// A row that does not split into exactly one term and one definition stops the parse:
// re-export with separators that appear nowhere in the set (e.g. "@@" and "##").

import { readFile } from 'node:fs/promises';
import { parseArgs } from 'node:util';

const { values: args, positionals } = parseArgs({
  allowPositionals: true,
  options: {
    'term-sep': { type: 'string', default: '|' },
    'row-sep': { type: 'string', default: '||' },
  },
});

if (positionals.length !== 1) {
  console.error('Usage: node parse-export.mjs export.txt [--term-sep "|"] [--row-sep "||"] > cards.json');
  process.exit(2);
}

const text = (await readFile(positionals[0], 'utf8')).replace(/\r\n/g, '\n');
const rows = text.split(args['row-sep']).filter((r) => r.trim() !== '');

const cards = [];
const bad = [];
rows.forEach((row, i) => {
  const parts = row.split(args['term-sep']);
  if (parts.length !== 2) bad.push({ row: i + 1, parts: parts.length, text: row.slice(0, 120) });
  else cards.push({ term: parts[0].trim(), definition: parts[1].trim() });
});

if (bad.length) {
  console.error(JSON.stringify({ error: 'Rows that do not split into term + definition', rows: bad }, null, 2));
  process.exit(1);
}
console.log(JSON.stringify(cards, null, 2));
