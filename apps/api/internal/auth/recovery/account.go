package recovery

import (
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgtype"

	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/db/sqlcgen"
)

// provider is player_accounts.auth_provider for a sign-in kept by this API (AUTH_PROVIDER in the TypeScript was
// 'supabase').
const provider = "rotra"

// account is what eligible() reads: the player's account, its contact and its sign-in identity.
type account struct {
	// contactEmail is the player's private contact email ("" when none).
	contactEmail string
	provider     string
	subject      pgtype.UUID
	disabled     bool
	// syncStatus is the contact sync status ("" when there is no account).
	syncStatus string
	// identityUsable: the identity the account points at exists, is a player's and is not disabled.
	identityUsable bool
	hasAccount     bool
}

func accountFrom(contactEmail pgtype.Text, prov pgtype.Text, subject pgtype.UUID, disabledAt pgtype.Timestamptz, sync sqlcgen.NullPlayerContactSyncStatus, usable bool) account {
	return account{
		contactEmail: contactEmail.String, provider: prov.String, subject: subject, disabled: disabledAt.Valid,
		syncStatus: string(sync.PlayerContactSyncStatus), identityUsable: usable, hasAccount: prov.Valid,
	}
}

// eligible is eligible() in password-resets.ts: the account exists and is not disabled, is signed in by this API,
// its contact is in sync and still has the email the request was made with. Go adds one condition: the sign-in
// identity the account points at exists, belongs to the player app and is not disabled, so a link is never
// issued for an account that could not use it.
func (a account) eligible(email string) bool {
	return a.hasAccount && !a.disabled && a.provider == provider && a.syncStatus == "in_sync" &&
		a.contactEmail == email && a.identityUsable
}

func uuidOf(p pgtype.UUID) uuid.UUID { return uuid.UUID(p.Bytes) }
func pgUUID(u uuid.UUID) pgtype.UUID { return pgtype.UUID{Bytes: u, Valid: true} }
