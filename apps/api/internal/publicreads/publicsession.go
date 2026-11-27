package publicreads

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"log/slog"
	"math"
	"net/http"
	"slices"
	"sort"
	"strconv"
	"strings"
	"unicode/utf16"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgtype"
	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/db/sqlcgen"
	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/rules/sessioncost"
)

// GET /api/public-sessions/{slug}: the public session page for a visitor. A port of readPublicSession in
// packages/db/src/queue/public-session.ts, as Queue's handlePublicRead('public-session.page') calls it.
//
// SCOPE: the visitor view only. Participant and waitlist names are masked, skillMix is counts, and nothing
// carries a phone, presence, costs or a private result. Go reads no cookie, so a sign-in changes nothing; the
// signed-in view (registered full names, D-2026-11-09-09) and the personal parts (my request, my night, join
// request) stay on their Route Handlers until Go can verify a sign-in.
//
// The built page is shared for the snapshot TTL per slug and view (snapshotcache.go), so the read is cheap however
// many phones ask. Only a 200 body is shared; a not_found or an error is answered fresh each time.

type publicSessions struct {
	pool  *pgxpool.Pool
	log   *slog.Logger
	cache *snapshotCache
}

// publicSessionDTO is the allowlisted PublicSessionPage, key for key in the order the TypeScript builds it.
type publicSessionDTO struct {
	Slug             string               `json:"slug"`
	Status           string               `json:"status"`
	Title            string               `json:"title"`
	Start            int64                `json:"start"`
	End              int64                `json:"end"`
	Club             publicSessionClub    `json:"club"`
	Venue            publicSessionVenue   `json:"venue"`
	Courts           []string             `json:"courts"`
	Formats          publicSessionFormats `json:"formats"`
	Mode             string               `json:"mode"`
	LevelRestriction levelRestriction     `json:"levelRestriction"`
	Minimum          int32                `json:"minimum"`
	Notes            *string              `json:"notes"`
	ParticipantCount int                  `json:"participantCount"`
	Participants     []publicPerson       `json:"participants"`
	SkillMix         publicSkillMix       `json:"skillMix"`
	Hosts            []publicPerson       `json:"hosts"`
	Waitlist         []publicPerson       `json:"waitlist"`
	OpenSlots        int                  `json:"openSlots"`
	SlotBudget       int                  `json:"slotBudget"`
	AcceptJoin       bool                 `json:"acceptJoinRequests"`
	AlwaysRequire    bool                 `json:"alwaysRequireRequest"`
	AmountDue        *int64               `json:"amountDuePerPlayer"`
	RecordGames      bool                 `json:"recordGames"`
	LastSyncedAt     int64                `json:"lastSyncedAt"`
	HasPending       bool                 `json:"hasPendingChanges"`
	Results          *orderedObject       `json:"results"`
}

type publicSessionClub struct {
	ID       string      `json:"id"`
	Name     string      `json:"name"`
	Initials utf16String `json:"initials"`
	LogoURL  *string     `json:"logoUrl"`
}

type publicSessionVenue struct {
	Name    string  `json:"name"`
	Address *string `json:"address"`
}

type publicSessionFormats struct {
	Singles bool `json:"singles"`
	Doubles bool `json:"doubles"`
}

// publicPerson is one masked participant or waitlist entry: a masked name, a picture, and the level ring.
type publicPerson struct {
	Name       string  `json:"name"`
	PictureURL *string `json:"pictureUrl"`
	SkillGroup *string `json:"skillGroup"`
	LevelLabel *string `json:"levelLabel"`
}

type publicSkillMix struct {
	Beginner     int `json:"beginner"`
	Intermediate int `json:"intermediate"`
	Advanced     int `json:"advanced"`
	Unrated      int `json:"unrated"`
}

