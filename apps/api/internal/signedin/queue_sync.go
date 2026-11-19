package signedin

import (
	"context"
	"net/http"
	"strconv"
	"strings"
	"time"
	"unicode"

	"github.com/jackc/pgx/v5/pgtype"

	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/auth/store"
	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/db/sqlcgen"
	httpapi "github.com/jose-codegourmet/rotra-v2/apps/api/internal/http"
	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/publicreads"
)

// The Queue sync reads: GET /api/sync, GET /api/sessions/{sessionId}/sync and GET /api/sessions/{sessionId}/done-review.
// Ports of readClubSyncSummary, readSyncStatus and sessionCompleteness in packages/db/src/queue/sync.ts and of
// reviewSessionDone in packages/db/src/queue/finalization.ts. None of them writes or locks in the TypeScript, so none
// does here. The two sync reads make no entitlement check (the TypeScript makes none); the review makes the session one.

func (s *server) registerQueueSync(rt *Router) {
	club := store.AudienceClub
	rt.Handle("GET /api/sync", club, s.club(s.queueClubSync))
	rt.Handle("GET /api/sessions/{sessionId}/sync", club, s.club(s.queueSessionSync))
	rt.Handle("GET /api/sessions/{sessionId}/done-review", club, s.club(s.queueDoneReview))
}

// syncCompleteness is sessionCompleteness: proven only when no stream is open or sealed short, no conflict is open and
// no operation waits to be processed.
type syncCompleteness struct {
	Proven            bool  `json:"proven"`
	OpenStreams       int32 `json:"openStreams"`
	OpenConflicts     int32 `json:"openConflicts"`
	PendingOperations int32 `json:"pendingOperations"`
}

func readCompleteness(ctx context.Context, q *sqlcgen.Queries, session pgtype.UUID) (syncCompleteness, error) {
	c, err := q.GetQueueSyncCompleteness(ctx, session)
	if err != nil {
		return syncCompleteness{}, err
	}
	return syncCompleteness{
		Proven:      c.OpenStreams == 0 && c.OpenConflicts == 0 && c.PendingOperations == 0,
		OpenStreams: c.OpenStreams, OpenConflicts: c.OpenConflicts, PendingOperations: c.PendingOperations,
	}, nil
}

// queueClubSync is readClubSyncSummary: the prepared or active sessions whose records the server cannot prove complete.
func (s *server) queueClubSync(r *http.Request, q *sqlcgen.Queries, club pgtype.UUID) (any, error) {
	ctx := r.Context()
	ids, err := q.ListQueueClubOpenSessionIDs(ctx, club)
	if err != nil {
		return nil, err
	}
	incomplete := []string{}
	for _, id := range ids {
		c, err := readCompleteness(ctx, q, id)
		if err != nil {
			return nil, err
		}
		if !c.Proven {
			incomplete = append(incomplete, id.String())
		}
	}
	return struct {
		IncompleteSessionIDs []string `json:"incompleteSessionIds"`
		CheckedAt            string   `json:"checkedAt"`
	}{incomplete, httpapi.ToIso(s.now())}, nil
}

type syncStreamDTO struct {
	ID                      string  `json:"id"`
	SessionID               string  `json:"sessionId"`
	DeviceID                string  `json:"deviceId"`
	GenerationNo            int32   `json:"generationNo"`
	DownloadedRevision      string  `json:"downloadedRevision"`
	ContiguousSequence      string  `json:"contiguousSequence"`
	HighestReceivedSequence string  `json:"highestReceivedSequence"`
	SealedFinalSequence     *string `json:"sealedFinalSequence"`
	SealedAt                *string `json:"sealedAt"`
	State                   string  `json:"state"`
}

