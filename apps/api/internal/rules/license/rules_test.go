package license_test

import (
	"reflect"
	"testing"
	"time"

	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/rules/club"
	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/rules/license"
)

// Ported from packages/data/src/license/license.rules.test.ts. The Vitest case names are in each comment; an it.each
// counts as one case per row.

const today = "2026-10-27" // ADMIN_LICENSE_TODAY

func term(plan license.Plan, startsAt, endsAt string) license.Term {
	return license.Term{Plan: plan, StartsAt: startsAt, EndsAt: endsAt, AmountMinor: 150000}
}

var (
	noRecord = &license.Record{}
	paid     = club.Price{LicensePricing: "paid", LicenseMonthlyMinor: 150000, LicenseYearlyMinor: 1500000}
	free     = club.Price{LicensePricing: "free", LicenseMonthlyMinor: 150000, LicenseYearlyMinor: 1500000}
)

// describe('dates (rotra-admin.html addMonths / diffDays)'): clamps to the end of a shorter month, counts whole
// calendar days, reads today in Manila, writes a term range with the year once.
func TestDates(t *testing.T) {
	for _, c := range []struct {
		in     string
		months int
		want   string
	}{{"2026-01-31", 1, "2026-02-28"}, {"2028-01-31", 1, "2028-02-29"}, {"2026-10-01", 6, "2027-04-01"}} {
		if got := license.AddMonths(c.in, c.months); got != c.want {
			t.Errorf("AddMonths(%s, %d) = %s, want %s", c.in, c.months, got, c.want)
		}
	}
	for _, c := range []struct {
		a, b string
		want int
	}{{"2026-10-27", "2027-03-31", 155}, {"2026-10-01", "2027-04-01", 182}, {"2026-10-27", "2026-10-27", 0}, {"2026-10-27", "2026-10-20", -7}} {
		if got := license.DiffDays(c.a, c.b); got != c.want {
			t.Errorf("DiffDays(%s, %s) = %d, want %d", c.a, c.b, got, c.want)
		}
	}
	at := func(s string) time.Time {
		v, err := time.Parse(time.RFC3339, s)
		if err != nil {
			t.Fatal(err)
		}
		return v
	}
	if got := license.ManilaToday(at("2026-10-27T16:30:00Z")); got != "2026-10-28" {
		t.Errorf("ManilaToday = %s", got)
	}
	if got := license.ManilaToday(at("2026-10-27T15:59:00Z")); got != "2026-10-27" {
		t.Errorf("ManilaToday = %s", got)
	}
	if got := license.FormatTermRange("2026-10-03", "2026-11-02"); got != "Oct 3 – Nov 2, 2026" {
		t.Errorf("range: %s", got)
	}
	if got := license.FormatTermRange("2026-04-01", "2027-03-31"); got != "Apr 1, 2026 – Mar 31, 2027" {
		t.Errorf("range: %s", got)
	}
}

func TestCalendarDates(t *testing.T) {
	for _, ok := range []string{"2026-02-28", "2028-02-29", "2026-12-31", "1900-01-01", "0100-01-01"} {
		if !license.IsCalendarDate(ok) {
			t.Errorf("%s is a date", ok)
		}
	}
	// Date.UTC reads a year from 0 to 99 as 1900 to 1999, so "0026-01-01" and "0001-01-01" do not read back as themselves.
	for _, bad := range []string{"2026-02-29", "2026-13-01", "2026-00-10", "2026-01-32", "2026-1-5", "26-01-01", "2026-01-01 ", "", "٢٠٢٦-01-01", "0026-01-01"} {
		if license.IsCalendarDate(bad) {
			t.Errorf("%q is not a date", bad)
		}
	}
	if got := license.AddDays("2026-02-27", 3); got != "2026-03-02" {
		t.Errorf("AddDays: %s", got)
	}
	if got := license.AddDays("2026-03-01", -1); got != "2026-02-28" {
		t.Errorf("AddDays back: %s", got)
	}
	if got := license.FormatLicenseDate("2026-10-03"); got != "Oct 3, 2026" {
		t.Errorf("FormatLicenseDate: %s", got)
	}
}

