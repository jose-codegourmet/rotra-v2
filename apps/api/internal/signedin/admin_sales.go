package signedin

import (
	"encoding/json"
	"net/http"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgtype"

	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/db/sqlcgen"
	httpapi "github.com/jose-codegourmet/rotra-v2/apps/api/internal/http"
	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/publicreads"
)

// The Sales views: GET /api/sales and GET /api/sales/clubs/{clubId}. Ports of packages/db/src/admin/sales.ts. Postgres
// computes every total (the rotra_sales_* functions); this only shapes the rows into the DTOs and applies the change
// chip of @rotra/data/sales/rules. The database role needs EXECUTE on those functions.

const (
	salesListLimit = 6 // SALES_LIST_LIMIT: the lists on the platform page
	clubSalesMonth = 6 // CLUB_SALES_MONTHS
	defaultPeriod  = "30d"
)

// salesPeriod is parseSalesPeriod: missing or empty means the default; any other unknown value is invalid.
func salesPeriod(raw string, found bool) (string, error) {
	if !found || raw == "" {
		return defaultPeriod, nil
	}
	switch raw {
	case "7d", "30d", "12m":
		return raw, nil
	}
	return "", &serviceError{code: httpapi.ErrInvalid}
}

// salesChange is the change chip: no history, no change, new, or a whole percent.
type salesChange struct {
	Kind    string `json:"kind"`
	Percent *int64 `json:"percent,omitempty"`
}

func changeOf(current, previous int64, comparable bool) salesChange {
	switch {
	case !comparable:
		return salesChange{Kind: "no-history"}
	case previous == 0 && current == 0:
		return salesChange{Kind: "no-change"}
	case previous == 0:
		return salesChange{Kind: "new"}
	}
	p := jsRound(float64(current-previous) / float64(previous) * 100)
	return salesChange{Kind: "change", Percent: &p}
}

type bucketOf[V any] struct {
	Start string `json:"start"`
	Value V      `json:"value"`
}

type metricOf[V any] struct {
	Value    V             `json:"value"`
	Previous V             `json:"previous"`
	Change   salesChange   `json:"change"`
	Buckets  []bucketOf[V] `json:"buckets"`
}

type bucketRow struct {
	BucketStart          string  `json:"bucket_start"`
	PreviousStart        string  `json:"previous_start"`
	RevenueMinor         int64   `json:"revenue_minor"`
	Sessions             int64   `json:"sessions"`
	Matches              int64   `json:"matches"`
	PreviousRevenueMinor int64   `json:"previous_revenue_minor"`
	PreviousSessions     int64   `json:"previous_sessions"`
	PreviousMatches      int64   `json:"previous_matches"`
	FirstLicensedOn      *string `json:"first_licensed_on"`
}

// metric is metricOf: the totals of the period and the one before, the chip and the bars, oldest first.
func metric[V any](rows []bucketRow, cur, prev func(bucketRow) int64, comparable bool, wrap func(int64) V) metricOf[V] {
	var value, before int64
	buckets := make([]bucketOf[V], 0, len(rows))
	for _, r := range rows {
		value += cur(r)
		before += prev(r)
		buckets = append(buckets, bucketOf[V]{Start: r.BucketStart, Value: wrap(cur(r))})
	}
	return metricOf[V]{Value: wrap(value), Previous: wrap(before), Change: changeOf(value, before, comparable), Buckets: buckets}
}

func planLabel(plan string) string {
	if plan == "yearly" {
		return "Yearly"
	}
	return "Monthly"
}

func decodeRows[T any](raw [][]byte) ([]T, error) {
	out := make([]T, 0, len(raw))
	for _, b := range raw {
		var v T
		if err := json.Unmarshal(b, &v); err != nil {
			return nil, err
		}
		out = append(out, v)
	}
	return out, nil
}

type planRow struct {
	Plan       string `json:"plan"`
	TotalMinor int64  `json:"total_minor"`
	Payments   int64  `json:"payments"`
}

type paymentRow struct {
	TermID      string `json:"term_id"`
	ClubID      string `json:"club_id"`
	ClubName    string `json:"club_name"`
	Plan        string `json:"plan"`
	PaidOn      string `json:"paid_on"`
	AmountMinor int64  `json:"amount_minor"`
}

type activityRow struct {
	ClubID    string `json:"club_id"`
	ClubName  string `json:"club_name"`
	Sessions  int64  `json:"sessions"`
	Matches   int64  `json:"matches"`
	PaidMinor int64  `json:"paid_minor"`
}

