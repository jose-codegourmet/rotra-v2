// Rewrites the status index in README.md from each log's `Status:` line.
import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const dir = dirname(fileURLToPath(import.meta.url));
const rows = readdirSync(dir)
  .filter((f) => /^\d{4}-\d{2}-\d{2}-.+\.md$/.test(f))
  .sort()
  .map((f) => {
    const text = readFileSync(join(dir, f), 'utf8');
    const title = (text.match(/^# (.+)$/m) ?? [, f])[1];
    const status = (text.match(/^Status:\s*(.+)$/m) ?? [, 'MISSING'])[1];
    return `| [${f.slice(0, -3)}](${f}) | ${title.replace(/\|/g, '/')} | ${status} |`;
  });

const counts = {};
for (const r of rows) {
  const s = r.split('|').at(-2).trim().split(/ [—(]/)[0];
  counts[s] = (counts[s] ?? 0) + 1;
}
const summary = Object.entries(counts).map(([s, n]) => `${s}: ${n}`).join(' · ');

const block = `<!-- status-index:start -->\n${summary}\n\n| Log | Change | Status |\n|---|---|---|\n${rows.join('\n')}\n<!-- status-index:end -->`;
const readme = join(dir, 'README.md');
const next = readFileSync(readme, 'utf8').replace(/<!-- status-index:start -->[\s\S]*<!-- status-index:end -->/, block);
writeFileSync(readme, next);
