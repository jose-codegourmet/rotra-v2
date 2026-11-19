// Package license holds the license rules (Go-only, bucket 2): pure functions with no database, HTTP, clock or
// randomness. They are ported from packages/data/src/license/license.rules.ts (calendar dates, a club's access and
// retention from its terms, the Activate / Renew license effects and record line) and from the period arithmetic of
// packages/db/src/admin/licenses.ts activateLicense (the term end, the payment reference, the paid-on date).
//
// Two ways of adding months live side by side, as they do in the TypeScript, and are not reconciled here: AddMonths
// (license.rules.ts, on calendar dates) clamps to the end of a shorter month, so Jan 31 plus one month is Feb 28; the
// service's AddMonthsOverflow (licenses.ts addMonths, on an instant) is setUTCMonth, which overflows, so Jan 31 plus
// one month is Mar 3. The stored terms use the second.
package license