func (s *server) adminSales(r *http.Request, q *sqlcgen.Queries) (any, error) {
	raw, found := publicreads.QueryValue(r.URL.RawQuery, "period")
	period, err := salesPeriod(raw, found)
	if err != nil {
		return nil, err
	}
	today := manilaToday(s.now())
	day, err := parseDay(today)
	if err != nil {
		return nil, err
	}
	ctx := r.Context()
	bucketJSON, err := q.ListSalesPlatformBuckets(ctx, sqlcgen.ListSalesPlatformBucketsParams{Period: period, Today: day})
	if err != nil {
		return nil, err
	}
	planJSON, err := q.ListSalesRevenueByPlan(ctx, sqlcgen.ListSalesRevenueByPlanParams{Period: period, Today: day})
	if err != nil {
		return nil, err
	}
	paymentJSON, err := q.ListSalesRecentPayments(ctx, sqlcgen.ListSalesRecentPaymentsParams{Period: period, Today: day, MaxRows: salesListLimit})
	if err != nil {
		return nil, err
	}
	clubJSON, err := q.ListSalesMostActiveClubs(ctx, sqlcgen.ListSalesMostActiveClubsParams{Period: period, Today: day, MaxRows: salesListLimit})
	if err != nil {
		return nil, err
	}
	buckets, err := decodeRows[bucketRow](bucketJSON)
	if err != nil {
		return nil, err
	}
	plans, err := decodeRows[planRow](planJSON)
	if err != nil {
		return nil, err
	}
	payments, err := decodeRows[paymentRow](paymentJSON)
	if err != nil {
		return nil, err
	}
	clubs, err := decodeRows[activityRow](clubJSON)
	if err != nil {
		return nil, err
	}
	if len(buckets) == 0 {
		return nil, errNoBars // 'Sales period returned no bars': an unexpected failure
	}
	first := buckets[0]
	licensed := today
	if first.FirstLicensedOn != nil {
		licensed = *first.FirstLicensedOn
	}
	// The comparison needs the whole earlier period to start on or after the first licensed day.
	comparable := first.PreviousStart >= licensed

	type planDTO struct {
		Plan     string        `json:"plan"`
		Total    httpapi.Money `json:"total"`
		Payments int64         `json:"payments"`
	}
	type paymentDTO struct {
		TermID   string        `json:"termId"`
		ClubID   string        `json:"clubId"`
		ClubName string        `json:"clubName"`
		Plan     string        `json:"plan"`
		PaidOn   string        `json:"paidOn"`
		Amount   httpapi.Money `json:"amount"`
	}
	type activityDTO struct {
		ClubID   string        `json:"clubId"`
		ClubName string        `json:"clubName"`
		Sessions int64         `json:"sessions"`
		Matches  int64         `json:"matches"`
		Paid     httpapi.Money `json:"paid"`
	}
	id := func(n int64) int64 { return n }
	report := struct {
		Period          string                  `json:"period"`
		BucketUnit      string                  `json:"bucketUnit"`
		Today           string                  `json:"today"`
		From            string                  `json:"from"`
		To              string                  `json:"to"`
		Revenue         metricOf[httpapi.Money] `json:"revenue"`
		SessionsStarted metricOf[int64]         `json:"sessionsStarted"`
		MatchesPlayed   metricOf[int64]         `json:"matchesPlayed"`
		RevenueByPlan   []planDTO               `json:"revenueByPlan"`
		RecentPayments  []paymentDTO            `json:"recentPayments"`
		MostActiveClubs []activityDTO           `json:"mostActiveClubs"`
	}{
		Period: period, BucketUnit: "day", Today: today, From: first.BucketStart, To: today,
		Revenue:         metric(buckets, func(b bucketRow) int64 { return b.RevenueMinor }, func(b bucketRow) int64 { return b.PreviousRevenueMinor }, comparable, peso),
		SessionsStarted: metric(buckets, func(b bucketRow) int64 { return b.Sessions }, func(b bucketRow) int64 { return b.PreviousSessions }, comparable, id),
		MatchesPlayed:   metric(buckets, func(b bucketRow) int64 { return b.Matches }, func(b bucketRow) int64 { return b.PreviousMatches }, comparable, id),
		RevenueByPlan:   []planDTO{}, RecentPayments: []paymentDTO{}, MostActiveClubs: []activityDTO{},
	}
	if period == "12m" {
		report.BucketUnit = "month"
	}
	for _, p := range plans {
		report.RevenueByPlan = append(report.RevenueByPlan, planDTO{Plan: planLabel(p.Plan), Total: peso(p.TotalMinor), Payments: p.Payments})
	}
	for _, p := range payments {
		report.RecentPayments = append(report.RecentPayments, paymentDTO{TermID: p.TermID, ClubID: p.ClubID, ClubName: p.ClubName, Plan: planLabel(p.Plan), PaidOn: p.PaidOn, Amount: peso(p.AmountMinor)})
	}
	for _, c := range clubs {
		report.MostActiveClubs = append(report.MostActiveClubs, activityDTO{ClubID: c.ClubID, ClubName: c.ClubName, Sessions: c.Sessions, Matches: c.Matches, Paid: peso(c.PaidMinor)})
	}
	return struct {
		Report any `json:"report"`
	}{report}, nil
}

