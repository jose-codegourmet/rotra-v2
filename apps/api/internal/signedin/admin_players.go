package signedin

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/player/answers"
	"net/http"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgtype"

	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/db/sqlcgen"
	httpapi "github.com/jose-codegourmet/rotra-v2/apps/api/internal/http"
	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/publicreads"
)

// The player directory and what hangs off one player: GET /api/players, /api/players/{playerId}, .../games and
// .../verification. Ports of packages/db/src/admin/players.ts and readAdminAccountVerification. The list takes no
// query string: every row carries what the screen filters on (the RTR ID, the email, the rank status, the club
// nicknames), and the client filters.

const (
	clubOnlyRemoval  = "Saved by its club only; the club manages this record"
	notConnectedNote = "This part of ROTRA isn't connected to saved data yet."
)

type placeDTO struct {
	Code string `json:"code"`
	Name string `json:"name"`
}

type playerClubDTO struct {
	ClubID   string  `json:"clubId"`
	Name     string  `json:"name"`
	AddedAt  int64   `json:"addedAt"`
	SavedAs  *string `json:"savedAs,omitempty"`
	Identity string  `json:"identity"`
}

type rankStatusDTO struct {
	Kind string `json:"kind"`
	Text string `json:"text"`
}

// adminPlayerDTO is AdminPlayer on the wire. A field the TypeScript leaves undefined is left out here too (a pointer
// with omitempty); null is a pointer without it.
type adminPlayerDTO struct {
	ID                    string          `json:"id"`
	Name                  string          `json:"name"`
	Nickname              *string         `json:"nickname"`
	RtrID                 *string         `json:"rtrId"`
	CreatedByClubID       string          `json:"createdByClubId"`
	CreatedOn             string          `json:"createdOn"`
	AddedOn               string          `json:"addedOn"`
	Picture               *string         `json:"picture"`
	RegisteredPlace       placeDTO        `json:"registeredPlace"`
	Phone                 *string         `json:"phone,omitempty"`
	Email                 *string         `json:"email,omitempty"`
	PhoneHidden           bool            `json:"phoneHidden"`
	Claimed               bool            `json:"claimed"`
	DetailsRequired       *bool           `json:"detailsRequired,omitempty"`
	RegisteredOn          *string         `json:"registeredOn,omitempty"`
	Clubs                 []playerClubDTO `json:"clubs"`
	LevelIndex            *int16          `json:"levelIndex"`
	LevelBand             *string         `json:"levelBand"`
	RecentStandardMatches int32           `json:"recentStandardMatches"`
	RankStatus            rankStatusDTO   `json:"rankStatus"`
	ArchivedAt            *string         `json:"archivedAt"`
	Revision              string          `json:"revision"`
	RemovalReason         string          `json:"removalReason"`
	// Gender is public and set by the player, read-only for Admin (D-2026-11-19-01): null for a player with none given, and absent
	// on a record that is not a player.
	Gender json.RawMessage `json:"gender,omitempty"`
	// Verification is the derived status of a registered player with an account (D-2026-11-23-07); null for every other row.
	Verification *playerVerificationDTO `json:"verification"`
}

type playerVerificationDTO struct {
	Verified        bool `json:"verified"`
	VerifiedByAdmin bool `json:"verifiedByAdmin"`
	CompletedSteps  int  `json:"completedSteps"`
}

// createdOnFromRtrId: 'RTR-PH-CEB-031526-0001' becomes '2026-03-15' (the date segment is MMDDYY); ” when malformed.
func createdOnFromRtrID(rtrID string) string {
	parts := splitDash(rtrID)
	if len(parts) < 4 || len(parts[3]) != 6 {
		return ""
	}
	seg := parts[3]
	for i := 0; i < 6; i++ {
		if seg[i] < '0' || seg[i] > '9' {
			return ""
		}
	}
	return "20" + seg[4:6] + "-" + seg[0:2] + "-" + seg[2:4]
}

func splitDash(s string) []string {
	var parts []string
	start := 0
	for i := 0; i < len(s); i++ {
		if s[i] == '-' {
			parts = append(parts, s[start:i])
			start = i + 1
		}
	}
	return append(parts, s[start:])
}

