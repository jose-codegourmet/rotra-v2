package signedin

import (
	"encoding/json"
	"errors"
	"net/http"
	"strings"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgtype"

	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/db/sqlcgen"
	httpapi "github.com/jose-codegourmet/rotra-v2/apps/api/internal/http"
	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/publicreads"
)

// The club's saved players: GET /api/club/players, /api/club/players/{id} (Edit details), its delete-impact and
// year-stats, and GET /api/players (Player lookup). Ports of packages/db/src/queue/club-players.ts,
// club-player-details.ts, club-player-delete.ts and club-player-own-details.ts.

// levelFromID is levelCodeFor: a stored skill level, or the query's -1 for "never assessed", as a level code.
func levelFromID(id int16) *string {
	if id < 0 {
		return nil
	}
	return publicreads.LevelCode(pgtype.Int2{Int16: id, Valid: true})
}

// ---- GET /api/club/players ----

// clubPlayerDTO is ClubPlayerDto: one saved player as Saved players shows them. It never carries a phone or an email.
type clubPlayerDTO struct {
	ID              string  `json:"id"`
	ClubID          string  `json:"clubId"`
	PlayerID        *string `json:"playerId"`
	FullName        string  `json:"fullName"`
	Nickname        *string `json:"nickname"`
	ClubNickname    *string `json:"clubNickname"`
	Picture         *string `json:"picture"`
	PictureName     *string `json:"pictureName"`
	BannerKey       string  `json:"bannerKey"`
	BannerImageURL  *string `json:"bannerImageUrl"`
	Identity        string  `json:"identity"`
	RtrID           *string `json:"rtrId"`
	PlayingLevel    *string `json:"playingLevel"`
	PhoneHidden     bool    `json:"phoneHidden"`
	HasPhone        bool    `json:"hasPhone"`
	EmailOnFile     bool    `json:"emailOnFile"`
	DetailsRequired bool    `json:"detailsRequired"`
	SessionsHere    int32   `json:"sessionsHere"`
	AddedAt         string  `json:"addedAt"`
}

func uuidPtr(u pgtype.UUID) *string {
	if !u.Valid {
		return nil
	}
	s := u.String()
	return &s
}

// jsTruthyText is Boolean(text): a non-empty string.
func jsTruthyText(t pgtype.Text) bool { return t.Valid && t.String != "" }

func (s *server) queueClubPlayers(r *http.Request, q *sqlcgen.Queries, club pgtype.UUID) (any, error) {
	ctx := r.Context()
	rows, err := q.ListQueueClubPlayers(ctx, club)
	if err != nil {
		return nil, err
	}
	shown, err := q.ListShownProfileBanners(ctx)
	if err != nil {
		return nil, err
	}
	out := make([]clubPlayerDTO, 0, len(rows))
	for _, p := range rows {
		registered := p.ProfileState.Valid && p.ProfileState.PlayerProfileState == sqlcgen.PlayerProfileStateClaimed
		// Only a registered player has chosen a banner; the others draw the default the Admin sets.
		var chosenID, chosenImage pgtype.Text
		if registered {
			chosenID, chosenImage = p.BannerID, p.BannerImage
		}
		bannerKey, bannerImage := publicreads.ResolveBanner(chosenID, chosenImage, shown)
		entryOpen := !registered && p.EntryID.Valid && !p.EntryClaimedPlayerID.Valid
		phone := p.InputPhone
		d := clubPlayerDTO{
			ID: p.ID.String(), ClubID: p.ClubID.String(), BannerKey: bannerKey, BannerImageURL: bannerImage,
			PlayingLevel: levelFromID(p.LevelID), SessionsHere: p.SessionsHere, AddedAt: httpapi.ToIso(p.AddedAt.Time),
			EmailOnFile: entryOpen, DetailsRequired: !registered && !entryOpen && !p.HasPlayer && jsTruthyText(phone),
		}
		switch {
		case registered:
			d.PlayerID = uuidPtr(p.PlayerID)
			// A registered player's own name wins over the club's saved copy, so a claim or profile edit shows on every card.
			d.FullName = p.DisplayName
			if p.PlayerFullName.Valid && p.PlayerFullName.String != "" {
				d.FullName = p.PlayerFullName.String
			}
			d.Nickname = textPtr(p.PlayerNickname)
			if n := strings.TrimFunc(p.Nickname.String, publicreads.IsJSSpace); p.Nickname.Valid && n != "" {
				d.ClubNickname = &n
			}
			d.Picture = textPtr(p.AvatarRef)
			d.PictureName = textPtr(p.PlayerFullName)
			d.Identity = "registered"
			d.RtrID = textPtr(p.PlayerRtrID)
			d.PhoneHidden = p.HidePhoneFromClubs.Bool
		default:
			if entryOpen {
				d.PlayerID = uuidPtr(p.EntryID)
				d.RtrID = textPtr(p.EntryRtrID)
			} else {
				d.PlayerID = uuidPtr(p.PlayerID)
			}
			d.FullName = p.DisplayName
			d.Nickname = textPtr(p.Nickname)
			d.Identity = "guest"
			if entryOpen || p.HasPlayer || jsTruthyText(phone) {
				d.Identity = "unclaimed"
			}
		}
		d.HasPhone = (registered && jsTruthyText(p.ContactPhone)) || jsTruthyText(phone)
		out = append(out, d)
	}
	return struct {
		Players []clubPlayerDTO `json:"players"`
	}{out}, nil
}

