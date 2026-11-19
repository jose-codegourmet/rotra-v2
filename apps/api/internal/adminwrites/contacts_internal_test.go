package adminwrites

import (
	"context"
	"testing"
)

// The steps of an application between its transactions run on a context that the client leaving does not cancel: the Route
// Handler finishes a change it has started. Without it a login step cut off after the stage would leave the request failed with
// application_error.
func TestDetachedOutlivesTheRequest(t *testing.T) {
	parent, cancel := context.WithCancel(context.Background())
	ctx, done := detached(parent)
	defer done()
	cancel()
	if err := ctx.Err(); err != nil {
		t.Fatalf("the detached context ended with the request: %v", err)
	}
	if _, bounded := ctx.Deadline(); !bounded {
		t.Error("the detached context must have a deadline")
	}
}
