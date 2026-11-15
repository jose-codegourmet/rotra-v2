// The fingerprint of the Go files the committed .wasm is built from (track rule-cases, G15).
// Pure Node, no Go: `scripts/check.mjs` (make check) recomputes it and fails when it differs from
// `wasm/rules.fingerprint`. Covered: every non-test .go file under apps/api/internal/rules/ (the rules,
// their model and the collation) and under apps/api/cmd/ruleswasm/ (the exports). Test files, the
// rulestest helpers and go.mod are not hashed; a toolchain change shows in `rules-manifest.json` instead.
import { createHash } from 'node:crypto'
import { readdirSync, readFileSync } from 'node:fs'
import { dirname, join, relative } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
export const REPO_ROOT = join(here, '..', '..')
export const FINGERPRINT_ROOTS = ['apps/api/internal/rules', 'apps/api/cmd/ruleswasm']

function goFiles(dir, out) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name)
    if (entry.isDirectory()) {
      if (entry.name !== 'rulestest' && entry.name !== 'testdata') goFiles(full, out)
    } else if (entry.name.endsWith('.go') && !entry.name.endsWith('_test.go')) {
      out.push(full)
    }
  }
  return out
}

/** Sorted list of the files that are hashed, as repo-relative POSIX paths. */
export function fingerprintFiles(repoRoot = REPO_ROOT) {
  return FINGERPRINT_ROOTS.flatMap((root) => goFiles(join(repoRoot, root), []))
    .map((file) => relative(repoRoot, file).split('\\').join('/'))
    .sort()
}

/** sha256 over `<path>\n<length>\n<bytes>` of each file, in path order. */
export function computeFingerprint(repoRoot = REPO_ROOT) {
  const hash = createHash('sha256')
  for (const path of fingerprintFiles(repoRoot)) {
    const bytes = readFileSync(join(repoRoot, path))
    hash.update(`${path}\n${bytes.length}\n`)
    hash.update(bytes)
  }
  return hash.digest('hex')
}
