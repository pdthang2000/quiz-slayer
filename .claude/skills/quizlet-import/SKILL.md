---
name: quizlet-import
description: Import a Quizlet flashcard set into Jackkie's local QuizSlayer database as cards with one tag, through the running API. Use when Jackkie gives a quizlet.com set link or text from Quizlet's Export box and asks to import, copy or pull its cards into QuizSlayer, or says /quizlet-import.
argument-hint: "<quizlet-set-url> <TagName>"
---

# Quizlet import (dev tool)

Copies one Quizlet set into the local QuizSlayer DB: one card per Quizlet term, all with one tag.
Example: `/quizlet-import https://quizlet.com/vn/721345981/chinese-basic-010-flash-cards/ CN_Vocab_10`

This is a developer tool, not a product feature. It only calls the existing `createCard` command
(`POST /cards`), so it adds no business rules and needs no doc changes. A real in-app import is
Content Ingestion work and must be modelled first (`/domain-interview`).

## Hard rules
- **Code carries the text, never Claude.** Card text goes from Quizlet to the clipboard, to a file,
  to the API. Never read cards and retype them into a file.
- **Copy exactly.** Term → front, definition → back, in Quizlet's order. Never split a multi-word card,
  merge cards, reword, translate, fix typos or reformat.
- **Invalid cards never stop the import.** Valid cards are imported. A card that is empty, over a limit
  or refused by the API goes to `quizlet-invalid-cards.json` at the repo root (gitignored), with its
  front, back and tags, for Jackkie to edit. The script does this. Never edit those cards.
- **Through the API only.** Never write to Postgres, never use Prisma or raw SQL (CLAUDE.md: the
  aggregate checks the rules before anything is written).