// describe('termEnd (rotra-admin.html termEnd())'): adds one month or twelve less a day; clamps to month end first.
func TestTermEnd(t *testing.T) {
	for _, c := range []struct {
		start string
		plan  license.Plan
		want  string
	}{{"2026-10-03", license.Monthly, "2026-11-02"}, {"2026-02-01", license.Monthly, "2026-02-28"}, {"2026-04-01", license.Yearly, "2027-03-31"},
		{"2026-02-15", license.Yearly, "2027-02-14"}, {"2026-01-31", license.Monthly, "2026-02-27"}, {"2028-02-29", license.Yearly, "2029-02-27"}} {
		if got := license.TermEnd(c.start, c.plan); got != c.want {
			t.Errorf("TermEnd(%s, %s) = %s, want %s", c.start, c.plan, got, c.want)
		}
	}
}

// describe('accessOf (rotra-admin.html access())'): six cases.
func TestAccessOf(t *testing.T) {
	if got := license.AccessOf(nil, today); got != (license.Access{State: "none"}) {
		t.Errorf("no terms: %+v", got)
	}
	back2back := []license.Term{term("Monthly", "2026-10-01", "2026-10-31"), term("Monthly", "2026-11-01", "2026-11-30"), term("Yearly", "2026-12-01", "2027-11-30")}
	if got, want := license.AccessOf(back2back, today), (license.Access{State: "active", Plan: "Monthly", Until: "2027-11-30", Days: license.DiffDays(today, "2027-11-30")}); got != want {
		t.Errorf("back to back: %+v", got)
	}
	gap := []license.Term{term("Monthly", "2026-10-01", "2026-10-31"), term("Monthly", "2026-11-02", "2026-12-01")}
	if got := license.AccessOf(gap, today); got.State != "active" || got.Until != "2026-10-31" || got.Days != 4 {
		t.Errorf("gap: %+v", got)
	}
	if got := license.AccessOf([]license.Term{term("Monthly", "2026-09-28", today)}, today); got.Days != 0 {
		t.Errorf("last day: %+v", got)
	}
	if got, want := license.AccessOf([]license.Term{term("Monthly", "2026-11-15", "2026-12-14")}, today), (license.Access{State: "scheduled", Plan: "Monthly", Starts: "2026-11-15"}); got != want {
		t.Errorf("scheduled: %+v", got)
	}
	expired := []license.Term{term("Monthly", "2026-08-01", "2026-08-31"), term("Monthly", "2026-09-01", "2026-09-30"), term("Monthly", "2026-11-15", "2026-12-14")}
	if got, want := license.AccessOf(expired, today), (license.Access{State: "expired", Plan: "Monthly", Ended: "2026-09-30", Since: "2026-10-01", Next: "2026-11-15"}); got != want {
		t.Errorf("expired: %+v", got)
	}
}

// describe('retentionOf (rotra-admin.html retention())'): six cases.
func TestRetentionOf(t *testing.T) {
	ended := []license.Term{term("Monthly", "2026-09-01", "2026-09-30")}
	if got, want := license.RetentionOf(ended, noRecord, today), (license.Retention{K: "stale", DeleteOn: "2027-04-01", Since: "2026-10-01", Left: 156, Elapsed: 26, Total: 182}); got != want {
		t.Errorf("six months: %+v", got)
	}
	later := append(append([]license.Term{}, ended...), term("Monthly", "2026-10-01", "2026-10-20"))
	if got := license.RetentionOf(later, noRecord, today); got.K != "stale" || got.Since != "2026-10-21" || got.DeleteOn != "2027-04-21" {
		t.Errorf("continuous expiry: %+v", got)
	}
	if got, want := license.RetentionOf(ended, noRecord, "2027-04-01"), (license.Retention{K: "due", DeleteOn: "2027-04-01", Since: "2026-10-01"}); got != want {
		t.Errorf("due: %+v", got)
	}
	if got, want := license.RetentionOf(ended, &license.Record{DeletedOn: "2027-04-02"}, "2027-04-05"), (license.Retention{K: "deleted", On: "2027-04-02"}); got != want {
		t.Errorf("deleted: %+v", got)
	}
	if got, want := license.RetentionOf(ended, &license.Record{FailedOn: "2027-04-01"}, "2027-04-03"), (license.Retention{K: "failed", DeleteOn: "2027-04-01", FailedOn: "2027-04-01", Since: "2026-10-01"}); got != want {
		t.Errorf("failed: %+v", got)
	}
	renewed := append(append([]license.Term{}, ended...), term("Monthly", today, license.TermEnd(today, "Monthly")))
	record := &license.Record{Cycles: []license.Cycle{{Expired: "2026-10-01", Cancelled: today}}}
	if got, want := license.RetentionOf(renewed, record, today), (license.Retention{K: "restored", Cycle: license.Cycle{Expired: "2026-10-01", Cancelled: today}}); got != want {
		t.Errorf("restored: %+v", got)
	}
	want := license.Retention{K: "stale", DeleteOn: "2027-05-27", Since: "2026-11-27", Left: license.DiffDays("2026-12-01", "2027-05-27"), Elapsed: 4, Total: license.DiffDays("2026-11-27", "2027-05-27")}
	if got := license.RetentionOf(renewed, record, "2026-12-01"); got != want {
		t.Errorf("a later expiry: %+v", got)
	}
	// 'does not carry a failed deletion into a later expiry'
	if got := license.RetentionOf(renewed, &license.Record{FailedOn: "2026-10-20"}, "2026-12-01"); got.K != "stale" {
		t.Errorf("failed deletion carried: %+v", got)
	}
}

