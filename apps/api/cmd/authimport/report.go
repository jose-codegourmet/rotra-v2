package main

import (
	"fmt"
	"io"
	"sort"

	"github.com/google/uuid"

	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/auth/store"
)

// kinds is the order accounts are imported and printed in.
var kinds = []store.Audience{store.AudienceClub, store.AudiencePlayer, store.AudienceAdmin}

// Why an account was not imported. Every one is a count plus the account ids, never the data behind it.
const (
	skipNoSubject    = "no_subject"     // a club account with no Supabase user yet (never provisioned)
	skipNoSourceUser = "no_source_user" // the account points at a user that is not in auth.users
	skipNoLoginKey   = "no_login_key"   // the user has no email (player, admin) or the username is empty (club)
	skipDuplicateKey = "duplicate_key"  // two Supabase users resolve to one login key in one audience
	skipBadHash      = "bad_hash"       // the stored hash is not bcrypt $2a/$2b/$2y
	skipKeyTaken     = "key_taken"      // an identity with that login key already exists (never overwritten)
	skipChanged      = "changed"        // the account row changed while the import ran
	skipFailed       = "failed"         // a database error; the transaction rolled back
)

// Counts is the outcome for one account type.
type Counts struct {
	Pending  int // accounts still on provider supabase
	Imported int // imported (dry run: would be imported)
	Disabled int // of those, imported as disabled identities
	// Skipped maps a reason to the account ids it hit.
	Skipped map[string][]uuid.UUID
	// Mismatch lists players whose contact email differs from the Supabase email (imported anyway).
	Mismatch []uuid.UUID
}

func (c *Counts) skip(reason string, id uuid.UUID) {
	if c.Skipped == nil {
		c.Skipped = map[string][]uuid.UUID{}
	}
	c.Skipped[reason] = append(c.Skipped[reason], id)
}

// SkippedTotal is every skipped account of this type.
func (c *Counts) SkippedTotal() int {
	n := 0
	for _, ids := range c.Skipped {
		n += len(ids)
	}
	return n
}

// Report is the result of one import run.
type Report struct {
	DryRun bool
	Types  map[store.Audience]*Counts
}

func newReport(dryRun bool) *Report {
	r := &Report{DryRun: dryRun, Types: map[store.Audience]*Counts{}}
	for _, k := range kinds {
		r.Types[k] = &Counts{}
	}
	return r
}

// Failed is the number of accounts that hit a database error.
func (r *Report) Failed() int {
	n := 0
	for _, c := range r.Types {
		n += len(c.Skipped[skipFailed])
	}
	return n
}

// printer writes lines and remembers the first error.
type printer struct {
	w   io.Writer
	err error
}

func (p *printer) f(format string, a ...any) {
	if p.err == nil {
		_, p.err = fmt.Fprintf(p.w, format, a...)
	}
}

// Print writes the report. It holds counts and account ids only.
func (r *Report) Print(w io.Writer) error {
	p := &printer{w: w}
	mode, done := "import", "imported"
	if r.DryRun {
		mode, done = "dry-run", "would_import"
	}
	p.f("mode=%s\n", mode)
	for _, k := range kinds {
		c := r.Types[k]
		p.f("%s pending=%d %s=%d disabled=%d skipped=%d email_mismatch=%d\n",
			k, c.Pending, done, c.Imported, c.Disabled, c.SkippedTotal(), len(c.Mismatch))
	}
	for _, k := range kinds {
		c := r.Types[k]
		reasons := make([]string, 0, len(c.Skipped))
		for reason := range c.Skipped {
			reasons = append(reasons, reason)
		}
		sort.Strings(reasons)
		for _, reason := range reasons {
			for _, id := range c.Skipped[reason] {
				p.f("skipped %s %s %s\n", k, reason, id)
			}
		}
		for _, id := range c.Mismatch {
			p.f("email_mismatch %s %s\n", k, id)
		}
	}
	return p.err
}
