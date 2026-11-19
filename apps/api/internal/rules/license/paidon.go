package license

import (
	"regexp"
	"strconv"
	"time"
)

var paidOnText = regexp.MustCompile(`^(?:(\d{4})|\+(\d{6}))-(\d{2})-(\d{2})$`)

// ParsePaidOn reads the date a club paid the way `new Date(`${paidOn}T00:00:00Z`)` does for the text a form sends,
// and stores it as a calendar date (Prisma's @db.Date). It accepts YYYY-MM-DD, or +YYYYYY-MM-DD with the year in six
// digits, with a year from 1 to 9999, a month from 01 to 12 and a day from 01 to 31. A day past the end of a short
// month rolls over, as the JavaScript date does ("2026-02-30" is 2026-03-02).
//
// Anything else is refused (ok false). In the TypeScript most of that is a crash (an Invalid Date, or a year Postgres
// refuses), so Go answers `invalid` instead (a logged deviation); a few odd texts the legacy JavaScript date parser
// reads ("2026-11-19" followed by a NUL character) are refused here too.
func ParsePaidOn(text string) (time.Time, bool) {
	m := paidOnText.FindStringSubmatch(text)
	if m == nil {
		return time.Time{}, false
	}
	year := m[1]
	if year == "" {
		year = m[2]
	}
	y, _ := strconv.Atoi(year)
	month, _ := strconv.Atoi(m[3])
	day, _ := strconv.Atoi(m[4])
	if y < 1 || y > 9999 || month < 1 || month > 12 || day < 1 || day > 31 {
		return time.Time{}, false
	}
	return time.Date(y, time.Month(month), day, 0, 0, 0, 0, time.UTC), true
}
