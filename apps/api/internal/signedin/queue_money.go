package signedin

import (
	"errors"
	"math"
	"net/http"
	"sort"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgtype"

	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/db/sqlcgen"
	httpapi "github.com/jose-codegourmet/rotra-v2/apps/api/internal/http"
	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/rules/collate"
)

// GET /api/sessions/{sessionId}/cost and /payments (Q-MONEY). Ports of readSessionCost and readSessionPayments in
// packages/db/src/queue/financials.ts, and of the pure rules in @rotra/data/session-cost and session-payment
// (internal/rules/sessioncost and payment are still empty, so the rules live here as unexported helpers, as the Admin
// sales rules do). Money is integer centavos; JavaScript numbers are exact below 2^53, so the arithmetic is done in
// int64 and float64 where the TypeScript divides.

type costInput struct {
	CourtFeePerCourtHour *int32          `json:"courtFeePerCourtHour"`
	EntranceFeePerHead   *int32          `json:"entranceFeePerHead"`
	PaymentMode          string          `json:"paymentMode"`
	CustomFeePerHead     *int32          `json:"customFeePerHead"`
	Shuttles             []shuttleLineIn `json:"shuttles"`
}

type shuttleLineIn struct {
	InventoryItemID string `json:"inventoryItemId"`
	Tubes           int32  `json:"tubes"`
}

type shuttleLineOut struct {
	InventoryItemID string `json:"inventoryItemId"`
	Tubes           int32  `json:"tubes"`
	Name            string `json:"name"`
}

type costResultKind struct {
	Kind   string `json:"kind"`
	Amount int64  `json:"amount"`
}

// costResult is SessionCostResult.
type costResult struct {
	Players            int64          `json:"players"`
	Court              int64          `json:"court"`
	Shuttle            int64          `json:"shuttle"`
	Entrance           int64          `json:"entrance"`
	EntranceFeePerHead int64          `json:"entranceFeePerHead"`
	Total              int64          `json:"total"`
	BreakEven          int64          `json:"breakEven"`
	PerHead            int64          `json:"perHead"`
	IsCustom           bool           `json:"isCustom"`
	Collect            int64          `json:"collect"`
	Result             costResultKind `json:"result"`
}

func nz(v *int32) int64 {
	if v == nil {
		return 0
	}
	return int64(*v)
}

// estimateSessionCost is estimateSessionCost: the court fee rounds to the nearest centavo, break-even up to a whole peso.
func estimateSessionCost(in costInput, courts, durationMinutes, players int64, price map[string]int32) costResult {
	p := max(1, players)
	court := (nz(in.CourtFeePerCourtHour)*courts*durationMinutes + 30) / 60
	var shuttle int64
	for _, line := range in.Shuttles {
		shuttle += int64(line.Tubes) * int64(price[line.InventoryItemID])
	}
	entranceFee := nz(in.EntranceFeePerHead)
	entrance := entranceFee * p
	total := court + shuttle + entrance
	breakEven := int64(math.Ceil(float64(total)/float64(p*100))) * 100
	isCustom := in.PaymentMode == "custom"
	perHead := breakEven
	if isCustom {
		perHead = nz(in.CustomFeePerHead)
	}
	collect := perHead * p
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
	return costResult{
		Players: p, Court: court, Shuttle: shuttle, Entrance: entrance, EntranceFeePerHead: entranceFee, Total: total, BreakEven: breakEven,
		PerHead: perHead, IsCustom: isCustom, Collect: collect, Result: costResultKind{Kind: kind, Amount: diff},
	}
}

// sessionMinutes is the minutes() of financials.ts: the scheduled length rounded half up, never below 0.
func sessionMinutes(start, end pgtype.Timestamptz) int64 {
	return max(0, jsRound(float64(end.Time.UnixMilli()-start.Time.UnixMilli())/60000))
}

// costEstimate is estimateFor: the derived estimate of a session, with what it used.
type costEstimate struct {
	Input           *costInput       `json:"input"`
	Estimate        *costResult      `json:"estimate"`
	Revision        *string          `json:"revision"`
	Courts          int64            `json:"courts"`
	DurationMinutes int64            `json:"durationMinutes"`
	ShuttleLines    []shuttleLineOut `json:"shuttleLines"`
}

