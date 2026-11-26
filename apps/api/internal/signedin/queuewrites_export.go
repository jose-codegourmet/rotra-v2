package signedin

import (
	"context"
	"errors"
	"time"

	"github.com/jackc/pgx/v5/pgtype"

	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/db/sqlcgen"
	httpapi "github.com/jose-codegourmet/rotra-v2/apps/api/internal/http"
	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/rules/model"
)

// What the Queue writes (internal/queuewrites) answer with: the same roster read, entry, waitlist entry and join
// request the GET routes send, shared here so a write can never disagree with a read about what the Queue Master sees.

// RosterEntry is rosterEntryDto on the wire.
type RosterEntry = queueRosterEntryDTO

// WaitlistEntry is waitlistDto on the wire.
type WaitlistEntry = queueWaitlistDTO

// JoinRequest is joinRequestDto on the wire.
type JoinRequest = queueJoinRequestDTO

// RosterNames is rosterNamesOf for one entry: the nickname players see and the club's own nickname for a registered
// player (null when blank).
func RosterNames(clubNickname, playerNickname pgtype.Text, state sqlcgen.NullPlayerProfileState) (nickname, club *string) {
	return rosterNames(clubNickname, playerNickname, state)
}

// RosterEntryOf is rosterEntryDto for a session player row.
func RosterEntryOf(e sqlcgen.SessionPlayer, nickname, clubNickname *string) RosterEntry {
	return RosterEntry{
		ID: e.ID.String(), SessionID: e.SessionID.String(), ClubPlayerID: e.ClubPlayerID.String(), NameSnapshot: e.NameSnapshot,
		NicknameSnapshot: nickname, ClubNickname: clubNickname, Present: e.Present, PresentChangedAt: httpapi.ToIso(e.PresentChangedAt.Time),
		Level: levelOf(e.SkillLevelID), LevelLockedAt: isoPtr(e.LevelLockedAt), ConfirmedAt: httpapi.ToIso(e.ConfirmedAt.Time),
		GamesAdjustment: e.GamesAdjustment, SelfCheckedInAt: isoPtr(e.SelfCheckedInAt), LeftAt: isoPtr(e.LeftAt),
		Revision: httpapi.ToDecimalString(e.Revision),
	}
}

// WaitlistEntryOf is waitlistDto for a waitlist row at a position.
func WaitlistEntryOf(w sqlcgen.SessionWaitlist, position int) WaitlistEntry {
	return WaitlistEntry{
		ID: w.ID.String(), SessionID: w.SessionID.String(), ClubPlayerID: w.ClubPlayerID.String(), Level: levelOf(w.SkillLevelID),
		AddedAt: httpapi.ToIso(w.AddedAt.Time), Position: position,
	}
}

// JoinRequestOf is joinRequestDto for a request row with its Player's picture and name seed.
func JoinRequestOf(j sqlcgen.GetQueueJoinRequestForUpdateRow) JoinRequest {
	return JoinRequest{
		ID: j.ID.String(), SessionID: j.SessionID.String(), Name: j.Name, Nickname: textPtr(j.Nickname), PhoneE164: textPtr(j.PhoneE164),
		StatedBand: string(j.StatedBand), Placement: string(j.Placement), Status: string(j.Status), RequestedAt: httpapi.ToIso(j.RequestedAt.Time),
		DecidedAt: isoPtr(j.DecidedAt), ClubPlayerID: uuidPtr(j.ClubPlayerID), PlayerID: uuidPtr(j.PlayerID),
		Picture: textPtr(j.AvatarRef), PictureName: textPtr(j.PlayerFullName),
	}
}

// WaitlistPosition is the 1-based place of an entry in the waitlist order (orderedWaitlist then findIndex + 1); 0 when
// it is not there.
func WaitlistPosition(rows []sqlcgen.ListQueueWaitlistRow, id pgtype.UUID) int {
	for i, w := range orderedQueueWaitlist(rows) {
		if w.ID == id {
			return i + 1
		}
	}
	return 0
}

