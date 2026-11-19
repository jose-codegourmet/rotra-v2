package license

import (
	"fmt"
	"sort"

	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/rules/club"
)

// Plan is Monthly or Yearly, the casing the Queue payment history and the Admin forms show.
type Plan string

// The two plans.
const (
	Monthly Plan = "Monthly"
	Yearly  Plan = "Yearly"
)

// Term is one license term the platform owner recorded. Dates are YYYY-MM-DD; EndsAt is the last licensed day.
type Term struct {
	Plan             Plan
	StartsAt, EndsAt string
	AmountMinor      int64
	PaymentReference string
}

// Access states.
const (
	AccessNone      = "none"
	AccessActive    = "active"
	AccessExpired   = "expired"
	AccessScheduled = "scheduled"
)

// Access is one club's license access on a day (A-CLUBS access(c)). Which fields are set depends on State:
// active: Plan, Until, Days; expired: Plan, Ended, Since, Next (empty for none); scheduled: Plan, Starts.
type Access struct {
	State        string
	Plan         Plan
	Until        string
	Days         int
	Ended, Since string
	Next         string
	Starts       string
}

// Retention states (the `k` of retention(c)).
const (
	RetentionNone     = "none"
	RetentionRestored = "restored"
	RetentionStale    = "stale"
	RetentionDue      = "due"
	RetentionFailed   = "failed"
	RetentionDeleted  = "deleted"
)

// Cycle is one expiry cycle: the first unlicensed day and the renewal that cancelled it (empty when none did).
type Cycle struct{ Expired, Cancelled string }

// Record is a club's public-page retention record. Dates are YYYY-MM-DD, empty for none.
type Record struct {
	Cycles              []Cycle
	FailedOn, DeletedOn string
}

// Retention is the club's public pages on a day (A-RETENTION). Which fields are set depends on K: restored: Cycle;
// stale: DeleteOn, Since, Left, Elapsed, Total; due: DeleteOn, Since; failed: DeleteOn, FailedOn, Since;
// deleted: On.
type Retention struct {
	K                    string
	Cycle                Cycle
	DeleteOn, Since      string
	Left, Elapsed, Total int
	FailedOn             string
	On                   string
}

// TermEnd is termEnd (rotra-admin.html termEnd()): the last day a term covers, one month or twelve on, less a day.
func TermEnd(startsOn string, plan Plan) string {
	months := 1
	if plan == Yearly {
		months = 12
	}
	return AddDays(AddMonths(startsOn, months), -1)
}

// PlanPriceMinor is planPriceMinor: the club's price for a plan in centavos; a free club's terms are recorded at 0.
func PlanPriceMinor(c club.Price, plan Plan) int64 {
	if c.LicensePricing == "free" {
		return 0
	}
	if plan == Yearly {
		return c.LicenseYearlyMinor
	}
	return c.LicenseMonthlyMinor
}

// AccessOf is accessOf (rotra-admin.html access()): one club's access on today from its terms. Back-to-back terms
// (one starting by the day after another ends) read as one continuous period. Pass one club's terms only.
func AccessOf(terms []Term, today string) Access {
	if len(terms) == 0 {
		return Access{State: AccessNone}
	}
	var covering []Term
	for _, t := range terms {
		if t.StartsAt <= today && today <= t.EndsAt {
			covering = append(covering, t)
		}
	}
	sort.SliceStable(covering, func(i, j int) bool { return covering[i].StartsAt < covering[j].StartsAt })
	if len(covering) > 0 {
		current := covering[0]
		until := current.EndsAt
		for moved := true; moved; {
			moved = false
			for _, t := range terms {
				if t.StartsAt <= AddDays(until, 1) && t.EndsAt > until {
					until = t.EndsAt
					moved = true
				}
			}
		}
		return Access{State: AccessActive, Plan: current.Plan, Until: until, Days: DiffDays(today, until)}
	}
	var later, earlier []Term
	for _, t := range terms {
		if t.StartsAt > today {
			later = append(later, t)
		}
		if t.EndsAt < today {
			earlier = append(earlier, t)
		}
	}
	sort.SliceStable(later, func(i, j int) bool { return later[i].StartsAt < later[j].StartsAt })
	sort.SliceStable(earlier, func(i, j int) bool { return earlier[i].EndsAt > earlier[j].EndsAt })
	if len(earlier) == 0 {
		if len(later) > 0 {
			return Access{State: AccessScheduled, Plan: later[0].Plan, Starts: later[0].StartsAt}
		}
		return Access{State: AccessNone}
	}
	last := earlier[0]
	out := Access{State: AccessExpired, Plan: last.Plan, Ended: last.EndsAt, Since: AddDays(last.EndsAt, 1)}
	if len(later) > 0 {
		out.Next = later[0].StartsAt
	}
	return out
}

