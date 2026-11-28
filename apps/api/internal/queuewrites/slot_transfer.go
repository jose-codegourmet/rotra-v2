package queuewrites

import (
	"context"
	"crypto/rand"
	"crypto/sha256"
	"encoding/base64"
	"encoding/json"
	"errors"
	"net/http"
	"regexp"
	"strings"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgtype"

	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/auth/session"
	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/auth/store"
	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/clubjoin"
	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/db/sqlcgen"
	httpapi "github.com/jose-codegourmet/rotra-v2/apps/api/internal/http"
	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/liveupdates"
	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/player/fields"
	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/publicreads"
	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/rules/club"
	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/rules/slotledger"
	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/signedin"
	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/slotmoney"
	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/writes"
)

// Slot transfer (task 5.5, epic #1009, D-2026-11-22-03): Approve, and the Player's seven routes under
// /api/public-sessions/{slug}/slot-transfer (apps/player/src/app/api/public-sessions/[slug]/slot-transfer/** and packages/db/src/queue/slot-transfers.ts).
// A confirmed signed-in Player asks, before Start, to hand their slot to a registered ROTRA player found by exact RTR ID, or makes a single-claim
// transfer link for someone with no account; the Queue Master approves or rejects it in Requests. Every write runs on the locked session row and
// locks the transfer row. ROTRA moves no money: Approve records the slot's money on the transfer row (#1013); the sender's payment mark is never
// touched. The texts are the shared TypeScript rules (packages/data/src/slot-transfer/slotTransfer.rules.ts); they are kept here, not under
// internal/rules, because no shared rule changes.

const (
	transferNotConfirmed  = "Only confirmed players can transfer their slot."
	transferAlreadySent   = "Your transfer request is already sent."
	transferRtrIDError    = "Enter the full RTR ID, like RTR-PH-CEB-102926-0001."
	transferSelfError     = "That's your own RTR ID."
	transferAlreadyClosed = "This transfer request is already closed."

	transferLinkClosed    = "This transfer link no longer works. Ask the sender for a new link."
	transferLinkClaimed   = "Someone else already claimed this transfer link."
	transferLinkOwn       = "This is your own transfer link. Send it to the player who'll take your slot."
	transferLinkExpired   = "This transfer link has expired. Transfer links stop working when the session starts."
	transferLinkCancelled = "This session was cancelled, so the transfer link no longer works."
	transferClaimHaveSlot = "You already have a slot in this session, so you can't claim this one."
	transferClaimClosed   = "Your claim on this slot is already closed."

	transferWithdrawnToast      = "Transfer request withdrawn"
	transferLinkCreatedToast    = "Transfer link ready · share it with the new player"
	transferLinkCancelledToast  = "Transfer link cancelled"
	transferClaimedToast        = "Slot claimed · the QM decides"
	transferClaimWithdrawnToast = "Claim withdrawn · this link no longer works"
)

var (
	// rtrIDShape is RTR_ID_SHAPE: `.` is any character but a line terminator, `\d` is an ASCII digit.
	rtrIDShape = regexp.MustCompile("^RTR-[^\n\r  ]+-[0-9]{6}-[0-9]+$")
	// linkTokenShape is TRANSFER_LINK_TOKEN: 32 random bytes in base64url, 43 characters.
	linkTokenShape = regexp.MustCompile("^[A-Za-z0-9_-]{43}$")
)

func transferSentToast(recipient string) string {
	return "Transfer to " + recipient + " sent · the QM decides"
}

func transferRecipientConfirmed(name string) string {
	return name + " already has a slot in this session."
}

func transferApprovedToast(sender, recipient string, waived int64) string {
	tail := ""
	if waived != 0 {
		tail = " · " + club.FormatPeso(waived) + " waived"
	}
	return sender + "'s slot now belongs to " + recipient + tail
}

// normalizeRtrID is normalizeRtrId: trimmed and upper case.
func normalizeRtrID(text string) string { return strings.ToUpper(fields.JSTrim(text)) }

func isRtrID(text string) bool { return rtrIDShape.MatchString(normalizeRtrID(text)) }