// levelBandOf is levelBandOf: the band of a display order 0..8, or null.
func levelBandOf(order pgtype.Int2) *string {
	if !order.Valid || order.Int16 < 0 || order.Int16 > 8 {
		return nil
	}
	b := "advanced"
	switch {
	case order.Int16 < 3:
		b = "beginner"
	case order.Int16 < 6:
		b = "intermediate"
	}
	return &b
}

func addr[T any](v T) *T { return &v }

// optText is a nullable column as a field the TypeScript leaves undefined when null.
func optText(t pgtype.Text) *string { return textPtr(t) }

// firstNickname is `clubPlayers.find((p) => p.nickname)?.nickname`: the first one that is not null or empty.
func firstNickname(nicknames []pgtype.Text) *string {
	for _, n := range nicknames {
		if n.Valid && n.String != "" {
			return addr(n.String)
		}
	}
	return nil
}

// adminPlayerDirectory is readAdminPlayerDirectory: the players with an RTR ID, then the open shared entries of
// unclaimed people, then the clubs' older records. A non-nil id narrows each part to that ID.
func (s *server) adminPlayerDirectory(ctx context.Context, q *sqlcgen.Queries, id pgtype.UUID) ([]adminPlayerDTO, error) {
	players, err := q.ListAdminPlayerRows(ctx, id)
	if err != nil {
		return nil, err
	}
	shared, err := s.sharedEntryRows(ctx, q, id)
	if err != nil {
		return nil, err
	}
	clubOnly, err := clubOnlyRows(ctx, q, id)
	if err != nil {
		return nil, err
	}
	ids := make([]pgtype.UUID, len(players))
	for i, p := range players {
		ids[i] = p.ID
	}
	recordRows, err := q.ListAdminPlayerClubRecords(ctx, ids)
	if err != nil {
		return nil, err
	}
	records := map[pgtype.UUID][]sqlcgen.ListAdminPlayerClubRecordsRow{}
	for _, rec := range recordRows {
		records[rec.PlayerID] = append(records[rec.PlayerID], rec)
	}
	// A registration in progress copies an open entry's RTR ID; the entry's row stands for the person until it completes.
	open := map[string]bool{}
	for _, e := range shared {
		open[*e.RtrID] = true
	}
	out := []adminPlayerDTO{}
	for _, p := range players {
		claimed := p.ProfileState == sqlcgen.PlayerProfileStateClaimed
		if !claimed && open[p.RtrID] {
			continue
		}
		recs := records[p.ID]
		nicks := make([]pgtype.Text, len(recs))
		clubs := make([]playerClubDTO, 0, len(recs))
		identity := "unclaimed"
		if claimed {
			identity = "registered"
		}
		for i, rec := range recs {
			nicks[i] = rec.Nickname
			clubs = append(clubs, playerClubDTO{ClubID: rec.ClubID.String(), Name: rec.ClubName, AddedAt: rec.AddedAt.Time.UnixMilli(), Identity: identity})
		}
		nickname := textPtr(p.Nickname)
		if !p.Nickname.Valid {
			nickname = firstNickname(nicks)
		}
		createdOn := createdOnFromRtrID(p.RtrID)
		d := adminPlayerDTO{
			ID: p.ID.String(), Name: p.FullName, Nickname: nickname, RtrID: addr(p.RtrID), CreatedByClubID: p.CreatingClubID.String(),
			CreatedOn: createdOn, AddedOn: createdOn, Picture: textPtr(p.AvatarRef),
			RegisteredPlace: placeDTO{Code: p.CityCode, Name: p.CityName},
			PhoneHidden:     p.HidePhoneFromClubs, Claimed: claimed, Clubs: clubs, LevelIndex: nil,
			LevelBand: levelBandOf(p.LevelOrder), RecentStandardMatches: p.RecentStandardMatchCount.Int32,
			Revision: httpapi.ToDecimalString(p.Revision), RemovalReason: notConnectedNote,
		}
		d.Gender = json.RawMessage("null")
		if p.Gender.Valid {
			d.Gender, _ = json.Marshal(string(p.Gender.PlayerGender))
		}
		if claimed && p.HasAccount {
			v, byAdmin, steps := answers.Verification(p.GoogleEmail.String, p.Email.String, p.PhoneE164.String, p.VerifiedOverride)
			d.Verification = &playerVerificationDTO{Verified: v, VerifiedByAdmin: byAdmin, CompletedSteps: steps}
		}
		if p.HasContact {
			d.Phone = addr(p.PhoneE164.String)
			d.Email = optText(p.Email)
		}
		if p.ClaimedAt.Valid {
			d.RegisteredOn = addr(httpapi.ToDateOnly(p.ClaimedAt.Time))
		}
		if p.LevelOrder.Valid {
			d.LevelIndex = addr(p.LevelOrder.Int16)
		}
		d.RankStatus = rankStatusOf(p)
		out = append(out, d)
	}
	out = append(out, shared...)
	return append(out, clubOnly...), nil
}

