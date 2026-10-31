# ROTRA documentation

**Last verified:** 2026-10-27. Agents start at [AGENTS.md](../AGENTS.md), whose routing table says which
file to read for each task. This page is the map for people.

Everything here describes the **v1 target**, agreed October 25–27, 2026. Nothing is built yet.

## Engineering

| Doc | Read when |
|---|---|
| [Architecture](architecture.md) | You need to know which app or package something belongs in, how data flows, or what is decided |
| [Coding conventions](coding-conventions.md) | You write a component, form, page, hook, style, or Prisma model |
| [Ways of working](ways-of-working.md) | You write or pick up a ticket, open or review a PR, or find docs that disagree |
| [Product terms](product-terms.md) | You use a domain word or name something in code |

## Product

| Doc | What it answers |
|---|---|
| [Business logic](business_logic/product/README.md) | What each product does: rules per module, plus `flow/` journeys |
| [Screens](screens/product/README.md) | What each screen shows: layout, controls, states, dialogs, by screen ID |
| [Database design](database_design/product/README.md) | Proposed tables and fields per module |
| Open decisions: [business](business_logic/product/open-decisions.md) · [screens](screens/product/open-decisions.md) · [database](database_design/product/open-decisions.md) | What is still undecided. Never fill these in by guessing |

## Design

| Doc | What it is |
|---|---|
| [Queue prototype](../app/mocksups-app/queue-app/rotra-queue.html) ([notes](../app/mocksups-app/queue-app/README.md)) | Clickable design of the Queue app, the agreed design reference |
| [Player Information prototype](../app/mocksups-app/player-app/rotra-player.html) ([notes](../app/mocksups-app/player-app/README.md)) | Clickable design of the Player Information app |
| [Admin prototype](../app/mocksups-app/admin-app/rotra-admin.html) ([notes](../app/mocksups-app/admin-app/README.md)) | Clickable design of the Admin app |
| [Branding](branding/branding.md) | Brand identity, voice, logo, characters. For colors, type, and components the prototypes win |

Open a prototype in any browser; nothing is installed.

## Other

| Doc | What it is |
|---|---|
| [Email templates](email-templates.md) | Supabase auth email coverage. Templates are pasted into the Supabase dashboard by hand |

## Structure

```text
docs/
  architecture.md · coding-conventions.md · ways-of-working.md · product-terms.md
  business_logic/product/<product>/modules/<module>/README.md (+ flow/<journey>.md)
  screens/product/  experience-contract · navigation · state-matrix · dialogs · coverage · open-decisions
                    modules/<product>/<module>.md
  database_design/product/  conventions · transactions · access-retention · open-decisions
                            <product>/modules/<module>.md
  ../app/mocksups-app/   canonical prototype HTML + README per app
  branding/
```

`<product>` is `queue`, `player-information`, or `admin`. Products are product boundaries: Queue maps
to `apps/queue`, Player Information to `apps/player`, Admin to `apps/admin`.
