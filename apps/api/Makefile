# sqlc is a dev tool only: it is run by version, never added to go.mod.
SQLC_VERSION := v1.30.0

.PHONY: sqlc sqlc-check test wasm
sqlc:
	go run github.com/sqlc-dev/sqlc/cmd/sqlc@$(SQLC_VERSION) generate

# Fails when the committed generated code differs from a fresh run (CI runs this).
sqlc-check: sqlc
	git diff --exit-code -- internal/db/sqlcgen
	test -z "$$(git ls-files --others --exclude-standard internal/db/sqlcgen)"

test:
	go vet ./... && go test -race -cover ./...

# Rebuild the committed rules .wasm, wasm_exec.js, manifest and fingerprint in packages/rules-wasm.
# Run it after any change under internal/rules or cmd/ruleswasm; `make check` fails on a stale one.
wasm:
	node ../../packages/rules-wasm/build.mjs
