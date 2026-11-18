// Package identity holds the player identity writes the claim shares with the later registration and club
// resolution tracks: the RTR ID (allocation and format) and the automatic linking of club records by phone.
// It ports packages/db/src/player/{identity,rtr-id}.ts.
package identity

import (
	"fmt"
	"time"
)

// syncZone is the server timezone of the RTR ID sync day (RTR_SYNC_TIMEZONE, proposal pending #244). Manila has
// no daylight saving, so a fixed +08:00 zone is exact and needs no timezone database in the deploy image.
var syncZone = time.FixedZone("Asia/Manila", 8*60*60)

// SyncDate is the sync day (YYYY-MM-DD) of an instant in Asia/Manila (rtrSyncDate).
func SyncDate(at time.Time) string { return at.In(syncZone).Format("2006-01-02") }

// FormatRTRID is formatRtrId: RTR-<country>-<city>-<MMDDYY sync day>-<sequence padded to four digits>. A
// sequence above 9999 is not truncated (overflow presentation is open, #244). syncDate is YYYY-MM-DD.
func FormatRTRID(countryCode, cityCode, syncDate string, sequence int32) string {
	// syncDate is always SyncDate's output: year, month and day are fixed-width.
	return fmt.Sprintf("RTR-%s-%s-%s%s%s-%04d", countryCode, cityCode, syncDate[5:7], syncDate[8:10], syncDate[2:4], sequence)
}
