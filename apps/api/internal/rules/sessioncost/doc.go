// Package sessioncost holds Go-only (bucket 2) rules: pure functions with no database, HTTP, clock or randomness. It is the
// session cost estimate (packages/data/src/session-cost/sessionCost.rules.ts). Money is integer centavos; the court fee rounds to
// the nearest centavo and the break-even fee up to a whole peso.
package sessioncost
