package publicreads

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"log/slog"
	"net/http"
	"sort"
	"strconv"
	"strings"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgtype"
	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/db/sqlcgen"
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
	Minimum          int32                `json:"minimum"`
	Notes            *string              `json:"notes"`
	ParticipantCount int                  `json:"participantCount"`
	Participants     []publicPerson       `json:"participants"`
	SkillMix         publicSkillMix       `json:"skillMix"`
	Waitlist         []publicPerson       `json:"waitlist"`
	OpenSlots        int                  `json:"openSlots"`
	SlotBudget       int                  `json:"slotBudget"`
	AcceptJoin       bool                 `json:"acceptJoinRequests"`
	AlwaysRequire    bool                 `json:"alwaysRequireRequest"`
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

func (p *publicSessions) page(w http.ResponseWriter, r *http.Request) {
	slug := r.PathValue("slug")
	if !validSlug(slug) {
		notFound(w)
		return
	}
	body, err := p.cache.get(r.Context(), snapshotKey{slug: slug, view: viewVisitor}, func(ctx context.Context) ([]byte, error) {
		return p.build(ctx, slug)
	})
	switch {
	case err == nil:
		h := w.Header()
		h.Set("Cache-Control", "public, max-age=0, must-revalidate")
		h.Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusOK)
		_, _ = w.Write(body)
	case errors.Is(err, errPageNotFound):
		notFound(w)
	case r.Context().Err() != nil:
		// the client left; there is nobody to answer
	default:
		failRead(w, r, p.log, "public session read failed", err)
	}
}

// build reads one page from one repeatable-read snapshot and returns its JSON.
func (p *publicSessions) build(ctx context.Context, slug string) ([]byte, error) {
	var dto publicSessionDTO
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
		dto = sessionPage(s, labels, roster, orderedWaitlist(waitRows), results)
		return nil
	})
	if err != nil {
		return nil, err
	}
	body, err := json.Marshal(dto)
	if err != nil {
		return nil, fmt.Errorf("encoding page: %w", err)
	}
	return body, nil
}

func sessionPage(s sqlcgen.GetPublicSessionBySlugRow, labels []string, roster []sqlcgen.ListPublicSessionRosterRow,
	waitlist []sqlcgen.ListPublicSessionWaitlistRow, results *orderedObject) publicSessionDTO {
	capacity := len(labels) * int(s.PlayersPerCourt)
	participants := make([]publicPerson, 0, min(len(roster), 12))
	levels := make([]pgtype.Int2, 0, len(roster))
	for i, entry := range roster {
		levels = append(levels, entry.SkillLevelID)
		if i < 12 { // the page shows the first twelve; skillMix and the count cover everyone
			participants = append(participants, newPublicPerson(maskPublicName(entry.NameSnapshot), entry.AvatarRef, entry.SkillLevelID))
		}
	}
	people := make([]publicPerson, 0, len(waitlist))
	for _, w := range waitlist {
		name := ""
		if w.ClubPlayerDisplayName.Valid {
			name = w.ClubPlayerDisplayName.String
		}
		people = append(people, newPublicPerson(maskPublicName(name), w.AvatarRef, w.SkillLevelID))
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
		Mode:    string(s.SessionMode), Minimum: s.MinimumGames, Notes: textPtr(s.Notes),
		ParticipantCount: len(roster), Participants: participants, SkillMix: skillMix(levels), Waitlist: people,
		OpenSlots: max(0, capacity-len(roster)), SlotBudget: capacity,
		AcceptJoin: s.AcceptJoinRequests && takesRequests, AlwaysRequire: s.AlwaysRequireRequest,
		RecordGames:  s.RecordGames,
		LastSyncedAt: s.UpdatedAt.Time.UnixMilli(), HasPending: s.HasPendingChanges, Results: results,
	}
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

// orderedWaitlist is orderedWaitlist in session-store.ts: demoted entries first (latest demotion batch at the front,
// each batch in its original slot order), then everyone else by arrival, the id last. Every time compares at the
// millisecond the TypeScript's Date has, and a missing slot time counts as 0.
func orderedWaitlist(rows []sqlcgen.ListPublicSessionWaitlistRow) []sqlcgen.ListPublicSessionWaitlistRow {
	ms := func(t pgtype.Timestamptz) int64 {
		if !t.Valid {
			return 0
		}
		return t.Time.UnixMilli()
	}
	out := append([]sqlcgen.ListPublicSessionWaitlistRow(nil), rows...)
	sort.SliceStable(out, func(i, j int) bool {
		a, b := out[i], out[j]
		if a.DemotedAt.Valid && b.DemotedAt.Valid {
			if d := ms(b.DemotedAt) - ms(a.DemotedAt); d != 0 {
				return d < 0
			}
			if d := ms(a.DemotedConfirmedAt) - ms(b.DemotedConfirmedAt); d != 0 {
				return d < 0
			}
		} else if a.DemotedAt.Valid || b.DemotedAt.Valid {
			return a.DemotedAt.Valid
		}
		if d := ms(a.AddedAt) - ms(b.AddedAt); d != 0 {
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
			seen[entry.NameSnapshot] = face{picture: textPtr(entry.AvatarRef), index: i}
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
