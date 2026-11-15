//go:build js && wasm

package main

import "syscall/js"

// export wraps a string-in, string-out function as a JavaScript function. A call without a string
// argument gets an error reply instead of a panic.
func export(f func(string) string) js.Func {
	return js.FuncOf(func(this js.Value, args []js.Value) any {
		if len(args) < 1 || args[0].Type() != js.TypeString {
			return fail("expected one JSON string argument")
		}
		return f(args[0].String())
	})
}

func main() {
	api := js.Global().Get("Object").New()
	api.Set("call", export(Call))
	api.Set("autoFillPlacements", export(AutoFillPlacements))
	api.Set("versions", js.FuncOf(func(js.Value, []js.Value) any { return versions() }))
	js.Global().Set("rotraRules", api)
	select {} // stay alive: the exports are callbacks into this program
}
