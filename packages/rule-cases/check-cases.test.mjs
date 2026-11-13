// Checks that every case file under cases/ has the shape described by case.schema.json.
// Plain node:test, no dependencies: the shape is small, and a Vitest or Ajv dependency would
// change pnpm-lock.yaml, which the backend CI scope job rejects.
import assert from 'node:assert/strict'
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join, relative, sep } from 'node:path'
import { test } from 'node:test'
import { fileURLToPath } from 'node:url'

const root = fileURLToPath(new URL('.', import.meta.url))
const casesDir = join(root, 'cases')
const schema = JSON.parse(readFileSync(join(root, 'case.schema.json'), 'utf8'))

function walk(dir) {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name)
    return statSync(path).isDirectory() ? walk(path) : [path]
  })
}

const files = walk(casesDir)
const keys = (object) => Object.keys(object).sort()
const own = (object, allowed) => keys(object).every((key) => allowed.includes(key))

test('there are case files, and only JSON', () => {
  assert.ok(files.length > 0)
  for (const file of files) assert.ok(file.endsWith('.json'), file)
})

for (const file of files) {
  const name = relative(casesDir, file).split(sep).join('/')
  test(`${name} matches case.schema.json`, () => {
    const data = JSON.parse(readFileSync(file, 'utf8'))
    assert.ok(own(data, Object.keys(schema.properties)), 'unknown top-level key')
    for (const key of schema.required) assert.ok(key in data, `missing ${key}`)
    assert.match(data.rule, new RegExp(schema.properties.rule.pattern))
    assert.equal(data.rule, name.replace(/\.json$/, ''), 'rule must equal the file path')
    assert.ok(Number.isInteger(data.version) && data.version >= 1, 'version')
    assert.ok(Array.isArray(data.cases) && data.cases.length >= 1, 'cases')
    const names = new Set()
    for (const item of data.cases) {
      assert.ok(own(item, ['name', 'input', 'expected']), 'unknown case key')
      assert.ok(typeof item.name === 'string' && item.name.length > 0, 'case name')
      assert.ok(!names.has(item.name), `duplicate case name: ${item.name}`)
      names.add(item.name)
      assert.ok('expected' in item, `${item.name}: expected`)
      assert.ok(item.input && typeof item.input === 'object' && !Array.isArray(item.input), 'input')
      assert.ok(own(item.input, ['args', 'select']), `${item.name}: unknown input key`)
      assert.ok(Array.isArray(item.input.args), `${item.name}: input.args`)
      if ('select' in item.input) {
        assert.ok(typeof item.input.select === 'string' && item.input.select.length > 0, 'select')
      }
    }
  })
}