// linkState is transferLinkState: the link's state for the person who opened it (viewer is nil for a visitor). A link works exactly while its
// transfer is pending and the session is Prepared.
func linkState(status sqlcgen.SlotTransferStatus, sessionState sqlcgen.QueueSessionState, sender, recipient pgtype.UUID, viewer *pgtype.UUID) string {
	mine := viewer != nil && recipient.Valid && recipient == *viewer
	switch {
	case status == sqlcgen.SlotTransferStatusApproved:
		if mine {
			return "approved"
		}
		return "closed"
	case status == sqlcgen.SlotTransferStatusCancelled || sessionState == sqlcgen.QueueSessionStateCancelled:
		return "cancelled"
	case status == sqlcgen.SlotTransferStatusExpired || (status == sqlcgen.SlotTransferStatusPending && sessionState != sqlcgen.QueueSessionStatePrepared):
		return "expired"
	case status != sqlcgen.SlotTransferStatusPending:
		return "closed"
	case viewer != nil && *viewer == sender:
		return "own"
	case mine:
		return "yours"
	case recipient.Valid:
		return "claimed"
	}
	return "open"
}

// linkClaimError is transferLinkClaimError: why a claim is refused for a link in this state, or "" when it may be claimed.
func linkClaimError(state string) string {
	switch state {
	case "open":
		return ""
	case "yours", "approved", "claimed":
		return transferLinkClaimed
	case "own":
		return transferLinkOwn
	case "expired":
		return transferLinkExpired
	case "cancelled":
		return transferLinkCancelled
	}
	return transferLinkClosed
}

func (s *server) registerSlotTransfer(rt *signedin.Router) {
	rt.Handle("POST /api/sessions/{sessionId}/requests/transfers/{transferId}/approve", store.AudienceClub, s.club(s.approveSlotTransfer))

	routes := map[string]writes.Command{
		"":               s.requestSlotTransfer,
		"/lookup":        s.findTransferRecipient,
		"/withdraw":      s.withdrawSlotTransfer,
		"/link":          s.createTransferLink,
		"/link/claim":    s.claimTransferLink,
		"/link/withdraw": s.withdrawTransferClaim,
	}
	for action, cmd := range routes {
		path := "/api/public-sessions/{slug}/slot-transfer" + action
		rt.Handle("POST "+path, store.AudiencePlayer, s.fromQueueOrigin(s.player(cmd)))
		rt.Handle("OPTIONS "+path, store.AudiencePlayer, http.HandlerFunc(s.preflight))
	}
	// The link card is open to a visitor: the pass is optional, and there is no Google deadline gate (handleVisitorRequest).
	const read = "/api/public-sessions/{slug}/slot-transfer/link/read"
	rt.Handle("POST "+read, store.AudiencePlayer, s.fromQueueOrigin(s.auth.Optional(store.AudiencePlayer)(http.HandlerFunc(s.readTransferLink))))
	rt.Handle("OPTIONS "+read, store.AudiencePlayer, http.HandlerFunc(s.preflight))
}

// ---------- Queue Master: Approve ----------

