# ROTRA Admin prototype

`rotra-admin.html` is the single-file design reference for the v1 Admin app, used by the platform owner. It covers sign-in and access denial, the club directory, adding a club, the club detail (in tabs: Overview, License, Public pages, Activity), each club's own monthly and yearly price, manual license activation and renewal after an outside payment, public-page retention, club name-change approval, the player directory and player detail, contact-change review and application, ranking settings, and feature flags. Open it in any browser. Nothing is installed and nothing is sent anywhere.

**Saved version:** October 27, 2026. It matches version 8 of the published artifact (sharing is set from its Share menu): https://claude.ai/artifact/A5aS4yN8Exa7XBpjxPgWtL

It shares its tokens, type and base components with the [Queue prototype](../queue-app/README.md) and the [Player Information prototype](../player-app/README.md). Clubs, players, RTR IDs and license payments reuse their fixtures where they overlap.

## How it relates to the docs

Screen IDs follow [Admin screen modules](../../../docs/screens/product/modules/admin/README.md) (`A-LOGIN`, `A-WORKSPACE`, `A-CLUBS`, `A-ADD-CLUB`, `A-CLUB-DETAIL`, `A-CLUB-PRICE`, `A-LICENSE`, `A-RETENTION`, `A-PLAYERS`, `A-PLAYER-DETAIL`, `A-CONTACT-REQUESTS`, `A-CONTACT-REVIEW`, `A-RANK-CONFIG`, `A-FEATURE-FLAGS`, `A-ADD-FLAG`). Rules come from [Admin business logic](../../../docs/business_logic/product/admin/README.md). Nothing here is implemented in the apps.

Decisions the platform owner made with the prototype on October 27, 2026. They are recorded in the business, screen and database docs; the business and screen `open-decisions.md` files list them under "Settled by the Admin prototype":

- **Club provisioning:** the platform owner adds clubs directly with **Add club**: name, fixed founding address and city (which sets the RTR city code), a Queue app username, an initial password the owner gives to the club, and the club's price. There's no club application flow.
- **License prices:** there's no fixed price. Each club has its own monthly and yearly price, set when the club is added and changed from its License tab. The yearly price must be less than twelve months at the monthly price. The License form fills in the amount from the club's price, and the amount can still be edited. Changing a price doesn't change payments already recorded. A club can instead be set to **Free**, for example a tester club: it still gets license terms (so expiry works the same), recorded at ₱0 and shown as Free. Tagbilaran Badminton Circle is the sample free tester club.
- **Feature flags:** the list starts empty. **Add flag** creates one with a name, a key the apps' code checks (suggested from the name, fixed once saved), what it does, and whether it starts on. New flags start off.
- **Club detail layout:** tabs for Overview, License, Public pages and Activity.

Where the docs leave something open, the prototype says so in its copy rather than inventing a control:

- **Password reset:** no reset control for a forgotten club password.
- **Early renewal and overlapping terms:** a renewal is proposed to start the day after the current term ends, and overlaps show a warning.
- **Contact-change evidence, decline flow and notifications:** no ID upload. Decline closes the request.
- **Effect of a settings change on existing ranks:** saving makes a new version and promises no recalculation.
- **Feature flag targeting and offline effect:** flags are platform-wide on/off, and when offline devices pick up a change is still undecided.

It also picks some placeholders: the License sheet records the date paid, amount and an optional reference, matching the payment history clubs see in the Queue prototype. The Club names list sits beside Contact changes under Requests.

## Prototype-only parts

- **Prototype** button (top bar): sign in as the platform owner or with a club account (access denied), end the session, simulate offline, make the next license save lose its reply (Check status then finds it, so nothing is added twice), make the next contact change fail to apply, make the next settings save fail or meet a newer version, show a placeholder flag, and reset the demo data.
- Sign-in is a mock: whatever you type signs in as the platform owner. Access denied is reached from the Prototype menu.
- Data is kept in this browser's `localStorage` (`rotra-admin-prototype-v1`), and the theme choice in `rotra-admin-theme`.
- Saving, applying and checking status use short timers instead of real work.
- The clubs, their prices, about 185 players, requests, license payments and action records are fixtures, not real data.
