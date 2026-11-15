// Package match holds the shared (bucket 1) rules about a match. Pure functions: no database, no
// HTTP, no clock; the caller passes the data and `now`.
package match

// Format is a match format, as the TypeScript MatchFormat.
type Format string

// CourtsNeeded is how many courts a match holds: two for a 5v5 fun match, one for every other format.
func CourtsNeeded(format Format) int {
	if format == "fun_5v5" {
		return 2
	}
	return 1
}
