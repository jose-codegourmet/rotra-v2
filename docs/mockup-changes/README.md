# Mockup changes — ROTRA

**Last verified:** 2026-10-31 · **Audience:** contributors and AI coding agents.

Every change to a mockup in [app/mocksups-app](../../app/mocksups-app/README.md) gets **one log file
here**. The log is what turns a design change into work on the real apps: an agent reads the `NEW` logs
and writes tickets from them.

---

## 1. The flow

1. **A layout or UI change is requested.** Change the mockup first
   (`app/mocksups-app/<app>/<file>.html`), not the real app. The real app changes later, through a ticket.
2. **Write the log.** One new file in this folder, from the template in §3, with `Status: NEW`.
3. **Fix the docs the mockup made untrue, in the same change:**
   - business logic: `docs/business_logic/product/<product>/modules/<module>/`
   - database design: `docs/database_design/product/<product>/modules/`
   - screen docs, if the screen's layout, controls, states or copy changed: `docs/screens/product/`
   
   If nothing needed updating, say so in the log. If the change touches anything in an
   `open-decisions.md`, money, ranking math, auth or contacts, **ask first** (see
   [ways-of-working.md §10](../ways-of-working.md#10-stop-and-ask)).
4. **Turn it into a ticket.** An agent asked to ticket mockup changes takes every log with
   `Status: NEW`, writes the ticket ([ways-of-working.md §3](../ways-of-working.md#3-how-work-is-organised)),
   then edits the log to `Status: ALREADY A TICKET — #<issue number>`.
5. **Never ticket a log that already says `ALREADY A TICKET`.** Don't delete logs; they're the history.

---

## 2. File name

`YYYY-MM-DD-<app>-<short-slug>.md`, where `<app>` is `queue`, `player` or `admin`.

Example: `2026-10-31-queue-court-card-timer.md`. Two changes on the same day get two files.

---

## 3. Template

```markdown
# <What changed, in one line>

Status: NEW
Date: YYYY-MM-DD
App: queue | player | admin
Mockup: app/mocksups-app/<app>/<file>.html › <screen / tab>
Screen ID: <from docs/screens, if it has one>

## What changed
- <Before → after, in plain words>

## Why
- <The request or decision behind it>

## Docs updated
- Business logic: <file> — <what> | none needed
- Database design: <file> — <what> | none needed
- Screen docs: <file> — <what> | none needed

## Real app work
- <What the ticket will need to change in apps/ and packages/ui>
```

When it becomes a ticket, change only the status line:

```markdown
Status: ALREADY A TICKET — #312
```