// ReadSessionRoster is readSessionRosterIn for the club's session: the roster read, run on q (a transaction's queries).
func ReadSessionRoster(ctx context.Context, q *sqlcgen.Queries, club, sessionID pgtype.UUID, now func() time.Time) (any, error) {
	rows, err := q.ListQueueSessions(ctx, sqlcgen.ListQueueSessionsParams{ClubID: club, SessionID: sessionID})
	if err != nil {
		return nil, err
	}
	if len(rows) == 0 {
		return nil, errNotFound
	}
	return (&server{now: now}).rosterOf(ctx, q, club, rows[0])
}

// OrderedWaitlist is orderedWaitlist: the session's waitlist rows in waitlist order.
func OrderedWaitlist(rows []sqlcgen.ListQueueWaitlistRow) []sqlcgen.ListQueueWaitlistRow {
	return orderedQueueWaitlist(rows)
}

// CountedGamesByEntry is countedGamesByEntry: the games each roster entry has counted, by entry id.
func CountedGamesByEntry(ctx context.Context, q *sqlcgen.Queries, session pgtype.UUID) (map[string]int, error) {
	return countedGamesByEntry(ctx, q, session)
}

// Session is sessionDto on the wire.
type Session = queueSessionDTO

// Court is courtDto on the wire.
type Court = queueCourtDTO

// SessionOf is sessionDto for a queue_sessions row, as a write reads it (the columns of LockQueueSession).
func SessionOf(r sqlcgen.LockQueueSessionRow) Session {
	formats := r.RequestFormats
	d := Session{
		ID: r.ID.String(), ClubID: r.ClubID.String(), Title: r.Title, Notes: r.Notes.String,
		ScheduledStartAt: httpapi.ToIso(r.ScheduledStartAt.Time), ScheduledEndAt: httpapi.ToIso(r.ScheduledEndAt.Time),
		VenueID: uuidPtr(r.VenueID), VenueName: r.VenueName.String, VenueAddress: r.VenueAddress.String, State: string(r.State),
		InvalidReason: textPtr(r.InvalidReason), CancelledAt: isoPtr(r.CancelledAt), CancelReason: textPtr(r.CancelReason),
		SessionMode: string(r.SessionMode), AllowSingles: r.AllowSingles, AllowDoubles: r.AllowDoubles, MinimumGames: r.MinimumGames,
		MinimumIsCalculated: r.MinimumIsCalculated, PlayersPerCourt: r.PlayersPerCourt, StartedAt: isoPtr(r.StartedAt),
		FinalizedAt: isoPtr(r.FinalizedAt), SeriesID: uuidPtr(r.SeriesID), PublicSlug: r.PublicSlug, AcceptJoinRequests: r.AcceptJoinRequests,
		AlwaysRequireRequest: r.AlwaysRequireRequest, CourtFillMode: string(r.CourtFillMode), RequestFormats: requestFormatsRecord(formats),
		RecordGames: r.RecordGames, Revision: httpapi.ToDecimalString(r.Revision),
	}
	if r.ExpectedPlayers.Valid {
		v := r.ExpectedPlayers.Int32
		d.ExpectedPlayers = &v
	}
	return d
}

// CourtOf is courtDto for a session court row.
func CourtOf(c sqlcgen.SessionCourt) Court {
	return Court{
		ID: c.ID.String(), SessionID: c.SessionID.String(), Label: c.Label, Position: c.Position, StartsAt: isoPtr(c.StartsAt), OpenedEarlyAt: isoPtr(c.OpenedEarlyAt),
		OpenUntil: isoPtr(c.OpenUntil), RemovedAt: isoPtr(c.RemovedAt),
	}
}

// NewInviteCode is newClubInviteCode: a random club invite code.
func NewInviteCode() (string, error) { return newInviteCode() }

// Venue is venueDto on the wire.
type Venue = queueVenueDTO

// VenueOf is venueDto for a saved venue.
func VenueOf(v sqlcgen.ClubVenue) Venue {
	return Venue{
		ID: v.ID.String(), ClubID: v.ClubID.String(), Name: v.Name, Address: v.Address.String,
		CourtFeePerCourtHr: moneyOrNil(v.CourtFeePerCourtHourMinor, v.Currency), EntranceFee: moneyOrNil(v.EntranceFeeMinor, v.Currency),
		Revision: httpapi.ToDecimalString(v.Revision),
	}
}

// Match is matchDto on the wire.
type Match = queueMatchDTO

