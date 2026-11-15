//go:build !(js && wasm)

package main

import (
	"fmt"
	"os"
)

// The command only makes sense as WebAssembly; this stub lets `go build ./...`, `go vet` and `go test`
// compile the package on the host.
func main() {
	fmt.Fprintln(os.Stderr, "ruleswasm: build with GOOS=js GOARCH=wasm")
	os.Exit(2)
}
