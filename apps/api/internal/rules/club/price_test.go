package club_test

import (
	"math"
	"reflect"
	"testing"

	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/rules/club"
)

func paid(monthlyPesos, yearlyPesos int64) club.Price {
	return club.Price{LicensePricing: "paid", LicenseMonthlyMinor: monthlyPesos * 100, LicenseYearlyMinor: yearlyPesos * 100}
}

// Ported from packages/data/src/club/club.rules.test.ts, describe('club price rules'): 'rounds the yearly saving
// over twelve months to a whole percent', 'formats a paid price as one line with the saving', 'leaves the saving out
// when there is none', 'shows a free club as a tester club, whatever amounts it kept', 'formats every seeded club
// price from SEED_PRICE' and 'shows a recorded ₱0 amount as Free and other amounts in pesos'.
func TestClubPriceRules(t *testing.T) {
	for _, c := range []struct {
		p    club.Price
		want float64
	}{{paid(1500, 15000), 17}, {paid(1200, 12000), 17}, {paid(1000, 6000), 50}, {paid(1500, 18000), 0},
		{club.Price{LicensePricing: "free"}, 0}} {
		if got := club.YearlySavingPercentOf(c.p); got != c.want {
			t.Errorf("%+v: %v, want %v", c.p, got, c.want)
		}
	}
	for p, want := range map[club.Price]string{
		paid(1500, 15000): "₱1,500 a month · ₱15,000 a year (17% off)",
		paid(1800, 18000): "₱1,800 a month · ₱18,000 a year (17% off)",
		paid(1500, 18000): "₱1,500 a month · ₱18,000 a year",
		{LicensePricing: "free", LicenseMonthlyMinor: 100000, LicenseYearlyMinor: 1000000}: "Free (tester club)",
		{LicensePricing: "free"}: "Free (tester club)",
	} {
		if got := club.FormatClubPriceLine(p); got != want {
			t.Errorf("%+v: %q, want %q", p, got, want)
		}
	}
	// The seeded clubs of packages/data/src/fixtures/clubs.ts (monthly, yearly in pesos; the last is free).
	seeded := []struct {
		monthly, yearly int64
		free            bool
		want            string
	}{
		{1500, 15000, false, "₱1,500 a month · ₱15,000 a year (17% off)"}, {1500, 15000, false, "₱1,500 a month · ₱15,000 a year (17% off)"},
		{1200, 12000, false, "₱1,200 a month · ₱12,000 a year (17% off)"}, {1800, 18000, false, "₱1,800 a month · ₱18,000 a year (17% off)"},
		{1500, 15000, false, "₱1,500 a month · ₱15,000 a year (17% off)"}, {1500, 15000, false, "₱1,500 a month · ₱15,000 a year (17% off)"},
		{1500, 15000, false, "₱1,500 a month · ₱15,000 a year (17% off)"}, {1000, 10000, true, "Free (tester club)"},
	}
	for _, s := range seeded {
		p := paid(s.monthly, s.yearly)
		if s.free {
			p.LicensePricing = "free"
		}
		if got := club.FormatClubPriceLine(p); got != s.want {
			t.Errorf("%+v: %q", s, got)
		}
	}
	for in, want := range map[int64]string{0: "Free", 150000: "₱1,500", 1500000: "₱15,000", 150050: "₱1,500.50"} {
		if got := club.FormatAmount(in); got != want {
			t.Errorf("FormatAmount(%d) = %q, want %q", in, got, want)
		}
	}
}

// The saving of a price with no monthly amount, and the arm64 fused multiply: 1 - 1/(0.5 * 12) must not drift.
func TestYearlySavingPercentEdges(t *testing.T) {
	if got := club.YearlySavingPercent(0, 100); !math.IsInf(got, -1) {
		t.Errorf("a monthly price of 0: %v", got)
	}
	if got := club.YearlySavingPercent(0, 0); !math.IsNaN(got) {
		t.Errorf("0 / 0: %v", got)
	}
	for _, c := range [][3]int64{{150000, 1500000, 17}, {100, 1150, 4}, {300, 3250, 10}, {1, 6, 50}, {7, 63, 25}, {100, 1190, 1}} {
		if got := club.YearlySavingPercent(c[0], c[1]); got != float64(c[2]) {
			t.Errorf("%v: %v", c, got)
		}
	}
}