// MatchContext is what matchContext holds for a session: the live roster, the courts and the matches in the shapes the shared
// rules read, with the stored match rows behind them (a write that places a match needs the row of each).
type MatchContext struct {
	Roster  []model.Player
	Courts  []model.Court
	Matches []model.Match
	Rows    []sqlcgen.ListSessionMatchRowsRow
}

// MatchContextOf reads the match context of a session, on q (a transaction's queries). The roster has no games adjustment: the
// caller that needs it reads the stored roster too.
func MatchContextOf(ctx context.Context, q *sqlcgen.Queries, sessionID pgtype.UUID) (MatchContext, error) {
	ls := &loadedSession{}
	if err := ls.fill(ctx, q, sessionID); err != nil {
		return MatchContext{}, err
	}
	return MatchContext{Roster: ls.rules, Courts: ls.courts, Matches: ls.matches, Rows: ls.matchRows}, nil
}

// MatchOf is matchDto for one match of a session, as stored now; false when it is not among the session's matches.
func MatchOf(ctx context.Context, q *sqlcgen.Queries, sessionID pgtype.UUID, matchID pgtype.UUID) (Match, bool, error) {
	all, err := matchesIn(ctx, q, sessionID)
	if err != nil {
		return Match{}, false, err
	}
	want := matchID.String()
	for _, m := range all {
		if m.ID == want {
			return m, true, nil
		}
	}
	return Match{}, false, nil
}

// OwnDetails is readOwnDetails: what a club entered about its own unclaimed player. Anything missing or malformed reads as not
// entered. Months is nil with no experience; RecordedAt is the stored text of the date it was recorded ("" for none).
type OwnDetails struct {
	PlayingStyle string
	Months       *int64
	RecordedAt   string
	Links        map[string]string
}

// OwnDetailsOf reads the stored details (club_player_private_inputs.preset_fields).
func OwnDetailsOf(stored []byte) OwnDetails {
	d := readOwnDetails(stored)
	return OwnDetails{PlayingStyle: d.playingStyle, Months: d.months, RecordedAt: d.recordedAt, Links: d.links}
}

// CurrentExperienceMonths is currentExperienceMonths: the recorded months plus the calendar months since they were recorded. A
// recorded date that is not a date leaves the months as they are.
func CurrentExperienceMonths(months int64, recordedAt string, now time.Time) int64 {
	if recordedAt == "" {
		return months
	}
	at, ok := parseJSDate(recordedAt)
	if !ok {
		return months
	}
	return currentMonthsAt(months, at, now)
}

// ErrNoSuchPlayer is StandingOf for a Player with no row: forbidden.
var ErrNoSuchPlayer = errors.New("signedin: no such player")

// PlayerStanding is what the Player's join write decides on: playerStanding without the display fields.
type PlayerStanding struct {
	InSession bool
	// WaitlistClubPlayerID is the Player's own saved player while they are waitlisted and not on the roster.
	WaitlistClubPlayerID pgtype.UUID
	// RequestPending says the Player's latest request is pending.
	RequestPending bool
}

// StandingOf is playerStanding: where the signed-in Player stands in a session. A Player that does not exist is forbidden.
func StandingOf(ctx context.Context, q *sqlcgen.Queries, playerID, sessionID pgtype.UUID) (PlayerStanding, error) {
	st, err := playerStanding(ctx, q, playerID, sessionID)
	var se *serviceError
	if errors.As(err, &se) && se.code == httpapi.ErrForbidden {
		return PlayerStanding{}, ErrNoSuchPlayer
	}
	if err != nil {
		return PlayerStanding{}, err
	}
	return PlayerStanding{InSession: st.InSession, WaitlistClubPlayerID: st.waitlistClubPlayer, RequestPending: st.JoinRequest != nil && st.JoinRequest.Status == "pending"}, nil
}

// Shortfall is a roster entry below the session's minimum games (the belowMinimum warning of Session done).
type Shortfall = reviewShortfall

// BelowMinimum is belowMinimum: the live roster entries with fewer counted games than the target; a target of zero lists nobody.
func BelowMinimum(ctx context.Context, q *sqlcgen.Queries, session pgtype.UUID, minimum int32) ([]Shortfall, error) {
	return belowMinimum(ctx, q, session, minimum)
}
