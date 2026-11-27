package sessioncost

// ShuttleLine is a planned number of tubes of one inventory item.
type ShuttleLine struct {
	InventoryItemID string
	Tubes           int64
}

// Input is what a club entered: the fees (nil is not set), the payment mode ("break_even" or "custom") and the shuttle plan.
type Input struct {
	CourtFeePerCourtHour *int64
	EntranceFeePerHead   *int64
	PaymentMode          string
	CustomFeePerHead     *int64
	Shuttles             []ShuttleLine
}

// Item is an inventory item as the estimate reads it: its current price, and for the default plan its category.
type Item struct {
	ID            string
	Category      string
	UnitCostMinor int64
	Removed       bool
}

// Context is what the estimate is worked out for: the live courts, the scheduled minutes, the players and the club's items.
type Context struct {
	Courts, DurationMinutes, Players int64
	// FreePlayers are the roster players who play free (D-2026-11-27-01): they leave the head count of the split, never the costs.
	FreePlayers int64
	Items       []Item
}

// Outcome is whether the fees cover the costs: kind is "profit", "loss", "breaks_even" or "no_costs".
type Outcome struct {
	Kind   string
	Amount int64
}

// Result is the derived estimate.
type Result struct {
	Players, Payers, Court, Shuttle, Entrance, EntranceFeePerHead, Total, BreakEven, PerHead int64
	IsCustom                                                                                 bool
	Collect                                                                                  int64
	Outcome                                                                                  Outcome
}

// Estimate is estimateSessionCost. At least one player is counted. The court fee is the fee per court hour times courts and minutes
// over sixty, rounded half up to the centavo; shuttles are priced at the item's current price (an item the club no longer lists
// costs nothing); break-even is the total over the players rounded up to a whole peso.
func Estimate(in Input, c Context) Result {
	players := max(1, c.Players)
	court := (value(in.CourtFeePerCourtHour)*c.Courts*c.DurationMinutes + 30) / 60
	prices := make(map[string]int64, len(c.Items))
	for _, i := range c.Items {
		if _, ok := prices[i.ID]; !ok {
			prices[i.ID] = i.UnitCostMinor
		}
	}
	var shuttle int64
	for _, line := range in.Shuttles {
		shuttle += line.Tubes * prices[line.InventoryItemID]
	}
	entranceFee := value(in.EntranceFeePerHead)
	entrance := entranceFee * players
	total := court + shuttle + entrance
	// Free players leave the head count of the split (at least one payer); the entrance fee and every cost stay for everyone.
	payers := players - min(max(0, c.FreePlayers), players-1)
	per := payers * 100
	breakEven := (total + per - 1) / per * 100
	isCustom := in.PaymentMode == "custom"
	perHead := breakEven
	if isCustom {
		perHead = value(in.CustomFeePerHead)
	}
	collect := perHead * payers
	diff := collect - total
	kind := "loss"
	switch {
	case total == 0:
		kind = "no_costs"
	case !isCustom || diff == 0:
		kind = "breaks_even"
	case diff > 0:
		kind = "profit"
	}
	if diff < 0 {
		diff = -diff
	}
	return Result{
		Players: players, Payers: payers, Court: court, Shuttle: shuttle, Entrance: entrance, EntranceFeePerHead: entranceFee, Total: total,
		BreakEven: breakEven, PerHead: perHead, IsCustom: isCustom, Collect: collect, Outcome: Outcome{Kind: kind, Amount: diff},
	}
}

func value(v *int64) int64 {
	if v == nil {
		return 0
	}
	return *v
}

// AmountDue is amountDuePerHead: what one player is asked for, nil with no estimate (no fee set).
func AmountDue(r *Result) *int64 {
	if r == nil {
		return nil
	}
	v := r.PerHead
	return &v
}

// DefaultShuttlePlan is defaultShuttlePlan: the first shuttlecock item that is not removed, with one tube per ninety court-minutes
// (rounded half up, at least one tube). No such item gives no plan.
func DefaultShuttlePlan(courts, durationMinutes int64, items []Item) []ShuttleLine {
	for _, i := range items {
		if i.Category == "shuttlecocks" && !i.Removed {
			tubes := max(1, int64(float64(courts*durationMinutes)/90+0.5))
			return []ShuttleLine{{InventoryItemID: i.ID, Tubes: tubes}}
		}
	}
	return nil
}

// Normalize is normalizeSessionCost for a typed estimate: lines with no item or no tubes are dropped, and an estimate with no fee, no
// line and break-even mode is no estimate at all (nil). An explicit zero fee stays an estimate. A custom fee is kept in custom mode only.
func Normalize(in *Input) *Input {
	if in == nil {
		return nil
	}
	var lines []ShuttleLine
	for _, l := range in.Shuttles {
		if l.InventoryItemID != "" && l.Tubes > 0 {
			lines = append(lines, l)
		}
	}
	if in.CourtFeePerCourtHour == nil && in.EntranceFeePerHead == nil && len(lines) == 0 && in.PaymentMode == "break_even" {
		return nil
	}
	out := &Input{CourtFeePerCourtHour: in.CourtFeePerCourtHour, EntranceFeePerHead: in.EntranceFeePerHead, PaymentMode: in.PaymentMode, Shuttles: lines}
	if in.PaymentMode == "custom" {
		out.CustomFeePerHead = in.CustomFeePerHead
	}
	return out
}