func (s *server) estimateFor(r *http.Request, q *sqlcgen.Queries, club pgtype.UUID, sess sqlcgen.ListQueueSessionsRow) (costEstimate, error) {
	ctx := r.Context()
	duration := sessionMinutes(sess.ScheduledStartAt, sess.ScheduledEndAt)
	none := costEstimate{DurationMinutes: duration, ShuttleLines: []shuttleLineOut{}}
	est, err := q.GetQueueCostEstimate(ctx, sess.ID)
	if errors.Is(err, pgx.ErrNoRows) {
		return none, nil
	}
	if err != nil {
		return none, err
	}
	lines, err := q.ListQueueShuttlePlanLines(ctx, sess.ID)
	if err != nil {
		return none, err
	}
	in := costInput{
		CourtFeePerCourtHour: int4Ptr(est.CourtFeePerCourtHourMinor), EntranceFeePerHead: int4Ptr(est.EntranceFeePerHeadMinor),
		PaymentMode: string(est.PaymentMode), CustomFeePerHead: int4Ptr(est.CustomFeePerHeadMinor), Shuttles: []shuttleLineIn{},
	}
	for _, l := range lines {
		in.Shuttles = append(in.Shuttles, shuttleLineIn{InventoryItemID: l.InventoryItemID.String(), Tubes: l.Tubes})
	}
	items, err := q.ListQueueClubInventoryPrices(ctx, club)
	if err != nil {
		return none, err
	}
	price, name := map[string]int32{}, map[string]string{}
	for _, i := range items {
		price[i.ID.String()], name[i.ID.String()] = i.UnitCostMinor, i.Name
	}
	courts, err := q.ListQueueLiveCourts(ctx, club)
	if err != nil {
		return none, err
	}
	var n int64
	for _, c := range courts {
		if c.SessionID == sess.ID {
			n++
		}
	}
	players := int64(sess.RosterCount)
	if players == 0 && sess.ExpectedPlayers.Valid {
		players = int64(sess.ExpectedPlayers.Int32)
	}
	result := estimateSessionCost(in, n, duration, players, price)
	rev := httpapi.ToDecimalString(est.Revision)
	out := costEstimate{Input: &in, Estimate: &result, Revision: &rev, Courts: n, DurationMinutes: duration, ShuttleLines: []shuttleLineOut{}}
	for _, l := range in.Shuttles {
		out.ShuttleLines = append(out.ShuttleLines, shuttleLineOut{InventoryItemID: l.InventoryItemID, Tubes: l.Tubes, Name: name[l.InventoryItemID]})
	}
	return out, nil
}

func int4Ptr(v pgtype.Int4) *int32 {
	if !v.Valid {
		return nil
	}
	return &v.Int32
}

func (s *server) queueCost(r *http.Request, q *sqlcgen.Queries, club pgtype.UUID) (any, error) {
	sess, err := s.session(r, q, club)
	if err != nil {
		return nil, err
	}
	est, err := s.estimateFor(r, q, club, sess)
	if err != nil {
		return nil, err
	}
	return struct {
		Cost costEstimate `json:"cost"`
	}{est}, nil
}

// ---- payments ----

// paidMark is a mark's received amount (null for an older mark that meant paid in full) and when it was marked.
type paidMark struct {
	Amount *httpapi.Money `json:"amount"`
	At     string         `json:"at"`
}

type paymentPlayer struct {
	SessionPlayerID string    `json:"sessionPlayerId"`
	ClubPlayerID    string    `json:"clubPlayerId"`
	Name            string    `json:"name"`
	Paid            *paidMark `json:"paid"`
}

type paymentTotalsDTO struct {
	Paid         int64  `json:"paid"`
	Partial      int64  `json:"partial"`
	Total        int64  `json:"total"`
	Collected    int64  `json:"collected"`
	StillDue     *int64 `json:"stillDue"`
	ToReimburse  int64  `json:"toReimburse"`
	AgainstCosts *int64 `json:"againstCosts"`
	Cost         *int64 `json:"cost"`
}