// approveSlotTransfer is Approve with the level the Queue Master chose. One transaction on the locked session: the sender's entry is released
// (reason transferred; its paid mark and assessments stay on it), the recipient's saved player is found or saved, their waitlist row (or a new
// one) gets the level and is promoted into a slot that keeps the sender's place in slot order. The live count is unchanged and the recipient ends
// with exactly one entry. Refused when the recipient got a slot meanwhile. The recipient's pending join request and the sender's open drop-out
// notice close. #1013: the slot's money is read before it changes hands and written on the transfer row; no payment mark changes.
func (s *server) approveSlotTransfer(r *http.Request, clubID pgtype.UUID) (writes.Result, error) {
	body, err := writes.ReadBody(r)
	if err != nil {
		return writes.Result{}, err
	}
	level := body.Text("level")
	skillLevel, err := levelID(level)
	if err != nil {
		return writes.Result{}, err
	}
	// The waiver the Queue Master was shown: missing and null skip the check; anything else must be a whole number of centavos.
	var expected *int64
	if v, has := body["expectedWaiverMinor"]; has && v != nil {
		_, isNumber := v.(json.Number)
		f := body.Number("expectedWaiverMinor")
		if !isNumber || !safeInteger(f) || f < 0 {
			return writes.Result{}, writes.Fail(httpapi.ErrInvalid, map[string]string{"expectedWaiverMinor": "Enter the waiver in centavos."})
		}
		e := int64(f)
		expected = &e
	}
	return s.decision(r, clubID, func(t *txn, transfer sqlcgen.LockSlotTransferRow) (any, error) {
		sender, err := t.q.GetSessionPlayer(t.ctx, transfer.SenderSessionPlayerID)
		if err != nil && !errors.Is(err, pgx.ErrNoRows) {
			return nil, err
		}
		if err != nil || sender.ReleasedAt.Valid || sender.NoShowAt.Valid {
			return nil, conflict("transfer", slotledger.TransferSenderGone)
		}
		if !transfer.RecipientPlayerID.Valid {
			return nil, conflict("transfer", slotledger.TransferNotFound)
		}
		recipient, err := t.q.GetPlayerNames(t.ctx, transfer.RecipientPlayerID)
		if err != nil {
			return nil, err
		}
		if _, err := t.q.GetTransferLiveEntry(t.ctx, sqlcgen.GetTransferLiveEntryParams{SessionID: t.sess.ID, PlayerID: transfer.RecipientPlayerID}); err == nil {
			return nil, conflict("transfer", transferRecipientConfirmed(recipient.FullName))
		} else if !errors.Is(err, pgx.ErrNoRows) {
			return nil, err
		}
		// #1013: the slot's money, read before it changes hands: its cash collected so far (the sender's own mark plus anything carried to
		// them), earlier waivers and the automatic waiver. No payment mark is written or changed; collected cash stays the same.
		due, err := t.amountDue()
		if err != nil {
			return nil, err
		}
		ledger, err := slotmoney.Load(t.ctx, t.q, t.sess.ID)
		if err != nil {
			return nil, err
		}
		payment := slotledger.SnapshotOf(due, slotledger.HoldingOf(ledger.PaymentOf(sender.ID, due), due))
		if expected != nil && *expected != payment.Waived {
			return nil, conflict("transfer", "The payment for this slot changed: approving now waives "+club.FormatPeso(payment.Waived)+". Check and approve again.")
		}
		now := t.stamp()
		operationID := derivedID(transfer.ID.String(), "approve").String()
		recipientClubPlayer, _, err := t.clubPlayerForProfile(operationID, transfer.RecipientPlayerID.String(), now, "")
		if err != nil {
			return nil, err
		}
		if err := t.q.ReleaseSessionPlayerTransferred(t.ctx, sqlcgen.ReleaseSessionPlayerTransferredParams{Now: now, ID: sender.ID}); err != nil {
			return nil, err
		}
		waiting, err := t.q.GetSessionWaitlistEntryOfClubPlayer(t.ctx, sqlcgen.GetSessionWaitlistEntryOfClubPlayerParams{SessionID: t.sess.ID, ClubPlayerID: recipientClubPlayer.ID})
		wasWaitlisted := err == nil
		if err != nil && !errors.Is(err, pgx.ErrNoRows) {
			return nil, err
		}
		var entry sqlcgen.SessionWaitlist
		if wasWaitlisted {
			entry, err = t.q.SetSessionWaitlistLevel(t.ctx, sqlcgen.SetSessionWaitlistLevelParams{SkillLevelID: skillLevel, Now: now, ID: waiting.ID})
		} else {
			entry, err = t.q.InsertSessionWaitlistEntry(t.ctx, sqlcgen.InsertSessionWaitlistEntryParams{
				ID: derivedID(operationID, "waitlist"), ClubID: t.club, SessionID: t.sess.ID, ClubPlayerID: recipientClubPlayer.ID,
				SkillLevelID: skillLevel, AddedAt: now, Now: now,
			})
		}
		if err != nil {
			return nil, err
		}
		promoted, err := t.promoteWaiter(waiter{ID: entry.ID, ClubPlayerID: entry.ClubPlayerID, SkillLevelID: entry.SkillLevelID}, operationID, false)
		if err != nil {
			return nil, err
		}
		// The recipient takes the sender's place in slot order (first come, first served).
		if err := t.q.SetSessionPlayerConfirmedAt(t.ctx, sqlcgen.SetSessionPlayerConfirmedAtParams{ConfirmedAt: sender.ConfirmedAt, Now: now, ID: promoted.ID}); err != nil {
			return nil, err
		}
		if err := t.q.ClosePlayerPendingJoinRequests(t.ctx, sqlcgen.ClosePlayerPendingJoinRequestsParams{Now: now, SessionID: t.sess.ID, PlayerID: transfer.RecipientPlayerID}); err != nil {
			return nil, err
		}
		if err := t.q.CloseEntryDropOutNotices(t.ctx, sqlcgen.CloseEntryDropOutNoticesParams{Now: now, SessionPlayerID: sender.ID}); err != nil {
			return nil, err
		}
		approved := sqlcgen.ApproveSlotTransferParams{
			Now: now, RecipientClubPlayerID: recipientClubPlayer.ID, RecipientSessionPlayerID: promoted.ID, RecipientWasWaitlisted: pgtype.Bool{Bool: wasWaitlisted, Valid: true},
			AmountPaidMinor: pgtype.Int4{Int32: int32(payment.Paid), Valid: true}, PriorWaivedMinor: pgtype.Int4{Int32: int32(payment.PriorWaived), Valid: true},
			WaivedMinor: pgtype.Int4{Int32: int32(payment.Waived), Valid: true}, ID: transfer.ID,
		}
		if payment.AmountDue != nil {
			approved.AmountDueMinor = pgtype.Int4{Int32: int32(*payment.AmountDue), Valid: true}
		}
		if err := t.q.ApproveSlotTransfer(t.ctx, approved); err != nil {
			return nil, err
		}
		touched, err := t.touch()
		if err != nil {
			return nil, err
		}
		if _, err := t.recomputeMinimum(touched); err != nil {
			return nil, err
		}
		return transferAnswer{transfer.ID.String(), transferApprovedToast(sender.NameSnapshot, recipient.FullName, payment.Waived)}, nil
	})
}

