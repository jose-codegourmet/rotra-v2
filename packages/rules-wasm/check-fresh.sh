#!/bin/sh
# Backend CI: the committed wasm/ must equal a fresh build of apps/api (a Go rule change with a stale
# .wasm cannot merge). Needs Go and Node. The fingerprint alone is checked by `make check` without Go.
set -eu
cd "$(dirname "$0")"
node build.mjs
git diff --exit-code -- wasm
test -z "$(git ls-files --others --exclude-standard wasm)"
