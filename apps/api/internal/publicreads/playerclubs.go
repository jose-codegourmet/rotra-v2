package publicreads

import (
	"errors"
	"fmt"
	"net/http"
	"strings"
	"unicode"
	"unicode/utf16"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgtype"

	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/db/sqlcgen"
	httpapi "github.com/jose-codegourmet/rotra-v2/apps/api/internal/http"
)

// clubDTO is a club on a player's page: id, name, initials and logo. How the player joined never leaves here.
type clubDTO struct {
	ID       string      `json:"id"`
	Name     string      `json:"name"`
	Initials utf16String `json:"initials"`
	LogoURL  *string     `json:"logoUrl"`
	// IsHost is whether the player is a current trusted host there (the Host badge, #1007).
	IsHost bool `json:"isHost"`
}

// clubs answers GET /api/players/{playerId}/clubs: the clubs the player is currently saved in. It follows the
// profile read (only a player with an RTR ID is found), and an always-private profile has no clubs.
func (p *players) clubs(w http.ResponseWriter, r *http.Request) {
	id, ok := uuidParam(r)
	if !ok {
		notFound(w)
		return
	}
	body := struct {
		Clubs []clubDTO `json:"clubs"`
	}{Clubs: []clubDTO{}}
	found := false
	err := readTx(r.Context(), p.pool, func(q *sqlcgen.Queries) error {
		visibility, err := q.GetPublicClubsVisibility(r.Context(), id)
		if errors.Is(err, pgx.ErrNoRows) {
			// An unclaimed person a club saved (a shared entry): the clubs that saved them.
			open, err := entryOpen(r.Context(), q, id)
			if err != nil || !open {
				return err
			}
			found = true
			entryClubs, err := q.ListEntryClubs(r.Context(), id)
			if err != nil {
				return fmt.Errorf("listing entry clubs: %w", err)
			}
			seen := map[pgtype.UUID]bool{}
			for _, c := range entryClubs {
				if !seen[c.ID] {
					seen[c.ID] = true
					body.Clubs = append(body.Clubs, clubDTO{ID: c.ID.String(), Name: c.Name, Initials: clubInitials(c.Name), LogoURL: textPtr(c.LogoRef)})
				}
			}
			return nil
		}
		if err != nil {
			return fmt.Errorf("reading visibility: %w", err)
		}
		found = true
		if visibility == sqlcgen.ProfileVisibilityAlwaysPrivate {
			return nil
		}
		rows, err := q.ListPlayerClubs(r.Context(), id)
		if err != nil {
			return fmt.Errorf("listing clubs: %w", err)
		}
		hosts, err := q.ListPlayerHostClubIDs(r.Context(), id)
		if err != nil {
			return fmt.Errorf("listing host clubs: %w", err)
		}
		isHost := map[pgtype.UUID]bool{}
		for _, h := range hosts {
			isHost[h] = true
		}
		for _, c := range rows {
			body.Clubs = append(body.Clubs, clubDTO{ID: c.ID.String(), Name: c.Name, Initials: clubInitials(c.Name), LogoURL: textPtr(c.LogoRef), IsHost: isHost[c.ID]})
		}
		return nil
	})
	if err != nil {
		p.fail(w, r, err)
		return
	}
	if !found {
		notFound(w)
		return
	}
	httpapi.WriteJSON(w, http.StatusOK, body, httpapi.Public)
}

// utf16String is a string carried as UTF-16 units. JavaScript's w[0] is one unit, which is half of a surrogate
// pair for an emoji, and JSON.stringify then writes that half as an escape. Go strings cannot hold it.
type utf16String []uint16

const hexDigits = "0123456789abcdef"

// MarshalJSON writes the string as JSON.stringify does: a lone surrogate as a lower-case \uXXXX escape.
func (u utf16String) MarshalJSON() ([]byte, error) {
	var b strings.Builder
	b.WriteByte('"')
	for i := 0; i < len(u); i++ {
		c := rune(u[i])
		if utf16.IsSurrogate(c) {
			if i+1 < len(u) {
				if r := utf16.DecodeRune(c, rune(u[i+1])); r != unicode.ReplacementChar {
					b.WriteRune(r)
					i++
					continue
				}
			}
			b.WriteString(`\u`)
			b.WriteByte(hexDigits[c>>12])
			b.WriteByte(hexDigits[c>>8&0xf])
			b.WriteByte(hexDigits[c>>4&0xf])
			b.WriteByte(hexDigits[c&0xf])
			continue
		}
		switch {
		case c == '"':
			b.WriteString(`\"`)
		case c == '\\':
			b.WriteString(`\\`)
		case c == '\n':
			b.WriteString(`\n`)
		case c == '\r':
			b.WriteString(`\r`)
		case c == '\t':
			b.WriteString(`\t`)
		case c == '\b':
			b.WriteString(`\b`)
		case c == '\f':
			b.WriteString(`\f`)
		case c < 0x20:
			b.WriteString(`\u00`)
			b.WriteByte(hexDigits[c>>4])
			b.WriteByte(hexDigits[c&0xf])
		default:
			b.WriteRune(c)
		}
	}
	b.WriteByte('"')
	return []byte(b.String()), nil
}

// upperExpansions are the JavaScript toUpperCase results that are more than one letter. Go's simple case
// mapping keeps these characters as they are. Other expansions (a few Greek and Armenian forms) are not
// copied: no club name is expected to start with one.
var upperExpansions = map[rune]string{
	0xdf: "SS", 0xfb00: "FF", 0xfb01: "FI", 0xfb02: "FL", 0xfb03: "FFI", 0xfb04: "FFL", 0xfb05: "ST", 0xfb06: "ST",
}

// clubInitials is initials() in player-clubs.ts:
// name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]?.toUpperCase() ?? ”).join(”).
func clubInitials(name string) utf16String {
	words := strings.FieldsFunc(name, isJSSpace)
	if len(words) > 2 {
		words = words[:2]
	}
	out := utf16String{}
	for _, w := range words {
		first := []rune(w)[0]
		var unit uint16
		if first >= 0x10000 {
			unit = uint16(utf16.Encode([]rune{first})[0]) // w[0] is the high half only
			out = append(out, unit)
			continue
		}
		if up, ok := upperExpansions[first]; ok {
			out = append(out, utf16.Encode([]rune(up))...)
			continue
		}
		out = append(out, utf16.Encode([]rune{unicode.ToUpper(first)})...)
	}
	return out
}