// ---------- the Player's routes ----------

// senderEntry is senderEntry: the Player's live roster entry in a Prepared session (the slot they would transfer).
func (t *txn) senderEntry(player pgtype.UUID) (sqlcgen.GetTransferLiveEntryRow, error) {
	if t.sess.State != sqlcgen.QueueSessionStatePrepared {
		return sqlcgen.GetTransferLiveEntryRow{}, invalid("state", slotledger.TransferStarted)
	}
	e, err := t.q.GetTransferLiveEntry(t.ctx, sqlcgen.GetTransferLiveEntryParams{SessionID: t.sess.ID, PlayerID: player})
	if errors.Is(err, pgx.ErrNoRows) {
		return e, invalid("player", transferNotConfirmed)
	}
	return e, err
}

// waitlistPlaceOf is the Player's 0-based place on this session's waitlist, -1 when not waiting.
func (t *txn) waitlistPlaceOf(player pgtype.UUID) (int, error) {
	saved, err := t.q.ListPlayerClubPlayerIDs(t.ctx, sqlcgen.ListPlayerClubPlayerIDsParams{ClubID: t.sess.ClubID, PlayerID: player})
	if err != nil {
		return -1, err
	}
	rows, err := t.q.ListQueueWaitlist(t.ctx, t.sess.ID)
	if err != nil {
		return -1, err
	}
	for i, w := range signedin.OrderedWaitlist(rows) {
		for _, id := range saved {
			if id == w.ClubPlayerID {
				return i, nil
			}
		}
	}
	return -1, nil
}

// transferRecipient is the TransferRecipient shape of the Find preview.
type transferRecipient struct {
	PlayerID         string  `json:"playerId"`
	FullName         string  `json:"fullName"`
	Nickname         *string `json:"nickname"`
	RtrID            string  `json:"rtrId"`
	Picture          *string `json:"picture"`
	WaitlistPosition *int    `json:"waitlistPosition"`
}

func textOf(t pgtype.Text) *string {
	if !t.Valid {
		return nil
	}
	return &t.String
}

