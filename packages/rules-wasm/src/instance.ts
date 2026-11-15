import type { GoInstance } from './engine'

type GoRuntime = {
  importObject: WebAssembly.Imports
  exited: boolean
  run(instance: WebAssembly.Instance): Promise<void>
}
type RulesApi = {
  call(json: string): string
  autoFillPlacements(json: string): string
  versions(): string
}
const host = globalThis as unknown as { Go?: new () => GoRuntime; rotraRules?: RulesApi }

/**
 * Runs Go's `wasm_exec.js` runtime over a compiled module. `new WebAssembly.Instance` is synchronous,
 * and Go's `run` reaches `select {}` (which sets `rotraRules`) before its first await, so this is
 * synchronous too. The api object is taken right away: a later instance overwrites the global.
 */
export function startGo(module: WebAssembly.Module): GoInstance {
  const Go = host.Go
  if (!Go) throw new Error('wasm_exec.js is not loaded (no global Go)')
  const go = new Go()
  const instance = new WebAssembly.Instance(module, go.importObject)
  go.run(instance).catch(() => {})
  const api = host.rotraRules
  if (!api) throw new Error('the rules program did not register rotraRules')
  return {
    call: (json) => api.call(json),
    autoFillPlacements: (json) => api.autoFillPlacements(json),
    versions: () => api.versions(),
    simulateExit: () => {
      go.exited = true
    },
  }
}
