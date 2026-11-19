// Package club holds the club rules (Go-only, bucket 2): pure functions with no database, HTTP, clock or randomness.
// They are ported from packages/data/src/club/club.rules.ts (names, the price line, the directory filter and search),
// packages/schema/src/{money,club-price}.ts (peso amounts and a club's license price) and the price check of
// packages/db/src/admin/clubs.ts (validatePricing). The Facebook post text of club.rules.ts is a Queue rule (it
// formats times in the browser's locale) and is not here.
//
// Amounts are whole centavos. A number from a JSON body is a JavaScript number, so a few checks take a float64.
package club
