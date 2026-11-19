// Package rankingsettings holds the ranking settings rules (Go-only, bucket 2): pure functions with no database,
// HTTP, clock or randomness. They are ported from packages/data/src/ranking-settings/rankingSettings.rules.ts (basis
// points, the stored-settings check, versions) and packages/schema/src/ranking-settings.ts (the form's check of the
// typed draft). No stored rank is recalculated here: these rules only describe and append versions.
//
// Numbers that arrive in a JSON body are JavaScript numbers, so the draft carries float64 values, and NaN stands for
// a value that was not a number (the `int()` of the service helpers).
package rankingsettings
