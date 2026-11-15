import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import vm from 'node:vm'
import { isRulesLoaded, RulesEngine, setEngine } from './engine'
import { startGo } from './instance'
import type { RulesManifest } from './types'

const wasmDir = join(dirname(fileURLToPath(import.meta.url)), '..', 'wasm')

let loading: Promise<RulesEngine> | null = null

/**
 * Node loader (server and Vitest): reads the committed manifest, `wasm_exec.js` and `.wasm` from disk,
 * once. After `await loadRules()` every rule in `@rotra/rules-wasm/rules` is synchronous.
 * `dir` is for tests that load a different build.
 */
export function loadRules(dir: string = wasmDir): Promise<RulesEngine> {
  if (loading && dir === wasmDir) return loading
  const run = Promise.resolve().then(() => {
    const manifest = JSON.parse(
      readFileSync(join(dir, 'rules-manifest.json'), 'utf8'),
    ) as RulesManifest
    if (!(globalThis as { Go?: unknown }).Go) {
      vm.runInThisContext(readFileSync(join(dir, manifest.wasmExec.file), 'utf8'))
    }
    const module = new WebAssembly.Module(readFileSync(join(dir, manifest.wasm)))
    const engine = new RulesEngine(() => startGo(module))
    setEngine(engine)
    return engine
  })
  if (dir === wasmDir) loading = run
  return run
}

export const rulesLoaded = isRulesLoaded
