package club_test

import (
	"math"
	"testing"

	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/rules/club"
)

// Ported from packages/schema/src/money.test.ts: 'converts %s pesos exactly' (6 rows), 'preserves numeric centavos',
// 'rejects invalid or unsafe amount %s' (13 rows) and 'formatPeso' (5 rows).
func TestMoneyFromText(t *testing.T) {
	for in, want := range map[string]int64{"0": 0, "0.29": 29, "1.01": 101, "350": 35000, "1,234.50": 123450, "90071992547409.91": 9007199254740991} {
		if got, _, ok := club.MoneyFromText(in); !ok || got != want {
			t.Errorf("%q: %d %v, want %d", in, got, ok, want)
		}
	}
	for _, in := range []string{"", " ", "-1", "1.001", "1,23", "1e3", "NaN", "90071992547409.92"} {
		if _, _, ok := club.MoneyFromText(in); ok {
			t.Errorf("%q must be refused", in)
		}
	}
	if _, msg, _ := club.MoneyFromText("90071992547409.92"); msg != club.AmountTooLarge {
		t.Errorf("too large: %q", msg)
	}
	if _, msg, _ := club.MoneyFromText("1.001"); msg != club.PesoAmountError {
		t.Errorf("format: %q", msg)
	}
}

func TestMoneyFromTextEdges(t *testing.T) {
	for in, want := range map[string]int64{"1,000": 100000, " 12.5 ": 1250, "\u00a07\ufeff": 700, "1000000": 100000000, "999,999": 99999900, "0.5": 50, "0,000": 0} {
		got, _, ok := club.MoneyFromText(in)
		if in == "0,000" { // a group of three after a one-digit group is a valid grouping
			want = 0
		}
		if !ok || got != want {
			t.Errorf("%q: %d %v, want %d", in, got, ok, want)
		}
	}
	for _, in := range []string{"1,0000", ",100", "1,,000", "1.", ".5", "1,000,00", "1 000", "٣", "1.5.5", "+5", "1,2345", "1.5\n5"} {
		if _, _, ok := club.MoneyFromText(in); ok {
			t.Errorf("%q must be refused", in)
		}
	}
}

func TestMoneyFromNumber(t *testing.T) {
	for _, v := range []float64{35000, 0} {
		if got, ok := club.MoneyFromNumber(v); !ok || got != int64(v) {
			t.Errorf("%v: %d %v", v, got, ok)
		}
	}
	for _, v := range []float64{-1, 0.29, math.Inf(1), math.NaN(), math.MaxInt64, 9007199254740992} {
		if _, ok := club.MoneyFromNumber(v); ok {
			t.Errorf("%v must be refused", v)
		}
	}
	if got, ok := club.MoneyFromNumber(9007199254740991); !ok || got != 9007199254740991 {
		t.Errorf("largest safe integer: %d %v", got, ok)
	}
}

func TestOptionalMoney(t *testing.T) {
	if _, none, ok := club.OptionalMoney("  "); !none || !ok {
		t.Error("empty is none")
	}
	if c, none, ok := club.OptionalMoney("1,500"); none || !ok || c != 150000 {
		t.Errorf("1,500: %d %v %v", c, none, ok)
	}
	if _, _, ok := club.OptionalMoney("x"); ok {
		t.Error("x is refused")
	}
}

func TestFormatPeso(t *testing.T) {
	for in, want := range map[int64]string{150000: "₱1,500", 150050: "₱1,500.50", 35000: "₱350", 5: "₱0.05", 0: "₱0", 100000000: "₱1,000,000", 99: "₱0.99", -150000: "₱-1,500", -5: "₱-0.05", -99: "₱-0.99", -100: "₱-1"} {
		if got := club.FormatPeso(in); got != want {
			t.Errorf("FormatPeso(%d) = %q, want %q", in, got, want)
		}
	}
}
