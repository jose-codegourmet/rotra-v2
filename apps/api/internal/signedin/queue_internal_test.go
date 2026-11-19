package signedin

import (
	"testing"
	"time"

	"github.com/jackc/pgx/v5/pgtype"
)

func TestNormalizeLookupEmail(t *testing.T) {
	for in, want := range map[string]string{
		"  Alice@Example.TEST ": "alice@example.test", "a@b": "a@b", "x.y@z.w": "x.y@z.w",
		"": "", "   ": "", "a": "", "@b": "", "a@": "", "a@@b": "", "a b@c": "", "a@b c": "", "a@b@c": "", "a b@c": "",
	} {
		if got := normalizeLookupEmail(in); got != want {
			t.Errorf("%q: got %q, want %q", in, got, want)
		}
	}
}

func TestNormalizeLookupRtrID(t *testing.T) {
	for in, want := range map[string]string{
		"RTR-PH-CEB-102926-0001": "RTR-PH-CEB-102926-0001", " rtr-ph-ceb-102926-12345 ": "RTR-PH-CEB-102926-12345",
		"RTR-PH-CEB-102926-000": "", "RTR-P-CEB-102926-0001": "", "RTR-PH-CE-102926-0001": "", "RTR-PH-CEB-10292-0001": "",
		"RTR-PH-CEB-102926-000A": "", "RTR-PH-CEB1-102926-0001": "", "": "", "RTR-PH-CEB-102926-0001-1": "", "XTR-PH-CEB-102926-0001": "",
	} {
		if got := normalizeLookupRtrID(in); got != want {
			t.Errorf("%q: got %q, want %q", in, got, want)
		}
	}
}

func TestReadOwnDetailsReadsOnlyWhatIsWellFormed(t *testing.T) {
	d := readOwnDetails([]byte(`{"playingStyle":"Smasher","experienceMonths":14,"experienceRecordedAt":"2026-08-10T00:00:00.000Z","socialLinks":{"facebook":"fb","instagram":3}}`))
	if d.playingStyle != "Smasher" || d.months == nil || *d.months != 14 || d.links["facebook"] != "fb" || d.links["instagram"] != "" || d.links["youtube"] != "" {
		t.Errorf("well formed: %+v", d)
	}
	for _, bad := range []string{``, `null`, `[1,2]`, `"text"`, `{"experienceMonths":1.5,"playingStyle":7,"socialLinks":[]}`} {
		d := readOwnDetails([]byte(bad))
		if d.playingStyle != "" || d.months != nil || len(d.links) != 4 {
			t.Errorf("%q: %+v", bad, d)
		}
	}
}

func TestExperienceMonthsCountUpByWholeUTCMonths(t *testing.T) {
	rec := time.Date(2026, 8, 10, 0, 0, 0, 0, time.UTC)
	for now, want := range map[time.Time]int64{
		time.Date(2026, 8, 31, 0, 0, 0, 0, time.UTC): 14, time.Date(2026, 11, 1, 0, 0, 0, 0, time.UTC): 17,
		time.Date(2027, 2, 1, 0, 0, 0, 0, time.UTC): 20, time.Date(2026, 1, 1, 0, 0, 0, 0, time.UTC): 14, // never backwards
	} {
		if got := currentMonthsAt(14, rec, now); got != want {
			t.Errorf("%v: got %d, want %d", now, got, want)
		}
	}
	if y, m := floorDiv(17, 12), 17%12; y != 1 || m != 5 {
		t.Errorf("17 months: %d y %d m", y, m)
	}
	if floorDiv(-1, 12) != -1 {
		t.Error("floorDiv rounds toward minus infinity")
	}
	if _, ok := parseJSDate("not a date"); ok {
		t.Error("an unreadable date reads as none")
	}
}

