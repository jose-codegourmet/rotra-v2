// Package rulecases is the Go side of @rotra/rule-cases: it finds the repository root, loads
// packages/rule-cases/cases/v1/<area>/<rule>.json and runs a Go rule over every case. Test support
// only; production code never imports it.
//
// The input-to-arguments mapping stays in each rule's test (the Go twin of
// packages/data/src/rule-cases/runners.ts): the helper hands over the case's raw JSON `input` and its
// optional top-level `now` (epoch milliseconds, only on cases whose rule reads the clock).
package rulecases

import (
	"bytes"
	"encoding/json"
	"errors"
	"fmt"
	"os"
	"path/filepath"
	"reflect"
	"testing"
)

const casesDir = "packages/rule-cases/cases/v1"

// Case is one entry of a rule case file.
type Case struct {
	Name     string          `json:"name"`
	Now      *int64          `json:"now"`
	Input    json.RawMessage `json:"input"`
	Expected json.RawMessage `json:"expected"`
}

// File is a rule case file (kind "rule").
type File struct {
	Kind    string `json:"kind"`
	Rule    string `json:"rule"`
	Version int    `json:"version"`
	Cases   []Case `json:"cases"`
}

// Runner is a Go rule seen from the cases: input JSON and now in, the value `expected` holds out.
// A Map result is written as [key, value] pairs, like the TypeScript runners.
type Runner func(input json.RawMessage, now *int64) (any, error)

// RepoRoot finds the monorepo root by walking up from the working directory (a package test's
// directory) to the first folder that holds packages/rule-cases/cases/v1.
func RepoRoot() (string, error) {
	wd, err := os.Getwd()
	if err != nil {
		return "", err
	}
	return repoRootFrom(wd)
}

func repoRootFrom(dir string) (string, error) {
	for {
		if info, err := os.Stat(filepath.Join(dir, filepath.FromSlash(casesDir))); err == nil && info.IsDir() {
			return dir, nil
		}
		parent := filepath.Dir(dir)
		if parent == dir {
			return "", errors.New("rulecases: no packages/rule-cases/cases/v1 found above the working directory")
		}
		dir = parent
	}
}

// Load reads cases/v1/<area>/<rule>.json under root and checks it is a rule file for that rule.
func Load(root, area, rule string) (File, error) {
	path := filepath.Join(root, filepath.FromSlash(casesDir), area, rule+".json")
	raw, err := os.ReadFile(path)
	if err != nil {
		return File{}, err
	}
	var f File
	if err := json.Unmarshal(raw, &f); err != nil {
		return File{}, fmt.Errorf("%s: %w", path, err)
	}
	switch {
	case f.Kind != "rule":
		return File{}, fmt.Errorf("%s: kind %q is not a rule file", path, f.Kind)
	case f.Rule != rule:
		return File{}, fmt.Errorf("%s: file holds rule %q", path, f.Rule)
	case len(f.Cases) == 0:
		return File{}, fmt.Errorf("%s: no cases", path)
	}
	return f, nil
}

// Run runs fn over every case of <area>/<rule>.json as subtests of t. Use it from the rule's own package.
func Run(t *testing.T, area, rule string, fn Runner) {
	t.Helper()
	root, err := RepoRoot()
	if err != nil {
		t.Fatal(err)
	}
	f, err := Load(root, area, rule)
	if err != nil {
		t.Fatal(err)
	}
	for _, c := range f.Cases {
		t.Run(c.Name, func(t *testing.T) {
			if err := runCase(c, fn); err != nil {
				t.Error(err)
			}
		})
	}
}

// RunFrom is Run against an explicit root, returning the failure messages instead of failing t.
// It exists to test this package; rule tests use Run.
func RunFrom(t *testing.T, root, area, rule string, fn Runner) []string {
	t.Helper()
	f, err := Load(root, area, rule)
	if err != nil {
		t.Fatal(err)
	}
	var failures []string
	for _, c := range f.Cases {
		if err := runCase(c, fn); err != nil {
			failures = append(failures, err.Error())
		}
	}
	return failures
}

func runCase(c Case, fn Runner) error {
	got, err := fn(c.Input, c.Now)
	if err != nil {
		return fmt.Errorf("%s: rule returned an error: %w", c.Name, err)
	}
	if err := compare(c.Expected, got); err != nil {
		return fmt.Errorf("%s: %w", c.Name, err)
	}
	return nil
}

// compare checks the rule's result against `expected` as JSON values, so key order and number type
// (int or float) never matter.
func compare(want json.RawMessage, got any) error {
	gotRaw, err := json.Marshal(got)
	if err != nil {
		return fmt.Errorf("result is not JSON: %w", err)
	}
	var w, g any
	if err := decodeNumbers(want, &w); err != nil {
		return err
	}
	if err := decodeNumbers(gotRaw, &g); err != nil {
		return err
	}
	if !reflect.DeepEqual(w, g) {
		return fmt.Errorf("got %s, want %s", gotRaw, want)
	}
	return nil
}

func decodeNumbers(raw []byte, into *any) error {
	dec := json.NewDecoder(bytes.NewReader(raw))
	dec.UseNumber() // exact integers up to int64, no float rounding
	return dec.Decode(into)
}