// validSlug is what a public slug can be. queue_sessions_public_slug_check allows only ^[a-z0-9-]{4,64}$, so
// anything else names no session: it is answered not_found before the cache and the database see it.
func validSlug(s string) bool {
	if len(s) < 4 || len(s) > 64 {
		return false
	}
	for i := 0; i < len(s); i++ {
		c := s[i]
		if (c < 'a' || c > 'z') && (c < '0' || c > '9') && c != '-' {
			return false
		}
	}
	return true
}

// SnapshotVersionHeader carries the snapshot version of the copy a read answered with, on a read that sent minVersion. A
// screen told "version N" by a live message asks again with minVersion=N and gets a copy at least that new.
const SnapshotVersionHeader = "X-Rotra-Snapshot-Version"

// minVersion reads the version a screen asks for. Anything that is not a whole number of 0 or more asks for no version.
func minVersion(r *http.Request) int64 {
	n, err := strconv.ParseInt(r.URL.Query().Get("minVersion"), 10, 64)
	if err != nil || n < 0 {
		return 0
	}
	return n
}

func (p *publicSessions) page(w http.ResponseWriter, r *http.Request) {
	slug := r.PathValue("slug")
	if !validSlug(slug) {
		notFound(w)
		return
	}
	snap, err := p.cache.getAt(r.Context(), snapshotKey{slug: slug, view: viewVisitor}, minVersion(r), func(ctx context.Context) (snapshot, error) {
		return p.build(ctx, slug)
	})
	switch {
	case err == nil:
		h := w.Header()
		h.Set("Cache-Control", "public, max-age=0, must-revalidate")
		h.Set("Content-Type", "application/json")
		if r.URL.Query().Has("minVersion") {
			// Only a screen that asked for a version is told which one it got: a plain read keeps the answer the Route Handler gave.
			h.Set(SnapshotVersionHeader, strconv.FormatInt(snap.version, 10))
		}
		w.WriteHeader(http.StatusOK)
		_, _ = w.Write(snap.body)
	case errors.Is(err, errPageNotFound):
		notFound(w)
	case r.Context().Err() != nil:
		// the client left; there is nobody to answer
	default:
		failRead(w, r, p.log, "public session read failed", err)
	}
}

// build reads one page from one repeatable-read snapshot and returns its JSON with the session's snapshot version.
func (p *publicSessions) build(ctx context.Context, slug string) (snapshot, error) {
	var dto publicSessionDTO
	var version int64
	var session pgtype.UUID
	err := readTx(ctx, p.pool, func(q *sqlcgen.Queries) error {
		s, err := q.GetPublicSessionBySlug(ctx, slug)
		if errors.Is(err, pgx.ErrNoRows) {
			return errPageNotFound
		}
		if err != nil {
			return fmt.Errorf("reading session: %w", err)
		}
		// A page removed by retention is gone for the public; the session and its history are not.
		if s.PublicationDeleted {
			return errPageNotFound
		}
		if version, err = q.GetSessionSnapshotVersion(ctx, s.ID); err != nil {
			return fmt.Errorf("reading the snapshot version: %w", err)
		}
		session = s.ID
		labels, err := q.ListPublicSessionCourts(ctx, s.ID)
		if err != nil {
			return fmt.Errorf("listing courts: %w", err)
		}
		roster, err := q.ListPublicSessionRoster(ctx, s.ID)
		if err != nil {
			return fmt.Errorf("listing roster: %w", err)
		}
		waitRows, err := q.ListPublicSessionWaitlist(ctx, s.ID)
		if err != nil {
			return fmt.Errorf("listing waitlist: %w", err)
		}
		hostRows, err := q.ListPublicSessionHosts(ctx, sqlcgen.ListPublicSessionHostsParams{SessionID: s.ID, Ended: s.State == sqlcgen.QueueSessionStateCompleted || s.State == sqlcgen.QueueSessionStateInvalid})
		if err != nil {
			return fmt.Errorf("listing hosts: %w", err)
		}
		amountDue, err := publicAmountDue(ctx, q, s, len(labels), len(roster))
		if err != nil {
			return err
		}
		var results *orderedObject
		// Record games off (D-2026-11-18-06): the session has no results, whatever rows exist.
		if s.State == sqlcgen.QueueSessionStateCompleted && s.RecordGames {
			raw, err := q.GetPublishedResults(ctx, s.ID)
			if err != nil && !errors.Is(err, pgx.ErrNoRows) {
				return fmt.Errorf("reading published results: %w", err)
			}
			if results, err = resultsWithPictures(raw, roster); err != nil {
				return fmt.Errorf("reading published results: %w", err)
			}
		}
		dto = sessionPage(s, labels, roster, orderedWaitlist(waitRows), hostRows, results)
		dto.AmountDue = amountDue
		return nil
	})
	if err != nil {
		return snapshot{}, err
	}
	body, err := json.Marshal(dto)
	if err != nil {
		return snapshot{}, fmt.Errorf("encoding page: %w", err)
	}
	return snapshot{body: body, version: version, session: uuid.UUID(session.Bytes)}, nil
}

