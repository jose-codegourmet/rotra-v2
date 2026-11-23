package queuewrites

import (
	"context"
	"errors"
	"math"
	"net/http"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgtype"

	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/auth/store"
	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/db/sqlcgen"
	httpapi "github.com/jose-codegourmet/rotra-v2/apps/api/internal/http"
	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/liveupdates"
	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/player/fields"
	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/signedin"
	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/writes"
)

// This file ports the club's inventory writes (Q-INVENTORY): apps/queue/src/app/api/inventory/** and saveInventoryItem,
// stepInventoryStock and removeInventoryItem of packages/db/src/queue/financials.ts. GET /api/inventory is a signed-in read
// (internal/signedin). Money is integer centavos. Every command checks the club's entitlement first, before it checks the fields.

func (s *server) registerInventory(rt *signedin.Router) {
	club := store.AudienceClub
	rt.Handle("POST /api/inventory", club, s.club(s.saveInventoryItem))
	rt.Handle("DELETE /api/inventory/{itemId}", club, s.club(s.removeInventoryItem))
	rt.Handle("POST /api/inventory/{itemId}/stock", club, s.club(s.stepInventoryStock))
}

// inventoryItem is inventoryDto on the wire.
type inventoryItem struct {
	ID            string  `json:"id"`
	ClubID        string  `json:"clubId"`
	Name          string  `json:"name"`
	Category      string  `json:"category"`
	Unit          string  `json:"unit"`
	Stock         int32   `json:"stock"`
	UnitCostMinor int32   `json:"unitCostMinor"`
	Currency      string  `json:"currency"`
	RemovedAt     *string `json:"removedAt"`
	Revision      string  `json:"revision"`
}

func inventoryOf(i sqlcgen.InventoryItem) inventoryItem {
	out := inventoryItem{
		ID: i.ID.String(), ClubID: i.ClubID.String(), Name: i.Name, Category: string(i.Category), Unit: i.Unit, Stock: i.Stock,
		UnitCostMinor: i.UnitCostMinor, Currency: i.Currency, Revision: httpapi.ToDecimalString(i.Revision),
	}
	if i.RemovedAt.Valid {
		v := httpapi.ToIso(i.RemovedAt.Time)
		out.RemovedAt = &v
	}
	return out
}

// beyondInt32 is a number Prisma refuses for an Int column: the checks of the service let it through and the write fails (a 500).
func beyondInt32(f float64) bool { return f > math.MaxInt32 || f < math.MinInt32 }

// categoryOf is the InventoryCategory a text names, if it names one.
func categoryOf(text string) (sqlcgen.InventoryCategory, bool) {
	switch c := sqlcgen.InventoryCategory(text); c {
	case sqlcgen.InventoryCategoryShuttlecocks, sqlcgen.InventoryCategoryEquipment, sqlcgen.InventoryCategoryOther:
		return c, true
	}
	return "", false
}

// saveInventoryItem is POST /api/inventory, saveInventoryItem: add or edit an item. `id` is the client's stable command ID, so a
// retried add returns the same item; an edit sends `expectedRevision` and a stale one is a conflict. An existing item sent with no
// expectedRevision comes back as it is, unchanged. The edit takes no row lock, so two edits at one revision can both win.
func (s *server) saveInventoryItem(r *http.Request, club pgtype.UUID) (writes.Result, error) {
	body, err := writes.ReadBody(r)
	if err != nil {
		return writes.Result{}, err
	}
	id, category, stock, cost := body.Text("id"), body.Text("category"), body.Number("stock"), body.Number("unitCostMinor")
	expected, hasExpected := body["expectedRevision"].(string)
	if err := s.entitled(r.Context(), club); err != nil {
		return writes.Result{}, err
	}
	name := fields.JSTrim(body.Text("name"))
	if !hyphenatedUUID.MatchString(id) {
		return writes.Result{}, writes.Fail(httpapi.ErrInvalid, map[string]string{"id": "Expected a UUID."})
	}
	if name == "" {
		return writes.Result{}, writes.Fail(httpapi.ErrInvalid, map[string]string{"name": "Enter a name."})
	}
	cat, ok := categoryOf(category)
	if !ok {
		return writes.Result{}, writes.Fail(httpapi.ErrInvalid, map[string]string{"category": "Choose a category."})
	}
	if !isInteger(stock) || stock < 0 {
		return writes.Result{}, writes.Fail(httpapi.ErrInvalid, map[string]string{"stock": "Enter a stock of zero or more."})
	}
	if !safeInteger(cost) || cost < 0 {
		return writes.Result{}, writes.Fail(httpapi.ErrInvalid, map[string]string{"unitCost": "Enter an amount of zero or more."})
	}
	if math.Mod(cost, 100) != 0 {
		return writes.Result{}, writes.Fail(httpapi.ErrInvalid, map[string]string{"unitCost": "Enter a whole-peso amount."})
	}
	unit := fields.JSTrim(body.Text("unit"))
	if unit == "" {
		unit = "piece"
	}
	itemID, _ := writes.ParseUUID(id) // the check above is stricter than the parser
	out, err := s.inClub(r.Context(), club, func(t *txn) (any, error) {
		existing, err := t.q.GetInventoryItem(t.ctx, itemID)
		found := err == nil
		if err != nil && !errors.Is(err, pgx.ErrNoRows) {
			return nil, err
		}
		if found && existing.ClubID != t.club {
			return nil, writes.Fail(httpapi.ErrNotFound, nil)
		}
		switch {
		case !found:
			if beyondInt32(stock) || beyondInt32(cost) {
				return nil, errTypeError // Prisma refuses a number beyond an Int column
			}
			created, err := t.q.InsertInventoryItem(t.ctx, sqlcgen.InsertInventoryItemParams{
				ID: itemID, ClubID: t.club, Name: name, Category: cat, Unit: unit, Stock: int32(stock), UnitCostMinor: int32(cost), Now: t.stamp(),
			})
			return inventoryOf(created), err
		case existing.RemovedAt.Valid:
			return nil, writes.Fail(httpapi.ErrNotFound, nil)
		case !hasExpected:
			return inventoryOf(existing), nil
		}
		if err := requireRevision(existing.Revision, expected); err != nil {
			return nil, err
		}
		if beyondInt32(stock) || beyondInt32(cost) {
			return nil, errTypeError
		}
		updated, err := t.q.UpdateInventoryItem(t.ctx, sqlcgen.UpdateInventoryItemParams{
			Name: name, Category: cat, Unit: unit, Stock: int32(stock), UnitCostMinor: int32(cost), Now: t.stamp(), ID: existing.ID,
		})
		return inventoryOf(updated), err
	})
	if err != nil {
		return writes.Result{}, err
	}
	return writes.Result{Body: map[string]any{"item": out}}, nil
}

