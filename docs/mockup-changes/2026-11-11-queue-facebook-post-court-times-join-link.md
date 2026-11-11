# Facebook post: court times on each court line and a join link (#730, proposed)

Status: IN MOCK APP — #730
Date: 2026-11-11
App: queue
Mockup: apps/mockup/queue-app/rotra-queue.html › Facebook post dialog (Copy Facebook post), Club settings › Facebook post template keys
Route: /queue/sessions/s-tonight/preparation (Copy Facebook post)
Screen ID: none found (Facebook post dialog)
Artifact: https://claude.ai/artifact/Xb3bpD4iWeWbnoXh7MpaEh
Components: facebook-post-dialog, post-template-keys
Supersedes: none
Superseded by: none

## What changed
- Before: the post listed courts by name only (“Court 1”) and ended with the court rules.
- After: each court line reads “Court 1 · 7:30 PM–10:30 PM”, using the court's own schedule and falling back to the session time when the court has none; staggered courts show their own times. The default template ends with a new key `{{ join_link }}` that fills “To join and see the full roster, open this link: <public session page URL>”. A club template saved earlier without the key still ends with that line. The key is added to the template key list as “Join line with the public session link”. The dialog helper now reads “Filled in from SESSION and your club's template. Each court line shows that court's time, and the post ends with the public session link. Copy it and paste it into your Facebook group or page.”

## Why
- Owner decision pack, ticket #730 (recommended options): wording “To join and see the full roster, open this link: [public session page URL]”; same style as the When line, “Court 1 · 7:30 PM–10:30 PM”; a court with no schedule falls back to the session time.
- Ticket text: “Whenever courts are included, each court line should also include that court's schedule and time, not just the court name … Add a line with a link so people can join and see the full roster.”
- Proposed, built to the recommended option of the owner decision pack. The owner has not approved it yet.

## Like for like
- Compare at: 375 px and 1280 px, dark and light.
- States: post with three courts on the session time; staggered courts (own start or end); court past midnight (the range adds “· next day”); template without the key (line appended); template with the key in another place; Edit template, Copy post and Close unchanged.
- Copy: Court 1 · 7:30 PM–10:30 PM · To join and see the full roster, open this link: URL · Join line with the public session link · dialog helper above.
- Tokens: none
- Known differences: none

## Reuse plan
- Reuses as is: facebook-post-dialog, template editor, key chips, fmtRange time style of the When line.
- Extends: the post template fill (courts key with times, new join_link key).
- New: none
- Shares work with: none

## Docs updated
- Business logic: `docs/business_logic/product/queue/README.md` (Facebook post template paragraph: court times and the `{{ join_link }}` line).
- Database design: none needed (the template is the club's saved text; the key is added in the post generator).
- Screen docs: `docs/screens/product/modules/queue/session-setup.md` › Copy Facebook post (court lines, join line, dialog helper); `docs/screens/product/modules/queue/access-home.md` › Facebook post keys (`courts` with times, new `join_link`).

## Real app work
- Court line format and the join line in the post generator (packages/ui and the Queue copy-post code), default template, template key list, dialog helper text. Public session URL is the existing session link.