func sessionPage(s sqlcgen.GetPublicSessionBySlugRow, labels []string, roster []sqlcgen.ListPublicSessionRosterRow,
	waitlist []sqlcgen.ListPublicSessionWaitlistRow, hostRows []sqlcgen.ListPublicSessionHostsRow, results *orderedObject) publicSessionDTO {
	capacity := len(labels) * int(s.PlayersPerCourt)
	participants := make([]publicPerson, 0, min(len(roster), 12))
	levels := make([]pgtype.Int2, 0, len(roster))
	for i, entry := range roster {
		levels = append(levels, entry.SkillLevelID)
		if i < 12 { // the page shows the first twelve; skillMix and the count cover everyone
			participants = append(participants, newPublicPerson(maskPublicName(entry.NameSnapshot), pictureOf(entry.HasProfile, entry.ProfileAvatarRef, entry.SavedAvatarRef), entry.SkillLevelID))
		}
	}
	people := make([]publicPerson, 0, len(waitlist))
	for _, w := range waitlist {
		name := ""
		if w.ClubPlayerDisplayName.Valid {
			name = w.ClubPlayerDisplayName.String
		}
		people = append(people, newPublicPerson(maskPublicName(name), pictureOf(w.HasProfile, w.ProfileAvatarRef, w.SavedAvatarRef), w.SkillLevelID))
	}
	// The Hosts section (#1006): the same masked name and picture as Players. A host who plays is also in `participants`; capacity and
	// counts read the roster only. A finished session shows the name the row froze with.
	ended := s.State == sqlcgen.QueueSessionStateCompleted || s.State == sqlcgen.QueueSessionStateInvalid
	hosts := make([]publicPerson, 0, len(hostRows))
	for _, h := range hostRows {
		placed := slices.IndexFunc(roster, func(r sqlcgen.ListPublicSessionRosterRow) bool { return r.ClubPlayerID == h.ClubPlayerID })
		waiting := slices.IndexFunc(waitlist, func(w sqlcgen.ListPublicSessionWaitlistRow) bool { return w.ClubPlayerID == h.ClubPlayerID })
		level := pgtype.Int2{}
		if h.AssessedLevelID >= 0 {
			level = pgtype.Int2{Int16: h.AssessedLevelID, Valid: true}
		}
		if waiting >= 0 && waitlist[waiting].SkillLevelID.Valid {
			level = waitlist[waiting].SkillLevelID
		}
		name := h.DisplayName
		if ended {
			name = h.NameSnapshot
		}
		if placed >= 0 {
			if roster[placed].SkillLevelID.Valid {
				level = roster[placed].SkillLevelID
			}
			if !ended {
				name = roster[placed].NameSnapshot
			}
		}
		hosts = append(hosts, newPublicPerson(maskPublicName(name), pictureOf(h.HasProfile, h.ProfileAvatarRef, h.SavedAvatarRef), level))
	}
	status := string(s.State)
	if s.State == sqlcgen.QueueSessionStateFinalizing {
		status = string(sqlcgen.QueueSessionStateActive) // Session done has not committed yet
	}
	takesRequests := s.State == sqlcgen.QueueSessionStatePrepared || s.State == sqlcgen.QueueSessionStateActive
	if labels == nil {
		labels = []string{}
	}
	return publicSessionDTO{
		Slug: s.PublicSlug, Status: status, Title: s.Title,
		Start: s.ScheduledStartAt.Time.UnixMilli(), End: s.ScheduledEndAt.Time.UnixMilli(),
		Club:    publicSessionClub{ID: s.ClubID.String(), Name: s.ClubName, Initials: clubInitials(s.ClubName), LogoURL: textPtr(s.ClubLogoRef)},
		Venue:   publicSessionVenue{Name: s.VenueName.String, Address: textPtr(s.VenueAddress)},
		Courts:  labels,
		Formats: publicSessionFormats{Singles: s.AllowSingles, Doubles: s.AllowDoubles},
		Mode:    string(s.SessionMode), LevelRestriction: restrictionOf(s), Minimum: s.MinimumGames, Notes: textPtr(s.Notes),
		ParticipantCount: len(roster), Participants: participants, SkillMix: skillMix(levels), Hosts: hosts, Waitlist: people,
		OpenSlots: max(0, capacity-len(roster)), SlotBudget: capacity,
		AcceptJoin: s.AcceptJoinRequests && takesRequests, AlwaysRequire: s.AlwaysRequireRequest,
		RecordGames:  s.RecordGames,
		LastSyncedAt: s.UpdatedAt.Time.UnixMilli(), HasPending: s.HasPendingChanges, Results: results,
	}
}

