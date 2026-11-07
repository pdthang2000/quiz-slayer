#!/usr/bin/env node
// DDD review gate (docs/use-case-checklist.md, .claude/skills/ddd-review/SKILL.md).
// A review belongs to the exact staged diff: stage anything new after the review and it must run again.
//   --mark   record that /ddd-review passed for what is staged now
//   --check  exit 0 if what is staged now was reviewed (or has no code changes), else 1
//   --hook   Claude Code PreToolUse hook (.claude/settings.json): block `git commit` until --check passes
// Marks live in .git/ddd-review/ (never committed).
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const root = process.env.CLAUDE_PROJECT_DIR ?? process.cwd();
const git = (...args) =>
  execFileSync('git', args, { cwd: root, encoding: 'utf8', maxBuffer: 256 * 1024 * 1024 });

// Only code needs a review. Docs-only or config-only commits pass.
const NEEDS_REVIEW = /^(apps|packages)\//;

function staged() {
  const files = git('diff', '--cached', '--name-only').split('\n').filter(Boolean);
  const diff = git('diff', '--cached', '--binary', '--no-color', '--no-ext-diff');
  const hash = createHash('sha256').update(diff).digest('hex');
  const gitDir = git('rev-parse', '--absolute-git-dir').trim();
  return {
    files,
    hash,
    mark: join(gitDir, 'ddd-review', hash),
    needsReview: files.some((f) => NEEDS_REVIEW.test(f)),
  };
}

function check() {
  const s = staged();
  if (!s.needsReview) return { ok: true, why: 'no code changes staged, no DDD review needed' };
  if (existsSync(s.mark)) return { ok: true, why: `DDD review found for staged diff ${s.hash.slice(0, 8)}` };
  return {
    ok: false,
    why:
      `The staged code changes have no DDD review (or changed after it), diff ${s.hash.slice(0, 8)}.\n` +
      'Run /ddd-review on the staged diff (.claude/skills/ddd-review/SKILL.md), fix every "must fix", then commit.',
  };
}

const mode = process.argv[2];

if (mode === '--mark') {
  const s = staged();
  if (!s.files.length) {
    console.error('Nothing is staged. Stage the reviewed files first.');
    process.exit(1);
  }
  mkdirSync(join(s.mark, '..'), { recursive: true });
  writeFileSync(s.mark, `${new Date().toISOString()}\n${s.files.join('\n')}\n`);
  console.log(`DDD review recorded for staged diff ${s.hash.slice(0, 8)} (${s.files.length} files).`);
  process.exit(0);
}

if (mode === '--check') {
  const r = check();
  console.log(`${r.ok ? '✓' : '✗'} ${r.why}`);
  process.exit(r.ok ? 0 : 1);
}

if (mode === '--hook') {
  let cmd = '';
  try {
    cmd = JSON.parse(readFileSync(0, 'utf8') || '{}').tool_input?.command ?? '';
  } catch {
    process.exit(0);
  }
  // Only real commands count, not text that mentions them: drop heredoc bodies and quoted
  // text (e.g. the commit message), then look at each command on its own.
  const commands = cmd
    .replace(/<<-?\s*(['"]?)(\w+)\1([^\n]*)\n[\s\S]*?\n\s*\2(?=\n|$)/g, '$3')
    .replace(/'[^']*'|"(?:[^"\\]|\\.)*"/g, '""')
    .split(/[\n;&|]+/);
  const gitRuns = (subcommand) =>
    new RegExp(`^[\\s({$]*(\\w+=\\S*\\s+)*git\\s+(-[cC]\\s+\\S+\\s+)*(${subcommand})(?=[\\s)]|$)`);
  const commitIndex = commands.findIndex((c) => gitRuns('commit').test(c));
  if (commitIndex === -1) process.exit(0);

  const block = (msg) => {
    console.error(`DDD review gate: ${msg}`);
    process.exit(2); // exit 2 = Claude Code blocks the tool call and shows this message
  };
  const commitPart = commands[commitIndex];
  if (commands.slice(0, commitIndex).some((c) => gitRuns('add|rm|mv').test(c)))
    block('stage files in a separate command, run /ddd-review, then run `git commit` on its own.');
  if (/\s(--all\b|-[A-Za-z]*a[A-Za-z]*\b)/.test(commitPart))
    block('do not use `git commit -a`: stage with `git add`, run /ddd-review, then commit.');
  if (/\s(--no-verify\b|-[A-Za-z]*n[A-Za-z]*\b)/.test(commitPart))
    block('do not skip the git pre-commit hook (--no-verify / -n) unless Jackkie says so.');

  let r;
  try {
    r = check();
  } catch {
    process.exit(0); // not a git repo or git failed: not our business
  }
  if (!r.ok) block(r.why);
  process.exit(0);
}

console.error('Usage: ddd-review-gate.mjs --mark | --check | --hook');
process.exit(2);
