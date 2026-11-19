package signedin

import (
	"testing"
	"time"

	"github.com/jackc/pgx/v5/pgtype"

	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/db/sqlcgen"
)

// The pure rules of the Admin reads, pinned against what the TypeScript functions give for the same input.

func TestJSRoundIsHalfUpAlsoForNegatives(t *testing.T) {
	for in, want := range map[float64]int64{2.5: 3, -2.5: -2, -0.4: 0, 0.49: 0, -12.5: -12, 12.5: 13, -0.5: 0} {
		if got := jsRound(in); got != want {
			t.Errorf("Math.round(%v) = %d, want %d", in, got, want)
		}
	}
}

func TestFormatPesoAndPriceLine(t *testing.T) {
	for in, want := range map[int64]string{150000: "₱1,500", 150050: "₱1,500.50", 0: "₱0", 5: "₱0.05", 100000000: "₱1,000,000", 99: "₱0.99"} {
		if got := formatPeso(in); got != want {
			t.Errorf("formatPeso(%d) = %q, want %q", in, got, want)
		}
	}
	for _, c := range []struct {
		free            bool
		monthly, yearly int64
		want            string
	}{
		{false, 150000, 1500000, "₱1,500 a month · ₱15,000 a year (17% off)"},
		{false, 150000, 1800000, "₱1,500 a month · ₱18,000 a year"},
		{false, 150000, 2000000, "₱1,500 a month · ₱20,000 a year"},
		{false, 0, 100, "₱0 a month · ₱1 a year"},
		{true, 150000, 1500000, "Free (tester club)"},
	} {
		if got := priceLine(c.free, c.monthly, c.yearly); got != c.want {
			t.Errorf("priceLine(%+v) = %q, want %q", c, got, c.want)
		}
	}
}

func TestLicenseAuditSummary(t *testing.T) {
	at := func(s string) time.Time {
		v, err := time.Parse(time.RFC3339, s)
		if err != nil {
			t.Fatal(err)
		}
		return v
	}
	// Manila days: the end is exclusive, so the last licensed day is the day before it.
	got := licenseAuditSummary("Renewed", "Monthly", at("2026-10-03T00:00:00+08:00"), at("2026-11-03T00:00:00+08:00"), 150000, "LIC-0009")
	if want := "Renewed license: Monthly, Oct 3 – Nov 2, 2026 · ₱1,500 · LIC-0009."; got != want {
		t.Errorf("got %q, want %q", got, want)
	}
	got = licenseAuditSummary("Activated", "Yearly", at("2026-12-01T00:00:00+08:00"), at("2027-12-01T00:00:00+08:00"), 0, "")
	if want := "Activated license: Yearly, Dec 1, 2026 – Nov 30, 2027 · Free."; got != want {
		t.Errorf("got %q, want %q", got, want)
	}
}

func TestSalesChangeChip(t *testing.T) {
	pct := func(v int64) *int64 { return &v }
	for _, c := range []struct {
		cur, prev  int64
		comparable bool
		want       salesChange
	}{
		{5, 0, false, salesChange{Kind: "no-history"}},
		{0, 0, true, salesChange{Kind: "no-change"}},
		{4, 0, true, salesChange{Kind: "new"}},
		{3, 2, true, salesChange{Kind: "change", Percent: pct(50)}},
		{1, 8, true, salesChange{Kind: "change", Percent: pct(-87)}}, // Math.round(-87.5) is -87
		{2, 3, true, salesChange{Kind: "change", Percent: pct(-33)}},
		{0, 4, true, salesChange{Kind: "change", Percent: pct(-100)}},
	} {
		got := changeOf(c.cur, c.prev, c.comparable)
		if got.Kind != c.want.Kind || (got.Percent == nil) != (c.want.Percent == nil) || (got.Percent != nil && *got.Percent != *c.want.Percent) {
			t.Errorf("changeOf(%d, %d, %v) = %+v (%v), want %+v (%v)", c.cur, c.prev, c.comparable, got, deref(got.Percent), c.want, deref(c.want.Percent))
		}
	}
}

func deref(p *int64) any {
	if p == nil {
		return nil
	}
	return *p
}

func TestSalesPeriodAndPerSession(t *testing.T) {
	if p, err := salesPeriod("", false); p != "30d" || err != nil {
		t.Errorf("missing: %q %v", p, err)
	}
	if p, err := salesPeriod("", true); p != "30d" || err != nil {
		t.Errorf("empty: %q %v", p, err)
	}
	if p, err := salesPeriod("12m", true); p != "12m" || err != nil {
		t.Errorf("12m: %q %v", p, err)
	}
	if _, err := salesPeriod("30D", true); err == nil {
		t.Error("an unknown period must be invalid")
	}
	if got := perSession(500, 0); got != nil {
		t.Error("no sessions has no per-session figure")
	}
	if got := perSession(5, 2); got == nil || got.AmountMinor != 3 { // 2.5 rounds up
		t.Errorf("perSession(5, 2) = %+v", got)
	}
}