// RetentionOf is retentionOf (rotra-admin.html retention()): the club's public pages on today. The countdown runs
// six months from the first unlicensed day of the current continuous expiry, never from session dates; it is "due"
// once that day is reached and only "deleted" once deletion actually finished. A failed deletion belongs to the
// current expiry only, so a later expiry starts clean. The record may be nil.
func RetentionOf(terms []Term, record *Record, today string) Retention {
	if record != nil && record.DeletedOn != "" {
		return Retention{K: RetentionDeleted, On: record.DeletedOn}
	}
	access := AccessOf(terms, today)
	if access.State != AccessExpired {
		if record != nil {
			for i := len(record.Cycles) - 1; i >= 0; i-- {
				if c := record.Cycles[i]; c.Cancelled != "" {
					return Retention{K: RetentionRestored, Cycle: Cycle{Expired: c.Expired, Cancelled: c.Cancelled}}
				}
			}
		}
		return Retention{K: RetentionNone}
	}
	since := access.Since
	deleteOn := AddMonths(since, RetentionMonths)
	if record != nil && record.FailedOn != "" && record.FailedOn >= since {
		return Retention{K: RetentionFailed, DeleteOn: deleteOn, FailedOn: record.FailedOn, Since: since}
	}
	if today >= deleteOn {
		return Retention{K: RetentionDue, DeleteOn: deleteOn, Since: since}
	}
	total := DiffDays(since, deleteOn)
	return Retention{K: RetentionStale, DeleteOn: deleteOn, Since: since, Left: DiffDays(today, deleteOn),
		Elapsed: min(total, max(0, DiffDays(since, today))), Total: total}
}

// TermStart is licenseTermStart: the start of the term Activate / Renew records (D-2026-11-11-06), never typed. A club
// with a current term starts the day after it ends (renewals stack); any other club starts today.
func TermStart(terms []Term, today string) string {
	if access := AccessOf(terms, today); access.State == AccessActive {
		return AddDays(access.Until, 1)
	}
	return today
}

// Draft is the prefilled values of Activate / Renew license (rotra-admin.html licStart()). Plan is empty and
// AmountMinor nil until a plan is chosen.
type Draft struct {
	Plan        Plan
	StartsOn    string
	PaidOn      string
	AmountMinor *int64
	Reference   string
}

// DefaultDraft is defaultLicenseDraft: the latest plan, the club's price for it (0 when free), paid today, and the
// computed start (TermStart), shown read-only as Covers.
func DefaultDraft(c club.Price, terms []Term, today string) Draft {
	sorted := append([]Term(nil), terms...)
	sort.SliceStable(sorted, func(i, j int) bool { return sorted[i].StartsAt > sorted[j].StartsAt })
	var plan Plan
	if len(sorted) > 0 {
		plan = sorted[0].Plan
	}
	d := Draft{Plan: plan, StartsOn: TermStart(terms, today), PaidOn: today}
	switch {
	case c.LicensePricing == "free":
		zero := int64(0)
		d.AmountMinor = &zero
	case plan != "":
		price := PlanPriceMinor(c, plan)
		d.AmountMinor = &price
	}
	return d
}

// Effects is licenseEffects: what saving this term will do, as D-LICENSE lists it (rotra-admin.html licEffects()).
func Effects(clubName string, access Access, retention Retention, plan Plan, startsOn, today string) []string {
	to := TermEnd(startsOn, plan)
	lines := []string{fmt.Sprintf("%s can use the Queue app from %s to %s.", clubName, FormatLicenseDate(startsOn), FormatLicenseDate(to))}
	if access.State == AccessExpired {
		switch {
		case startsOn > today:
			lines = append(lines, fmt.Sprintf("Until %s the club stays expired and its public pages stay stale.", FormatLicenseDate(startsOn)))
		case retention.K == RetentionDeleted:
			lines = append(lines, fmt.Sprintf("The public pages deleted on %s don't come back. Player match history and ranks were kept.", FormatLicenseDate(retention.On)))
		case retention.K == RetentionFailed:
			lines = append(lines, "Restores the club's stale public pages and cancels the pending deletion retry.")
		case retention.K == RetentionStale || retention.K == RetentionDue:
			lines = append(lines, fmt.Sprintf("Restores the club's stale public pages and cancels the deletion scheduled for %s.", FormatLicenseDate(retention.DeleteOn)))
		}
	}
	return append(lines, "Still one active session at a time.", "Adds a payment record the club sees in Club settings.")
}

// AuditSummary is licenseAuditSummary: the record line for a recorded term (rotra-admin.html licCommit()):
// 'Renewed license: Monthly, Oct 3 – Nov 2, 2026 · ₱1,500 · LIC-0009.' plus any retention sentence. The verb is
// Activated or Renewed.
func AuditSummary(verb string, t Term, retentionNote string) string {
	ref := ""
	if t.PaymentReference != "" {
		ref = " · " + t.PaymentReference
	}
	return fmt.Sprintf("%s license: %s, %s · %s%s.%s", verb, t.Plan, FormatTermRange(t.StartsAt, t.EndsAt), club.FormatAmount(t.AmountMinor), ref, retentionNote)
}
