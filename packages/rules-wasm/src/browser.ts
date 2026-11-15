import { RulesEngine, setEngine } from './engine'
import { startGo } from './instance'
import type { RulesManifest } from './types'

export type BrowserLoadOptions = {
  /** Where `rules-manifest.json`, `wasm_exec.js` and the `.wasm` are served. Default `/rules/`. */
  baseUrl?: string
  /** The hashed `.wasm` name, when the app build knows it. Otherwise the manifest says. */
  wasmFile?: string
}

let loading: Promise<RulesEngine> | null = null

const withSlash = (url: string) => (url.endsWith('/') ? url : `${url}/`)

function loadScript(src: string) {
  return new Promise<void>((resolve, reject) => {
    const el = document.createElement('script')
    el.src = src
    el.onload = () => resolve()
    el.onerror = () => reject(new Error(`could not load ${src}`))
    document.head.appendChild(el)
  })
}

/** The manifest of the live build; always revalidated, it is the one file that is not content-hashed. */
export async function fetchRulesManifest(baseUrl = '/rules/'): Promise<RulesManifest> {
  const res = await fetch(`${withSlash(baseUrl)}rules-manifest.json`, { cache: 'no-cache' })
  if (!res.ok) throw new Error(`rules-manifest.json: ${res.status}`)
  return (await res.json()) as RulesManifest
}

/**
 * Browser loader: the `.wasm` is requested by its hashed name, so it can be served `immutable`.
 * After `await loadRulesInBrowser()` every rule is synchronous. Loaded once; later calls share it.
 */
export function loadRulesInBrowser(options: BrowserLoadOptions = {}): Promise<RulesEngine> {
  if (loading) return loading
  const base = withSlash(options.baseUrl ?? '/rules/')
  loading = (async () => {
    const manifest = options.wasmFile ? null : await fetchRulesManifest(base)
    const wasmFile = options.wasmFile ?? (manifest as RulesManifest).wasm
    if (!(globalThis as { Go?: unknown }).Go) await loadScript(`${base}wasm_exec.js`)
    const res = await fetch(`${base}${wasmFile}`)
    if (!res.ok) throw new Error(`${wasmFile}: ${res.status}`)
    const module = await WebAssembly.compileStreaming(res)
    const engine = new RulesEngine(() => startGo(module))
    setEngine(engine)
    return engine
  })().catch((error) => {
    loading = null
    throw error
  })
  return loading
}
