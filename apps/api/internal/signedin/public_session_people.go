package signedin

import (
	"context"
	"errors"
	"slices"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgtype"

	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/db/sqlcgen"
	httpapi "github.com/jose-codegourmet/rotra-v2/apps/api/internal/http"
	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/publicreads"
)

// The people of a session page, as the signed-in Player sees them: the name rules of the access read (person) and of
// the other session reads (peopleFor), and where the Player stands (playerStanding).

// faceDTO is a face on a court tile, a queued match, a match record or a match request: the first name by the
// signed-in name rule, the level, the picture. participant is the face's index in the access read's roster, sent
// only when the roster is listed in full (index 0 is sent).
type faceDTO struct {
	Name        string  `json:"name"`
	Level       *string `json:"level"`
	PictureURL  *string `json:"pictureUrl"`
	Masked      bool    `json:"masked"`
	IsViewer    bool    `json:"isViewer"`
	Participant *int    `json:"participant,omitempty"`
}

// shownPerson is one roster entry as a signed-in Player sees it (peopleFor): a registered (claimed) player's full name
// and nickname, guests and unclaimed profiles masked, an always-private player masked for everyone but themselves.
// The picture stays public.
type shownPerson struct {
	name       string
	masked     bool
	nickname   *string
	pictureURL *string
	isViewer   bool
}

// rosterPeople reads the saved players behind roster entries, by club player ID.
func rosterPeople(ctx context.Context, q *sqlcgen.Queries, entries []sqlcgen.ListSessionRosterRowsRow) (map[pgtype.UUID]sqlcgen.ListRosterPeopleRow, error) {
	ids := make([]pgtype.UUID, 0, len(entries))
	for _, e := range entries {
		ids = append(ids, e.ClubPlayerID)
	}
	rows, err := q.ListRosterPeople(ctx, ids)
	if err != nil {
		return nil, err
	}
	out := make(map[pgtype.UUID]sqlcgen.ListRosterPeopleRow, len(rows))
	for _, r := range rows {
		out[r.ID] = r
	}
	return out, nil
}

func isClaimed(r sqlcgen.ListRosterPeopleRow) bool {
	return r.PlayerID.Valid && r.ProfileState.Valid && r.ProfileState.PlayerProfileState == sqlcgen.PlayerProfileStateClaimed
}

// peopleFor is peopleFor in match-requests.ts, keyed by roster entry ID.
func peopleFor(ctx context.Context, q *sqlcgen.Queries, entries []sqlcgen.ListSessionRosterRowsRow, viewerID pgtype.UUID) (map[pgtype.UUID]shownPerson, error) {
	linked, err := rosterPeople(ctx, q, entries)
	if err != nil {
		return nil, err
	}
	out := make(map[pgtype.UUID]shownPerson, len(entries))
	for _, e := range entries {
		club, found := linked[e.ClubPlayerID]
		registered := found && isClaimed(club)
		isViewer := found && club.PlayerID.Valid && club.PlayerID == viewerID
		alwaysPrivate := registered && club.ProfileVisibility.Valid && club.ProfileVisibility.ProfileVisibility == sqlcgen.ProfileVisibilityAlwaysPrivate
		showFull := registered && (!alwaysPrivate || isViewer)
		p := shownPerson{name: e.NameSnapshot, masked: !showFull, isViewer: isViewer}
		if !showFull {
			p.name = publicreads.MaskPublicName(e.NameSnapshot)
		} else {
			p.nickname = publicreads.TextPtr(club.PlayerNickname)
		}
		if found {
			p.pictureURL = publicreads.TextPtr(club.AvatarRef)
		}
		out[e.ID] = p
	}
	return out, nil
}

// standing is playerStanding: the signed-in Player's own place in a session, for the join card.
type standing struct {
	Name             string           `json:"name"`
	Nickname         *string          `json:"nickname"`
	RtrID            *string          `json:"rtrId"`
	PictureURL       *string          `json:"pictureUrl"`
	InSession        bool             `json:"inSession"`
	WaitlistPosition *int             `json:"waitlistPosition"`
	JoinRequest      *joinRequestView `json:"joinRequest"`
}