// parseDay reads a YYYY-MM-DD day as a database date.
func parseDay(day string) (pgtype.Date, error) {
	var d pgtype.Date
	err := d.Scan(day)
	return d, err
}

type monthRow struct {
	Month               string `json:"month"`
	PaidMinor           int64  `json:"paid_minor"`
	Sessions            int64  `json:"sessions"`
	Matches             int64  `json:"matches"`
	CostPerSessionMinor int64  `json:"cost_per_session_minor"`
}

// perSession is paid divided by sessions, rounded to the centavo; null with no sessions.
func perSession(paid, sessions int64) *httpapi.Money {
	if sessions == 0 {
		return nil
	}
	m := peso(jsRound(float64(paid) / float64(sessions)))
	return &m
}

// adminClubSales is readClubSales: the last six months of one club against the Admin cost per session. An ID that is
// not a UUID, or a club that does not exist, is 404.
func (s *server) adminClubSales(r *http.Request, q *sqlcgen.Queries) (any, error) {
	raw := r.PathValue("clubId")
	id, ok := uuidKey(raw)
	if !ok {
		return nil, errNotFound
	}
	ctx := r.Context()
	club, err := q.GetClubSalesPricing(ctx, id)
	if err == pgx.ErrNoRows {
		return nil, errNotFound
	}
	if err != nil {
		return nil, err
	}
	today := manilaToday(s.now())
	day, err := parseDay(today)
	if err != nil {
		return nil, err
	}
	monthJSON, err := q.ListSalesClubMonths(ctx, sqlcgen.ListSalesClubMonthsParams{ClubID: id, Today: day, Months: clubSalesMonth})
	if err != nil {
		return nil, err
	}
	rows, err := decodeRows[monthRow](monthJSON)
	if err != nil {
		return nil, err
	}
	if len(rows) != clubSalesMonth {
		return nil, errNoSettings // 'Admin settings row is missing': an unexpected failure
	}
	type monthDTO struct {
		Month          string         `json:"month"`
		Paid           httpapi.Money  `json:"paid"`
		Sessions       int64          `json:"sessions"`
		Matches        int64          `json:"matches"`
		PaidPerSession *httpapi.Money `json:"paidPerSession"`
		EstimatedCost  httpapi.Money  `json:"estimatedCost"`
		LeftOver       httpapi.Money  `json:"leftOver"`
	}
	cost := rows[0].CostPerSessionMinor
	months := make([]monthDTO, 0, len(rows))
	var paid, sessions, matches, estimated int64
	for _, m := range rows {
		est := m.Sessions * cost
		d := monthDTO{Month: m.Month, Paid: peso(m.PaidMinor), Sessions: m.Sessions, Matches: m.Matches, EstimatedCost: peso(est), LeftOver: peso(m.PaidMinor - est)}
		if m.PaidMinor != 0 {
			d.PaidPerSession = perSession(m.PaidMinor, m.Sessions)
		}
		months = append(months, d)
		paid, sessions, matches, estimated = paid+m.PaidMinor, sessions+m.Sessions, matches+m.Matches, estimated+est
	}
	var list *httpapi.Money
	if club.LicensePricing != sqlcgen.LicensePricingFree {
		m := peso(int64(club.LicenseMonthlyMinor.Int32)) // ?? 0 for a missing price
		list = &m
	}
	return struct {
		Report any `json:"report"`
	}{struct {
		ClubID           string         `json:"clubId"`
		Today            string         `json:"today"`
		Pricing          string         `json:"pricing"`
		MonthlyListPrice *httpapi.Money `json:"monthlyListPrice"`
		CostPerSession   httpapi.Money  `json:"costPerSession"`
		Months           []monthDTO     `json:"months"`
		Totals           struct {
			Paid           httpapi.Money  `json:"paid"`
			Sessions       int64          `json:"sessions"`
			Matches        int64          `json:"matches"`
			PaidPerSession *httpapi.Money `json:"paidPerSession"`
			EstimatedCost  httpapi.Money  `json:"estimatedCost"`
			LeftOver       httpapi.Money  `json:"leftOver"`
		} `json:"totals"`
	}{
		ClubID: raw, Today: today, Pricing: string(club.LicensePricing), MonthlyListPrice: list, CostPerSession: peso(cost), Months: months,
		Totals: struct {
			Paid           httpapi.Money  `json:"paid"`
			Sessions       int64          `json:"sessions"`
			Matches        int64          `json:"matches"`
			PaidPerSession *httpapi.Money `json:"paidPerSession"`
			EstimatedCost  httpapi.Money  `json:"estimatedCost"`
			LeftOver       httpapi.Money  `json:"leftOver"`
		}{Paid: peso(paid), Sessions: sessions, Matches: matches, PaidPerSession: perSession(paid, sessions), EstimatedCost: peso(estimated), LeftOver: peso(paid - estimated)},
	}}, nil
}
