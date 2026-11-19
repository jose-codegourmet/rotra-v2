// Captures how Node orders names with new Intl.Collator('en-PH', { sensitivity: 'base' }), the tie-break of the period
// leaderboards, so the Go ordering can be pinned against it. Names that compare equal under this collator (case and
// accents ignored) share a class; the Go test compares every pair of inputs by class. Plain Node, no database.
// Run: source ~/.nvm/nvm.sh && nvm use && node apps/api/testdata/tools/capture-collation-base.mjs
// Output: apps/api/internal/publicreads/testdata/collation-base.golden.json (commit it).
import { writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const out = resolve(dirname(fileURLToPath(import.meta.url)), '../../internal/publicreads/testdata/collation-base.golden.json')
const names = [
  'Alice Reyes', 'alice reyes', 'Ace', 'ace', 'ACE', 'Alice', 'ALICE', 'alice', 'Álvaro', 'Alvaro', 'alvaro', 'Zoë', 'Zoe', 'zoe', 'zoë', 'Zoe Tan', 'zoë tan', 'Zoë Lim',
  'zed', 'Ünï Çödé', 'unicode', 'Jon', 'jon', 'Éa', 'Eb', 'ea', 'Ñandú', 'Nandu', 'Nzo', 'Ñ', 'N', '😀 Smile', 'Smile', 'Ø', 'O', 'Ö', 'o', 'P', 'ß', 'ss', 'S', 'Å', 'A', 'Z', 'ä',
  '1', '10', '2', '_', '-', '.', '"', '*', ' ', '日本', '中', 'あ', 'ア', 'Ж', 'Б', 'Ω', 'α', 'Ａ', 'ǅ', 'Ǆ', 'ŉ', 'İ', 'I', 'i', 'ı', 'é', 'e', 'E', 'É', 'Ē', 'ő', 'Æ', 'AE', 'ae', 'œ', 'OE',
  'Þ', 'Th', 'th', 'ð', 'D', 'd', 'Ł', 'L', 'l', 'Ĺ', 'ĺ', 'élan Vital', 'Jon Doe', 'Jane Doe', 'Joe Dee', 'John D', 'jon doe', 'Gina Default', 'Advanced Ada', 'Zed Zulu', '日本 太郎',
  'a lower', 'Bea', 'bea', 'Carlo', 'Cárlo', 'carlo', 'Dina', 'Édna', 'Edna', 'Eve', 'Évé', 'Eve Alcala', 'Frank', 'Hal', 'Hal Ng', 'Ng', 'Oz', 'Qi', 'Una Club-Name', 'Una Real', 'Uni', 'UR', 'Uri One',
  'Filler 01', 'Filler 02', 'Filler 10', 'filler 1', 'a-b', 'a_b', 'a.b', 'a b', 'ab', 'a*b', "O'Neil", 'Oneil', 'Dela Cruz', 'de la Cruz', 'De La Cruz', 'DELA CRUZ', 'Mc Donald', 'McDonald', 'Mac',
  'Ana', 'ana', 'ANA', 'Anna', 'Anne', 'Sofía', 'Sofia', 'sofia', 'Søren', 'Soren', 'Łukasz', 'Lukasz', 'Ångström', 'Angstrom', 'Çelik', 'Celik', 'Đ', 'Ð', 'Ħ', 'H', 'ĳ', 'ij', 'IJ',
]
const collator = new Intl.Collator('en-PH', { sensitivity: 'base' })
const inputs = [...new Set(names)]
const sorted = [...inputs].sort(collator.compare)
const classes = []
let cls = 0
sorted.forEach((n, i) => {
  if (i > 0 && collator.compare(sorted[i - 1], n) !== 0) cls++
  classes.push(cls)
})
const classOf = Object.fromEntries(sorted.map((n, i) => [n, classes[i]]))
// every pair must agree with the classes, or the collator is not a preorder on this corpus
for (const a of inputs) for (const b of inputs) {
  const want = Math.sign(classOf[a] - classOf[b])
  if (Math.sign(collator.compare(a, b)) !== want) throw new Error(`not a preorder: ${a} ${b}`)
}
writeFileSync(out, `${JSON.stringify({ inputs, classOf }, null, 1)}\n`)
console.log(inputs.length, 'names,', cls + 1, 'classes written to', out)