// pictureOf is pictureOf: a saved player with a profile shows the profile's picture (even none); a guest or unclaimed record, the club's.
func pictureOf(hasProfile bool, profile, saved pgtype.Text) pgtype.Text {
	if hasProfile {
		return profile
	}
	return saved
}

// newPublicPerson is a masked name, the picture, and publicLevel(levelCodeFor(id)).
func newPublicPerson(maskedName string, avatar pgtype.Text, level pgtype.Int2) publicPerson {
	p := publicPerson{Name: maskedName, PictureURL: textPtr(avatar)}
	if code := levelOf(level); code != nil {
		group, tier, _ := strings.Cut(*code, "_")
		g, label := group, capitalize(group)+" "+capitalize(tier)
		p.SkillGroup, p.LevelLabel = &g, &label
	}
	return p
}

// levelOf is levelCodeFor: no level, or an id outside the nine levels, is no level.
func levelOf(id pgtype.Int2) *string {
	if !id.Valid {
		return nil
	}
	return levelCode(id.Int16)
}

func capitalize(s string) string {
	if s == "" {
		return s
	}
	return strings.ToUpper(s[:1]) + s[1:]
}

// skillMix is publicSkillMix: counts over the whole live roster, a missing or unknown level is unrated.
func skillMix(levels []pgtype.Int2) publicSkillMix {
	var m publicSkillMix
	for _, id := range levels {
		code := levelOf(id)
		if code == nil {
			m.Unrated++
			continue
		}
		switch group, _, _ := strings.Cut(*code, "_"); group {
		case "beginner":
			m.Beginner++
		case "intermediate":
			m.Intermediate++
		default:
			m.Advanced++
		}
	}
	return m
}

// orderedWaitlist is orderedWaitlist in session-store.ts: strictly by the time each entry joined the waitlist (the
// demotion time for a player moved off the roster, otherwise the arrival), a demotion batch in its original slot
// order, the id last. Every time compares at the millisecond the TypeScript's Date has, and a missing slot time
// counts as 0.
func orderedWaitlist(rows []sqlcgen.ListPublicSessionWaitlistRow) []sqlcgen.ListPublicSessionWaitlistRow {
	ms := func(t pgtype.Timestamptz) int64 {
		if !t.Valid {
			return 0
		}
		return t.Time.UnixMilli()
	}
	joined := func(r sqlcgen.ListPublicSessionWaitlistRow) int64 {
		if r.DemotedAt.Valid {
			return ms(r.DemotedAt)
		}
		return ms(r.AddedAt)
	}
	out := append([]sqlcgen.ListPublicSessionWaitlistRow(nil), rows...)
	sort.SliceStable(out, func(i, j int) bool {
		a, b := out[i], out[j]
		if d := joined(a) - joined(b); d != 0 {
			return d < 0
		}
		if d := ms(a.DemotedConfirmedAt) - ms(b.DemotedConfirmedAt); d != 0 {
			return d < 0
		}
		return a.ID.String() < b.ID.String()
	})
	return out
}

