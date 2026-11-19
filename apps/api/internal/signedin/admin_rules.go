package signedin

import (
	"fmt"
	"math"
	"strings"
	"time"
)

// The pure text rules the Admin record of actions needs, ported from @rotra/schema/{money,club-price} and
// @rotra/data/{club,license}/*.rules.ts. (The Go rule packages for these are still empty stubs, and this track does
// not change them, so the few functions live here.)

// formatPeso is formatPeso: whole amounts as '₱1,500', two decimals otherwise ('₱1,500.50'). The amount is whole
// centavos, as every stored price and payment is.
func formatPeso(minor int64) string {
	pesos := minor / 100 // truncates toward zero, like Math.trunc
	cents := minor % 100
	if cents < 0 {
		cents = -cents
	}
	whole := groupThousands(pesos)
	if cents != 0 {
		return fmt.Sprintf("₱%s.%02d", whole, cents)
	}
	return "₱" + whole
}

// groupThousands is Number.toLocaleString('en-PH') for a whole number: commas between groups of three.
func groupThousands(n int64) string {
	neg := n < 0
	if neg {
		n = -n
	}
	s := fmt.Sprintf("%d", n)
	var b strings.Builder
	for i, c := range s {
		if i > 0 && (len(s)-i)%3 == 0 {
			b.WriteByte(',')
		}
		b.WriteRune(c)
	}
	if neg {
		return "-" + b.String()
	}
	return b.String()
}

// yearlySavingPercent is savePct(): the whole-percent saving of the yearly price over twelve months. It is a float
// because a monthly price of 0 makes it infinite or NaN, neither of which is above 0.
func yearlySavingPercent(monthly, yearly int64) float64 {
	return math.Floor((1-float64(yearly)/(float64(monthly)*12))*100 + 0.5)
}

// priceLine is formatClubPriceLine: "₱1,500 a month · ₱15,000 a year (17% off)", or "Free (tester club)".
func priceLine(free bool, monthly, yearly int64) string {
	if free {
		return "Free (tester club)"
	}
	line := formatPeso(monthly) + " a month · " + formatPeso(yearly) + " a year"
	if saving := yearlySavingPercent(monthly, yearly); saving > 0 && !math.IsInf(saving, 0) {
		line += fmt.Sprintf(" (%d%% off)", int64(saving))
	}
	return line
}

// formatAmount is a recorded license amount: 0 is a free club's term.
func formatAmount(minor int64) string {
	if minor == 0 {
		return "Free"
	}
	return formatPeso(minor)
}

// shortDate is 'Oct 3, 2026' (en-US, UTC); shortDay is 'Oct 3'.
func shortDate(t time.Time) string { return t.UTC().Format("Jan 2, 2006") }
func shortDay(t time.Time) string  { return t.UTC().Format("Jan 2") }

// termRange is 'Oct 3 – Nov 2, 2026', or both years when they differ: the record's term ranges. The days are
// Manila calendar days written as dates, so they are read as UTC dates.
func termRange(from, to time.Time) string {
	if from.Year() == to.Year() {
		return shortDay(from) + " – " + shortDate(to)
	}
	return shortDate(from) + " – " + shortDate(to)
}

// calendarDay turns the Manila day of an instant into the date a license rule reads.
func calendarDay(t time.Time) time.Time {
	d := t.In(manila)
	return time.Date(d.Year(), d.Month(), d.Day(), 0, 0, 0, 0, time.UTC)
}

// licenseAuditSummary is the record line for a recorded term:
// 'Renewed license: Monthly, Oct 3 – Nov 2, 2026 · ₱1,500 · LIC-0009.'
func licenseAuditSummary(verb, plan string, startsAt, endsAt time.Time, amountMinor int64, reference string) string {
	ref := ""
	if reference != "" {
		ref = " · " + reference
	}
	// endsAt is the exclusive end of access: the last licensed day is the day before.
	last := endsAt.Add(-time.Millisecond)
	return fmt.Sprintf("%s license: %s, %s · %s%s.", verb, plan, termRange(calendarDay(startsAt), calendarDay(last)), formatAmount(amountMinor), ref)
}
