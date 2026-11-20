package sessionresult

// Pow10 and InPow10Table let the external test check the table.
func Pow10(y float64) float64 { return pow10(y) }

func InPow10Table(y float64) bool {
	_, ok := lookupPow10(y)
	return ok
}