func TestContactNormalizeAndDisplay(t *testing.T) {
	phone, email := sqlcgen.ContactChangeFieldPhone, sqlcgen.ContactChangeFieldEmail
	for _, c := range []struct {
		field sqlcgen.ContactChangeField
		in    string
		want  string
	}{
		{phone, "0917 555 0142", "+639175550142"},
		{phone, " 0917-555-0142 ", "+639175550142"},
		{phone, "639175550142", "+639175550142"},
		{phone, "+63 917 555 0142", "+639175550142"},
		{phone, "0817 555 0142", "08175550142"}, // not a PH mobile: only spaces and hyphens go
		{phone, "call me", "callme"},
		{phone, "", ""},
		{email, "  Alice@Example.TEST ", "alice@example.test"},
	} {
		if got := normalizeContact(c.field, c.in); got != c.want {
			t.Errorf("normalizeContact(%s, %q) = %q, want %q", c.field, c.in, got, c.want)
		}
	}
	for in, want := range map[string]string{
		"+639175550142": "+63 917 555 0142", "09175550142": "0917 555 0142", "0917": "0917", "09175": "0917 5", "+63917": "+63 917",
		"+639": "+63 9", "hello": "hello", "+1 202 555 0100": "+1 202 555 0100", "": "",
	} {
		if got := formatPhoneForDisplay(in); got != want {
			t.Errorf("formatPhoneForDisplay(%q) = %q, want %q", in, got, want)
		}
	}
}

func TestChecksFor(t *testing.T) {
	phone := sqlcgen.ContactChangeFieldPhone
	self := holder{id: "p1", fullName: "Pat", rtrID: "R1", phone: addr("+639175550001")}
	other := holder{id: "p2", fullName: "Quin", rtrID: "R2", phone: addr("+639175550002")}
	req := checked{id: "r1", playerID: "p1", field: phone, from: "+639175550009", to: "0917 555 0002", status: sqlcgen.ContactChangeStatusPending, requestedAt: 1000}
	newer := checked{id: "r2", playerID: "p1", field: phone, status: sqlcgen.ContactChangeStatusApproved, requestedAt: 2000}
	later := checked{id: "r3", playerID: "p1", field: phone, status: sqlcgen.ContactChangeStatusPending, requestedAt: 3000}
	closed := checked{id: "r4", playerID: "p1", field: phone, status: sqlcgen.ContactChangeStatusRejected, requestedAt: 4000}
	checks := checksFor(req, []holder{self, other}, []checked{req, newer, later, closed})
	if len(checks) != 4 {
		t.Fatalf("%d checks", len(checks))
	}
	if c := checks[0]; c.OK || c.OtherPlayer == nil || c.OtherPlayer.ID != "p2" {
		t.Errorf("linked elsewhere: %+v", c)
	}
	if c := checks[1]; c.OK || c.NewerRequestID == nil || *c.NewerRequestID != "r3" || *c.SentAt != 3000 {
		t.Errorf("newer request must be the latest open one: %+v", c)
	}
	if c := checks[2]; c.OK || c.CurrentValue == nil || *c.CurrentValue != "+63 917 555 0001" {
		t.Errorf("original changed: %+v", c)
	}
	if c := checks[3]; c.OK {
		t.Errorf("an approved request for the player is in progress: %+v", c)
	}
	clean := checksFor(checked{id: "r1", playerID: "p1", field: phone, from: "+639175550001", to: "+639175550777", status: sqlcgen.ContactChangeStatusPending, requestedAt: 1}, []holder{self}, nil)
	for i, c := range clean {
		if !c.OK {
			t.Errorf("check %d should pass: %+v", i, c)
		}
	}
}

func TestAuditHelpers(t *testing.T) {
	if got := createdOnFromRtrID("RTR-PH-CEB-031526-0001"); got != "2026-03-15" {
		t.Errorf("createdOn: %q", got)
	}
	for _, bad := range []string{"", "RTR-PH-CEB", "RTR-PH-CEB-0315-0001", "RTR-PH-CEB-03152x-0001"} {
		if got := createdOnFromRtrID(bad); got != "" {
			t.Errorf("createdOn(%q) = %q, want empty", bad, got)
		}
	}
	if got := identityOf(map[string]any{"name": "Bob <b>&", "nickname": nil}); got == nil || *got != `{"name":"Bob <b>&","nickname":null}` {
		t.Errorf("identity: %v", got)
	}
	if got := identityOf(map[string]any{"name": "", "nickname": "x"}); got != nil {
		t.Errorf("an empty name is no identity: %v", *got)
	}
	if got := priceLineOf(map[string]any{"pricing": "free"}); got == nil || *got != "Free (tester club)" {
		t.Errorf("free price line: %v", got)
	}
	for _, v := range []any{nil, "paid", []any{}, map[string]any{"pricing": "gold"}} {
		if priceLineOf(v) != nil {
			t.Errorf("%v is not a price", v)
		}
	}
	if got := levelBandOf(pgtype.Int2{Int16: 8, Valid: true}); got == nil || *got != "advanced" {
		t.Errorf("band: %v", got)
	}
	if levelBandOf(pgtype.Int2{Int16: 9, Valid: true}) != nil || levelBandOf(pgtype.Int2{}) != nil {
		t.Error("an order outside 0..8 has no band")
	}
}