// recipientFor is recipientFor: the recipient by exact RTR ID, a registered (claimed) ROTRA player listed in Player Information. Refused for the
// sender themselves and for anyone already confirmed in this session; a waitlisted recipient is allowed and reports their place.
func (t *txn) recipientFor(sender pgtype.UUID, rtrID string) (transferRecipient, error) {
	if !isRtrID(rtrID) {
		return transferRecipient{}, invalid("rtrId", transferRtrIDError)
	}
	notFound := writes.Fail(httpapi.ErrNotFound, map[string]string{"rtrId": slotledger.TransferNotFound})
	row, err := t.q.GetTransferRecipientByRtrID(t.ctx, normalizeRtrID(rtrID))
	if errors.Is(err, pgx.ErrNoRows) {
		return transferRecipient{}, notFound
	}
	if err != nil {
		return transferRecipient{}, err
	}
	if row.ProfileState != sqlcgen.PlayerProfileStateClaimed || (row.HiddenFromDirectory && row.ID != sender) {
		return transferRecipient{}, notFound
	}
	_, err = t.q.GetTransferLiveEntry(t.ctx, sqlcgen.GetTransferLiveEntryParams{SessionID: t.sess.ID, PlayerID: row.ID})
	confirmed := err == nil
	if err != nil && !errors.Is(err, pgx.ErrNoRows) {
		return transferRecipient{}, err
	}
	switch {
	case row.ID == sender:
		return transferRecipient{}, conflict("rtrId", transferSelfError)
	case confirmed:
		return transferRecipient{}, conflict("rtrId", transferRecipientConfirmed(row.FullName))
	}
	index, err := t.waitlistPlaceOf(row.ID)
	if err != nil {
		return transferRecipient{}, err
	}
	out := transferRecipient{PlayerID: row.ID.String(), FullName: row.FullName, Nickname: textOf(row.Nickname), RtrID: row.RtrID, Picture: textOf(row.AvatarRef)}
	if index >= 0 {
		place := index + 1
		out.WaitlistPosition = &place
	}
	return out, nil
}

// lockTransferOf is lockTransfer: the transfer row of the session, FOR UPDATE; a malformed id and an unknown one are not found.
func (t *txn) lockTransferOf(id pgtype.UUID) (sqlcgen.LockSlotTransferFullRow, error) {
	row, err := t.q.LockSlotTransferFull(t.ctx, sqlcgen.LockSlotTransferFullParams{ID: id, SessionID: t.sess.ID})
	if errors.Is(err, pgx.ErrNoRows) {
		return row, writes.Fail(httpapi.ErrNotFound, nil)
	}
	return row, err
}

// transferOfToken is transferForToken: the transfer whose link carries this token, in this session, or false. No lock.
func (t *txn) transferOfToken(token string) (pgtype.UUID, bool, error) {
	if !linkTokenShape.MatchString(token) {
		return pgtype.UUID{}, false, nil
	}
	sum := sha256.Sum256([]byte(token))
	hit, err := t.q.GetTransferByLinkDigest(t.ctx, sum[:])
	if errors.Is(err, pgx.ErrNoRows) || (err == nil && hit.SessionID != t.sess.ID) {
		return pgtype.UUID{}, false, nil
	}
	return hit.ID, err == nil, err
}

// slotTransferID reads the client's transferId: it must be a UUID before anything else is looked at.
// The answer sends the id back as the client wrote it (an upper-case id comes back upper case), where the row keeps it in Postgres's form.
func slotTransferID(body writes.Body) (id pgtype.UUID, text string, err error) {
	text = body.Text("transferId")
	id, ok := writes.ParseUUID(text)
	if !ok || !hyphenatedUUID.MatchString(text) {
		return id, text, writes.Fail(httpapi.ErrInvalid, nil)
	}
	return id, text, nil
}

// findTransferRecipient is Find on the Transfer my slot sheet: the recipient preview, or the refusal. Reads only: no lock, no change.
func (s *server) findTransferRecipient(r *http.Request, p session.Principal) (writes.Result, error) {
	body, err := writes.ReadBody(r)
	if err != nil {
		return writes.Result{}, err
	}
	ps, err := s.sessionOfSlug(r)
	if err != nil {
		return writes.Result{}, err
	}
	var out transferRecipient
	err = writes.InTx(r.Context(), s.pool, func(ctx context.Context, q *sqlcgen.Queries) error {
		// findUniqueOrThrow: the session as it is, no lock.
		row, err := q.GetQueueSession(ctx, ps.id)
		if err != nil {
			return err
		}
		t := &txn{ctx: ctx, q: q, s: s, club: ps.club, sess: sqlcgen.LockQueueSessionRow(row)}
		if _, err := t.senderEntry(playerOf(p)); err != nil {
			return err
		}
		out, err = t.recipientFor(playerOf(p), body.Text("rtrId"))
		return err
	})
	if err != nil {
		return writes.Result{}, mapDatabaseError(err)
	}
	return writes.Result{Body: out}, nil
}

