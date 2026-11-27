package signedin

import (
	"context"
	"errors"
	"net/http"
	"sort"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgtype"

	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/db/sqlcgen"
	httpapi "github.com/jose-codegourmet/rotra-v2/apps/api/internal/http"
	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/rules/collate"
	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/rules/payment"
	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/rules/sessioncost"
	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/rules/slotledger"
	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/slotmoney"
)

// GET /api/sessions/{sessionId}/cost and /payments (Q-MONEY). Ports of readSessionCost and readSessionPayments in
// packages/db/src/queue/financials.ts, and of the pure rules in @rotra/data/session-cost and session-payment
// (internal/rules/sessioncost and payment). Money is integer centavos; JavaScript numbers are exact below 2^53, so the arithmetic
// is done in int64.

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
	Payers             int64          `json:"payers"`
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

func int64Ptr(v *int32) *int64 {
	if v == nil {
		return nil
	}
	n := int64(*v)
	return &n
}

// estimateSessionCost is estimateSessionCost (rules/sessioncost): the DTO of the estimate of an input, the courts and minutes it is for,
// the players and the club's prices.
func estimateSessionCost(in costInput, courts, durationMinutes, players, free int64, price map[string]int32) costResult {
	input := sessioncost.Input{
		CourtFeePerCourtHour: int64Ptr(in.CourtFeePerCourtHour), EntranceFeePerHead: int64Ptr(in.EntranceFeePerHead),
		PaymentMode: in.PaymentMode, CustomFeePerHead: int64Ptr(in.CustomFeePerHead),
	}
	items := make([]sessioncost.Item, 0, len(price))
	for id, p := range price {
		items = append(items, sessioncost.Item{ID: id, UnitCostMinor: int64(p)})
	}
	for _, line := range in.Shuttles {
		input.Shuttles = append(input.Shuttles, sessioncost.ShuttleLine{InventoryItemID: line.InventoryItemID, Tubes: int64(line.Tubes)})
	}
	r := sessioncost.Estimate(input, sessioncost.Context{Courts: courts, DurationMinutes: durationMinutes, Players: players, FreePlayers: free, Items: items})
	return costResult{
		Players: r.Players, Payers: r.Payers, Court: r.Court, Shuttle: r.Shuttle, Entrance: r.Entrance, EntranceFeePerHead: r.EntranceFeePerHead, Total: r.Total,
		BreakEven: r.BreakEven, PerHead: r.PerHead, IsCustom: r.IsCustom, Collect: r.Collect, Result: costResultKind{Kind: r.Outcome.Kind, Amount: r.Outcome.Amount},
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
	return s.estimateForCtx(r.Context(), q, club, sess)
}

func (s *server) estimateForCtx(ctx context.Context, q *sqlcgen.Queries, club pgtype.UUID, sess sqlcgen.ListQueueSessionsRow) (costEstimate, error) {
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
	// Before anyone joins: the expected count, else the slots (the form's "follows your slots"), never 1 player.
	players := int64(sess.RosterCount)
	if players == 0 && sess.ExpectedPlayers.Valid {
		players = int64(sess.ExpectedPlayers.Int32)
	}
	if players == 0 {
		players = n * int64(sess.PlayersPerCourt)
	}
	// D-2026-11-27-01: free roster players leave the break-even head count.
	free, err := q.CountQueueFreeRoster(ctx, sess.ID)
	if err != nil {
		return none, err
	}
	result := estimateSessionCost(in, n, duration, players, int64(free), price)
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
	SessionPlayerID string              `json:"sessionPlayerId"`
	ClubPlayerID    string              `json:"clubPlayerId"`
	Name            string              `json:"name"`
	Free            bool                `json:"free"`
	Paid            *paidMark           `json:"paid"`
	Transfer        *slotmoney.Transfer `json:"transfer"`
	Refund          *refundMark         `json:"refund"`
}

// refundMark is the manual full refund recorded for a player (#1014); paid.amount is net of it.
type refundMark struct {
	Amount *httpapi.Money `json:"amount"`
	At     string         `json:"at"`
}

type paymentTotalsDTO struct {
	Paid         int64  `json:"paid"`
	Partial      int64  `json:"partial"`
	Total        int64  `json:"total"`
	Collected    int64  `json:"collected"`
	Waived       int64  `json:"waived"`
	Refunded     int64  `json:"refunded"`
	StillDue     *int64 `json:"stillDue"`
	ToReimburse  int64  `json:"toReimburse"`
	AgainstCosts *int64 `json:"againstCosts"`
	Cost         *int64 `json:"cost"`
	Free         int64  `json:"free,omitempty"` // only while someone plays free, so the totals of a session with none keep their shape
}

// paymentTotals is paymentTotals (rules/payment): marks holds one entry per marked player (cash net of a refund, waivers, the refund).
func paymentTotals(marks []payment.Mark, total int64, amountDue *int64, cost *int64, free int64) paymentTotalsDTO {
	t := payment.ComputeTotals(marks, total, amountDue, cost, free)
	return paymentTotalsDTO{
		Paid: t.Paid, Partial: t.Partial, Total: t.Total, Collected: t.Collected, Waived: t.Waived, Refunded: t.Refunded, StillDue: t.StillDue,
		ToReimburse: t.ToReimburse, AgainstCosts: t.AgainstCosts, Cost: t.Cost, Free: t.Free,
	}
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
	freeRows, err := q.ListMoneyFreeRoster(ctx, row.ID)
	if err != nil {
		return nil, err
	}
	isFree := map[pgtype.UUID]bool{}
	for _, id := range freeRows {
		isFree[id] = true
	}
	// #1013: each live entry's own mark (unless frozen into a transfer it sent) plus the cash and waivers an approved transfer carried
	// into it. Senders are off the roster: cash counts once.
	ledger, err := slotmoney.Load(ctx, q, row.ID)
	if err != nil {
		return nil, err
	}
	type entry struct {
		e       sqlcgen.ListQueueRosterRow
		payment slotledger.EntryPayment
	}
	var entries []entry
	for _, e := range roster {
		if e.NoShowAt.Valid {
			continue // off the live roster
		}
		entries = append(entries, entry{e, ledger.PaymentOf(e.ID, amountDue)})
	}
	players := []paymentPlayer{}
	var marks []payment.Mark
	var total, free int64
	for _, en := range entries {
		e, pay := en.e, en.payment
		// D-2026-11-27-01: plays free (owes nothing, left out of the split and the totals) while no cash was recorded.
		isFreeNow := isFree[e.ID] && pay.Mark == nil
		p := paymentPlayer{SessionPlayerID: e.ID.String(), ClubPlayerID: e.ClubPlayerID.String(), Name: e.NameSnapshot, Free: isFreeNow}
		if isFreeNow {
			free++
		} else {
			total++
		}
		if pay.Mark != nil {
			var own *slotmoney.Mark
			if !pay.Frozen {
				if m, ok := ledger.MarkOf(e.ID); ok {
					own = &m
				}
			}
			transfer := ledger.TransferOf(pay, isoOfMillis)
			var approvedAt int64
			if n := len(pay.Chain); n > 0 {
				approvedAt = *pay.Chain[n-1].DecidedAt
			}
			at := int64(0)
			currency := "PHP"
			if own != nil {
				at, currency = own.MarkedAt.Time.UnixMilli(), own.Currency
			}
			if transfer != nil {
				at = max(at, approvedAt)
			}
			p.Paid = &paidMark{Amount: moneyOfPtr(pay.Mark.Amount, currency), At: isoOfMillis(at)}
			p.Transfer = transfer
			marks = append(marks, payment.Mark{Amount: pay.Mark.Amount, Waived: pay.Mark.Waived, Refunded: pay.Refunded})
		}
		if rf, ok := ledger.RefundOf(e.ID); ok {
			p.Refund = &refundMark{Amount: &httpapi.Money{AmountMinor: rf.Amount, Currency: rf.Currency}, At: httpapi.ToIso(rf.RefundedAt.Time)}
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
	}{players, amountDue, basis, entranceIncluded, paymentTotals(marks, total, amountDue, cost, free)}}, nil
}

func moneyOfPtr(amount *int64, currency string) *httpapi.Money {
	if amount == nil {
		return nil
	}
	return &httpapi.Money{AmountMinor: *amount, Currency: currency}
}

// isoOfMillis is toIso of a time held in milliseconds.
func isoOfMillis(ms int64) string { return httpapi.ToIso(time.UnixMilli(ms)) }
