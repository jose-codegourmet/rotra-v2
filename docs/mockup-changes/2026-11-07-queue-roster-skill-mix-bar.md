# Skill mix bar above the roster when grouped by Skill group

Status: IN MOCK APP — #472 (PR #482)
Date: 2026-11-07
App: queue
Mockup: apps/mockup/queue-app/rotra-queue.html › Preparation › Roster and levels (Group by: Skill group)
Screen ID: Q-ROSTER

## What changed
- **Skill mix bar (new):** when Group by is Skill group, a header row (label "Skill mix" left, "N players" right), a single 8 px stacked bar with 2 px gaps and a segment per skill group sized by count, and a wrapping legend (dot + name + count) appear above the groups. Zero-count groups are omitted; "No level" shows only while someone has no level. With no players the header says "No players yet" over an empty track and there is no legend.
- Colors: Advanced is the accent, Intermediate and Beginner are lighter steps of it, No level is the neutral border color.

## Why
- The operator sees the mix of skill levels at a glance while balancing the roster.

## Docs updated
- Business logic: none needed (display only)
- Database design: none needed
- Screen docs: docs/screens/product/modules/queue/players-roster.md — Q-ROSTER describes the Skill mix bar

## Real app work
- New presentational `SkillDistributionBar` in @rotra/ui (counts only, so the public page can reuse it); `RosterPanel` renders it above the groups from the same filtered players.
