# 01 — Product Vision

## Overview

The Badminton Queueing & Leaderboard App is a centralized platform built to solve a real problem in casual badminton communities: **no one knows when they play, who they played, or how good they actually are.**

The app combines:

- Queue-based match management — structured rotation so every player gets fair court time
- Player statistics & skill tracking — persistent identity and growth over time
- Gamified leaderboards — motivation to show up and play well
- Club-based organization — the natural unit of a badminton community

---

## The Core Problem

Casual badminton games at shared courts suffer from:

- **Unfair rotation** — the same people keep playing because they manage the queue themselves
- **No records** — no one knows who won, who played, or who's been waiting
- **Skill mismatches** — no way to tell a beginner from an advanced player at a glance
- **Payment disputes** — court and shuttle costs are split informally with no transparency
- **No player identity** — players participate but have nothing to show for it

---

## What This App Provides

### For Players

- Know exactly when their next match is — no guessing, no arguing
- See their stats accumulate across every session they attend
- Build a profile that travels with them across clubs
- Get rated fairly and rate others after every match

### For Que Masters & Club Owners

- Run sessions efficiently without shouting names or managing paper lists
- Track court usage, shuttle consumption, and per-player costs automatically
- Assign umpires and manage match flow from a single interface
- See payment status for every player at a glance

### For Clubs

- A permanent record of all sessions, matches, and members
- A community leaderboard that motivates attendance
- Transparent cost sharing that reduces friction
- Tools to grow membership via invite links and QR codes

---

## Design Philosophy

> A **badminton operating system** — the infrastructure layer that every club and serious casual player reaches for when they pick up a racket.

The app is not trying to be a social network. It is a **utility** first — it must make running and attending a badminton session objectively easier than not using it. Social and gamification features are layered on top to increase retention, but they must never get in the way of the core flow.

### Principles


| Principle                          | Application                                                                    |
| ---------------------------------- | ------------------------------------------------------------------------------ |
| Que Masters should not be blocked  | Every operation they need must be 1–2 taps away                                |
| Players need clarity, not features | Players see only what is relevant to their current state                       |
| Data integrity over convenience    | Match results and ratings must be verifiable; no self-reporting without checks |
| Real-time is non-negotiable        | Queue state must be live — stale data causes confusion and disputes            |
| Roles are additive, not exclusive  | A Club Owner is still a Player; a Que Master in Club A is a Player in Club B   |


---

## Target Audience

### Primary

- Casual to semi-competitive badminton players who attend regular club sessions
- Que Masters who currently manage sessions manually (whiteboard, group chat, paper)
- Club Owners who want structure and records without administrative overhead

### Secondary

- Badminton venues looking to provide a managed session experience
- Players looking to track their improvement and gear

### Out of Scope (MVP)

- Professional/tournament-level organizations
- Coaching or training plan features
- Spectator or broadcast features

---

## Success Metrics (Post-Launch)


| Metric                                          | Target                            |
| ----------------------------------------------- | --------------------------------- |
| Sessions created per active club per month      | ≥ 4                               |
| Player queue registration rate per session      | ≥ 80% of attendees                |
| Match review completion rate                    | ≥ 60% without Que Master override |
| Que Master session setup time                   | < 5 minutes                       |
| Waitlisted player response time after promotion | < 10 minutes                      |