// stepInventoryStock is POST /api/inventory/{itemId}/stock, stepInventoryStock: stock moves by one and never below zero. It is one
// atomic update with no transaction around it, and the item is read after it.
func (s *server) stepInventoryStock(r *http.Request, club pgtype.UUID) (writes.Result, error) {
	body, err := writes.ReadBody(r)
	if err != nil {
		return writes.Result{}, err
	}
	delta := body.Number("delta")
	if err := s.entitled(r.Context(), club); err != nil {
		return writes.Result{}, err
	}
	if delta != 1 && delta != -1 {
		return writes.Result{}, writes.Fail(httpapi.ErrInvalid, nil)
	}
	itemText := r.PathValue("itemId")
	if !hyphenatedUUID.MatchString(itemText) {
		return writes.Result{}, writes.Fail(httpapi.ErrNotFound, nil)
	}
	itemID, _ := writes.ParseUUID(itemText)
	q := sqlcgen.New(s.pool)
	// The update runs in a small transaction of its own so the live-update event commits with it (B-26); the reads stay outside.
	var rows int64
	err = writes.InTx(r.Context(), s.pool, func(ctx context.Context, tq *sqlcgen.Queries) error {
		var err error
		rows, err = tq.StepInventoryStock(ctx, sqlcgen.StepInventoryStockParams{Delta: int32(delta), ID: itemID, ClubID: club})
		if err == nil && rows > 0 {
			liveupdates.Note(ctx, club, pgtype.UUID{})
		}
		return err
	})
	if err != nil {
		return writes.Result{}, err
	}
	item, err := q.GetClubInventoryItem(r.Context(), sqlcgen.GetClubInventoryItemParams{ID: itemID, ClubID: club})
	if errors.Is(err, pgx.ErrNoRows) || err == nil && item.RemovedAt.Valid {
		return writes.Result{}, writes.Fail(httpapi.ErrNotFound, nil)
	}
	if err != nil {
		return writes.Result{}, err
	}
	if rows == 0 {
		return writes.Result{}, writes.Fail(httpapi.ErrInvalid, map[string]string{"stock": "Stock can’t go below zero."})
	}
	return writes.Result{Body: map[string]any{"item": inventoryOf(item)}}, nil
}

// removeInventoryItem is DELETE /api/inventory/{itemId}, removeInventoryItem: a soft remove, as past estimates may still use the
// item. A retried remove returns the removed item again; an id this club does not own is not found.
func (s *server) removeInventoryItem(r *http.Request, club pgtype.UUID) (writes.Result, error) {
	if err := s.entitled(r.Context(), club); err != nil {
		return writes.Result{}, err
	}
	itemText := r.PathValue("itemId")
	if !hyphenatedUUID.MatchString(itemText) {
		return writes.Result{}, writes.Fail(httpapi.ErrNotFound, nil)
	}
	itemID, _ := writes.ParseUUID(itemText)
	q := sqlcgen.New(s.pool)
	if err := writes.InTx(r.Context(), s.pool, func(ctx context.Context, tq *sqlcgen.Queries) error {
		if _, err := tq.RemoveInventoryItem(ctx, sqlcgen.RemoveInventoryItemParams{Now: s.stamp(), ID: itemID, ClubID: club}); err != nil {
			return err
		}
		liveupdates.Note(ctx, club, pgtype.UUID{}) // in the same transaction (B-26)
		return nil
	}); err != nil {
		return writes.Result{}, err
	}
	item, err := q.GetClubInventoryItem(r.Context(), sqlcgen.GetClubInventoryItemParams{ID: itemID, ClubID: club})
	if errors.Is(err, pgx.ErrNoRows) {
		return writes.Result{}, writes.Fail(httpapi.ErrNotFound, nil)
	}
	if err != nil {
		return writes.Result{}, err
	}
	return writes.Result{Body: map[string]any{"item": inventoryOf(item)}}, nil
}