// ---- GET /api/club/players/{id}: Edit details ----

type clubPlayerProfile struct {
	Email           string            `json:"email"`
	PlayingStyle    string            `json:"playingStyle"`
	ExperienceYears *int64            `json:"experienceYears"`
	ExperienceMonth *int64            `json:"experienceMonths"`
	SocialLinks     map[string]string `json:"socialLinks"`
}

type clubPlayerDetailsDTO struct {
	ClubPlayerID string             `json:"clubPlayerId"`
	Identity     string             `json:"identity"`
	FullName     string             `json:"fullName"`
	Nickname     *string            `json:"nickname"`
	PhoneOnFile  bool               `json:"phoneOnFile"`
	Profile      *clubPlayerProfile `json:"profile"`
}

// ownDetails is readOwnDetails: what the club entered about its own unclaimed player. Anything missing or malformed
// reads as not entered.
type ownDetails struct {
	playingStyle string
	months       *int64
	recordedAt   string
	links        map[string]string
}

var socialProviders = []string{"facebook", "instagram", "youtube", "linkedin"}

func jsonText(v any) string {
	s, _ := v.(string)
	return s
}

func readOwnDetails(stored []byte) ownDetails {
	raw := map[string]any{}
	var v any
	if err := json.Unmarshal(stored, &v); err == nil {
		if m, ok := v.(map[string]any); ok {
			raw = m
		}
	}
	links, _ := raw["socialLinks"].(map[string]any)
	d := ownDetails{playingStyle: jsonText(raw["playingStyle"]), recordedAt: jsonText(raw["experienceRecordedAt"]), links: map[string]string{}}
	for _, p := range socialProviders {
		d.links[p] = jsonText(links[p])
	}
	if f, ok := raw["experienceMonths"].(float64); ok && f == float64(int64(f)) {
		m := int64(f)
		d.months = &m
	}
	return d
}

func (s *server) queueClubPlayerDetails(r *http.Request, q *sqlcgen.Queries, club pgtype.UUID) (any, error) {
	ctx := r.Context()
	if err := requireClubEntitlement(ctx, q, club, s.now()); err != nil {
		return nil, err
	}
	id, ok := parseUUIDString(r.PathValue("clubPlayerId"))
	if !ok {
		return nil, errNotFound // the TypeScript read crashes on a malformed id (a database error: 500)
	}
	row, err := q.GetQueueClubPlayerEditable(ctx, sqlcgen.GetQueueClubPlayerEditableParams{ClubID: club, ClubPlayerID: id})
	if errors.Is(err, pgx.ErrNoRows) || (err == nil && row.RemovedAt.Valid) {
		return nil, errNotFound
	}
	if err != nil {
		return nil, err
	}
	if row.ProfileState.Valid && row.ProfileState.PlayerProfileState == sqlcgen.PlayerProfileStateClaimed {
		return nil, &serviceError{code: httpapi.ErrForbidden, fields: map[string]string{"player": "This player registered, so they keep their own details."}}
	}
	unclaimed := row.SharedEntryID.Valid || row.PlayerID.Valid || jsTruthyText(row.InputPhone)
	own := readOwnDetails(row.PresetFields)
	d := clubPlayerDetailsDTO{
		ClubPlayerID: row.ID.String(), Identity: "guest", FullName: row.DisplayName, Nickname: textPtr(row.Nickname), PhoneOnFile: jsTruthyText(row.InputPhone),
	}
	if unclaimed {
		d.Identity = "unclaimed"
		p := &clubPlayerProfile{Email: row.EntryEmail.String, PlayingStyle: own.playingStyle, SocialLinks: own.links}
		if own.months != nil {
			months := *own.months
			if own.recordedAt != "" {
				if at, ok := parseJSDate(own.recordedAt); ok {
					months = currentMonthsAt(months, at, s.now())
				}
			}
			years, rest := floorDiv(months, 12), months%12
			p.ExperienceYears, p.ExperienceMonth = &years, &rest
		}
		d.Profile = p
	}
	return struct {
		Details clubPlayerDetailsDTO `json:"details"`
	}{d}, nil
}