// The A02 fixtures (packages/data/src/fixtures/adminClubs.ts, licensePayments.ts and clubs.ts), embedded.
type fixtureClub struct {
	username, name string
	price          club.Price
	terms          []license.Term
	record         *license.Record
	access         license.Access
	retention      license.Retention
	hasTerms       bool
}

func fixture(username string) fixtureClub {
	for _, c := range fixtures() {
		if c.username == username {
			return c
		}
	}
	panic("club fixture missing: " + username)
}

func fixtures() []fixtureClub {
	p := func(m, y int64) club.Price {
		return club.Price{LicensePricing: "paid", LicenseMonthlyMinor: m, LicenseYearlyMinor: y}
	}
	tm := func(ref string, plan license.Plan, from, to string, pesos int64) license.Term {
		return license.Term{Plan: plan, StartsAt: from, EndsAt: to, AmountMinor: pesos * 100, PaymentReference: ref}
	}
	return []fixtureClub{
		{username: "lahug.smash", name: "Lahug Smash Club", price: p(150000, 1500000), hasTerms: true,
			terms: []license.Term{tm("LIC-0004", "Yearly", "2026-04-01", "2027-03-31", 15000), tm("LIC-0003", "Monthly", "2026-03-01", "2026-03-31", 1500),
				tm("LIC-0002", "Monthly", "2026-02-01", "2026-02-28", 1500), tm("LIC-0001", "Monthly", "2026-01-05", "2026-01-31", 1500)},
			access: license.Access{State: "active", Plan: "Yearly", Until: "2027-03-31", Days: 155}, retention: license.Retention{K: "none"}},
		{username: "itpark.badminton", name: "IT Park Badminton Club", price: p(150000, 1500000), hasTerms: true,
			terms: []license.Term{tm("LIC-0009", "Monthly", "2026-10-03", "2026-11-02", 1500), tm("LIC-0008", "Monthly", "2026-09-03", "2026-10-02", 1500),
				tm("LIC-0007", "Monthly", "2026-08-03", "2026-09-02", 1500), tm("LIC-0006", "Monthly", "2026-06-01", "2026-06-30", 1500), tm("LIC-0005", "Monthly", "2026-05-01", "2026-05-31", 1500)},
			record: &license.Record{Cycles: []license.Cycle{{Expired: "2026-07-01", Cancelled: "2026-08-03"}}},
			access: license.Access{State: "active", Plan: "Monthly", Until: "2026-11-02", Days: 6}, retention: license.Retention{K: "restored", Cycle: license.Cycle{Expired: "2026-07-01", Cancelled: "2026-08-03"}}},
		{username: "matina.smash", name: "Matina Smash Club", price: p(120000, 1200000), hasTerms: true,
			terms:  []license.Term{tm("LIC-0010", "Yearly", "2026-02-15", "2027-02-14", 15000)},
			access: license.Access{State: "active", Plan: "Yearly", Until: "2027-02-14", Days: 110}, retention: license.Retention{K: "none"}},
		{username: "sampaloc.shuttle", name: "Sampaloc Shuttle Club", price: p(180000, 1800000), hasTerms: true,
			terms: []license.Term{tm("LIC-0014", "Monthly", "2026-10-10", "2026-11-09", 1500), tm("LIC-0013", "Monthly", "2026-09-10", "2026-10-09", 1500),
				tm("LIC-0012", "Monthly", "2026-08-10", "2026-09-09", 1500), tm("LIC-0011", "Monthly", "2026-07-10", "2026-08-09", 1500)},
			access: license.Access{State: "active", Plan: "Monthly", Until: "2026-11-09", Days: 13}, retention: license.Retention{K: "none"}},
		{username: "talamban.racket", name: "Talamban Racket Club", price: p(150000, 1500000), hasTerms: true,
			terms:     []license.Term{tm("LIC-0017", "Monthly", "2026-09-01", "2026-09-30", 1500), tm("LIC-0016", "Monthly", "2026-08-01", "2026-08-31", 1500), tm("LIC-0015", "Monthly", "2026-06-01", "2026-07-31", 3000)},
			access:    license.Access{State: "expired", Plan: "Monthly", Ended: "2026-09-30", Since: "2026-10-01"},
			retention: license.Retention{K: "stale", DeleteOn: "2027-04-01", Since: "2026-10-01", Left: 156, Elapsed: 26, Total: 182}},
		{username: "bacolod.rally", name: "Bacolod Rally House", price: p(150000, 1500000), hasTerms: true,
			terms:     []license.Term{tm("LIC-0020", "Monthly", "2026-03-20", "2026-04-19", 1500), tm("LIC-0019", "Monthly", "2026-01-20", "2026-03-19", 3000)},
			record:    &license.Record{FailedOn: "2026-10-20"},
			access:    license.Access{State: "expired", Plan: "Monthly", Ended: "2026-04-19", Since: "2026-04-20"},
			retention: license.Retention{K: "failed", DeleteOn: "2026-10-20", FailedOn: "2026-10-20", Since: "2026-04-20"}},
		{username: "molo.shuttle", name: "Molo Shuttle Club", price: p(150000, 1500000), hasTerms: true,
			terms:  []license.Term{tm("LIC-0021", "Monthly", "2025-11-05", "2026-03-31", 7500)},
			record: &license.Record{DeletedOn: "2026-10-01"},
			access: license.Access{State: "expired", Plan: "Monthly", Ended: "2026-03-31", Since: "2026-04-01"}, retention: license.Retention{K: "deleted", On: "2026-10-01"}},
		{username: "tagbilaran.circle", name: "Tagbilaran Badminton Circle", price: club.Price{LicensePricing: "free", LicenseMonthlyMinor: 100000, LicenseYearlyMinor: 1000000},
			access: license.Access{State: "none"}, retention: license.Retention{K: "none"}},
	}
}

