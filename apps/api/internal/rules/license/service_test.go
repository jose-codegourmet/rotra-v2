package license_test

import (
	"testing"
	"time"

	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/rules/license"
)

func utc(s string) time.Time {
	v, err := time.Parse(time.RFC3339Nano, s)
	if err != nil {
		panic(err)
	}
	return v
}

// The service adds months the way Date.setUTCMonth does (licenses.ts addMonths): the day of the month is kept and a day
// past the end of the new month rolls over. Every row is what the Route Handler stored (licenses.golden.json).
func TestAddMonthsOverflowIsSetUTCMonth(t *testing.T) {
	for _, c := range []struct {
		from   string
		months int
		want   string
	}{
		{"2027-01-31T04:00:00Z", 1, "2027-03-03T04:00:00Z"}, {"2026-08-31T04:00:00Z", 1, "2026-10-01T04:00:00Z"},
		{"2026-01-30T04:00:00Z", 1, "2026-03-02T04:00:00Z"}, {"2027-01-29T04:00:00Z", 1, "2027-03-01T04:00:00Z"},
		{"2028-01-29T04:00:00Z", 1, "2028-02-29T04:00:00Z"}, {"2028-02-29T04:00:00Z", 12, "2029-03-01T04:00:00Z"},
		{"2026-12-31T04:00:00Z", 1, "2027-01-31T04:00:00Z"}, {"2026-10-31T04:00:00Z", 1, "2026-12-01T04:00:00Z"},
		{"2026-11-19T04:00:00Z", 12, "2027-11-19T04:00:00Z"}, {"2026-12-31T23:59:59.999Z", 1, "2027-01-31T23:59:59.999Z"},
	} {
		if got := license.AddMonthsOverflow(utc(c.from), c.months); !got.Equal(utc(c.want)) {
			t.Errorf("%s + %d months = %s, want %s", c.from, c.months, got.Format(time.RFC3339Nano), c.want)
		}
	}
	// The result is in UTC whatever the zone of the input.
	in := utc("2026-11-19T04:00:00Z").In(time.FixedZone("x", 8*3600))
	if got := license.AddMonthsOverflow(in, 1); got.Location() != time.UTC {
		t.Errorf("zone: %v", got.Location())
	}
}

func TestPaymentReference(t *testing.T) {
	for in, want := range map[int64]string{0: "LIC-0001", 4: "LIC-0005", 9998: "LIC-9999", 9999: "LIC-10000", 12344: "LIC-12345"} {
		if got := license.PaymentReference(in); got != want {
			t.Errorf("PaymentReference(%d) = %s, want %s", in, got, want)
		}
	}
}

// The date a club paid, as the Route Handler read it (licenses.golden.json): the cases that gave a term and the ones
// that crashed, which Go refuses.
func TestParsePaidOn(t *testing.T) {
	for in, want := range map[string]string{
		"2026-11-19": "2026-11-19", "2099-12-31": "2099-12-31", "0001-01-01": "0001-01-01", "2028-02-29": "2028-02-29",
		"2026-02-30": "2026-03-02", "2027-02-29": "2027-03-01", "2026-04-31": "2026-05-01", "+002026-11-19": "2026-11-19",
		"2026-01-31": "2026-01-31", "9999-12-31": "9999-12-31", "2026-12-31": "2026-12-31",
	} {
		got, ok := license.ParsePaidOn(in)
		if !ok || got.Format("2006-01-02") != want {
			t.Errorf("%q: %s %v, want %s", in, got.Format("2006-01-02"), ok, want)
		}
	}
	for _, in := range []string{
		"", "yesterday", "2026-11-19T10:00:00", "2026-1-5", "20261119", " 2026-11-19", "2026-11-19 ", "2026-00-10", "2026-01-32", "2026-01-00", "2026-13-01",
		"0000-01-01", "-000001-01-01", "-000000-01-01", "+012026-11-19", "+275760-09-13", "+275760-09-14", "+02026-11-19", "26-11-19", "2026/11/19",
		"2026-11-19t", "2026-11-19Z", "２０２６-11-19", "٢٠٢٦-11-19", "2026-11-19\n", "2026-11-19\x00", "+000000-01-01",
	} {
		if got, ok := license.ParsePaidOn(in); ok {
			t.Errorf("%q must be refused, got %s", in, got)
		}
	}
}
