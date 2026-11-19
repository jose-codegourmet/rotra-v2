# Go API role grants

Track go-signed-in-reads. SQL only; no table, column or row changes. The owner approved creating it on
November 19, 2026.

**Status: NOT applied to the shared database.** Checked on a throwaway `postgres:16-alpine` only.

## Why

The Go reads need what earlier migrations revoked from PUBLIC: `EXECUTE` on `rotra_player_compare` and the
`rotra_sales_*` functions, `SELECT` on the two sales views and `admin_settings`, and `UPDATE` on `clubs`
(`/api/club` and `/api/club/invite` fill a missing invite code).

## The role name

The repo never names the Go API's database role (the older migrations leave `"<runtime_role>"`). This
migration uses `rotra_api` and skips with a notice when no such role exists. Before applying to a shared
database, confirm the role Go's `DATABASE_URL` uses; if it differs, edit the name first. If Go connects as the
table owner or a superuser, none of this is needed.
