package publicreads_test

import (
	"bytes"
	"fmt"
	"reflect"
	"strings"
	"testing"
	"time"

	httpapi "github.com/jose-codegourmet/rotra-v2/apps/api/internal/http"
	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/publicreads"
)

// GET /api/public-sessions/{slug}/payment-status: the Share payment status page, characterized against the real Queue Route Handler
// (testdata/tools/capture-paymentstatus.test.mjs) on the seed of the public session page. The cases are written by
// testdata/tools/gen-paymentstatus-cases.py; this read is not cached, so every case reads the database fresh.
func TestPaymentStatusMatchesTheRouteHandler(t *testing.T) {
	var cases sessionCasesFile
	readTestdata(t, "paymentstatus.cases.json", &cases)
	golden := map[string]sessionGolden{}
	readTestdata(t, "paymentstatus.golden.json", &golden)
	if len(golden) != len(cases.Cases) {
		t.Fatalf("%d golden cases for %d case definitions: rerun apps/api/testdata/tools/capture-paymentstatus.test.mjs", len(golden), len(cases.Cases))
	}
	pool := openSeededWith(t, "publicsession.seed.sql")
	clk := &clock{t: time.Date(2026, 11, 17, 10, 0, 0, 0, time.UTC)}
	h := server(publicreads.Deps{Pool: pool.Raw(), Limiter: httpapi.NewRateLimiter(1_000_000, nil), Now: clk.Now})

	for i, c := range cases.Cases {
		t.Run(c.Name, func(t *testing.T) {
			mutate(t, pool.Raw(), append(append([]string{}, cases.Reset...), cases.Scenarios[c.Scenario]...)...)
			rec := get(h, c.Path, fmt.Sprintf("198.51.100.%d", 1+i%250))
			want, ok := golden[c.Name]
			if !ok {
				t.Fatalf("no golden for %s", c.Name)
			}
			if rec.Code != want.Status {
				t.Errorf("status %d, want %d (%.200s)", rec.Code, want.Status, rec.Body.String())
			}
			got := map[string]string{}
			for k := range rec.Header() {
				if strings.EqualFold(k, httpapi.RequestIDHeader) {
					continue // the Go server adds a request id; the Route Handler does not
				}
				got[strings.ToLower(k)] = rec.Header().Get(k)
			}
			if !reflect.DeepEqual(got, want.Headers) {
				t.Errorf("headers %v, want %v", got, want.Headers)
			}
			if wantBody := compact(t, want.Body); !bytes.Equal(rec.Body.Bytes(), wantBody) {
				t.Errorf("body\n got %s\nwant %s", rec.Body.Bytes(), wantBody)
			}
		})
	}
}
