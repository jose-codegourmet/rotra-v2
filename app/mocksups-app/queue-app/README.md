# ROTRA Queue prototype

`rotra-queue.html` is the single-file design reference for the v1 Queue product: club login, home dashboard, venues, saved players, inventory, club settings, session setup and preparation, the live console, finalization, results, the public session page, and session records. Open it in any browser. Nothing is installed and nothing is sent anywhere.

**Saved version:** October 27, 2026. It matches version 80 of the published artifact (sharing is set from its Share menu): https://claude.ai/code/artifact/ca759ab9-9fc2-4139-b107-bd516a2faee7

## How it relates to the docs

The prototype's agreed behavior is written up in:

- [Business logic](../../../docs/business_logic/product/README.md): rules, with Queue under `queue/modules/`
- [Screens](../../../docs/screens/product/README.md): screen contracts, with Queue under `modules/queue/`
- [Database design](../../../docs/database_design/product/README.md): proposed tables

When the prototype and the docs disagree, the docs' `open-decisions.md` files say what is still undecided. Nothing here is implemented in the apps.

## Prototype-only parts

- **Prototype** button (top bar): simulate offline, an expired license, approving a club name change, and resetting the demo data.
- Any password signs in. The password typed at sign-in counts as the current one for **Change password**.
- Data is kept in this browser's `localStorage` (`rotra-queue-prototype-v3`), and the theme choice is kept in `rotra-queue-theme`.
- Download, sync and finalization use short timers instead of real work.
- Sample players, venues, inventory, license payments and past sessions are fixtures, not real data.