func TestEstimateSessionCostRoundsLikeTheTypeScript(t *testing.T) {
	price := map[string]int32{"a": 95000, "b": 80000}
	in := costInput{CourtFeePerCourtHour: ptr32(25000), EntranceFeePerHead: ptr32(5000), PaymentMode: "break_even", Shuttles: []shuttleLineIn{{"a", 2}, {"b", 1}, {"gone", 4}}}
	got := estimateSessionCost(in, 2, 240, 6, price)
	if got.Court != 200000 || got.Shuttle != 270000 || got.Entrance != 30000 || got.Total != 500000 || got.BreakEven != 83400 || got.Collect != 500400 || got.Result.Kind != "breaks_even" || got.Result.Amount != 400 {
		t.Errorf("break even: %+v", got)
	}
	// The court fee is half-up to the centavo, and no players counts as one.
	if c := estimateSessionCost(costInput{CourtFeePerCourtHour: ptr32(1), PaymentMode: "break_even"}, 1, 30, 0, nil); c.Court != 1 || c.Players != 1 {
		t.Errorf("rounding: %+v", c)
	}
	custom := costInput{PaymentMode: "custom", CustomFeePerHead: ptr32(100000), CourtFeePerCourtHour: ptr32(1000)}
	if r := estimateSessionCost(custom, 1, 60, 2, nil); r.Result.Kind != "profit" || r.PerHead != 100000 || !r.IsCustom {
		t.Errorf("profit: %+v", r)
	}
	custom.CustomFeePerHead = nil
	if r := estimateSessionCost(custom, 1, 60, 2, nil); r.Result.Kind != "loss" || r.Result.Amount != 1000 {
		t.Errorf("loss: %+v", r)
	}
	if r := estimateSessionCost(costInput{PaymentMode: "break_even"}, 1, 60, 2, nil); r.Result.Kind != "no_costs" || r.BreakEven != 0 {
		t.Errorf("no costs: %+v", r)
	}
}

func ptr32(v int32) *int32 { return &v }

func TestPaymentTotals(t *testing.T) {
	due, cost := int64(1000), int64(5000)
	// paid in full, partial, over (reimburse), a legacy mark with no amount (counts as due), nothing received
	got := paymentTotals([]*int32{ptr32(1000), ptr32(400), ptr32(1500), nil, ptr32(0)}, 7, &due, &cost)
	if got.Paid != 3 || got.Partial != 1 || got.Total != 7 || got.Collected != 3900 || got.ToReimburse != 500 {
		t.Errorf("with a fee: %+v", got)
	}
	// still due: two unmarked players owe the full amount; the marked ones owe what is left (600 + 0 + 0 + 0 + 1000)
	if got.StillDue == nil || *got.StillDue != 2*1000+600+1000 || got.AgainstCosts == nil || *got.AgainstCosts != 3900-5000 {
		t.Errorf("still due %v against %v", got.StillDue, got.AgainstCosts)
	}
	none := paymentTotals([]*int32{ptr32(10), nil}, 3, nil, nil)
	if none.Paid != 2 || none.StillDue != nil || none.AgainstCosts != nil || none.Collected != 10 {
		t.Errorf("no fee set: %+v", none)
	}
}

func TestSessionMinutesRoundHalfUpAndNeverBelowZero(t *testing.T) {
	at := func(sec int64) pgtype.Timestamptz {
		return pgtype.Timestamptz{Time: time.Unix(sec, 0).UTC(), Valid: true}
	}
	for end, want := range map[int64]int64{5430: 91, 5429: 90, 5400: 90, 0: 0, -600: 0} {
		if got := sessionMinutes(at(0), at(end)); got != want {
			t.Errorf("end %d: got %d, want %d", end, got, want)
		}
	}
}

func TestRequestFormatsRecordHasASwitchForEveryFormat(t *testing.T) {
	got := requestFormatsRecord([]string{"fun_1v2", "doubles"})
	if len(got) != 6 || !got["doubles"] || !got["fun_1v2"] || got["singles"] {
		t.Errorf("%v", got)
	}
	if r := requestFormatsRecord(nil); len(r) != 6 || r["doubles"] {
		t.Errorf("a null list has no switch on: %v", r)
	}
}