// rankStatusOf reads the stored projection; a match count alone cannot establish leaderboard eligibility.
func rankStatusOf(p sqlcgen.ListAdminPlayerRowsRow) rankStatusDTO {
	if !p.HasRank || !p.LevelOrder.Valid {
		return rankStatusDTO{Kind: "none", Text: "No rank yet"}
	}
	if p.LeaderboardEligible.Bool {
		return rankStatusDTO{Kind: "board", Text: p.LevelLabel.String + " · on the overall leaderboard"}
	}
	return rankStatusDTO{Kind: "below", Text: fmt.Sprintf("%s · %d of %d recent matches", p.LevelLabel.String, p.RecentStandardMatchCount.Int32, p.RecentStandardMatchThreshold.Int16)}
}

// sharedEntryRows is readSharedEntryRows: one row per open shared entry that still has a club record, its id the entry
// id, with every club that saved the person (each club's own name when more than one did).
func (s *server) sharedEntryRows(ctx context.Context, q *sqlcgen.Queries, id pgtype.UUID) ([]adminPlayerDTO, error) {
	entries, err := q.ListAdminSharedEntries(ctx, id)
	if err != nil {
		return nil, err
	}
	ids := make([]pgtype.UUID, len(entries))
	for i, e := range entries {
		ids[i] = e.ID
	}
	recRows, err := q.ListAdminSharedEntryRecords(ctx, ids)
	if err != nil {
		return nil, err
	}
	byEntry := map[pgtype.UUID][]sqlcgen.ListAdminSharedEntryRecordsRow{}
	for _, rec := range recRows {
		byEntry[rec.SharedEntryID] = append(byEntry[rec.SharedEntryID], rec)
	}
	out := []adminPlayerDTO{}
	for _, e := range entries {
		recs := byEntry[e.ID]
		if len(recs) == 0 {
			continue
		}
		several := len(recs) > 1
		createdOn := createdOnFromRtrID(e.RtrID)
		nicks := make([]pgtype.Text, len(recs))
		clubs := make([]playerClubDTO, 0, len(recs))
		var phone *string
		for i, rec := range recs {
			nicks[i] = rec.Nickname
			c := playerClubDTO{ClubID: rec.ClubID.String(), Name: rec.ClubName, AddedAt: rec.AddedAt.Time.UnixMilli(), Identity: "unclaimed"}
			if several {
				c.SavedAs = addr(rec.DisplayName)
			}
			clubs = append(clubs, c)
			if phone == nil && rec.PhoneE164.Valid && rec.PhoneE164.String != "" {
				phone = addr(rec.PhoneE164.String)
			}
		}
		out = append(out, adminPlayerDTO{
			ID: e.ID.String(), Name: recs[0].DisplayName, Nickname: firstNickname(nicks), RtrID: addr(e.RtrID),
			CreatedByClubID: e.CreatingClubID.String(), CreatedOn: createdOn, AddedOn: createdOn,
			RegisteredPlace: placeDTO{Code: e.CityCode, Name: e.CityName}, Phone: phone, Email: optText(e.Email),
			DetailsRequired: addr(false), Clubs: clubs, RecentStandardMatches: 0,
			RankStatus: rankStatusDTO{Kind: "none", Text: "No rank yet"}, Revision: httpapi.ToDecimalString(e.Revision),
			RemovalReason: clubOnlyRemoval,
		})
	}
	return out, nil
}