func floorDiv(a, b int64) int64 {
	q := a / b
	if (a%b != 0) && ((a < 0) != (b < 0)) {
		q--
	}
	return q
}

// ---- GET /api/club/players/{id}/delete-impact ----

type deleteImpactDTO struct {
	ActiveSession *activeSessionImpact `json:"activeSession"`
	Busy          bool                 `json:"busy"`
}

type activeSessionImpact struct {
	Title          string `json:"title"`
	WaitingMatches int32  `json:"waitingMatches"`
}

func (s *server) queueDeleteImpact(r *http.Request, q *sqlcgen.Queries, club pgtype.UUID) (any, error) {
	ctx := r.Context()
	if err := requireClubEntitlement(ctx, q, club, s.now()); err != nil {
		return nil, err
	}
	id, ok := parseUUIDString(r.PathValue("clubPlayerId"))
	if !ok {
		return nil, errNotFound // the TypeScript read crashes on a malformed id: 500
	}
	saved, err := q.GetQueueSavedClubPlayer(ctx, sqlcgen.GetQueueSavedClubPlayerParams{ClubID: club, ClubPlayerID: id})
	if errors.Is(err, pgx.ErrNoRows) || (err == nil && saved.RemovedAt.Valid) {
		return nil, errNotFound
	}
	if err != nil {
		return nil, err
	}
	entry, err := q.GetQueueLiveActiveEntry(ctx, sqlcgen.GetQueueLiveActiveEntryParams{ClubID: club, ClubPlayerID: id})
	if errors.Is(err, pgx.ErrNoRows) {
		return struct {
			Impact deleteImpactDTO `json:"impact"`
		}{deleteImpactDTO{}}, nil
	}
	if err != nil {
		return nil, err
	}
	waiting, err := q.CountQueueEntryMatches(ctx, sqlcgen.CountQueueEntryMatchesParams{States: []string{"waiting"}, SessionPlayerID: entry.ID})
	if err != nil {
		return nil, err
	}
	playing, err := q.CountQueueEntryMatches(ctx, sqlcgen.CountQueueEntryMatchesParams{
		States: []string{"on_court", "active"}, SessionPlayerID: entry.ID,
	})
	if err != nil {
		return nil, err
	}
	return struct {
		Impact deleteImpactDTO `json:"impact"`
	}{deleteImpactDTO{ActiveSession: &activeSessionImpact{Title: entry.Title, WaitingMatches: waiting}, Busy: playing > 0}}, nil
}

// ---- GET /api/club/players/{id}/year-stats ----

func (s *server) queueYearStats(r *http.Request, q *sqlcgen.Queries, club pgtype.UUID) (any, error) {
	ctx := r.Context()
	id, ok := parseUUIDString(r.PathValue("clubPlayerId"))
	if !ok {
		return nil, errNotFound
	}
	row, err := q.GetQueueClubPlayerForStats(ctx, sqlcgen.GetQueueClubPlayerForStatsParams{ClubID: club, ClubPlayerID: id})
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, errNotFound
	}
	if err != nil {
		return nil, err
	}
	type stats struct {
		Stats any `json:"stats"`
	}
	claimed := row.ProfileState.Valid && row.ProfileState.PlayerProfileState == sqlcgen.PlayerProfileStateClaimed
	if !row.PlayerID.Valid || !claimed {
		return stats{nil}, nil
	}
	// Show my profile stats off: hidden from the Queue Master too (nothing but the marker leaves).
	if row.ShowProfileStats.Valid && !row.ShowProfileStats.Bool {
		return stats{map[string]bool{"hidden": true}}, nil
	}
	year, err := publicreads.PlayerYearStats(ctx, q, row.PlayerID, s.now())
	if err != nil {
		return nil, err
	}
	return stats{year}, nil
}