// packages/schema/src/club-price.test.ts, describe('whole-peso parsing'): 'reads %s as %i centavos' (5 rows), 'refuses
// %s' (10 rows), 'stores a paid price as integer centavos' and 'needs both amounts in whole pesos above zero'.
func TestWholePesoParsing(t *testing.T) {
	for in, want := range map[string]int64{"1500": 150000, "1,500": 150000, " 15000 ": 1500000, "1500.00": 150000, "1": 100} {
		if got, ok := club.ParseWholePesos(in); !ok || got != want {
			t.Errorf("%q: %d %v, want %d", in, got, ok, want)
		}
	}
	for _, in := range []string{"", " ", "0", "0.00", "1500.50", "-1500", "1.5e3", "abc"} {
		if _, ok := club.ParseWholePesos(in); ok {
			t.Errorf("%q must be refused", in)
		}
	}
	got, errs := club.ParsePrice(club.PriceInput{Pricing: "paid", Monthly: "1,500", Yearly: "15000"})
	if errs != nil || got != (club.PriceValues{Pricing: "paid", Monthly: 150000, Yearly: 1500000, HasMonthly: true, HasYearly: true}) {
		t.Errorf("paid price: %+v %v", got, errs)
	}
	_, errs = club.ParsePrice(club.PriceInput{Pricing: "paid", Monthly: "", Yearly: "0"})
	if want := map[string]string{"monthly": club.MonthlyPriceError, "yearly": club.YearlyPriceError}; !reflect.DeepEqual(errs, want) {
		t.Errorf("both wrong: %v", errs)
	}
	_, errs = club.ParsePrice(club.PriceInput{Pricing: "paid", Monthly: "1500.50", Yearly: "15000"})
	if want := map[string]string{"monthly": club.MonthlyPriceError}; !reflect.DeepEqual(errs, want) {
		t.Errorf("monthly wrong: %v", errs)
	}
}

// describe('yearly < 12 × monthly'): accepts one peso under, refuses three yearly prices, compares only once the
// monthly price is valid, rounds the saving.
func TestYearlyMustBeBelowTwelveMonths(t *testing.T) {
	if _, errs := club.ParsePrice(club.PriceInput{Pricing: "paid", Monthly: "1500", Yearly: "17999"}); errs != nil {
		t.Errorf("17999: %v", errs)
	}
	for _, y := range []string{"18000", "18,001", "20000"} {
		_, errs := club.ParsePrice(club.PriceInput{Pricing: "paid", Monthly: "1500", Yearly: y})
		want := map[string]string{"yearly": "Make it less than 12 months at the monthly price (₱18,000). Yearly plans get a discount."}
		if !reflect.DeepEqual(errs, want) {
			t.Errorf("%s: %v", y, errs)
		}
	}
	if _, errs := club.ParsePrice(club.PriceInput{Pricing: "paid", Monthly: "", Yearly: "18000"}); !reflect.DeepEqual(errs, map[string]string{"monthly": club.MonthlyPriceError}) {
		t.Errorf("empty monthly: %v", errs)
	}
	for _, c := range [][3]int64{{150000, 1500000, 17}, {120000, 1200000, 17}, {150000, 1800000, 0}} {
		if got := club.YearlySavingPercent(c[0], c[1]); got != float64(c[2]) {
			t.Errorf("%v: %v", c, got)
		}
	}
}

// describe('free'): 'needs no amounts' and 'keeps the last paid amounts without checking the discount'.
func TestFreePrice(t *testing.T) {
	if got, errs := club.ParsePrice(club.PriceInput{Pricing: "free"}); errs != nil || got != (club.PriceValues{Pricing: "free"}) {
		t.Errorf("no amounts: %+v %v", got, errs)
	}
	got, _ := club.ParsePrice(club.PriceInput{Pricing: "free", Monthly: "1500", Yearly: "20000"})
	if got != (club.PriceValues{Pricing: "free", Monthly: 150000, Yearly: 2000000, HasMonthly: true, HasYearly: true}) {
		t.Errorf("kept: %+v", got)
	}
	got, _ = club.ParsePrice(club.PriceInput{Pricing: "free", Monthly: "15.5", Yearly: ""})
	if got != (club.PriceValues{Pricing: "free"}) {
		t.Errorf("not whole: %+v", got)
	}
}

func TestPricingThatIsNeitherIsRefusedOnPricing(t *testing.T) {
	for _, p := range []string{"", "x", "Paid"} {
		_, errs := club.ParsePrice(club.PriceInput{Pricing: p})
		if want := map[string]string{"pricing": "Invalid discriminator value. Expected 'paid' | 'free'"}; !reflect.DeepEqual(errs, want) {
			t.Errorf("%q: %v", p, errs)
		}
	}
}

// The service's own check of a paid price (clubs.ts validatePricing): positive safe integers, yearly under twelve months.
func TestCheckPaid(t *testing.T) {
	for _, c := range [][2]float64{{150000, 1500000}, {1, 11}, {100000000000000, 1199999999999999}} {
		if msg, ok := club.CheckPaid(c[0], c[1]); !ok {
			t.Errorf("%v: %q", c, msg)
		}
	}
	for _, c := range [][2]float64{{0, 5}, {5, 0}, {-1, 5}, {5, -1}, {math.NaN(), 5}, {5, math.NaN()}, {1.5, 5}, {9007199254740992, 5}, {math.Inf(1), 5}} {
		if msg, ok := club.CheckPaid(c[0], c[1]); ok || msg != club.PricePairError {
			t.Errorf("%v: %q %v", c, msg, ok)
		}
	}
	for _, c := range [][2]float64{{100, 1200}, {100, 1201}, {1, 12}} {
		if msg, ok := club.CheckPaid(c[0], c[1]); ok || msg != club.PriceDiscountError {
			t.Errorf("%v: %q %v", c, msg, ok)
		}
	}
}
