# sqlc is a dev tool only: it is run by version, never added to go.mod.
SQLC_VERSION := v1.30.0

# tygo (TypeScript types from the rules wasm wire structs) is a dev tool only, pinned the same way.
TYGO_VERSION := v0.2.21

.PHONY: sqlc sqlc-check tygo tygo-check test wasm
sqlc:
	go run github.com/sqlc-dev/sqlc/cmd/sqlc@$(SQLC_VERSION) generate

# Fails when the committed generated code differs from a fresh run (CI runs this).
sqlc-check: sqlc
	git diff --exit-code -- internal/db/sqlcgen
	test -z "$$(git ls-files --others --exclude-standard internal/db/sqlcgen)"

# Regenerates packages/rules-wasm/src/generated from internal/rules/model and cmd/ruleswasm (tygo.yaml).
tygo:
	go run github.com/gzuidhof/tygo@$(TYGO_VERSION) generate

# Fails when the committed generated types differ from a fresh run (CI runs this).
tygo-check: tygo
	git diff --exit-code -- ../../packages/rules-wasm/src/generated
	test -z "$$(git ls-files --others --exclude-standard ../../packages/rules-wasm/src/generated)"

test:
	go vet ./... && go test -race -cover ./...

# Rebuild the committed rules .wasm, wasm_exec.js, manifest and fingerprint in packages/rules-wasm.
# Run it after any change under internal/rules or cmd/ruleswasm; `make check` fails on a stale one.
wasm:
	node ../../packages/rules-wasm/build.mjs