// ---- GET /api/players?q=: Player lookup ----

type directoryPlayerDTO struct {
	ID              string  `json:"id"`
	FullName        string  `json:"fullName"`
	Nickname        *string `json:"nickname"`
	RtrID           string  `json:"rtrId"`
	Identity        string  `json:"identity"`
	Picture         *string `json:"picture"`
	Suggestion      *string `json:"suggestion"`
	PhoneHidden     bool    `json:"phoneHidden"`
	OwnNameRequired bool    `json:"ownNameRequired,omitempty"`
}

// normalizeLookupEmail is normalizeEmail: trimmed, lowercased, and exactly one @ with something on each side and no
// whitespace. Empty when it is not an email.
func normalizeLookupEmail(typed string) string {
	email := publicreads.JSToLower(publicreads.JSTrim(typed))
	if email == "" {
		return ""
	}
	at := strings.IndexByte(email, '@')
	if at <= 0 || at == len(email)-1 { // /^[^@\s]+@[^@\s]+$/
		return ""
	}
	local, domain := email[:at], email[at+1:]
	if strings.ContainsRune(domain, '@') || strings.ContainsFunc(local, publicreads.IsJSSpace) || strings.ContainsFunc(domain, publicreads.IsJSSpace) {
		return ""
	}
	return email
}

// normalizeLookupRtrID is normalizeRtrId: an RTR ID as typed, uppercased; empty when it is not one.
func normalizeLookupRtrID(typed string) string {
	id := publicreads.RTRLookupKey(typed)
	// /^RTR-[A-Z]{2}-[A-Z]{3}-[0-9]{6}-[0-9]{4,}$/
	parts := strings.Split(id, "-")
	if len(parts) != 5 || parts[0] != "RTR" || !allIn(parts[1], 2, 2, 'A', 'Z') || !allIn(parts[2], 3, 3, 'A', 'Z') ||
		!allIn(parts[3], 6, 6, '0', '9') || !allIn(parts[4], 4, 1<<30, '0', '9') {
		return ""
	}
	return id
}

func allIn(s string, min, max int, lo, hi byte) bool {
	if len(s) < min || len(s) > max {
		return false
	}
	for i := 0; i < len(s); i++ {
		if s[i] < lo || s[i] > hi {
			return false
		}
	}
	return true
}

type lookupBody struct {
	Player    *directoryPlayerDTO  `json:"player"`
	SavedName *string              `json:"savedName"`
	Players   []directoryPlayerDTO `json:"players"`
}

func (s *server) queuePlayerLookup(r *http.Request, q *sqlcgen.Queries, club pgtype.UUID) (any, error) {
	raw, _ := publicreads.QueryValue(r.URL.RawQuery, "q")
	found, err := s.lookupPlayer(r, q, club, raw)
	if err != nil {
		return nil, err
	}
	found.Players = []directoryPlayerDTO{}
	if found.Player != nil {
		found.Players = []directoryPlayerDTO{*found.Player}
	}
	return found, nil
}

