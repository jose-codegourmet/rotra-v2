// Captures what JavaScript's `value > 0` answers for JSON values: the filter of normalizeSessionCost keeps a shuttle plan line only when
// `line.tubes > 0`, and the tubes can be any JSON value (the estimate of a request is not checked field by field). Writes
// apps/api/internal/queuewrites/testdata/jsnumber.golden.json, which money_cost_internal_test.go replays against jsToNumber.
//   source ~/.nvm/nvm.sh && nvm use && node apps/api/testdata/tools/capture-jsnumber.mjs
import { writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
const values = [
  null, true, false, 0, 1, -1, 0.5, 3, 1e300, -1e300, '', ' ', '\n', '0', '3', ' 3 ', '\t4\n', '-3', '+3', '.5', '5.', '1e3', '1E3', '1e', 'e1', '1.2.3', '--5', '1 2', '1,5',
  '0x10', '0X1f', '0b11', '0B2', '0o17', '0xg', '0x', '-0x10', '1_000', '0x1_0', 'Infinity', '+Infinity', '-Infinity', 'infinity', 'inf', 'NaN', 'nan', 'abc', 'true', 'null',
  '٣', '３', '1n', [], [3], [0], ['3'], [' 3 '], [null], [[3]], [[]], [1, 2], [true], [false], [undefined ?? null, 3], ['abc'], [{}], {}, { tubes: 3 },
]
const grid = values.map((value) => ({ value, gtZero: value > 0 }))
writeFileSync(resolve(here, '../../internal/queuewrites/testdata/jsnumber.golden.json'), `${JSON.stringify(grid, null, 1)}\n`)
console.log(grid.length, 'values')
