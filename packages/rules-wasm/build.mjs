// Builds apps/api/cmd/ruleswasm to wasm/rules.<hash>.wasm and records everything that goes with it:
// Go's wasm_exec.js (same Go version), rules-manifest.json and rules.fingerprint. Needs Go. Run
// `node build.mjs`, `pnpm --filter @rotra/rules-wasm build:wasm` or `make wasm` in apps/api.
// The build is deterministic (-trimpath, -buildvcs=false, no build id): the same sources and Go give the same hash.
import { execFileSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import {
  chmodSync,
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  renameSync,
  rmSync,
  writeFileSync,
} from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { computeFingerprint, REPO_ROOT } from './fingerprint.mjs'

const here = dirname(fileURLToPath(import.meta.url))
const out = join(here, 'wasm')
const api = join(REPO_ROOT, 'apps', 'api')
const sha = (bytes) => createHash('sha256').update(bytes).digest('hex')
const go = (args, opts = {}) =>
  execFileSync('go', args, { cwd: api, encoding: 'utf8', ...opts })
    .toString()
    .trim()

mkdirSync(out, { recursive: true })
const tmp = join(out, 'rules.tmp.wasm')
go(['build', '-trimpath', '-buildvcs=false', '-ldflags=-s -w', '-o', tmp, './cmd/ruleswasm'], {
  env: { ...process.env, GOOS: 'js', GOARCH: 'wasm', CGO_ENABLED: '0' },
})

const bytes = readFileSync(tmp)
const hash = sha(bytes).slice(0, 12)
const wasmName = `rules.${hash}.wasm`
for (const f of readdirSync(out)) if (/^rules\.[0-9a-f]{12}\.wasm$/.test(f)) rmSync(join(out, f))
renameSync(tmp, join(out, wasmName))
chmodSync(join(out, wasmName), 0o644)

const goVersion = go(['env', 'GOVERSION'])
const wasmExec = join(go(['env', 'GOROOT']), 'lib', 'wasm', 'wasm_exec.js')
if (!existsSync(wasmExec)) throw new Error(`wasm_exec.js not found at ${wasmExec}`)
// Go's toolchain files are read-only: write a plain copy.
writeFileSync(join(out, 'wasm_exec.js'), readFileSync(wasmExec), { mode: 0o644 })

// The live rules versions are read from the built file itself, so the manifest cannot lie.
const versions = JSON.parse(
  execFileSync(process.execPath, [join(here, 'read-versions.mjs'), join(out, wasmName)], {
    encoding: 'utf8',
  }),
)

const manifest = {
  wasm: wasmName,
  sha256: sha(bytes),
  bytes: bytes.length,
  versions,
  goVersion,
  wasmExec: { file: 'wasm_exec.js', sha256: sha(readFileSync(join(out, 'wasm_exec.js'))) },
}
writeFileSync(join(out, 'rules-manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`)
writeFileSync(join(out, 'rules.fingerprint'), `${computeFingerprint()}\n`)
console.log(`rules-wasm: ${wasmName} (${bytes.length} bytes, ${goVersion}, versions ${versions})`)
