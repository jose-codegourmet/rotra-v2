// Prints the rules versions a built .wasm carries (JSON array). Used by build.mjs only.
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import vm from 'node:vm'

const dir = join(dirname(fileURLToPath(import.meta.url)), 'wasm')
vm.runInThisContext(readFileSync(join(dir, 'wasm_exec.js'), 'utf8'))
const go = new globalThis.Go()
const { instance } = await WebAssembly.instantiate(readFileSync(process.argv[2]), go.importObject)
go.run(instance)
console.log(globalThis.rotraRules.versions())
process.exit(0)
