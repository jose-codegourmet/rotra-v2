// Package writetest is the harness every ported write (POST, PATCH, DELETE) is tested with. It is imported by
// tests only, and it imports no route package: a test passes in the function that registers its routes.
//
// A write is pinned against the real TypeScript. The capture (apps/api/testdata/tools/capture-writes-base.mjs) runs
// the real Route Handler and the real @rotra/db service on a real Postgres and records, for every case, each
// response and the rows the write left behind. Replay runs the same cases against the Go routes on a real Postgres
// and compares answer for answer and row for row.
//
// # The files of a group of cases (for example testdata/flags.*)
//
//	flags.cases.json   the cases: written by hand (CaseFile below)
//	flags.golden.json  what the TypeScript did: captured, never written by hand (Golden below)
//	admin.seed.sql     the rows every case starts from; it also resets them (see Replay)
//
// # Adding a case
//
//  1. Add it to the cases file. A case is an ordered list of steps with no reseed between them, so a retry or a
//     stale revision after a first change is two steps of one case. A step with "parallel" sends its requests at the
//     same moment (a race): the answers are compared as a set, because their order is not decided.
//  2. Name what is generated and cannot match: "redact" on a step lists paths in the response body, and the
//     snapshot's "redact" lists columns. Never redact by the shape of a value. A path that is not there is an error,
//     so a stale redaction cannot hide a change.
//  3. Run the capture (the command is at the top of the capture file). It rewrites the golden file.
//  4. Run the Go test. It must fail, then pass when the route is right.
//  5. Where Go must answer differently from the TypeScript on purpose (for example the TypeScript crashes with a 500),
//     set "goExpects" on the step with the status and error code, add "allow500" if the capture must record the
//     crash, and write the reason in the plan's deviations log. The rows left behind are still compared.
//
// # Multi-step cases (the offline contract)
//
// A case is already an ordered list of steps on one state, so a retry, a replay in order or a batch followed by another is just
// more steps. Each step is pinned on its own (status, headers, body). Four optional fields of a step make the long cases usable:
//
//   - "now" moves the clock before the step (and before its pass is issued): a retry five minutes later shows which stamps move.
//   - "snapshot": true also reads the rows after that step and pins them in the golden step ("no second write" is the same rows
//     before and after the retry). The case's final rows are always pinned.
//   - "save" keeps values of the answer for later steps (name -> dotted path, a number segment is an array index) and "{{name}}"
//     in a later path, body or rawBody is replaced by it. Each side saves from its own answer, so a generated id needs no fixed
//     value; the capture and Replay read the answer before anything is redacted.
//   - "parallel" (above) races requests; the case file's "snapshotDiff": true pins only the rows that changed (see CaseFile), which
//     keeps the golden of a big seed readable.
//
// The app of a case file is admin, player or club (the Queue app: Env.ClubPass signs a club account in, Env.RelinkClubs links the
// seed's club accounts to Go sign-in identities). A Player file signs the players of its seed in (Env.RelinkPlayers makes a Go
// sign-in identity for each account that has none, and Replay signs a step's "who", the account's auth subject, in with
// Env.PlayerPass); an Admin file keeps its player accounts as the seed made them.
//
// What the snapshot holds: the SQL of each snapshot spec runs on both sides with the time zone set to UTC, so write
// a unique ORDER BY and cast a bigint to text (a JSON number loses the digits above 2^53). The usual specs are the
// tables the write touches, the audit events and the player notifications; a write that must not touch a table
// is pinned by that table's rows not changing.
package writetest
