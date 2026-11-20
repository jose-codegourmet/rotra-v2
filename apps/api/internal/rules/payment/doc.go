// Package payment holds Go-only (bucket 2) rules: pure functions with no database, HTTP, clock or randomness. It is the payment
// status and totals of the Payments checklist (packages/data/src/session-payment/sessionPayment.rules.ts, owner decision of
// November 7, 2026, #479). Money is integer centavos.
package payment
