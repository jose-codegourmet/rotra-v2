package model

// Context is what the match guards read: the roster, the matches, the courts and the clock (epoch ms).
type Context struct {
	Roster  []Player
	Matches []Match
	Courts  []Court
	Now     int64
}