// requestSlotTransfer is Send transfer request: one pending transfer per slot (409 when one is already pending). Repeat-safe on the client's
// transferId: a retry by the same sender returns the saved request.
func (s *server) requestSlotTransfer(r *http.Request, p session.Principal) (writes.Result, error) {
	body, err := writes.ReadBody(r)
	if err != nil {
		return writes.Result{}, err
	}
	id, idText, err := slotTransferID(body)
	if err != nil {
		return writes.Result{}, err
	}
	ps, err := s.sessionOfSlug(r)
	if err != nil {
		return writes.Result{}, err
	}
	player := playerOf(p)
	out, err := s.inPageSession(r, ps, true, func(t *txn) (any, error) {
		saved, err := t.q.GetSavedSlotTransfer(t.ctx, id)
		if err == nil {
			if saved.SenderPlayerID != player {
				return nil, writes.Fail(httpapi.ErrConflict, nil)
			}
			name := ""
			if saved.RecipientName.Valid {
				name = saved.RecipientName.String
			}
			return transferAnswer{idText, transferSentToast(name)}, nil
		}
		if !errors.Is(err, pgx.ErrNoRows) {
			return nil, err
		}
		entry, err := t.senderEntry(player)
		if err != nil {
			return nil, err
		}
		if _, err := t.q.GetPendingTransferOfEntry(t.ctx, entry.ID); err == nil {
			return nil, conflict("player", transferAlreadySent)
		} else if !errors.Is(err, pgx.ErrNoRows) {
			return nil, err
		}
		recipient, err := t.recipientFor(player, body.Text("rtrId"))
		if err != nil {
			return nil, err
		}
		recipientID, _ := writes.ParseUUID(recipient.PlayerID)
		if err := t.q.InsertSlotTransfer(t.ctx, sqlcgen.InsertSlotTransferParams{
			ID: id, ClubID: t.sess.ClubID, SessionID: t.sess.ID, SenderSessionPlayerID: entry.ID, SenderClubPlayerID: entry.ClubPlayerID,
			SenderPlayerID: player, RecipientPlayerID: recipientID, RequestedAt: t.stamp(),
		}); err != nil {
			return nil, err
		}
		if _, err := t.touch(); err != nil {
			return nil, err
		}
		return transferAnswer{idText, transferSentToast(recipient.FullName)}, nil
	})
	return writes.Result{Body: out}, err
}

// withdrawSlotTransfer is Withdraw request on the sender's own pending transfer; the slot stays theirs. A link nobody claimed is Cancel link.
func (s *server) withdrawSlotTransfer(r *http.Request, p session.Principal) (writes.Result, error) {
	ps, err := s.sessionOfSlug(r)
	if err != nil {
		return writes.Result{}, err
	}
	player := playerOf(p)
	out, err := s.inPageSession(r, ps, true, func(t *txn) (any, error) {
		entry, err := t.senderEntry(player)
		if err != nil {
			return nil, err
		}
		pending, err := t.q.GetPendingTransferOfEntry(t.ctx, entry.ID)
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, conflict("player", transferAlreadyClosed)
		}
		if err != nil {
			return nil, err
		}
		locked, err := t.lockTransferOf(pending)
		if err != nil {
			return nil, err
		}
		if err := t.q.WithdrawSlotTransfer(t.ctx, sqlcgen.WithdrawSlotTransferParams{Now: t.stamp(), PlayerID: player, ID: pending}); err != nil {
			return nil, err
		}
		if _, err := t.touch(); err != nil {
			return nil, err
		}
		// Cancel link on a link nobody claimed; otherwise Withdraw request. Either way the link stops working.
		message := transferWithdrawnToast
		if locked.HasLink && !locked.RecipientPlayerID.Valid {
			message = transferLinkCancelledToast
		}
		return transferAnswer{pending.String(), message}, nil
	})
	return writes.Result{Body: out}, err
}