// paymentTotals is paymentTotals: marks holds one received amount (null: the current amount due) per marked player.
func paymentTotals(marks []*int32, total int64, amountDue *int64, cost *int64) paymentTotalsDTO {
	var paid, partial, collected, owed, toReimburse int64
	for _, m := range marks {
		// receivedAmount: a mark with no amount counts as the current amount due (0 with no fee set).
		var received int64
		switch {
		case m != nil:
			received = int64(*m)
		case amountDue != nil:
			received = *amountDue
		}
		collected += received
		switch {
		case amountDue == nil, received == *amountDue:
			paid++ // Paid
		case received <= 0:
			// Unpaid
		case received < *amountDue:
			partial++ // Partial
		default:
			paid++ // Reimburse counts as fully paid
		}
		if amountDue != nil {
			owed += max(*amountDue-received, 0)
			toReimburse += max(received-*amountDue, 0)
		}
	}
	t := paymentTotalsDTO{Paid: paid, Partial: partial, Total: total, Collected: collected, ToReimburse: toReimburse, Cost: cost}
	if amountDue != nil {
		v := (total-int64(len(marks)))*(*amountDue) + owed
		t.StillDue = &v
	}
	if cost != nil {
		v := collected - *cost
		t.AgainstCosts = &v
	}
	return t
}

func (s *server) queuePayments(r *http.Request, q *sqlcgen.Queries, club pgtype.UUID) (any, error) {
	ctx := r.Context()
	// The invalid-session answer comes before the access check.
	row, err := ownSession(ctx, q, club, r.PathValue("sessionId"))
	if err != nil {
		return nil, err
	}
	type payments struct {
		Payments any `json:"payments"`
	}
	if row.State == sqlcgen.QueueSessionStateInvalid {
		return payments{nil}, nil
	}
	if err := s.requireSessionAccess(ctx, q, club, row); err != nil {
		return nil, err
	}
	roster, err := q.ListQueueRoster(ctx, row.ID)
	if err != nil {
		return nil, err
	}
	marks, err := q.ListQueuePaymentMarks(ctx, row.ID)
	if err != nil {
		return nil, err
	}
	est, err := s.estimateFor(r, q, club, row)
	if err != nil {
		return nil, err
	}
	var amountDue, cost *int64
	basis := "break_even"
	var entranceIncluded *int64
	if est.Estimate != nil {
		v := est.Estimate.PerHead
		amountDue = &v
		c := est.Estimate.Total
		cost = &c
		e := est.Estimate.EntranceFeePerHead
		entranceIncluded = &e
	}
	if est.Input != nil {
		basis = est.Input.PaymentMode
	}
	byEntry := map[pgtype.UUID]sqlcgen.ListQueuePaymentMarksRow{}
	for _, m := range marks {
		byEntry[m.SessionPlayerID] = m
	}
	players := []paymentPlayer{}
	var counted []*int32
	var total int64
	for _, e := range roster {
		if e.NoShowAt.Valid {
			continue // off the live roster
		}
		total++
		p := paymentPlayer{SessionPlayerID: e.ID.String(), ClubPlayerID: e.ClubPlayerID.String(), Name: e.NameSnapshot}
		if m, ok := byEntry[e.ID]; ok {
			p.Paid = &paidMark{Amount: moneyOrNil(m.AmountMinor, m.Currency), At: httpapi.ToIso(m.MarkedAt.Time)}
			counted = append(counted, int4Ptr(m.AmountMinor))
		}
		players = append(players, p)
	}
	// Unpaid first, then by name the way localeCompare orders them.
	sort.SliceStable(players, func(i, j int) bool {
		a, b := players[i], players[j]
		if (a.Paid != nil) != (b.Paid != nil) {
			return a.Paid == nil
		}
		return collate.Compare(a.Name, b.Name) < 0
	})
	return payments{struct {
		Players          []paymentPlayer  `json:"players"`
		AmountDue        *int64           `json:"amountDue"`
		DueBasis         string           `json:"dueBasis"`
		EntranceIncluded *int64           `json:"entranceFeeIncluded"`
		Totals           paymentTotalsDTO `json:"totals"`
	}{players, amountDue, basis, entranceIncluded, paymentTotals(counted, total, amountDue, cost)}}, nil
}
