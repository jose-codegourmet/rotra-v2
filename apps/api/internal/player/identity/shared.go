package identity

import (
	"context"
	"errors"
	"fmt"
	"strings"
	"time"
	"unicode"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgtype"

	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/db/sqlcgen"
	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/player/fields"
	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/publicreads"
)

// The shared entry of an unclaimed player (D-2026-11-16-04, P15.8): one per normalized email, holding the RTR ID allocation and
// nothing a club typed. Ports of normalizeEmail, adoptEntryAllocation and claimSharedEntry in
// packages/db/src/player/shared-entry.ts, for registration: it keeps the RTR ID of an email a club saved before, and joins the
// clubs' records of that email to the new account.

// NormalizeEmail is normalizeEmail: trimmed and lower-cased as JavaScript does, and it must look like /^[^@\s]+@[^@\s]+$/.
// ok is false for an empty or malformed email.
func NormalizeEmail(typed string) (email string, ok bool) {
	email = publicreads.JSToLower(fields.JSTrim(typed))
	if email == "" {
		return "", false
	}
	at := strings.IndexByte(email, '@')
	if at <= 0 || at == len(email)-1 || strings.Count(email, "@") != 1 {
		return "", false
	}
	if strings.ContainsFunc(email, func(r rune) bool { return unicode.IsSpace(r) || fields.IsJSSpace(r) }) {
		return "", false
	}
	return email, true
}

// lockEmail is lockEmail: it serializes everything that reads and then writes one email. The key is the TypeScript's.
func lockEmail(ctx context.Context, q *sqlcgen.Queries, email string) error {
	if err := q.LockEmailAddress(ctx, email); err != nil {
		return fmt.Errorf("identity: locking the email: %w", err)
	}
	return nil
}

// AllocateRTRIDFor is allocateRtrId with emails: when an open shared entry has one of them (the registering ROTRA or Google
// email) the player keeps that entry's RTR ID, which the allocation copies (adoptEntryAllocation); otherwise it is
// AllocateRTRID. The first email with an open entry decides, as in the TypeScript.
func AllocateRTRIDFor(ctx context.Context, tx pgx.Tx, playerID, clubID uuid.UUID, at time.Time, emails ...string) (string, error) {
	adopted, err := adoptEntryAllocation(ctx, tx, playerID, emails)
	if err != nil {
		return "", err
	}
	if adopted != "" {
		return adopted, nil
	}
	return AllocateRTRID(ctx, tx, playerID, clubID, at)
}

// ErrCityRequired is CITY_REQUIRED: a registration from the Admin link with no city, for an email no club saved, has no place for the RTR ID.
var ErrCityRequired = errors.New("identity: pick your city or province")

// Place is where an RTR ID takes its place from: the club's founding city, or for the Admin link (no club) the founding city the player
// picked. A zero Place has none.
type Place struct {
	ClubID       uuid.UUID
	LocationCode pgtype.UUID
}

// AllocateRTRIDAt is allocateRtrId for a place: an open shared entry with one of the emails keeps its RTR ID and needs no city (no
// allocation without a club has a creating club); otherwise the club's founding city or the picked one gives it, and without either it is
// ErrCityRequired.
func AllocateRTRIDAt(ctx context.Context, tx pgx.Tx, playerID uuid.UUID, place Place, at time.Time, emails ...string) (string, error) {
	adopted, err := adoptEntryAllocation(ctx, tx, playerID, emails)
	if err != nil {
		return "", err
	}
	if adopted != "" {
		return adopted, nil
	}
	if place.ClubID != uuid.Nil {
		return AllocateRTRID(ctx, tx, playerID, place.ClubID, at)
	}
	if !place.LocationCode.Valid {
		return "", ErrCityRequired
	}
	q := sqlcgen.New(tx)
	loc, err := q.GetLocationCode(ctx, place.LocationCode)
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
		PlayerID: pgUUID(playerID), RtrID: rtrID, LocationCodeID: loc.ID,
		CountryCode: loc.CountryCode, CityCode: loc.CityCode, SyncDate: date, Sequence: seq, Now: pgTime(at),
	})
	if err != nil {
		return "", fmt.Errorf("identity: recording the allocation: %w", err)
	}
	return rtrID, nil
}

