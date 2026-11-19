package club

import (
	"fmt"
	"math"
	"math/big"
	"strings"

	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/player/fields"
)

// MaxSafeInteger is Number.MAX_SAFE_INTEGER, the largest amount of centavos a price or payment can be.
const MaxSafeInteger = 1<<53 - 1

// Messages of the money rules (@rotra/schema/money).
const (
	PesoAmountError = "Enter a peso amount with up to two decimals."
	AmountTooLarge  = "Amount is too large."
)

// IsSafeInteger is Number.isSafeInteger.
func IsSafeInteger(v float64) bool {
	return !math.IsNaN(v) && !math.IsInf(v, 0) && v == math.Trunc(v) && math.Abs(v) <= MaxSafeInteger
}

// MoneyFromNumber is the number branch of moneyField: whole centavos from zero up (a safe integer).
func MoneyFromNumber(v float64) (int64, bool) {
	if !IsSafeInteger(v) || v < 0 {
		return 0, false
	}
	return int64(v), true
}

// MoneyFromText is the string branch of moneyField: peso text with up to two decimals, thousands commas allowed as
// 1,234 groups (never 1,23), read exactly to centavos and never rounded. White space around it is trimmed. A value
// beyond the safe integers is refused with AmountTooLarge. msg is the reason when ok is false.
func MoneyFromText(value string) (centavos int64, msg string, ok bool) {
	t := fields.JSTrim(value)
	pesos, fraction, hasFraction := strings.Cut(t, ".")
	if hasFraction && (len(fraction) < 1 || len(fraction) > 2 || !allDigits(fraction)) || !pesosOK(pesos) {
		return 0, PesoAmountError, false
	}
	whole, _ := new(big.Int).SetString(strings.ReplaceAll(pesos, ",", ""), 10)
	c := new(big.Int).Mul(whole, big.NewInt(100))
	c.Add(c, mustInt(fraction+strings.Repeat("0", 2-len(fraction))))
	if c.Cmp(big.NewInt(MaxSafeInteger)) > 0 {
		return 0, AmountTooLarge, false
	}
	return c.Int64(), "", true
}

func mustInt(digits string) *big.Int {
	if digits == "" {
		return new(big.Int)
	}
	n, _ := new(big.Int).SetString(digits, 10)
	return n
}

func allDigits(s string) bool {
	if s == "" {
		return false
	}
	for i := 0; i < len(s); i++ {
		if s[i] < '0' || s[i] > '9' {
			return false
		}
	}
	return true
}

// pesosOK is the whole-peso part of the pattern: digits, or a 1 to 3 digit group followed by ,ddd groups.
func pesosOK(s string) bool {
	if allDigits(s) {
		return true
	}
	groups := strings.Split(s, ",")
	if len(groups) < 2 || len(groups[0]) < 1 || len(groups[0]) > 3 || !allDigits(groups[0]) {
		return false
	}
	for _, g := range groups[1:] {
		if len(g) != 3 || !allDigits(g) {
			return false
		}
	}
	return true
}

// OptionalMoney is optionalMoneyField: peso text to centavos, or none (ok true, isNone true) for an empty string.
func OptionalMoney(value string) (centavos int64, isNone, ok bool) {
	t := fields.JSTrim(value)
	if t == "" {
		return 0, true, true
	}
	c, _, good := MoneyFromText(t)
	return c, false, good
}

// FormatPeso is formatPeso: centavos as peso text the way the prototypes show money: thousands commas, no decimals
// for whole amounts ("₱1,500"), two decimals otherwise ("₱1,500.50"). A negative amount under one peso keeps the
// negative zero JavaScript prints for it ("₱-0.05").
func FormatPeso(minor int64) string {
	pesos := minor / 100 // truncates toward zero, like Math.trunc
	cents := minor % 100
	if cents < 0 {
		cents = -cents
	}
	whole := groupThousands(pesos)
	if minor < 0 && pesos == 0 {
		whole = "-0" // Math.trunc(-0.05) is -0, and (-0).toLocaleString() is "-0"
	}
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
