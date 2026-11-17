// Captures how Node orders strings with a.localeCompare(b) (the club page sorts members by their masked name that way),
// so the Go ordering can be pinned against it. Plain Node, no database.
// Run: source ~/.nvm/nvm.sh && nvm use && node apps/api/testdata/tools/capture-collation.mjs
// Output: apps/api/internal/publicreads/testdata/collation.golden.json (commit it).
import { writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const out = resolve(dirname(fileURLToPath(import.meta.url)), '../../internal/publicreads/testdata/collation.golden.json')
const masks = [
  'Alice Reyes', 'alice reyes', 'Alice', 'ALICE', 'alice', 'Álvaro', 'Alvaro', 'Zoë', 'Zoe', 'zed', 'Ünï Çödé', 'Jon', 'jon', 'Éa', 'Eb', 'ea',
  'Ñandú', 'Nzo', '😀 Smile', 'Smile', 'Ø', 'O', 'Ö', 'P', 'ß', 'ss', 'S', 'Å', 'Z', 'ä', '1', '10', '2', '_', '-', '.', '"', '日本', '中', 'あ', 'ア',
  'Ж', 'Б', 'Ω', 'α', 'Ａ', 'ǅ', 'Ǆ', 'ŉ', 'İ', 'I', 'i', 'ı', 'é', 'e', 'E', 'É', 'Ē', 'ő', 'Æ', 'AE', 'ae', 'œ', 'OE', 'Þ', 'Th', 'ð', 'D', 'Ł', 'L', 'Ĺ', 'ĺ',
  'élan Vital', 'Jon Doe', 'Jane Doe', 'Joe Dee', 'John D', 'jon doe', 'Gina Default', 'Advanced Ada', 'Zed Zulu', '日本 太郎', 'a lower',
]
const names = new Set()
// what maskPublicName makes of them: each word keeps its first character, then ***
const mask = (n) => n.trim().split(/\s+/).filter(Boolean).map((w) => `${Array.from(w)[0]}***`).join(' ') || 'Player'
for (const n of masks) { names.add(mask(n)); names.add(n) }
for (const a of ['Ana', 'ana', 'ANA', 'Bea', 'Carlo', 'Cárlo', 'Dina', 'Édna', 'Eve', 'Évé', 'Frank', 'Hal', 'Ng', 'Ñ', 'Oz', 'Qi', 'Zed'])
  for (const b of ['', ' R', ' r', ' Dela Cruz', ' de la Cruz', '-Smith', "'Neil", ' 2', ' 10']) { names.add(mask(a + b)); names.add(a + b) }
names.add(' ***'); names.add('***'); names.add('a b'); names.add('ab'); names.add('a-b'); names.add('a_b'); names.add('a.b'); names.add('a*b'); names.add('Player')
const inputs = [...names]
const sorted = [...inputs].sort((a, b) => a.localeCompare(b))
writeFileSync(out, `${JSON.stringify({ inputs, sorted }, null, 1)}\n`)
console.log(inputs.length, 'names written to', out)