func adoptEntryAllocation(ctx context.Context, tx pgx.Tx, playerID uuid.UUID, emails []string) (string, error) {
	q := sqlcgen.New(tx)
	for _, typed := range emails {
		email, ok := NormalizeEmail(typed)
		if !ok {
			continue
		}
		if err := lockEmail(ctx, q, email); err != nil {
			return "", err
		}
		entry, err := q.GetOpenSharedEntryByEmail(ctx, pgText(email))
		if errors.Is(err, pgx.ErrNoRows) {
			continue
		}
		if err != nil {
			return "", fmt.Errorf("identity: reading the shared entry: %w", err)
		}
		holder, err := q.GetAllocationPlayerByRtrID(ctx, entry.RtrID)
		if err == nil {
			// The RTR ID is already some player's: this player keeps it only when it is theirs (a retry).
			if holder == pgUUID(playerID) {
				return entry.RtrID, nil
			}
			return "", nil
		}
		if !errors.Is(err, pgx.ErrNoRows) {
			return "", fmt.Errorf("identity: reading the allocation: %w", err)
		}
		err = q.InsertAdoptedAllocation(ctx, sqlcgen.InsertAdoptedAllocationParams{
			PlayerID: pgUUID(playerID), RtrID: entry.RtrID, CreatingClubID: entry.CreatingClubID, LocationCodeID: entry.LocationCodeID,
			CountryCode: entry.CountryCode, CityCode: entry.CityCode, SyncDate: entry.SyncDate, Sequence: entry.Sequence,
		})
		if err != nil {
			return "", fmt.Errorf("identity: recording the adopted allocation: %w", err)
		}
		return entry.RtrID, nil
	}
	return "", nil
}

// ClaimSharedEntry is claimSharedEntry: the open shared entry whose email is one of emails (the person's ROTRA email or Google
// email) is claimed by the player, and every current club record pointing to it joins the account, with its games (the record
// keeps its club_player_id). One record per club: a club that already lists the account keeps that row. It is repeat-safe: an
// entry the player already claimed is found by the player. It returns the records that joined. The caller commits.
func ClaimSharedEntry(ctx context.Context, tx pgx.Tx, playerID uuid.UUID, emails []string, now time.Time) ([]Linked, error) {
	q := sqlcgen.New(tx)
	var entry uuid.UUID
	claimed, err := q.GetSharedEntryClaimedBy(ctx, pgUUID(playerID))
	already := err == nil
	switch {
	case already:
		entry = uuid.UUID(claimed.Bytes)
	case !errors.Is(err, pgx.ErrNoRows):
		return nil, fmt.Errorf("identity: reading the claimed entry: %w", err)
	default:
		for _, typed := range emails {
			email, ok := NormalizeEmail(typed)
			if !ok {
				continue
			}
			if err := lockEmail(ctx, q, email); err != nil {
				return nil, err
			}
			open, err := q.GetOpenSharedEntryByEmail(ctx, pgText(email))
			if errors.Is(err, pgx.ErrNoRows) {
				continue
			}
			if err != nil {
				return nil, fmt.Errorf("identity: reading the shared entry: %w", err)
			}
			entry = uuid.UUID(open.ID.Bytes)
			break
		}
	}
	if entry == uuid.Nil {
		return nil, nil
	}
	records, err := q.ListSharedEntryRecords(ctx, pgUUID(entry))
	if err != nil {
		return nil, fmt.Errorf("identity: listing the entry's records: %w", err)
	}
	if !already {
		err = q.MarkSharedEntryClaimed(ctx, sqlcgen.MarkSharedEntryClaimedParams{PlayerID: pgUUID(playerID), Now: pgTime(now), ID: pgUUID(entry)})
		if err != nil {
			return nil, fmt.Errorf("identity: claiming the shared entry: %w", err)
		}
	}
	var linked []Linked
	for _, r := range records {
		if r.PlayerID.Valid {
			continue
		}
		listed, err := q.ClubListsPlayer(ctx, sqlcgen.ClubListsPlayerParams{ClubID: r.ClubID, PlayerID: pgUUID(playerID)})
		if err != nil {
			return nil, fmt.Errorf("identity: checking the club's list: %w", err)
		}
		if listed {
			continue
		}
		err = q.LinkSharedEntryRecord(ctx, sqlcgen.LinkSharedEntryRecordParams{PlayerID: pgUUID(playerID), Now: pgTime(now), ClubID: r.ClubID, ID: r.ID})
		if err != nil {
			return nil, fmt.Errorf("identity: linking a club record: %w", err)
		}
		linked = append(linked, Linked{ClubID: uuid.UUID(r.ClubID.Bytes), ClubPlayerID: uuid.UUID(r.ID.Bytes)})
	}
	return linked, nil
}
