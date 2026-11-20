// Package sessionresult holds Go-only (bucket 2) rules: pure functions with no database, HTTP, clock or randomness. It is the
// result snapshot Session done writes (packages/data/src/session-result/sessionResult.rules.ts): the session standings, the prototype
// reference awards (MVP, Most Improved, Off Day), the award baseline from earlier sessions and the snapshot that joins them.
//
// The awards are a prototype reference formula, not an approved ranking algorithm (open decision "Final rank/pairing/award formulas"),
// and a stored snapshot is a permanent result. Port a change to the formula only from the TypeScript, with its cases.
//
// Two things JavaScript decides that Go would not: the order of a stable sort (ties keep their input order, so the first of equal
// scores wins) and Math.pow (see [pow10]). The formula has no product that is added to something (only sums, one division and the
// power), so no platform can fuse a multiply-add and a score is the same on every machine. Keep it so: write an explicit float64
// conversion around a product if one is ever added.
package sessionresult
