package club

import (
	"math"
	"strconv"
)

// Messages of a club's license price (@rotra/schema/club-price, admin/clubs.ts validatePricing).
const (
	MonthlyPriceError = "Enter the monthly price in pesos."
	YearlyPriceError  = "Enter the yearly price in pesos."
	// PricePairError is what the service answers on `price` when a paid price is not two positive amounts.
	PricePairError = "Enter a monthly and yearly price."
	// PriceDiscountError is what the service answers on `price` when the yearly price is not below twelve months.
	PriceDiscountError = "The yearly price must be less than 12 months."
)

// YearlyDiscountError is yearlyDiscountError: the form's message, naming twelve months at the monthly price.
func YearlyDiscountError(monthlyMinor int64) string {
	return "Make it less than 12 months at the monthly price (" + FormatPeso(monthlyMinor*12) + "). Yearly plans get a discount."
}

// ParseWholePesos is parseWholePesos: peso text to whole-peso centavos above zero, or ok false ("1,500" and
// "1500.00" give 150000; "1500.50", "0" and "" give none).
func ParseWholePesos(value string) (int64, bool) {
	c, _, ok := MoneyFromText(value)
	if !ok || c <= 0 || c%100 != 0 {
		return 0, false
	}
	return c, true
}

// YearlySavingPercent is yearlySavingPercent (savePct): the whole-percent saving of the yearly price over twelve
// months. It is a float because a monthly price of 0 makes it infinite or NaN, neither of which is above 0.
func YearlySavingPercent(monthlyMinor, yearlyMinor int64) float64 {
	// The explicit conversions stop Go from fusing the product into the addition (it may on arm64), which would
	// skip a rounding JavaScript does.
	ratio := float64(float64(yearlyMinor) / float64(float64(monthlyMinor)*12))
	percent := float64((1 - ratio) * 100)
	return jsRound(percent)
}

// jsRound is Math.round: halves go up, toward positive infinity.
func jsRound(x float64) float64 {
	if math.IsNaN(x) || math.IsInf(x, 0) {
		return x
	}
	r := math.Floor(x)
	if x-r >= 0.5 {
		r++
	}
	return r
}

// StoredPrice is a stored club price: whole centavos; a free club keeps its last paid amounts (or 0).
type StoredPrice struct {
	Pricing                   string // "paid" or "free"
	MonthlyMinor, YearlyMinor int64
}

// FormatPriceLine is formatClubPriceLine (priceLine): "₱1,500 a month · ₱15,000 a year (17% off)", or
// "Free (tester club)".
func FormatPriceLine(p StoredPrice) string {
	if p.Pricing == "free" {
		return "Free (tester club)"
	}
	line := FormatPeso(p.MonthlyMinor) + " a month · " + FormatPeso(p.YearlyMinor) + " a year"
	if saving := YearlySavingPercent(p.MonthlyMinor, p.YearlyMinor); saving > 0 && !math.IsInf(saving, 0) {
		line += " (" + strconv.FormatInt(int64(saving), 10) + "% off)"
	}
	return line
}

// PriceInput is a club price as typed: the pricing and the amounts as peso text.
type PriceInput struct {
	Pricing         string
	Monthly, Yearly string
}

// PriceValues is the parsed price: whole centavos (paid), or the kept centavos / none (free).
type PriceValues struct {
	Pricing         string
	Monthly, Yearly int64
	// HasMonthly and HasYearly say whether a free club kept an amount (a paid price always has both).
	HasMonthly, HasYearly bool
}

// ParsePrice is clubPriceField: a club's own license price. Paid needs both amounts as whole pesos above zero
// (centavos), and the yearly price must be less than twelve times the monthly one; the issues are keyed `monthly`
// and `yearly`, and the discount is only compared once both amounts are valid. Free keeps whatever valid whole pesos
// were typed, and anything else is none. A pricing that is neither is refused on `pricing` with zod's own message.
func ParsePrice(in PriceInput) (PriceValues, map[string]string) {
	switch in.Pricing {
	case "free":
		m, mOK := ParseWholePesos(in.Monthly)
		y, yOK := ParseWholePesos(in.Yearly)
		return PriceValues{Pricing: "free", Monthly: m, Yearly: y, HasMonthly: mOK, HasYearly: yOK}, nil
	case "paid":
		errs := map[string]string{}
		m, mOK := ParseWholePesos(in.Monthly)
		y, yOK := ParseWholePesos(in.Yearly)
		if !mOK {
			errs["monthly"] = MonthlyPriceError
		}
		if !yOK {
			errs["yearly"] = YearlyPriceError
		}
		if len(errs) == 0 && y >= m*12 {
			errs["yearly"] = YearlyDiscountError(m)
		}
		if len(errs) > 0 {
			return PriceValues{}, errs
		}
		return PriceValues{Pricing: "paid", Monthly: m, Yearly: y, HasMonthly: true, HasYearly: true}, nil
	}
	return PriceValues{}, map[string]string{"pricing": "Invalid discriminator value. Expected 'paid' | 'free'"}
}

// CheckPaid is validatePricing for a paid club: both amounts positive safe integers (whole centavos) and the yearly
// price below twelve months. field and message say what the service answers on `price`; ok is true when fine. The
// amounts are JavaScript numbers, so NaN is a value that was not a number.
func CheckPaid(monthlyMinor, yearlyMinor float64) (message string, ok bool) {
	if !IsSafeInteger(monthlyMinor) || !IsSafeInteger(yearlyMinor) || monthlyMinor <= 0 || yearlyMinor <= 0 {
		return PricePairError, false
	}
	if yearlyMinor >= 12*monthlyMinor {
		return PriceDiscountError, false
	}
	return "", true
}