// queueSessionSync is readSyncStatus: the session's streams, its open conflicts (never their evidence) and completeness.
// The session is the club's own; another club's, an unknown and a malformed id are not found.
func (s *server) queueSessionSync(r *http.Request, q *sqlcgen.Queries, club pgtype.UUID) (any, error) {
	ctx := r.Context()
	row, err := ownSession(ctx, q, club, r.PathValue("sessionId"))
	if err != nil {
		return nil, err
	}
	streams, err := q.ListQueueSyncStreams(ctx, row.ID)
	if err != nil {
		return nil, err
	}
	conflicts, err := q.ListQueueSyncOpenConflicts(ctx, row.ID)
	if err != nil {
		return nil, err
	}
	completeness, err := readCompleteness(ctx, q, row.ID)
	if err != nil {
		return nil, err
	}
	type conflictDTO struct {
		ID         string `json:"id"`
		Category   string `json:"category"`
		DetectedAt string `json:"detectedAt"`
	}
	out := struct {
		Streams      []syncStreamDTO  `json:"streams"`
		Conflicts    []conflictDTO    `json:"conflicts"`
		Completeness syncCompleteness `json:"completeness"`
	}{Streams: make([]syncStreamDTO, 0, len(streams)), Conflicts: make([]conflictDTO, 0, len(conflicts)), Completeness: completeness}
	for _, st := range streams {
		d := syncStreamDTO{
			ID: st.ID.String(), SessionID: st.SessionID.String(), DeviceID: st.DeviceID.String(), GenerationNo: st.GenerationNo,
			DownloadedRevision:      strconv.FormatInt(st.DownloadedRevision, 10),
			ContiguousSequence:      strconv.FormatInt(st.ContiguousSequence, 10),
			HighestReceivedSequence: strconv.FormatInt(st.HighestReceivedSequence, 10),
			SealedAt:                isoPtr(st.SealedAt), State: string(st.State),
		}
		if st.SealedFinalSequence.Valid {
			v := strconv.FormatInt(st.SealedFinalSequence.Int64, 10)
			d.SealedFinalSequence = &v
		}
		out.Streams = append(out.Streams, d)
	}
	for _, c := range conflicts {
		out.Conflicts = append(out.Conflicts, conflictDTO{ID: c.ID.String(), Category: string(c.Category), DetectedAt: httpapi.ToIso(c.DetectedAt.Time)})
	}
	return out, nil
}

type reviewShortfall struct {
	SessionPlayerID string `json:"sessionPlayerId"`
	Name            string `json:"name"`
	Games           int    `json:"games"`
}

type reviewCandidate struct {
	ClubPlayerID string  `json:"clubPlayerId"`
	Name         string  `json:"name"`
	Identity     string  `json:"identity"`
	RtrID        *string `json:"rtrId"`
}

type reviewGuest struct {
	ClubPlayerID    string            `json:"clubPlayerId"`
	SessionPlayerID string            `json:"sessionPlayerId"`
	Name            string            `json:"name"`
	Candidates      []reviewCandidate `json:"candidates"`
}

// queueDoneReview is reviewSessionDone: what would block Session done, the minimum-games shortfall and the guests
// whose profile is not yet linked. The access check comes after the club's own lookup, as in the TypeScript.
func (s *server) queueDoneReview(r *http.Request, q *sqlcgen.Queries, club pgtype.UUID) (any, error) {
	ctx := r.Context()
	row, err := s.session(r, q, club)
	if err != nil {
		return nil, err
	}
	completeness, err := readCompleteness(ctx, q, row.ID)
	if err != nil {
		return nil, err
	}
	active, err := q.CountQueueActiveMatches(ctx, row.ID)
	if err != nil {
		return nil, err
	}
	// The instant is a JavaScript Date: whole milliseconds.
	hasPolicy, err := q.HasQueueEffectiveRankingPolicy(ctx, pgtype.Timestamptz{Time: s.now().Truncate(time.Millisecond), Valid: true})
	if err != nil {
		return nil, err
	}
	// The order the TypeScript uses: active matches, unsealed streams, open conflicts, pending operations, no policy.
	blocking := []string{}
	if active > 0 {
		blocking = append(blocking, "active_matches")
	}
	if completeness.OpenStreams > 0 {
		blocking = append(blocking, "unsealed_streams")
	}
	if completeness.OpenConflicts > 0 {
		blocking = append(blocking, "open_conflicts")
	}
	if completeness.PendingOperations > 0 {
		blocking = append(blocking, "pending_operations")
	}
	if !hasPolicy {
		blocking = append(blocking, "no_ranking_policy")
	}
	below, err := belowMinimum(ctx, q, row.ID, row.MinimumGames)
	if err != nil {
		return nil, err
	}
	guests, err := unresolvedGuests(ctx, q, club, row.ID)
	if err != nil {
		return nil, err
	}
	return struct {
		Blocking         []string          `json:"blocking"`
		ActiveMatches    int32             `json:"activeMatches"`
		Completeness     syncCompleteness  `json:"completeness"`
		BelowMinimum     []reviewShortfall `json:"belowMinimum"`
		UnresolvedGuests []reviewGuest     `json:"unresolvedGuests"`
	}{blocking, active, completeness, below, guests}, nil
}