// describe('the A02 fixtures at 2026-10-27'): 'match the access and retention the stories were written against'
// (eight clubs) and 'give the acceptance states'.
func TestTheA02Fixtures(t *testing.T) {
	for _, c := range fixtures() {
		if got := license.AccessOf(c.terms, today); got != c.access {
			t.Errorf("%s access: %+v, want %+v", c.username, got, c.access)
		}
		if got := license.RetentionOf(c.terms, c.record, today); got != c.retention {
			t.Errorf("%s retention: %+v, want %+v", c.username, got, c.retention)
		}
		if (len(c.terms) > 0) != c.hasTerms {
			t.Errorf("%s hasTerms", c.username)
		}
	}
	lahug := fixture("lahug.smash")
	if a := license.AccessOf(lahug.terms, today); a.State != "active" || a.Until != "2027-03-31" {
		t.Errorf("lahug: %+v", a)
	}
	it := fixture("itpark.badminton")
	if a := license.AccessOf(it.terms, today); a.State != "active" || a.Days != 6 {
		t.Errorf("itpark: %+v", a)
	}
	if r := license.RetentionOf(it.terms, it.record, today); r.K != "restored" {
		t.Errorf("itpark: %+v", r)
	}
	tal := fixture("talamban.racket")
	if a := license.AccessOf(tal.terms, today); a.State != "expired" || a.Since != "2026-10-01" {
		t.Errorf("talamban: %+v", a)
	}
	if r := license.RetentionOf(tal.terms, tal.record, today); r.K != "stale" || r.DeleteOn != "2027-04-01" {
		t.Errorf("talamban: %+v", r)
	}
	if r := fixture("bacolod.rally"); license.RetentionOf(r.terms, r.record, today).K != "failed" {
		t.Error("bacolod")
	}
	if r := fixture("molo.shuttle"); license.RetentionOf(r.terms, r.record, today) != (license.Retention{K: "deleted", On: "2026-10-01"}) {
		t.Error("molo")
	}
	if r := fixture("tagbilaran.circle"); license.AccessOf(r.terms, today) != (license.Access{State: "none"}) {
		t.Error("tagbilaran")
	}
}