// ---- published results ----

// orderedObject is a JSON object that keeps its keys in the order they were read: the TypeScript spreads the
// stored copy and appends to it, so the order on the wire is the stored order plus what was added.
type orderedObject struct {
	keys []string
	vals map[string]any
}

func (o *orderedObject) set(key string, v any) {
	if _, ok := o.vals[key]; !ok {
		o.keys = append(o.keys, key)
	}
	o.vals[key] = v
}

func (o *orderedObject) MarshalJSON() ([]byte, error) {
	var b bytes.Buffer
	b.WriteByte('{')
	for i, k := range o.keys {
		if i > 0 {
			b.WriteByte(',')
		}
		kb, err := json.Marshal(k)
		if err != nil {
			return nil, fmt.Errorf("encoding key: %w", err)
		}
		vb, err := json.Marshal(o.vals[k])
		if err != nil {
			return nil, fmt.Errorf("encoding value: %w", err)
		}
		b.Write(kb)
		b.WriteByte(':')
		b.Write(vb)
	}
	b.WriteByte('}')
	return b.Bytes(), nil
}

// decodeOrdered reads JSON keeping object key order; numbers become float64, which prints as JavaScript does.
func decodeOrdered(raw []byte) (any, error) {
	dec := json.NewDecoder(bytes.NewReader(raw))
	v, err := readOrdered(dec)
	if err != nil {
		return nil, err
	}
	if _, err := dec.Token(); !errors.Is(err, io.EOF) {
		return nil, errors.New("trailing data after JSON value")
	}
	return v, nil
}

func readOrdered(dec *json.Decoder) (any, error) {
	tok, err := dec.Token()
	if err != nil {
		return nil, fmt.Errorf("reading JSON: %w", err)
	}
	d, isDelim := tok.(json.Delim)
	if !isDelim {
		return tok, nil // string, float64, bool or nil
	}
	switch d {
	case '{':
		obj := &orderedObject{vals: map[string]any{}}
		for dec.More() {
			kt, err := dec.Token()
			if err != nil {
				return nil, fmt.Errorf("reading JSON key: %w", err)
			}
			v, err := readOrdered(dec)
			if err != nil {
				return nil, err
			}
			obj.set(kt.(string), v)
		}
		if _, err := dec.Token(); err != nil {
			return nil, fmt.Errorf("reading JSON: %w", err)
		}
		return obj, nil
	case '[':
		arr := []any{}
		for dec.More() {
			v, err := readOrdered(dec)
			if err != nil {
				return nil, err
			}
			arr = append(arr, v)
		}
		if _, err := dec.Token(); err != nil {
			return nil, fmt.Errorf("reading JSON: %w", err)
		}
		return arr, nil
	}
	return nil, fmt.Errorf("unexpected JSON delimiter %v", d)
}