// clubOnlyRows is readClubOnlyRecords: a club's older record with a phone and no global player, listed under its
// club as not registered yet, with no RTR ID and Details required.
func clubOnlyRows(ctx context.Context, q *sqlcgen.Queries, id pgtype.UUID) ([]adminPlayerDTO, error) {
	rows, err := q.ListAdminClubOnlyRecords(ctx, id)
	if err != nil {
		return nil, err
	}
	out := []adminPlayerDTO{}
	for _, r := range rows {
		added := httpapi.ToDateOnly(r.AddedAt.Time)
		out = append(out, adminPlayerDTO{
			ID: r.ID.String(), Name: r.DisplayName, Nickname: textPtr(r.Nickname), CreatedByClubID: r.ClubID.String(),
			CreatedOn: added, AddedOn: added, RegisteredPlace: placeDTO{Code: r.CityCode, Name: r.CityName},
			Phone: optText(r.PhoneE164), Email: optText(r.Email), DetailsRequired: addr(true),
			Clubs:      []playerClubDTO{{ClubID: r.ClubID.String(), Name: r.ClubName, AddedAt: r.AddedAt.Time.UnixMilli(), Identity: "unclaimed"}},
			RankStatus: rankStatusDTO{Kind: "none", Text: "No rank yet"}, Revision: httpapi.ToDecimalString(r.Revision),
			RemovalReason: clubOnlyRemoval,
		})
	}
	return out, nil
}

func (s *server) adminPlayers(r *http.Request, q *sqlcgen.Queries) (any, error) {
	players, err := s.adminPlayerDirectory(r.Context(), q, pgtype.UUID{})
	if err != nil {
		return nil, err
	}
	return struct {
		Players []adminPlayerDTO `json:"players"`
	}{players}, nil
}

// ---- GET /api/players/{playerId}: Quick view, the row with the edit values ----

type socialLinksDTO struct {
	Facebook  string `json:"facebook"`
	Instagram string `json:"instagram"`
	Youtube   string `json:"youtube"`
	Linkedin  string `json:"linkedin"`
}

// adminPlayerEditDTO is the directory row with the current edit values on top. The row's own name and nickname give
// way to the player's own when there is a player (a club record has none).
type adminPlayerEditDTO struct {
	adminPlayerDTO
	PlayingStyle     string         `json:"playingStyle"`
	ExperienceYears  *int64         `json:"experienceYears"`
	ExperienceMonths *int64         `json:"experienceMonths"`
	SocialLinks      socialLinksDTO `json:"socialLinks"`
	ProfilePrivate   bool           `json:"profilePrivate"`
	ShowProfileStats bool           `json:"showProfileStats"`
	PreviousPicture  *string        `json:"previousPicture"`
	HasAccount       bool           `json:"hasAccount"`
	PasswordSetAt    *string        `json:"passwordSetAt"`
}

func (s *server) adminPlayer(r *http.Request, q *sqlcgen.Queries) (any, error) {
	ctx := r.Context()
	// The TypeScript answers a 500 for an ID that is not a UUID (the database refuses it); here it is not found.
	id, ok := uuidKey(r.PathValue("playerId"))
	if !ok {
		return nil, errNotFound
	}
	edit, err := s.readAdminPlayerEdit(ctx, q, id, r.PathValue("playerId"))
	if err != nil {
		return nil, err
	}
	return struct {
		Edit             adminPlayerEditDTO `json:"edit"`
		SocialLinks      socialLinksDTO     `json:"socialLinks"`
		ShowProfileStats bool               `json:"showProfileStats"`
	}{*edit, edit.SocialLinks, edit.ShowProfileStats}, nil
}

