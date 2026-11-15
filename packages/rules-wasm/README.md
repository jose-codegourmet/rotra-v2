# @rotra/rules-wasm

The bucket 1 queue rules, built from Go (`apps/api/cmd/ruleswasm`) to WebAssembly, plus a typed
synchronous wrapper with today's rule names. Track `rule-cases`, tasks 5.2 to 5.7. **Nothing imports
this yet**: the swap in `apps/` and `packages/data` is phase 6 on `go-stack`.

```text
wasm/                          generated, committed, never edited by hand
  rules.<hash>.wasm            content-hashed name: serve it `immutable`
  wasm_exec.js                 Go's loader, copied from the same Go version that built the .wasm
  rules-manifest.json          what is published next to the .wasm (below)
  rules.fingerprint            sha256 of the Go rule files the .wasm was built from
src/rules.ts                   typed rules, synchronous after load (import `@rotra/rules-wasm/rules`)
src/node.ts                    `loadRules()`: reads from disk (server, Vitest)
src/browser.ts                 `loadRulesInBrowser({ baseUrl })`: fetch, `compileStreaming`
src/engine.ts                  restart on crash, `setRulesVersion(n)`
src/types.ts                   hand-written wire types (TODO 5.5: generate with `tygo`, B-23)
build.mjs  fingerprint.mjs     the build and the fingerprint (Node only; the build also needs Go)
check-fresh.sh                 Backend CI: a fresh build must equal the committed `wasm/`
```

## Rebuild

`make wasm` in `apps/api` (or `node packages/rules-wasm/build.mjs`), then commit `wasm/`. The build
is deterministic (`-trimpath`, stripped): the same Go files and Go version give the same hash. The Go
version is in the manifest; use the one in `apps/api/go.mod`.

## `rules-manifest.json`

Published next to the `.wasm` by every app deploy (G14); the Go API reads it to stamp the highest rules
version both sides carry.

```json
{ "wasm": "rules.<hash>.wasm", "sha256": "…", "bytes": 0, "versions": [1],
  "goVersion": "go1.26.11", "wasmExec": { "file": "wasm_exec.js", "sha256": "…" } }
```

## Use

```ts
import { loadRules } from '@rotra/rules-wasm/node' // browser: loadRulesInBrowser from /browser
import { setRulesVersion } from '@rotra/rules-wasm/engine'
import { canPlace, autoFillPlacements } from '@rotra/rules-wasm/rules'

await loadRules() // once; every rule is synchronous after this
setRulesVersion(session.rulesVersion)
```

If the Go program stops, or a call comes back as a panic, the wrapper starts a fresh instance and retries
the call once. Other rule errors throw `RulesError`. Differences from the TypeScript originals (JSON
boundary): `putOnCourt` returns the placed copy, `FORMAT_TEAM_SIZES` is `formatTeamSizes()`, and `now`
defaults to `Date.now()` in the wrapper.

## Checks

`make check` recomputes the fingerprint in Node (no Go) and runs `test/rulesWasm.test.ts`, which runs every
case in `@rotra/rule-cases` through the wrapper.