// describe('amounts'): the club's price for the plan, a free term as Free, the record line with the reference and the
// retention sentence.
func TestAmountsAndTheRecordLine(t *testing.T) {
	if license.PlanPriceMinor(paid, "Monthly") != 150000 || license.PlanPriceMinor(paid, "Yearly") != 1500000 || license.PlanPriceMinor(free, "Yearly") != 0 {
		t.Error("plan prices")
	}
	freeTerm := term("Monthly", today, "2026-11-26")
	freeTerm.AmountMinor = 0
	if got := license.AuditSummary("Activated", freeTerm, ""); got != "Activated license: Monthly, Oct 27 – Nov 26, 2026 · Free." {
		t.Errorf("free: %s", got)
	}
	renewal := term("Monthly", "2026-10-03", "2026-11-02")
	renewal.PaymentReference = "LIC-0009"
	if got := license.AuditSummary("Renewed", renewal, ""); got != "Renewed license: Monthly, Oct 3 – Nov 2, 2026 · ₱1,500 · LIC-0009." {
		t.Errorf("renewed: %s", got)
	}
	const note = " Public pages restored; deletion countdown from Oct 1, 2026 cancelled."
	if got := license.AuditSummary("Renewed", renewal, note); got != "Renewed license: Monthly, Oct 3 – Nov 2, 2026 · ₱1,500 · LIC-0009."+note {
		t.Errorf("with a note: %s", got)
	}
}

// describe('defaultLicenseDraft (rotra-admin.html licStart())'): three cases.
func TestDefaultDraft(t *testing.T) {
	l := fixture("lahug.smash")
	got := license.DefaultDraft(l.price, l.terms, today)
	if got.Plan != "Yearly" || got.StartsOn != "2027-04-01" || got.PaidOn != today || got.AmountMinor == nil || *got.AmountMinor != l.price.LicenseYearlyMinor || got.Reference != "" {
		t.Errorf("renews an active club: %+v", got)
	}
	tal := fixture("talamban.racket")
	got = license.DefaultDraft(tal.price, tal.terms, today)
	if got.Plan != "Monthly" || got.StartsOn != today || *got.AmountMinor != tal.price.LicenseMonthlyMinor {
		t.Errorf("starts an expired club today: %+v", got)
	}
	got = license.DefaultDraft(paid, nil, today)
	if got.Plan != "" || got.StartsOn != today || got.PaidOn != today || got.AmountMinor != nil {
		t.Errorf("never licensed: %+v", got)
	}
	if got = license.DefaultDraft(free, nil, today); got.Plan != "" || got.AmountMinor == nil || *got.AmountMinor != 0 {
		t.Errorf("free: %+v", got)
	}
	if license.TermStart(nil, today) != today || license.TermStart(l.terms, today) != "2027-04-01" {
		t.Error("TermStart")
	}
}

// describe('D-LICENSE effects (rotra-admin.html licEffects())'): three cases.
func TestEffects(t *testing.T) {
	effects := func(username string, plan license.Plan, startsOn string) []string {
		c := fixture(username)
		return license.Effects(c.name, license.AccessOf(c.terms, today), license.RetentionOf(c.terms, c.record, today), plan, startsOn, today)
	}
	want := []string{"Sampaloc Shuttle Club can use the Queue app from Nov 10, 2026 to Dec 9, 2026.", "Still one active session at a time.", "Adds a payment record the club sees in Club settings."}
	if got := effects("sampaloc.shuttle", "Monthly", "2026-11-10"); !reflect.DeepEqual(got, want) {
		t.Errorf("renewal of an active club: %v", got)
	}
	if got := effects("talamban.racket", "Monthly", today)[1]; got != "Restores the club's stale public pages and cancels the deletion scheduled for Apr 1, 2027." {
		t.Errorf("stale: %s", got)
	}
	if got := effects("bacolod.rally", "Monthly", today)[1]; got != "Restores the club's stale public pages and cancels the pending deletion retry." {
		t.Errorf("failed: %s", got)
	}
	if got := effects("bacolod.rally", "Monthly", "2026-11-01")[1]; got != "Until Nov 1, 2026 the club stays expired and its public pages stay stale." {
		t.Errorf("later start: %s", got)
	}
	if got := effects("molo.shuttle", "Monthly", today)[1]; got != "The public pages deleted on Oct 1, 2026 don't come back. Player match history and ranks were kept." {
		t.Errorf("deleted: %s", got)
	}
	// An expired club whose retention is due (no seeded club is) also gets its pages restored.
	talamban := fixture("talamban.racket")
	due := license.Retention{K: "due", DeleteOn: "2027-04-01", Since: "2026-10-01"}
	if got := license.Effects(talamban.name, license.AccessOf(talamban.terms, today), due, "Monthly", today, today)[1]; got != "Restores the club's stale public pages and cancels the deletion scheduled for Apr 1, 2027." {
		t.Errorf("due: %s", got)
	}
}
