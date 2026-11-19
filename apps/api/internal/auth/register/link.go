package register

import (
	"context"
	"errors"
	"net/url"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgtype"

	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/clubjoin"
	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/db/sqlcgen"
	httpapi "github.com/jose-codegourmet/rotra-v2/apps/api/internal/http"
	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/writes"
)

// link is what the registration page's context says about where the visitor came from (guestRegistrationClub): the club's
// name and, from a session link, the session's title and slug. Nothing about a guest, a player or a private contact.
type link struct {
	clubName     string
	club         pgtype.UUID
	sessionTitle *string
	sessionSlug  *string
}

// linkOf is guestRegistrationClub. A session link (`?session=`, the Register with ROTRA button of a session page, #689) must
// be this club's session with a live publication; it needs no code. Without one this is the club invite link, which needs the
// club's current code `k` (#712). An empty value counts as absent, as `|| null` makes it.
func linkOf(ctx context.Context, q *sqlcgen.Queries, clubText string, query url.Values) (link, error) {
	slug, code := query.Get("session"), query.Get("k")
	if slug == "" {
		club, err := clubjoin.RequireInvite(ctx, q, clubText, code)
		if err != nil {
			return link{}, err
		}
		return link{clubName: club.Name, club: club.ID}, nil
	}
	club, ok := clubjoin.ParseUUID(clubText)
	if !ok {
		return link{}, writes.Fail(httpapi.ErrNotFound, nil)
	}
	name, err := q.GetClubName(ctx, club)
	if errors.Is(err, pgx.ErrNoRows) {
		return link{}, writes.Fail(httpapi.ErrNotFound, nil)
	}
	if err != nil {
		return link{}, err
	}
	s, err := q.GetSessionForRegistration(ctx, slug)
	unavailable := writes.Fail(httpapi.ErrNotFound, map[string]string{"session": "This session link is not available."})
	if errors.Is(err, pgx.ErrNoRows) {
		return link{}, unavailable
	}
	if err != nil {
		return link{}, err
	}
	// The club ids are compared as text, the way the TypeScript compares the path's with the stored one: a club id written in
	// capitals reaches the club above and is never this session's.
	if uuid.UUID(s.ClubID.Bytes).String() != clubText || s.PublicationState == "deleted" {
		return link{}, unavailable
	}
	title, public := s.Title, s.PublicSlug
	return link{clubName: name, club: club, sessionTitle: &title, sessionSlug: &public}, nil
}