// belowMinimum is belowMinimum: live roster entries with fewer counted games than the target. A target of zero lists
// nobody. Games adjustments are not counted here (the TypeScript counts completed games only).
func belowMinimum(ctx context.Context, q *sqlcgen.Queries, session pgtype.UUID, minimum int32) ([]reviewShortfall, error) {
	out := []reviewShortfall{}
	if minimum <= 0 {
		return out, nil
	}
	roster, err := q.ListQueueReviewRoster(ctx, session)
	if err != nil {
		return nil, err
	}
	games, err := countedGamesByEntry(ctx, q, session)
	if err != nil {
		return nil, err
	}
	for _, e := range roster {
		g := games[e.ID.String()]
		if int32(g) < minimum {
			out = append(out, reviewShortfall{SessionPlayerID: e.ID.String(), Name: e.NameSnapshot, Games: g})
		}
	}
	return out, nil
}

// countedGamesByEntry is countedGamesByEntry and creditedKeys: a game counts for an entry that played the whole match in
// one segment, and for an entry the operator gave the game to after a substitution (incoming gives it to the entry that
// came on, outgoing to the entry whose segment the same operation closed).
func countedGamesByEntry(ctx context.Context, q *sqlcgen.Queries, session pgtype.UUID) (map[string]int, error) {
	parts, err := q.ListQueueCompletedParticipations(ctx, session)
	if err != nil {
		return nil, err
	}
	segments := map[string]int{}
	key := func(match, entry pgtype.UUID) string { return match.String() + ":" + entry.String() }
	for _, p := range parts {
		segments[key(p.MatchID, p.SessionPlayerID)]++
	}
	counted := map[string]string{} // key -> entry id; a set, so a game is counted once per match and entry
	for _, p := range parts {
		if p.CreditTo == "incoming" {
			counted[key(p.MatchID, p.SessionPlayerID)] = p.SessionPlayerID.String()
		}
		if p.CreditTo != "outgoing" {
			continue
		}
		for _, o := range parts {
			if o.MatchID == p.MatchID && o.ID != p.ID && o.LeftOperationID.Valid && o.LeftOperationID == p.JoinedOperationID {
				counted[key(o.MatchID, o.SessionPlayerID)] = o.SessionPlayerID.String()
				break
			}
		}
	}
	for _, p := range parts {
		if p.StartedWithMatch && p.FinishedWithMatch && segments[key(p.MatchID, p.SessionPlayerID)] == 1 {
			counted[key(p.MatchID, p.SessionPlayerID)] = p.SessionPlayerID.String()
		}
	}
	games := map[string]int{}
	for _, entry := range counted {
		games[entry]++
	}
	return games, nil
}

