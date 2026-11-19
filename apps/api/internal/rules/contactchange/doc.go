// Package contactchange holds Go-only (bucket 2) rules of the contact-change requests: pure functions with no database,
// HTTP, clock or randomness. They are ported from packages/data/src/contact-change-request/contactChangeRequest.rules.ts and
// packages/db/src/player/contact-change.ts: how a contact is compared, the four checks the Admin review shows while a
// request waits, and the words and shapes the routes validate a new contact with.
//
// The rest of that Vitest file (the next action label, the status counts, the filters, which requests can be blocked) are
// rules of the Admin screen's client; no route runs them, so they are not ported.
package contactchange
