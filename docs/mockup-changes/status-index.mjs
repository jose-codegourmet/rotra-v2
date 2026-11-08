// Rewrites the status index in README.md from each log's `Status:` line.
// `--check` writes nothing and exits 1 if the index is stale. Any run exits 1 on a bad status line.
import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const STATUSES = [
  ['NEW', /^NEW$/],
  ['TICKETED', /^TICKETED — #\d+$/],
  ['IN PROGRESS', /^IN PROGRESS — #\d+( \(PR #\d+\))?$/],
  ['IN MOCK APP', /^IN MOCK APP — (#\d+( \(PR #\d+\))?|PR #\d+)$/],
  ['CANCELLED', /^CANCELLED — .+$/],
  ['MOCKUP ONLY', /^MOCKUP ONLY — .+$/],
];

const dir = dirname(fileURLToPath(import.meta.url));
const field = (text, name) => (text.match(new RegExp(`^${name}:\\s*(.+)$`, 'm')) ?? [])[1];
const cell = (s) => s.replace(/\|/g, '/');
const counts = Object.fromEntries(STATUSES.map(([name]) => [name, 0]));
const bad = [];

const rows = readdirSync(dir)
  .filter((f) => /^\d{4}-\d{2}-\d{2}-.+\.md$/.test(f))
  .sort()
  .map((f) => {
    const text = readFileSync(join(dir, f), 'utf8');
    const title = (text.match(/^# (.+)$/m) ?? [, f])[1];
    const status = field(text, 'Status') ?? 'MISSING';
    const kind = STATUSES.find(([, re]) => re.test(status))?.[0];
    if (kind) counts[kind] += 1;
    else bad.push(`${f}: Status: ${status}`);
    const components = field(text, 'Components') ?? '—';
    const superseded = field(text, 'Superseded by');
    const note = superseded && superseded !== 'none' ? ` (superseded by ${superseded.replace(/\.md$/, '')})` : '';
    return `| [${f.slice(0, -3)}](${f}) | ${cell(title)} | ${cell(components)} | ${status}${cell(note)} |`;
  });

if (bad.length) {
  console.error(`Unknown status line (see README §4):\n  ${bad.join('\n  ')}`);
  process.exit(1);
}

const summary = Object.entries(counts)
  .filter(([, n]) => n)
  .map(([s, n]) => `${s}: ${n}`)
  .join(' · ');
const block = `<!-- status-index:start -->\n${summary}\n\n| Log | Change | Components | Status |\n|---|---|---|---|\n${rows.join('\n')}\n<!-- status-index:end -->`;
const readme = join(dir, 'README.md');
const current = readFileSync(readme, 'utf8');
const next = current.replace(/<!-- status-index:start -->[\s\S]*<!-- status-index:end -->/, block);

if (process.argv.includes('--check')) {
  if (next !== current) {
    console.error('Status index is stale: run node docs/mockup-changes/status-index.mjs');
    process.exit(1);
  }
} else {
  writeFileSync(readme, next);
}