// joinRequestView is the Player's latest join request.
type joinRequestView struct {
	RequestID        string `json:"requestId"`
	Name             string `json:"name"`
	Status           string `json:"status"`
	WaitlistPosition *int   `json:"waitlistPosition"`
	Placement        string `json:"placement"`
}

// playerStanding reads where the Player stands in a session: their name, whether they hold a slot or a waitlist place,
// and their latest request. Own data only.
func playerStanding(ctx context.Context, q *sqlcgen.Queries, playerID, sessionID pgtype.UUID) (standing, error) {
	player, err := q.GetStandingPlayer(ctx, playerID)
	if errors.Is(err, pgx.ErrNoRows) {
		return standing{}, &serviceError{code: httpapi.ErrForbidden}
	}
	if err != nil {
		return standing{}, err
	}
	_, ownErr := q.GetOwnLiveEntry(ctx, sqlcgen.GetOwnLiveEntryParams{SessionID: sessionID, PlayerID: playerID})
	if ownErr != nil && !errors.Is(ownErr, pgx.ErrNoRows) {
		return standing{}, ownErr
	}
	onRoster := ownErr == nil
	list, err := q.ListSessionWaitlistRows(ctx, sessionID)
	if err != nil {
		return standing{}, err
	}
	ordered := orderedWaitlist(list)
	waitIndex := -1
	if len(ordered) > 0 {
		ids := make([]pgtype.UUID, len(ordered))
		for i, w := range ordered {
			ids[i] = w.ClubPlayerID
		}
		own, err := q.ListMyClubPlayersAmong(ctx, sqlcgen.ListMyClubPlayersAmongParams{Ids: ids, PlayerID: playerID})
		if err != nil {
			return standing{}, err
		}
		mine := uuidSet(own)
		waitIndex = slices.IndexFunc(ordered, func(w sqlcgen.ListSessionWaitlistRowsRow) bool { return mine[w.ClubPlayerID] })
	}
	request, err := q.GetLatestJoinRequest(ctx, sqlcgen.GetLatestJoinRequestParams{SessionID: sessionID, PlayerID: playerID})
	if err != nil && !errors.Is(err, pgx.ErrNoRows) {
		return standing{}, err
	}
	hasRequest := err == nil
	inSession := onRoster || waitIndex >= 0
	st := standing{
		Name: player.FullName, Nickname: publicreads.TextPtr(player.Nickname), RtrID: publicreads.TextPtr(player.RtrID),
		PictureURL: publicreads.TextPtr(player.AvatarRef), InSession: inSession,
	}
	if !onRoster && waitIndex >= 0 {
		pos := waitIndex + 1
		st.WaitlistPosition = &pos
	}
	// A confirmed request whose place the Queue Master has since removed is history, not a status.
	if hasRequest && (request.Status != sqlcgen.JoinRequestStatusConfirmed || inSession) {
		index := -1
		if request.Status == sqlcgen.JoinRequestStatusConfirmed && request.ClubPlayerID.Valid {
			index = slices.IndexFunc(ordered, func(w sqlcgen.ListSessionWaitlistRowsRow) bool { return w.ClubPlayerID == request.ClubPlayerID })
		}
		view := &joinRequestView{RequestID: request.ID.String(), Name: request.Name, Status: string(request.Status), Placement: string(request.Placement)}
		if index >= 0 {
			pos := index + 1
			view.WaitlistPosition = &pos
		}
		st.JoinRequest = view
	}
	return st, nil
}

// isClubMember is memberOf: the Player's current saved record in the club with a level.
func isClubMember(ctx context.Context, q *sqlcgen.Queries, clubID, playerID pgtype.UUID) (bool, error) {
	return q.IsClubMemberWithLevel(ctx, sqlcgen.IsClubMemberWithLevelParams{ClubID: clubID, PlayerID: playerID})
}