// createTransferLink is Create a transfer link, for a recipient with no ROTRA account: a pending transfer with no recipient and the digest of a
// fresh token. The plaintext token is returned once and never stored, so a lost link is cancelled and made again. One pending transfer per slot.
func (s *server) createTransferLink(r *http.Request, p session.Principal) (writes.Result, error) {
	body, err := writes.ReadBody(r)
	if err != nil {
		return writes.Result{}, err
	}
	id, idText, err := slotTransferID(body)
	if err != nil {
		return writes.Result{}, err
	}
	ps, err := s.sessionOfSlug(r)
	if err != nil {
		return writes.Result{}, err
	}
	raw := make([]byte, 32)
	if _, err := rand.Read(raw); err != nil {
		return writes.Result{}, err
	}
	token := base64.RawURLEncoding.EncodeToString(raw)
	digest := sha256.Sum256([]byte(token))
	player := playerOf(p)
	out, err := s.inPageSession(r, ps, true, func(t *txn) (any, error) {
		entry, err := t.senderEntry(player)
		if err != nil {
			return nil, err
		}
		if _, err := t.q.GetPendingTransferOfEntry(t.ctx, entry.ID); err == nil {
			return nil, conflict("player", transferAlreadySent)
		} else if !errors.Is(err, pgx.ErrNoRows) {
			return nil, err
		}
		if err := t.q.InsertSlotTransfer(t.ctx, sqlcgen.InsertSlotTransferParams{
			ID: id, ClubID: t.sess.ClubID, SessionID: t.sess.ID, SenderSessionPlayerID: entry.ID, SenderClubPlayerID: entry.ClubPlayerID,
			SenderPlayerID: player, LinkTokenDigest: digest[:], RequestedAt: t.stamp(),
		}); err != nil {
			return nil, err
		}
		if _, err := t.touch(); err != nil {
			return nil, err
		}
		return struct {
			TransferID string `json:"transferId"`
			Token      string `json:"token"`
			Message    string `json:"message"`
		}{idText, token, transferLinkCreatedToast}, nil
	})
	return writes.Result{Body: out}, err
}

// linkCard is the TransferLinkView of the card on the session page.
type linkCard struct {
	State      string  `json:"state"`
	SenderName *string `json:"senderName"`
	ClaimBlock *string `json:"claimBlock"`
}

// readTransferLink is the transfer link card (`?transfer=<token>`), for anyone holding the link: its state from this viewer's side and the
// sender's masked name, as the public page masks names. An unknown or malformed token reads closed and says nothing more. A read: no lock. A POST
// so the token never sits in a server log URL.
func (s *server) readTransferLink(w http.ResponseWriter, r *http.Request) {
	closed := linkCard{State: "closed"}
	run := func() (any, error) {
		body, err := writes.ReadBody(r)
		if err != nil {
			return nil, err
		}
		var viewer *pgtype.UUID
		if p, ok := session.PrincipalFrom(r.Context()); ok {
			v := playerOf(p)
			viewer = &v
		}
		q := sqlcgen.New(s.pool)
		found, err := q.GetSessionOfSlugWithState(r.Context(), r.PathValue("slug"))
		if errors.Is(err, pgx.ErrNoRows) {
			return closed, nil
		}
		if err != nil {
			return nil, err
		}
		t := &txn{ctx: r.Context(), q: q, s: s, club: found.ClubID, sess: sqlcgen.LockQueueSessionRow{ID: found.ID, ClubID: found.ClubID, State: found.State}}
		hit, ok, err := t.transferOfToken(body.Text("token"))
		if err != nil || !ok {
			return closed, err
		}
		card, err := q.GetTransferLinkCard(r.Context(), hit)
		if err != nil {
			return nil, err
		}
		state := linkState(card.Status, found.State, card.SenderPlayerID, card.RecipientPlayerID, viewer)
		out := linkCard{State: state}
		name := publicreads.MaskPublicName(card.SenderName)
		out.SenderName = &name
		if state == "open" && viewer != nil {
			if _, err := q.GetTransferLiveEntry(r.Context(), sqlcgen.GetTransferLiveEntryParams{SessionID: found.ID, PlayerID: *viewer}); err == nil {
				block := transferClaimHaveSlot
				out.ClaimBlock = &block
			} else if !errors.Is(err, pgx.ErrNoRows) {
				return nil, err
			}
		}
		return out, nil
	}
	body, err := run()
	if err != nil {
		writes.Write(w, r, s.log, err)
		return
	}
	httpapi.WriteJSON(w, http.StatusOK, body, httpapi.Private)
}