// resultsWithPictures is withResultPictures: the published copy holds names and counts only, so each standings
// row, Off Day row and award winner gets its picture, and its `participant` (the index in the live roster, the
// order `participants` shows), from the live roster by name. A name two roster entries share gets neither.
// A registered player who is not public is masked in those rows as in the participant list, and a name shared with
// such a player is masked too (B-56). No published copy is null. Every other key passes through as stored.
func resultsWithPictures(raw []byte, roster []sqlcgen.ListPublicSessionRosterRow) (*orderedObject, error) {
	if len(raw) == 0 {
		return nil, nil
	}
	v, err := decodeOrdered(raw)
	if err != nil {
		return nil, err
	}
	out, ok := v.(*orderedObject)
	if !ok {
		return nil, nil // the table's CHECK keeps public_results an object
	}
	type face struct {
		picture *string
		index   int
	}
	seen := map[string]face{}
	clash := map[string]bool{}
	maskedNames := map[string]bool{}
	for i, entry := range roster {
		if entry.ResultMasked {
			maskedNames[entry.NameSnapshot] = true
		}
		if _, dup := seen[entry.NameSnapshot]; dup {
			clash[entry.NameSnapshot] = true
		} else {
			seen[entry.NameSnapshot] = face{picture: textPtr(pictureOf(entry.HasProfile, entry.ProfileAvatarRef, entry.SavedAvatarRef)), index: i}
		}
	}
	addFace := func(row any) any {
		obj, ok := row.(*orderedObject)
		if !ok {
			return row
		}
		nameVal, has := obj.vals["name"]
		if !has {
			return row
		}
		name, isString := nameVal.(string)
		if isString && maskedNames[name] {
			obj.set("name", maskPublicName(name))
		}
		var picture any
		if f, found := seen[name]; isString && found && !clash[name] {
			if f.picture != nil {
				picture = *f.picture
			}
			obj.set("pictureUrl", picture)
			obj.set("participant", float64(f.index))
		} else {
			obj.set("pictureUrl", nil)
		}
		return obj
	}
	// Published copies saved before shared positions (or with gaps) show 1, 1, 2 (owner, November 20, 2026).
	if rows, ok := out.vals["standings"].([]any); ok {
		shared, err := sharePositionsOf(rows)
		if err != nil {
			return nil, err
		}
		out.vals["standings"] = shared
	}
	for _, key := range []string{"standings", "offDay"} {
		if rows, ok := out.vals[key].([]any); ok {
			for i := range rows {
				rows[i] = addFace(rows[i])
			}
		}
	}
	switch awards := out.vals["awards"].(type) {
	case *orderedObject:
		for _, key := range []string{"mvp", "mostImproved"} {
			if winner, present := awards.vals[key]; present {
				awards.vals[key] = addFace(winner)
			}
		}
	case []any:
		// {...awards} of an array: its items under the keys "0", "1", ... (the publish path never writes this)
		spread := &orderedObject{vals: map[string]any{}}
		for i, item := range awards {
			spread.set(strconv.Itoa(i), item)
		}
		out.vals["awards"] = spread
	}
	return out, nil
}

// levelRestriction is LevelRestriction on the wire (levelRestrictionDto): the kind, and the slots per level for Slots per level.
type levelRestriction struct {
	Kind  string      `json:"kind"`
	Slots *levelSlots `json:"slots,omitempty"`
}

type levelSlots struct {
	Beginner     int32 `json:"beginner"`
	Intermediate int32 `json:"intermediate"`
	Advanced     int32 `json:"advanced"`
}

func restrictionOf(s sqlcgen.GetPublicSessionBySlugRow) levelRestriction {
	switch s.LevelRestriction {
	case sqlcgen.LevelRestrictionBeginners:
		return levelRestriction{Kind: "beginners"}
	case sqlcgen.LevelRestrictionBeginnersIntermediate:
		return levelRestriction{Kind: "beginners-intermediate"}
	case sqlcgen.LevelRestrictionSlotsPerBand:
		return levelRestriction{Kind: "per-level", Slots: &levelSlots{Beginner: s.BeginnerSlots.Int32, Intermediate: s.IntermediateSlots.Int32, Advanced: s.AdvancedSlots.Int32}}
	}
	return levelRestriction{Kind: "all"}
}

