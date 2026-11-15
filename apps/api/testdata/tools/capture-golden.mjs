// Captures what the Next.js Route Handlers put on the wire, from the real TypeScript sources:
// packages/db/src/service/{errors,serialize,handler}.ts. Both service files are pure apart from
// `import 'server-only'`, which only works inside Next.js, so that one line is stripped in a temp copy.
// Run: source ~/.nvm/nvm.sh && nvm use && node apps/api/testdata/tools/capture-golden.mjs
// Output: apps/api/internal/http/testdata/{errors,serialize}.golden.json (commit them).
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
const root = resolve(here, '../../../..')
const service = join(root, 'packages/db/src/service')
const out = resolve(here, '../../internal/http/testdata')

const tmp = mkdtempSync(join(tmpdir(), 'rotra-golden-'))
try {
  for (const name of ['errors', 'serialize']) {
    const src = readFileSync(join(service, `${name}.ts`), 'utf8').replace(/^import 'server-only'\n/m, '')
    writeFileSync(join(tmp, `${name}.ts`), src)
  }
  const errors = await import(pathToFileURL(join(tmp, 'errors.ts')).href)
  const ser = await import(pathToFileURL(join(tmp, 'serialize.ts')).href)

  // handler.ts: the same private headers, and the 500 body, are copied below from the source text so a
  // change to either makes this script (and the Go test) show a diff.
  const handler = readFileSync(join(service, 'handler.ts'), 'utf8')
  const grab = (re) => {
    const m = handler.match(re)
    if (!m) throw new Error(`handler.ts no longer matches ${re}`)
    return m[1]
  }
  const privateBlock = grab(/const PRIVATE_HEADERS = \{([^}]*)\}/)
  const publicBlock = grab(/const PUBLIC_HEADERS = \{([^}]*)\}/)
  const headers = (block) => Object.fromEntries([...block.matchAll(/'?([A-Za-z-]+)'?:\s*'([^']*)'/g)].map((m) => [m[1], m[2]]))
  const internal = grab(/respond\(500, (\{ error: \{[^}]*\} \}),/)

  const fields = { email: 'Enter a valid email.', name: 'Name is required.' }
  const errorCases = {}
  for (const [code, def] of Object.entries(errors.SERVICE_ERRORS)) {
    errorCases[code] = {
      status: def.status,
      body: errors.errorBody(new errors.ServiceError(code)),
      bodyWithFields: errors.errorBody(new errors.ServiceError(code, fields)),
    }
  }
  const errorsGolden = {
    private_headers: headers(privateBlock),
    public_headers: headers(publicBlock),
    internal: { status: 500, body: JSON.parse(JSON.stringify(eval(`(${internal})`))) },
    fields,
    codes: errorCases,
  }

  // Serialization: the exact input is described by Go as typed values; here the TS equivalents.
  const input = {
    id: 'club_1',
    revision: 9007199254740993n,
    sequence: 0n,
    negative: -42n,
    createdAt: new Date('2026-03-04T05:06:07.089Z'),
    wholeSecond: new Date('2026-03-04T05:06:07.000Z'),
    endedAt: null,
    omitted: undefined,
    sessionDate: ser.toDateOnly(new Date('2026-03-04T23:59:59.999Z')),
    fee: ser.toMoney(15000, 'PHP'),
    noFee: ser.toMoney(null, 'PHP'),
    zeroFee: ser.toMoney(0, 'PHP'),
    flag: false,
    count: 3,
    tags: ['a', null, 'b'],
    nested: { at: new Date('2026-12-31T16:00:00.000Z'), big: 123n, none: null },
  }
  const serializeGolden = {
    helpers: {
      toIso: ser.toIso(new Date('2026-03-04T05:06:07.089Z')),
      toIsoWholeSecond: ser.toIso(new Date('2026-03-04T05:06:07.000Z')),
      toIsoOrNullNull: ser.toIsoOrNull(null),
      toDecimalString: ser.toDecimalString(9007199254740993n),
      toDateOnly: ser.toDateOnly(new Date('2026-03-04T23:59:59.999Z')),
      toMoney: ser.toMoney(15000, 'PHP'),
      toMoneyNull: ser.toMoney(null, 'PHP'),
      toMoneyZero: ser.toMoney(0, 'PHP'),
    },
    // The bigint input is written here as a decimal string only to document it; Go builds the same
    // document with typed values (BigInt, Instant, DateOnly, nil pointers).
    document: ser.toJson(input),
  }

  writeFileSync(join(out, 'errors.golden.json'), `${JSON.stringify(errorsGolden, null, 2)}\n`)
  writeFileSync(join(out, 'serialize.golden.json'), `${JSON.stringify(serializeGolden, null, 2)}\n`)
  console.log('golden files written to', out)
} finally {
  rmSync(tmp, { recursive: true, force: true })
}