// readAdminPlayerEdit is readAdminPlayerEdit: the directory row with the current edit values on top. idText is the
// target as typed (the password audit event is matched on the text). errNotFound when there is no such row.
func (s *server) readAdminPlayerEdit(ctx context.Context, q *sqlcgen.Queries, id pgtype.UUID, idText string) (*adminPlayerEditDTO, error) {
	rows, err := s.adminPlayerDirectory(ctx, q, id)
	if err != nil {
		return nil, err
	}
	if len(rows) == 0 {
		return nil, errNotFound
	}
	edit := adminPlayerEditDTO{
		adminPlayerDTO: rows[0], ShowProfileStats: true, HasAccount: true,
		ExperienceYears: nil, ExperienceMonths: nil,
	}
	extras, err := q.GetAdminPlayerEditExtras(ctx, id)
	player := err == nil
	if err != nil && !errors.Is(err, pgx.ErrNoRows) {
		return nil, err
	}
	if player {
		edit.Name, edit.Nickname = extras.FullName, textPtr(extras.Nickname)
		edit.PlayingStyle = publicreads.PlayingStyle(extras.PersonalDetails)
		if months, ok := publicreads.CurrentExperienceMonths(extras.ExperienceMonths, extras.ExperienceRecordedAt, s.now()); ok {
			edit.ExperienceYears, edit.ExperienceMonths = addr(months/12), addr(months%12)
		}
		edit.ProfilePrivate = extras.ProfileVisibility != sqlcgen.ProfileVisibilityPublic
		edit.ShowProfileStats = extras.ShowProfileStats
		edit.PreviousPicture = textPtr(extras.AvatarPreviousRef)
		edit.HasAccount = extras.HasContact
	}
	links, err := q.ListPlayerSocialLinks(ctx, id)
	if err != nil {
		return nil, err
	}
	for _, l := range links {
		switch l.Provider {
		case sqlcgen.SocialProviderFacebook:
			edit.SocialLinks.Facebook = l.Url
		case sqlcgen.SocialProviderInstagram:
			edit.SocialLinks.Instagram = l.Url
		case sqlcgen.SocialProviderYoutube:
			edit.SocialLinks.Youtube = l.Url
		case sqlcgen.SocialProviderLinkedin:
			edit.SocialLinks.Linkedin = l.Url
		}
	}
	set, err := q.GetPlayerPasswordSetAt(ctx, idText) // the target is matched as typed
	if err != nil && !errors.Is(err, pgx.ErrNoRows) {
		return nil, err
	}
	edit.PasswordSetAt = isoPtr(set)
	return &edit, nil
}

// ---- GET /api/players/{playerId}/games ----

// adminPlayerGames is readAdminPlayerGames: the canonical history, every name in full. A person with no RTR ID yet has
// the games of the club records behind their shared entry, or of the one club record.
func (s *server) adminPlayerGames(r *http.Request, q *sqlcgen.Queries) (any, error) {
	ctx := r.Context()
	id, ok := uuidKey(r.PathValue("playerId"))
	if !ok {
		return nil, errNotFound
	}
	allocated, err := q.ExistsPlayerAllocation(ctx, id)
	if err != nil {
		return nil, err
	}
	sessions := []publicreads.HistorySession{}
	switch {
	case allocated:
		if sessions, err = publicreads.AdminPlayerHistory(ctx, q, id); err != nil {
			return nil, err
		}
	default:
		records, err := q.ListSharedEntryClubRecordIds(ctx, id)
		if err != nil {
			return nil, err
		}
		if len(records) > 0 {
			for _, rec := range records {
				more, err := publicreads.AdminClubPlayerHistory(ctx, q, rec.ClubID, rec.ID)
				if err != nil {
					return nil, err
				}
				sessions = append(sessions, more...)
			}
			break
		}
		clubOnly, err := clubOnlyRows(ctx, q, id)
		if err != nil {
			return nil, err
		}
		if len(clubOnly) == 0 {
			return nil, errNotFound
		}
		clubID, _ := uuidKey(clubOnly[0].CreatedByClubID)
		if sessions, err = publicreads.AdminClubPlayerHistory(ctx, q, clubID, id); err != nil {
			return nil, err
		}
	}
	games := make([]publicreads.HistorySession, 0, len(sessions))
	for _, h := range sessions {
		if h.FinishedAt != nil {
			games = append(games, h)
		}
	}
	return struct {
		Games []publicreads.HistorySession `json:"games"`
	}{games}, nil
}

// ---- GET /api/players/{playerId}/verification (D-2026-11-16-02) ----

// adminVerificationDTO is the player's verification with what only Admin sees: the full phone and the revision.
type adminVerificationDTO struct {
	verificationDTO
	Phone    *string `json:"phone"`
	Revision string  `json:"revision"`
}

func (s *server) adminPlayerVerification(r *http.Request, q *sqlcgen.Queries) (any, error) {
	type body struct {
		Verification *adminVerificationDTO `json:"verification"`
	}
	id, ok := uuidKey(r.PathValue("playerId"))
	if !ok {
		return body{}, nil
	}
	v, err := readVerification(r, q, id)
	if err != nil {
		return nil, err
	}
	if v == nil {
		return body{}, nil
	}
	return body{v.admin()}, nil
}