// lookupPlayer is lookupPlayer: the one ROTRA person whose RTR ID or email is exactly the query, registered or
// unclaimed. No name search and no phone lookup. When this club already saved them, savedName is this club's name for
// them instead. Players who chose Hide me from Player Information are not found.
func (s *server) lookupPlayer(r *http.Request, q *sqlcgen.Queries, club pgtype.UUID, query string) (lookupBody, error) {
	ctx := r.Context()
	none := lookupBody{}
	typed := publicreads.JSTrim(query)
	if typed == "" {
		return none, nil
	}
	rtrID := normalizeLookupRtrID(typed)
	email := ""
	if rtrID == "" {
		if email = normalizeLookupEmail(typed); email == "" {
			return none, nil
		}
	}
	var entry struct {
		id    pgtype.UUID
		rtrID string
		found bool
	}
	if rtrID != "" {
		e, err := q.GetOpenEntryByRtrID(ctx, rtrID)
		if err != nil && !errors.Is(err, pgx.ErrNoRows) {
			return none, err
		}
		if err == nil {
			entry.id, entry.rtrID, entry.found = e.ID, e.RtrID, true
		}
	} else {
		e, err := q.GetOpenEntryByEmail(ctx, pgtype.Text{String: email, Valid: true})
		if err != nil && !errors.Is(err, pgx.ErrNoRows) {
			return none, err
		}
		if err == nil {
			entry.id, entry.rtrID, entry.found = e.ID, e.RtrID, true
		}
	}
	var playerID pgtype.UUID
	if !entry.found {
		var err error
		if rtrID != "" {
			playerID, err = q.GetPlayerIDByRtrID(ctx, rtrID)
		} else {
			playerID, err = s.registeredPlayerByEmail(r, q, email)
		}
		if err != nil && !errors.Is(err, pgx.ErrNoRows) {
			return none, err
		}
		if errors.Is(err, pgx.ErrNoRows) {
			playerID = pgtype.UUID{}
		}
	}
	if !entry.found && !playerID.Valid {
		return none, nil
	}
	// What this club already saved of them.
	var savedName *string
	if entry.found {
		name, err := q.GetSavedClubPlayerForEntry(ctx, sqlcgen.GetSavedClubPlayerForEntryParams{ClubID: club, EntryID: entry.id})
		if err != nil && !errors.Is(err, pgx.ErrNoRows) {
			return none, err
		}
		if err == nil {
			savedName = &name
		}
	} else {
		saved, err := q.GetSavedClubPlayerForPlayer(ctx, sqlcgen.GetSavedClubPlayerForPlayerParams{ClubID: club, PlayerID: playerID})
		if err != nil && !errors.Is(err, pgx.ErrNoRows) {
			return none, err
		}
		if err == nil {
			name := saved.DisplayName
			if saved.ProfileState.Valid && saved.ProfileState.PlayerProfileState == sqlcgen.PlayerProfileStateClaimed && saved.FullName.String != "" {
				name = saved.FullName.String
			}
			savedName = &name
		}
	}
	if savedName != nil {
		return lookupBody{SavedName: savedName}, nil
	}
	if entry.found {
		return lookupBody{Player: &directoryPlayerDTO{ID: entry.id.String(), RtrID: entry.rtrID, Identity: "unclaimed", OwnNameRequired: true}}, nil
	}
	p, err := q.GetDirectoryPlayer(ctx, playerID)
	if errors.Is(err, pgx.ErrNoRows) {
		return none, nil
	}
	if err != nil {
		return none, err
	}
	return lookupBody{Player: &directoryPlayerDTO{
		ID: p.ID.String(), FullName: p.FullName, Nickname: textPtr(p.Nickname), RtrID: p.RtrID, Identity: "registered",
		Picture: textPtr(p.AvatarRef), Suggestion: publicreads.LevelCode(p.SkillLevelID), PhoneHidden: p.HidePhoneFromClubs,
	}}, nil
}

// registeredPlayerByEmail is registeredPlayerByEmail: the claimed player whose ROTRA email or connected Google email
// is the email. The ROTRA email wins when the two belong to different accounts.
func (s *server) registeredPlayerByEmail(r *http.Request, q *sqlcgen.Queries, email string) (pgtype.UUID, error) {
	ctx := r.Context()
	text := pgtype.Text{String: email, Valid: true}
	id, err := q.GetRegisteredPlayerByContactEmail(ctx, text)
	if err == nil {
		return id, nil
	}
	if !errors.Is(err, pgx.ErrNoRows) {
		return pgtype.UUID{}, err
	}
	return q.GetRegisteredPlayerByGoogleEmail(ctx, text)
}

// parseJSDate reads the ISO time the club's own details store (new Date(iso)). A value that is not one reads as no date.
func parseJSDate(iso string) (time.Time, bool) {
	t, err := time.Parse(time.RFC3339Nano, iso)
	return t, err == nil
}

// currentMonthsAt is currentExperienceMonths for a stored snapshot: the months count up by whole UTC calendar months
// since it was recorded, never backwards.
func currentMonthsAt(months int64, recordedAt, now time.Time) int64 {
	rec, now := recordedAt.UTC(), now.UTC()
	elapsed := int64((now.Year()-rec.Year())*12 + int(now.Month()) - int(rec.Month()))
	return months + max(0, elapsed)
}