// unresolvedGuests is unresolvedGuests: live roster entries whose saved player has no ROTRA profile, each with the club's
// own profiled players whose name or nickname equals one of theirs once trimmed, lower-cased and squeezed.
func unresolvedGuests(ctx context.Context, q *sqlcgen.Queries, club, session pgtype.UUID) ([]reviewGuest, error) {
	out := []reviewGuest{}
	roster, err := q.ListQueueUnresolvedGuestEntries(ctx, session)
	if err != nil {
		return nil, err
	}
	if len(roster) == 0 {
		return out, nil
	}
	saved, err := q.ListQueueProfiledClubPlayers(ctx, club)
	if err != nil {
		return nil, err
	}
	ids := make([]pgtype.UUID, 0, len(saved))
	for _, c := range saved {
		ids = append(ids, c.PlayerID)
	}
	profiles := map[pgtype.UUID]sqlcgen.ListQueueReviewProfilesRow{}
	if len(ids) > 0 {
		rows, err := q.ListQueueReviewProfiles(ctx, ids)
		if err != nil {
			return nil, err
		}
		for _, p := range rows {
			profiles[p.ID] = p
		}
	}
	for _, e := range roster {
		names := map[string]bool{}
		for _, n := range []string{e.DisplayName, e.Nickname.String, e.NameSnapshot} {
			if k := normalizedName(n); k != "" {
				names[k] = true
			}
		}
		guest := reviewGuest{ClubPlayerID: e.ClubPlayerID.String(), SessionPlayerID: e.ID.String(), Name: e.NameSnapshot, Candidates: []reviewCandidate{}}
		for _, c := range saved {
			p, hasProfile := profiles[c.PlayerID]
			match := names[normalizedName(c.DisplayName)] || names[normalizedName(c.Nickname.String)]
			if hasProfile {
				match = match || names[normalizedName(p.FullName)] || names[normalizedName(p.Nickname.String)]
			}
			if !match {
				continue
			}
			cand := reviewCandidate{ClubPlayerID: c.ID.String(), Name: c.DisplayName, Identity: "unclaimed"}
			if hasProfile {
				if p.FullName != "" {
					cand.Name = p.FullName
				}
				if p.ProfileState == sqlcgen.PlayerProfileStateClaimed {
					cand.Identity = "registered"
				}
				cand.RtrID = textPtr(p.RtrID)
			}
			guest.Candidates = append(guest.Candidates, cand)
		}
		out = append(out, guest)
	}
	return out, nil
}

// normalizedName is normalizedName: trim, lower-case with JavaScript's toLocaleLowerCase, then squeeze each run of
// whitespace to one space.
func normalizedName(name string) string {
	lower := jsLower(strings.TrimFunc(name, publicreads.IsJSSpace))
	var b strings.Builder
	space := false
	for _, r := range lower {
		if publicreads.IsJSSpace(r) {
			if !space {
				b.WriteByte(' ')
			}
			space = true
			continue
		}
		space = false
		b.WriteRune(r)
	}
	return b.String()
}

// jsLower is String.prototype.toLocaleLowerCase for an English locale: the simple lower-case mapping, plus the two cases
// where the full mapping differs: capital dotted I becomes i and a combining dot, and capital sigma becomes final sigma
// at the end of a word.
func jsLower(s string) string {
	runes := []rune(s)
	var b strings.Builder
	for i, r := range runes {
		switch {
		case r == 0x130:
			b.WriteString("i̇")
		case r == 0x3A3 && finalSigma(runes, i):
			b.WriteRune(0x3C2)
		default:
			b.WriteRune(unicode.ToLower(r))
		}
	}
	return b.String()
}

// finalSigma is the Final_Sigma condition: a cased letter before (skipping case-ignorable characters) and none after.
func finalSigma(runes []rune, i int) bool {
	before := false
	for j := i - 1; j >= 0; j-- {
		if caseIgnorable(runes[j]) {
			continue
		}
		before = cased(runes[j])
		break
	}
	if !before {
		return false
	}
	for j := i + 1; j < len(runes); j++ {
		if caseIgnorable(runes[j]) {
			continue
		}
		return !cased(runes[j])
	}
	return true
}

func cased(r rune) bool {
	return unicode.IsUpper(r) || unicode.IsLower(r) || unicode.IsTitle(r) || unicode.Is(unicode.Other_Lowercase, r) || unicode.Is(unicode.Other_Uppercase, r)
}

// caseIgnorable is Case_Ignorable: marks, format characters, modifier letters and symbols, and the word-internal
// punctuation (apostrophes, full stops, colons and middle dots).
func caseIgnorable(r rune) bool {
	if unicode.In(r, unicode.Mn, unicode.Me, unicode.Cf, unicode.Lm, unicode.Sk) {
		return true
	}
	switch r {
	case '\'', '.', ':', 0xB7, 0x387, 0x55F, 0x5F4, 0x2018, 0x2019, 0x2024, 0x2027, 0xFE13, 0xFE52, 0xFE55, 0xFF07, 0xFF0E, 0xFF1A:
		return true
	}
	return false
}
