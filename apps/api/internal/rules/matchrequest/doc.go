// Package matchrequest holds Go-only (bucket 2) rules: pure functions with no database, HTTP, clock or randomness. It is the
// match request rules of packages/data/src/match-request/matchRequest.rules.ts that the Queue's writes decide with: the lineup
// Add to queue builds, the spots a format needs and the formats a session allows. No Vitest case pins them, so the Go tests
// replay a grid captured from the real TypeScript (testdata/tools/capture-matchrequest-lineup.test.mjs).
package matchrequest
