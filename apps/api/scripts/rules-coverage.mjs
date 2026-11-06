// Checks every rule ID in docs/domain/contexts/*.md against the test names.
// Usage: node scripts/rules-coverage.mjs             one summary per context
//        node scripts/rules-coverage.mjs <context>   that context, rule by rule
// Exits 1 if a test names a rule ID that is in no context doc (typo or removed rule).
import { readdirSync, readFileSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const apiRoot = join(dirname(fileURLToPath(import.meta.url)), '..');
const repoRoot = join(apiRoot, '..', '..');
const docsDir = join(repoRoot, 'docs', 'domain', 'contexts');

const contexts = readdirSync(docsDir)
  .filter((name) => name.endsWith('.md'))
  .sort()
  .map((name) => ({
    name: name.replace(/\.md$/, ''),
    rules: [
      ...readFileSync(join(docsDir, name), 'utf8').matchAll(/\*\*([A-Z]+-\d+)\*\* `(\w+)`/g),
    ].map(([, id, status]) => ({ id, status })),
  }));

const only = process.argv.slice(2).find((arg) => arg !== '--'); // pnpm passes "--" on
if (only && !contexts.some((c) => c.name === only)) {
  console.error(`No context "${only}". Contexts: ${contexts.map((c) => c.name).join(', ')}`);
  process.exit(2);
}

function* specFiles(dir) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory() && entry.name !== 'node_modules') yield* specFiles(path);
    else if (/\.((e2e|int)-)?spec\.ts$|\.test\.tsx?$/.test(entry.name)) yield path;
  }
}

// it('TAG-03: ...') / test("TAG-03: ...") / it.each(...)('TAG-03: ...'), possibly wrapped by prettier.
// A test may name several rules: it('TRASH-05, TRASH-14: ...').
const testName = /\b(?:it|test)(?:\.\w+)?\(\s*['"`]([A-Z]+-\d+(?:, [A-Z]+-\d+)*):/g;
const tests = new Map();
// The API's specs, plus the mobile app's tests (UI rules, apps/mobile/src/**/*.test.ts(x)).
for (const dir of ['src', 'test', '../mobile/src']) {
  for (const file of specFiles(join(apiRoot, dir))) {
    for (const [, list] of readFileSync(file, 'utf8').matchAll(testName)) {
      for (const id of list.split(', ')) {
        const files = tests.get(id) ?? new Set();
        files.add(relative(apiRoot, file));
        tests.set(id, files);
      }
    }
  }
}

for (const { name, rules } of contexts) {
  if (only && name !== only) continue;
  console.log(`Rule coverage: ${name}`);
  if (only) {
    console.log('\nRule          Status     Tests');
    for (const { id, status } of rules) {
      const files = tests.get(id);
      const mark = files ? `✓ ${[...files].join(', ')}` : '✗';
      console.log(`${id.padEnd(13)} ${status.padEnd(10)} ${mark}`);
    }
    console.log('');
  }
  const confirmed = rules.filter((r) => r.status === 'confirmed');
  const uncovered = confirmed.filter((r) => !tests.has(r.id));
  console.log(`${confirmed.length - uncovered.length}/${confirmed.length} confirmed rules covered.`);
  if (uncovered.length) console.log(`Not covered: ${uncovered.map((r) => r.id).join(', ')}`);
  console.log('');
}

// Every context's rules count here, so a single-context run refuses the same names.
const known = new Set(contexts.flatMap((c) => c.rules.map((r) => r.id)));
const unknown = [...tests.keys()].filter((id) => !known.has(id));
if (unknown.length) {
  console.log(`Tests name rule IDs that are in no context doc: ${unknown.join(', ')}`);
  process.exit(1);
}