- **Never solve a bot check** (Quizlet's "Press & Hold" / CAPTCHA) and never enter a password. Ask
  Jackkie to do it.
- **Never fetch Quizlet with WebFetch, curl or a headless browser.** It is blocked, and those tools
  would be trying to get around the bot check.
- **No duplicates.** If the tag already has cards, stop and ask (the script enforces this).
- Commit nothing. Leave the JSON and export files out of the repo.

## 1. Inputs
- Quizlet set URL and tag name. Tag missing → ask for it. The tag must pass TAG-01: letters, digits,
  space, `-`, `_`, 1–50 characters (`CN_Vocab_10` is fine, `CN.Vocab.10` is not).
- API: `http://localhost:3000` unless Jackkie says otherwise (`--api` or `QUIZSLAYER_API_URL`).

## 2. Check the API
`curl -s http://localhost:3000/health` should print `{"status":"ok"}`. If it doesn't, tell Jackkie to run
`docker compose up -d` and `pnpm --filter @quizslayer/api start:dev`, then stop and wait.

## 3. Get the cards (route A, then B, then C)
`$TMPDIR` is the session's temporary folder. Each route ends with a `cards.json` file and the set's
term count, read from "Terms in this set (N)" on the page.

### Route A: Quizlet's Export, through the clipboard (preferred)
Needs Claude in Chrome and Jackkie logged in to Quizlet: the Export item is missing while logged out.
The clipboard is replaced, so tell Jackkie.
1. Load the `mcp__claude-in-chrome__*` tools in one ToolSearch call (tabs_context_mcp, tabs_create_mcp,
   tabs_close_mcp, navigate, computer, find, get_page_text, javascript_tool, browser_batch). Not
   available or extension not connected → route C.
2. `tabs_context_mcp`, then navigate to the set URL and wait for the page to load (`computer` wait,
   3 seconds). JavaScript sent straight after navigating fails.
3. `get_page_text`. If it says "Press & Hold" / "confirm you are a human" / "Access … denied": ask
   Jackkie to pass the check in that tab and reply "done". Do not reload the page afterwards.
4. Note the term count. Click the **More** (⋯) button, then **Export**. No Export item → Jackkie is
   logged out, or the set is someone else's: ask, or use route B. Page code may open the box:
   ```js
   const more = document.querySelector('button[aria-label="More"]');
   more.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, button: 0 })); more.click();
   await new Promise(r => setTimeout(r, 600));
   [...document.querySelectorAll('[role=menuitem]')].find(e => e.innerText.trim() === 'Export').click();
   ```
5. Between term and definition: **Custom** `@@`. Between rows: **Custom** `##`. Press **Copy text**.
   Custom separators matter: a term or definition can be several lines, so "New line" between rows
   would break those cards apart. Don't use `|` / `||`: a card that is blank on both sides makes
   `|||||`, which no longer splits into rows (Chinese basic 26).
   Use real clicks and typing here (`computer`). Setting the separator fields or pressing Copy text
   from page code froze the tab (2026-11-07).
   Work out the click positions each time, because they move when the Chrome window changes size:
   ```js
   const c = e => { const r = e.getBoundingClientRect(); return [r.x + r.width / 2, r.y + r.height / 2]; };
   JSON.stringify({
     radios: [...document.querySelectorAll('input[type=radio][value=custom]')].map(c), // term, row
     fields: [...document.querySelectorAll('input[type=text]')].filter(t => !t.placeholder).map(c),
     copy: c([...document.querySelectorAll('button')].find(b => b.innerText.trim() === 'Copy text')),
     vw: innerWidth,
   })
   ```
   Then take a screenshot: click at each position × (screenshot frame width ÷ `vw`). The positions stay
   valid while `vw` stays the same, so check `vw` on every set.
   Before saving, check the clipboard changed: same text as the previous set → the copy failed, stop.
6. Save and parse it:
   ```bash
   S=.claude/skills/quizlet-import/scripts
   pbpaste > $TMPDIR/quizlet-<id>.txt
   node $S/parse-export.mjs $TMPDIR/quizlet-<id>.txt > $TMPDIR/quizlet-<id>.json
   ```
   `@@` and `##` are the parser's defaults. If it reports rows that don't split in two, the set uses
   one of them somewhere: export again with other separators (e.g. `%%` / `&&`) and pass
   `--term-sep "%%" --row-sep "&&"`.

### Route B: the page's term list, through the clipboard
For a set Export doesn't offer. Needs the set page open as in route A.
1. Run in the page with `javascript_tool`:
   ```js
   const rows = [...document.querySelectorAll('.SetPageTermsList-term')];
   const cards = rows.map(r => {
     const s = [...r.querySelectorAll('[class*="TermText"]')].map(e => e.innerText);
     return { term: s[0] ?? '', definition: s[1] ?? '' };
   });
   window.focus();
   await navigator.clipboard.writeText(JSON.stringify(cards));
   const m = document.body.innerText.match(/Terms in this set \((\d+)\)/);
   JSON.stringify({ title: document.querySelector('h1')?.innerText, expected: m ? +m[1] : null, count: cards.length })
   ```
   Tool output is cut at about 1000 characters, so never read the cards from it.
2. `pbpaste > $TMPDIR/quizlet-<id>.json`.
3. `count === 0` → Quizlet changed its HTML: find the new selectors with `read_page` and adapt the
   snippet. `count < expected` → click "See more" or scroll to the end of the list, then run it again.
   A clipboard error → the tab has no focus: ask Jackkie to click the tab, then run it again.

### Route C: Jackkie pastes the export
Ask Jackkie to open the set → **⋯ → Export**, set the separators to `@@` and `##` as in route A, and paste the text into
a file or into chat. Save chat text with the Write tool, then parse it as in route A step 6.
This is the only route where Claude writes card text, because Jackkie handed it over.

## 4. Import
```bash
S=.claude/skills/quizlet-import/scripts
node $S/import-cards.mjs --file $TMPDIR/quizlet-<id>.json --tag <TagName> --expected <N> --set "<title>" --dry-run
node $S/import-cards.mjs --file $TMPDIR/quizlet-<id>.json --tag <TagName> --expected <N> --set "<title>"
```
The script checks the count against `--expected`, sends one `POST /cards` per valid card in file order,
adds invalid cards to the invalid file, then reads the cards back through `GET /tags` and
`GET /cards?tag=` and checks them.

| Exit | Meaning | Do |
|---|---|---|
| 0 | Valid cards imported and verified; invalid ones are in the invalid file | Report |
| 1 | Bad file, or API down | Fix the input / ask Jackkie to start the API |
| 2 | Bad arguments, or tag name refused | Fix it. Nothing was imported |
| 3 | Tag already has cards | Stop. Ask Jackkie. Use `--allow-existing-tag` only if Jackkie says so |
| 4 | The API failed on card N; cards before N **were** created | Do not re-run (duplicates). Show the error, the card and the created ids, and ask |
| 5 | Read-back mismatch | Show the output and ask |
| 6 | The file's card count differs from the set | Nothing imported. Get the cards again |

Several sets in a row: carry on after exit 0, and report them together at the end.

## 5. Report to Jackkie (short)
- Set title, cards imported out of the set's total, tag name and colour.
- `invalid`: how many, why, and the path of the invalid file.
- `placeholders`: valid cards with nothing but dots on a side. They were imported. Offer to move them to
  the Trash.
- `multiLineFronts`: cards with several lines on the front, probably several words on one card.
- Anything odd you noticed but didn't change (e.g. a different separator style on one card).
- Reminder: the Cards screen shows newest first, so the set's last card is at the top.

## Example results
- 2026-10-29, Chinese basic 010: 39 cards → `#CN_Vocab_10` (orange). Three multi-word cards kept as
  single cards: `坐/座`, `安/不安`, and the last card with 9 words.
- 2026-11-07, Chinese basic 11: 35 cards → `#CN_Vocab_11` (slate). Jackkie moved card 5 (`...` on both
  sides) to the Trash afterwards.
- 2026-11-07, Chinese basic 12–20 through route A: 222 cards, 0 invalid. Many fronts hold several
  words, one per line (up to 11), kept as single cards.
- 2026-11-07, Chinese basic 21–30: 159 of 160 cards. Set 26 card 2 is blank on both sides on Quizlet
  and went to the invalid file.
