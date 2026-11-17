package store

import (
	"context"

	"github.com/google/uuid"
)

// ClubName is the display name of a club (the sign-in body's account name). ErrNotFound when there is no club.
func (q *Queries) ClubName(ctx context.Context, clubID uuid.UUID) (string, error) {
	name, err := q.q.GetClubNameByID(ctx, pgUUID(clubID))
	if err != nil {
		return "", wrap("club name", err)
	}
	return name, nil
}

// PlayerFullName is the full name of a player (the sign-in body's account name). ErrNotFound when there is
// no player.
func (q *Queries) PlayerFullName(ctx context.Context, playerID uuid.UUID) (string, error) {
	name, err := q.q.GetPlayerFullNameByID(ctx, pgUUID(playerID))
	if err != nil {
		return "", wrap("player full name", err)
	}
	return name, nil
}
