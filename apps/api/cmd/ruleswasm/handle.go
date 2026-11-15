// Command ruleswasm builds the bucket 1 queue rules to WebAssembly (GOOS=js GOARCH=wasm) and exports
// them to JavaScript as globalThis.rotraRules. Every export takes one JSON string and returns one JSON
// string, so no js.Value other than a string ever crosses the boundary:
//
//	rotraRules.call('{"version":1,"rule":"match/canPlace","now":1794564000000,"input":{...}}')
//	rotraRules.autoFillPlacements('{"version":1,"now":...,"input":{...}}')   // one batched court fill
//	rotraRules.versions()                                                       // "[1]"
//
// A reply is {"ok":true,"result":...} or {"ok":false,"error":"..."}. A panic inside a rule is recovered
// into the second form, so one bad call never stops the Go program (spec G10).
//
// This file is the testable core and has no build tag; main_js.go registers the exports.
package main

import (
	"encoding/json"
	"fmt"
	"sync"

	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/rules"
)

// ruleAutoFill is the rule the dedicated autoFillPlacements export always runs.
const ruleAutoFill = "courtfill/autoFillPlacements"

// Envelope is the request every call carries (the TypeScript type is generated from it by tygo).
type Envelope struct {
	Version int             `json:"version"`
	Rule    string          `json:"rule"`
	Now     *int64          `json:"now"`
	Input   json.RawMessage `json:"input"`
}

// Reply is the response: ok with a result, or not ok with an error. It is one flat struct here; the
// TypeScript wrapper narrows it to a union (packages/rules-wasm/src/types.ts).
type Reply struct {
	OK     bool            `json:"ok"`
	Result json.RawMessage `json:"result,omitempty"`
	Error  string          `json:"error,omitempty"`
}

// resolver returns the runners of a rules version.
type resolver func(version int) (map[string]rules.Runner, error)

// registryResolver resolves versions through rules.For. Input decoding is not strict: a field the Go
// structs do not know is ignored, so the wire stays forward compatible (the case tests are strict).
func registryResolver(version int) (map[string]rules.Runner, error) {
	rs, err := rules.For(version)
	if err != nil {
		return nil, err
	}
	return rs.Runners(false), nil
}

type handler struct {
	resolve resolver
	mu      sync.Mutex
	cache   map[int]map[string]rules.Runner
}

func newHandler(resolve resolver) *handler {
	return &handler{resolve: resolve, cache: map[int]map[string]rules.Runner{}}
}

func (h *handler) runners(version int) (map[string]rules.Runner, error) {
	h.mu.Lock()
	defer h.mu.Unlock()
	if r, ok := h.cache[version]; ok {
		return r, nil
	}
	r, err := h.resolve(version)
	if err != nil {
		return nil, err
	}
	h.cache[version] = r
	return r, nil
}

func fail(format string, args ...any) string {
	out, _ := json.Marshal(Reply{Error: fmt.Sprintf(format, args...)})
	return string(out)
}

// call runs one envelope. forceRule, when set, replaces the envelope's rule (the dedicated exports).
// A panic anywhere below becomes {"ok":false,"error":"panic: ..."}.
func (h *handler) call(raw, forceRule string) (out string) {
	defer func() {
		if r := recover(); r != nil {
			out = fail("panic: %v", r)
		}
	}()
	var env Envelope
	if err := json.Unmarshal([]byte(raw), &env); err != nil {
		return fail("bad request: %v", err)
	}
	if forceRule != "" {
		env.Rule = forceRule
	}
	runners, err := h.runners(env.Version)
	if err != nil {
		return fail("%v", err)
	}
	run, ok := runners[env.Rule]
	if !ok {
		return fail("unknown rule %q in rules version %d", env.Rule, env.Version)
	}
	if len(env.Input) == 0 {
		env.Input = json.RawMessage("null")
	}
	result, err := run(env.Input, env.Now)
	if err != nil {
		return fail("%v", err)
	}
	body, err := json.Marshal(result)
	if err != nil {
		return fail("result is not JSON: %v", err)
	}
	// Marshal the reply by hand so a null result stays {"ok":true,"result":null}.
	return `{"ok":true,"result":` + string(body) + `}`
}

// versions lists the live rules versions as a JSON array.
func versions() string {
	out, _ := json.Marshal(rules.Versions())
	return string(out)
}

var defaultHandler = newHandler(registryResolver)

// Call is the rotraRules.call export.
func Call(raw string) string { return defaultHandler.call(raw, "") }

// AutoFillPlacements is the rotraRules.autoFillPlacements export: the whole court fill in one call.
func AutoFillPlacements(raw string) string { return defaultHandler.call(raw, ruleAutoFill) }
