package match

import (
	"encoding/json"
	"errors"
	"testing"

	"github.com/jose-codegourmet/rotra-v2/apps/api/internal/rulecases"
)

// Shared cases: packages/rule-cases/cases/v1/match/courtsNeeded.json (the TypeScript copy passes the same file).
func TestCourtsNeededSharedCases(t *testing.T) {
	rulecases.Run(t, "match", "courtsNeeded", func(input json.RawMessage, now *int64) (any, error) {
		var in struct {
			Match struct {
				Format Format `json:"format"`
			} `json:"match"`
		}
		if err := json.Unmarshal(input, &in); err != nil {
			return nil, err
		}
		if now != nil {
			return nil, errors.New("courtsNeeded must not read the clock")
		}
		return CourtsNeeded(in.Match.Format), nil
	})
}
