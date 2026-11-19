package identity

import (
	"context"
	"fmt"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgtype"

	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/db/sqlcgen"
)

func pgUUID(u uuid.UUID) pgtype.UUID { return pgtype.UUID{Bytes: u, Valid: true} }

func pgTime(t time.Time) pgtype.Timestamptz { return pgtype.Timestamptz{Time: t, Valid: true} }

// AllocateRTRID gives a new player the permanent RTR ID, in the caller's transaction (allocateRtrId): one atomic
// counter step for the creating club's founding city and the sync day of at, then the immutable allocation row.
// The counter is advanced by the rotra_next_player_sequence database function, which locks its row until the
// transaction ends: concurrent allocations for the same city and day (two clubs founded in one city) wait for
// each other and draw distinct numbers, and a rolled-back transaction gives its number back.
func AllocateRTRID(ctx context.Context, tx pgx.Tx, playerID, clubID uuid.UUID, at time.Time) (string, error) {
	q := sqlcgen.New(tx)
	loc, err := q.GetClubFoundingLocation(ctx, pgUUID(clubID))
	if err != nil {
		return "", fmt.Errorf("identity: reading the founding location: %w", err)
	}
	syncDay := SyncDate(at)
	day, err := time.Parse("2006-01-02", syncDay)
	if err != nil {
		return "", fmt.Errorf("identity: sync day %q: %w", syncDay, err)
	}
	date := pgtype.Date{Time: day, Valid: true}
	seq, err := q.NextPlayerSequence(ctx, sqlcgen.NextPlayerSequenceParams{LocationCodeID: loc.ID, SyncDate: date})
	if err != nil {
		return "", fmt.Errorf("identity: advancing the player counter: %w", err)
	}
	rtrID := FormatRTRID(loc.CountryCode, loc.CityCode, syncDay, seq)
	err = q.InsertPlayerIDAllocation(ctx, sqlcgen.InsertPlayerIDAllocationParams{
		PlayerID: pgUUID(playerID), RtrID: rtrID, CreatingClubID: pgUUID(clubID), LocationCodeID: loc.ID,
		CountryCode: loc.CountryCode, CityCode: loc.CityCode, SyncDate: date, Sequence: seq, Now: pgTime(at),
	})
	if err != nil {
		return "", fmt.Errorf("identity: recording the allocation: %w", err)
	}
	return rtrID, nil
}

// Linked is one club record joined to a player.
type Linked struct {
	ClubID, ClubPlayerID uuid.UUID
}

// LinkClubRecordsByPhone links every club's unclaimed record whose private phone is phoneE164 to the player who
// just registered with that phone (linkClubRecordsByPhone; D-2026-11-11-03: automatic, no Queue Master tap). One
// record per club (the earliest saved); a club that already lists the player keeps that row. Game history stays
// on the club records; no attribution or permanent result is written here. The matched rows are locked.
func LinkClubRecordsByPhone(ctx context.Context, tx pgx.Tx, playerID uuid.UUID, phoneE164 string, now time.Time) ([]Linked, error) {
	q := sqlcgen.New(tx)
	records, err := q.ListUnclaimedRecordsByPhone(ctx, phoneE164)
	if err != nil {
		return nil, fmt.Errorf("identity: listing club records by phone: %w", err)
	}
	var linked []Linked
	done := map[uuid.UUID]bool{}
	for _, r := range records {
		club, id := uuid.UUID(r.ClubID.Bytes), uuid.UUID(r.ID.Bytes)
		if done[club] {
			continue
		}
		listed, err := q.ClubListsPlayer(ctx, sqlcgen.ClubListsPlayerParams{ClubID: r.ClubID, PlayerID: pgUUID(playerID)})
		if err != nil {
			return nil, fmt.Errorf("identity: checking the club's list: %w", err)
		}
		if listed {
			continue
		}
		if err := q.LinkClubPlayer(ctx, sqlcgen.LinkClubPlayerParams{PlayerID: pgUUID(playerID), Now: pgTime(now), ClubID: r.ClubID, ID: r.ID}); err != nil {
			return nil, fmt.Errorf("identity: linking a club record: %w", err)
		}
		if err := q.ResolveClubPlayerInput(ctx, sqlcgen.ResolveClubPlayerInputParams{PlayerID: pgUUID(playerID), Now: pgTime(now), ClubPlayerID: r.ID}); err != nil {
			return nil, fmt.Errorf("identity: resolving a club record's intake: %w", err)
		}
		done[club] = true
		linked = append(linked, Linked{ClubID: club, ClubPlayerID: id})
	}
	return linked, nil
}

func pgText(s string) pgtype.Text { return pgtype.Text{String: s, Valid: true} }