// publicAmountDue is amountDuePerHead of estimateFor (Details > Payment, D-2026-11-25-05): the amount each player pays, never the cost lines.
// Nil with no estimate saved. The head count is the roster, else the expected players, else the slots. Free roster players
// (D-2026-11-27-01) are not read yet: the Go cost rule has no free players (task 2.12).
func publicAmountDue(ctx context.Context, q *sqlcgen.Queries, s sqlcgen.GetPublicSessionBySlugRow, courts, roster int) (*int64, error) {
	est, err := q.GetQueueCostEstimate(ctx, s.ID)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, nil
	}
	if err != nil {
		return nil, fmt.Errorf("reading cost estimate: %w", err)
	}
	lines, err := q.ListQueueShuttlePlanLines(ctx, s.ID)
	if err != nil {
		return nil, fmt.Errorf("reading shuttle plan: %w", err)
	}
	prices, err := q.ListQueueClubInventoryPrices(ctx, s.ClubID)
	if err != nil {
		return nil, fmt.Errorf("reading prices: %w", err)
	}
	opt := func(v pgtype.Int4) *int64 {
		if !v.Valid {
			return nil
		}
		n := int64(v.Int32)
		return &n
	}
	in := sessioncost.Input{CourtFeePerCourtHour: opt(est.CourtFeePerCourtHourMinor), EntranceFeePerHead: opt(est.EntranceFeePerHeadMinor),
		PaymentMode: string(est.PaymentMode), CustomFeePerHead: opt(est.CustomFeePerHeadMinor)}
	for _, l := range lines {
		in.Shuttles = append(in.Shuttles, sessioncost.ShuttleLine{InventoryItemID: l.InventoryItemID.String(), Tubes: int64(l.Tubes)})
	}
	items := make([]sessioncost.Item, 0, len(prices))
	for _, p := range prices {
		items = append(items, sessioncost.Item{ID: p.ID.String(), UnitCostMinor: int64(p.UnitCostMinor)})
	}
	players := int64(roster)
	if players == 0 {
		players = int64(s.ExpectedPlayers.Int32)
	}
	if players == 0 {
		players = int64(courts) * int64(s.PlayersPerCourt)
	}
	minutes := max(0, int64(math.Floor(float64(s.ScheduledEndAt.Time.UnixMilli()-s.ScheduledStartAt.Time.UnixMilli())/60000+0.5)))
	r := sessioncost.Estimate(in, sessioncost.Context{Courts: int64(courts), DurationMinutes: minutes, Players: players, Items: items})
	return sessioncost.AmountDue(&r), nil
}

// sharePositionsOf is sharePositions applied to a stored copy of any shape: a row is spread into a new object (so a string row becomes its
// indexed characters, a list its indexed items, a number or a boolean nothing) and takes the position of the row above when the wins and
// the losses read the same (both missing reads the same), else the next. A null row is the TypeScript's TypeError: the read fails.
func sharePositionsOf(rows []any) ([]any, error) {
	out := make([]any, 0, len(rows))
	read := func(v any, key string) any {
		if o, ok := v.(*orderedObject); ok {
			return o.vals[key]
		}
		return nil
	}
	for _, row := range rows {
		if row == nil {
			return nil, errors.New("a standings row is null")
		}
		position := float64(1)
		if len(out) > 0 {
			above := out[len(out)-1]
			position, _ = read(above, "position").(float64)
			if !jsStrictEqual(read(above, "wins"), read(row, "wins")) || !jsStrictEqual(read(above, "losses"), read(row, "losses")) {
				position++
			}
		}
		spread := &orderedObject{vals: map[string]any{}}
		switch r := row.(type) {
		case *orderedObject:
			for _, k := range r.keys {
				spread.set(k, r.vals[k])
			}
		case string:
			i := 0
			for _, u := range utf16.Encode([]rune(r)) {
				spread.set(strconv.Itoa(i), string(rune(u)))
				i++
			}
		case []any:
			for i, item := range r {
				spread.set(strconv.Itoa(i), item)
			}
		}
		spread.set("position", position)
		out = append(out, spread)
	}
	return out, nil
}

// jsStrictEqual is === for decoded JSON: numbers and strings by value, a missing value equal to a missing value, containers never.
func jsStrictEqual(a, b any) bool {
	switch x := a.(type) {
	case nil:
		return b == nil
	case float64, string, bool:
		return a == b
	default:
		_ = x
		return false
	}
}
