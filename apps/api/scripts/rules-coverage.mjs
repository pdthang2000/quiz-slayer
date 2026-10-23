// Lists every rule ID in docs/domain/contexts/<context>.md and whether a test name starts with it.
// Usage: node scripts/rules-coverage.mjs [context]   (default: card-library)
// Exits 1 if a test names a rule ID that is not in the doc (typo or removed rule).
import { readdirSync, readFileSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const apiRoot = join(dirname(fileURLToPath(import.meta.url)), '..');
const repoRoot = join(apiRoot, '..', '..');
const context = process.argv[2] ?? 'card-library';
const docPath = join(repoRoot, 'docs', 'domain', 'contexts', `${context}.md`);

const rules = [...readFileSync(docPath, 'utf8').matchAll(/\*\*([A-Z]+-\d+)\*\* `(\w+)`/g)].map(
  ([, id, status]) => ({ id, status }),
);

function* specFiles(dir) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory() && entry.name !== 'node_modules') yield* specFiles(path);
    else if (/\.((e2e|int)-)?spec\.ts$/.test(entry.name)) yield path;
  }
}

// it('TAG-03: ...') / test("TAG-03: ...") / it.each(...)('TAG-03: ...'), possibly wrapped by prettier.
const testName = /\b(?:it|test)(?:\.\w+)?\(\s*['"`]([A-Z]+-\d+):/g;
const tests = new Map();
for (const dir of ['src', 'test']) {
  for (const file of specFiles(join(apiRoot, dir))) {
    for (const [, id] of readFileSync(file, 'utf8').matchAll(testName)) {
      const files = tests.get(id) ?? new Set();
      files.add(relative(apiRoot, file));
      tests.set(id, files);
    }
  }
}

console.log(`Rule coverage: ${relative(repoRoot, docPath)}\n`);
console.log('Rule          Status     Tests');
for (const { id, status } of rules) {
  const files = tests.get(id);
  const mark = files ? `✓ ${[...files].join(', ')}` : '✗';
  console.log(`${id.padEnd(13)} ${status.padEnd(10)} ${mark}`);
}

const confirmed = rules.filter((r) => r.status === 'confirmed');
const uncovered = confirmed.filter((r) => !tests.has(r.id));
console.log(
  `\n${confirmed.length - uncovered.length}/${confirmed.length} confirmed rules covered.`,
);
if (uncovered.length) console.log(`Not covered: ${uncovered.map((r) => r.id).join(', ')}`);

const known = new Set(rules.map((r) => r.id));
const prefixes = new Set(rules.map((r) => r.id.split('-')[0]));
const unknown = [...tests.keys()].filter(
  (id) => prefixes.has(id.split('-')[0]) && !known.has(id),
);
if (unknown.length) {
  console.log(`\nTests name rule IDs that are not in the doc: ${unknown.join(', ')}`);
  process.exit(1);
}
