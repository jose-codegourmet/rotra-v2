// Package liveupdates is the Go side of live updates (track live-updates; B-25, B-26, B-34, B-43, B-44, B-48, B-49, B-50).
//
// It has two halves that meet in the table live_update_events:
//
//	the write side   Append, Note and Flush add one "this changed" row inside the write's own transaction (the
//	                 transactional outbox, B-26). writes.InTx flushes what the running route noted just before it commits.
//	the read side    Publisher reads new rows in transaction order (B-48) and hands them to Hub, an in-memory fan-out with
//	                 topics per session, club, player and admin. Service turns a ticket's grant into a subscription for the
//	                 SSE stream route of the httpapi package, with the Last-Event-ID catch-up.
//
// The rows hold no names, scores or results, only which club, session and registered players a write touched and a kind.
// A screen re-reads what changed through the normal, authorized read routes.
package liveupdates