// claimTransferLink is Claim this slot: the first signed-in player to accept takes the link. On the locked session and transfer rows, the claim is
// one conditional UPDATE (recipient_player_id IS NULL): a second claimant updates nothing and is told the link is already claimed. The transfer
// then waits for the Queue Master like a request by RTR ID. Refused for the sender, for anyone already confirmed here, and once the link closed.
func (s *server) claimTransferLink(r *http.Request, p session.Principal) (writes.Result, error) {
	body, err := writes.ReadBody(r)
	if err != nil {
		return writes.Result{}, err
	}
	ps, err := s.sessionOfSlug(r)
	if err != nil {
		return writes.Result{}, err
	}
	player := playerOf(p)
	out, err := s.inPageSession(r, ps, true, func(t *txn) (any, error) {
		id, ok, err := t.transferOfToken(body.Text("token"))
		if err != nil {
			return nil, err
		}
		if !ok {
			return nil, conflict("transfer", transferLinkClosed)
		}
		tr, err := t.lockTransferOf(id)
		if err != nil {
			return nil, err
		}
		if refused := linkClaimError(linkState(tr.Status, t.sess.State, tr.SenderPlayerID, tr.RecipientPlayerID, &player)); refused != "" {
			return nil, conflict("transfer", refused)
		}
		sender, err := t.q.GetSessionPlayerForTransfer(t.ctx, tr.SenderSessionPlayerID)
		if err != nil && !errors.Is(err, pgx.ErrNoRows) {
			return nil, err
		}
		if err != nil || sender.ReleasedAt.Valid || sender.NoShowAt.Valid {
			return nil, conflict("transfer", transferLinkClosed)
		}
		if _, err := t.q.GetTransferLiveEntry(t.ctx, sqlcgen.GetTransferLiveEntryParams{SessionID: t.sess.ID, PlayerID: player}); err == nil {
			return nil, conflict("transfer", transferClaimHaveSlot)
		} else if !errors.Is(err, pgx.ErrNoRows) {
			return nil, err
		}
		claimed, err := t.q.ClaimSlotTransfer(t.ctx, sqlcgen.ClaimSlotTransferParams{PlayerID: player, Now: t.stamp(), ID: tr.ID})
		if err != nil {
			return nil, err
		}
		if claimed != 1 {
			return nil, conflict("transfer", transferLinkClaimed)
		}
		// #1018: signing up or in through a transfer link makes the claimant a member of the club (create or reactivate the one membership
		// row, no owner approval, no queue rights).
		if err := clubjoin.AddToClub(t.ctx, t.q, t.stamp(), player, t.sess.ClubID); err != nil {
			return nil, err
		}
		liveupdates.NoteKind(t.ctx, liveupdates.KindPlayers, t.sess.ClubID, pgtype.UUID{})
		if _, err := t.touch(); err != nil {
			return nil, err
		}
		return transferAnswer{tr.ID.String(), transferClaimedToast}, nil
	})
	return writes.Result{Body: out}, err
}

// withdrawTransferClaim is Withdraw claim: the claimant gives the slot back before the Queue Master decides. The transfer closes as withdrawn (by
// them) and the link stops working; the sender makes a new one.
func (s *server) withdrawTransferClaim(r *http.Request, p session.Principal) (writes.Result, error) {
	body, err := writes.ReadBody(r)
	if err != nil {
		return writes.Result{}, err
	}
	ps, err := s.sessionOfSlug(r)
	if err != nil {
		return writes.Result{}, err
	}
	player := playerOf(p)
	out, err := s.inPageSession(r, ps, true, func(t *txn) (any, error) {
		id, ok, err := t.transferOfToken(body.Text("token"))
		if err != nil {
			return nil, err
		}
		if !ok {
			return nil, conflict("transfer", transferClaimClosed)
		}
		tr, err := t.lockTransferOf(id)
		if err != nil {
			return nil, err
		}
		if linkState(tr.Status, t.sess.State, tr.SenderPlayerID, tr.RecipientPlayerID, &player) != "yours" {
			return nil, conflict("transfer", transferClaimClosed)
		}
		if err := t.q.WithdrawSlotTransfer(t.ctx, sqlcgen.WithdrawSlotTransferParams{Now: t.stamp(), PlayerID: player, ID: tr.ID}); err != nil {
			return nil, err
		}
		if _, err := t.touch(); err != nil {
			return nil, err
		}
		return transferAnswer{tr.ID.String(), transferClaimWithdrawnToast}, nil
	})
	return writes.Result{Body: out}, err
}
