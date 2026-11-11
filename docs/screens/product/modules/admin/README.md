# Admin screen modules

**Audience:** platform owner. Club operators do not receive this access through their club credential.

| Module | Surfaces |
|---|---|
| [Access and workspace](access-navigation.md) | Admin access, focused navigation, failure states |
| [Clubs and licenses](clubs-licenses.md) | Club directory/detail, adding a club, per-club price, monthly/yearly activation/renewal, expiry/retention |
| [Sales](sales.md) | A-SALES: license revenue, sessions started and matches played, across every club |
| [Players and requests](players-requests.md) | Identity oversight, A-PLAYER-EDIT (edit everything), contact requests, review/application status |
| [Configuration](configuration.md) | 70/30 ranking weights, recent-match threshold, feature flags and adding a flag, A-CHARACTERS profile characters (15 per page), A-BANNERS profile banners |

Screen IDs begin with `A-`. No winner correction, manual offline reconstruction or full moderation suite is included. The only analytics page is [Sales](sales.md), added at the owner's request on November 8, 2026.

Business source: [Admin](../../../../business_logic/product/admin/README.md).

## Reference prototype

[`apps/mockup/admin-app/rotra-admin.html`](../../../../../apps/mockup/admin-app/rotra-admin.html) (October 27, 2026) shows every surface above. Open it in a browser; sign-in is a mock, and any input signs in as the platform owner. Its **Prototype** menu (access denied, offline, failed saves, demo reset) is not a product feature. Notes in its [README](../../../../../apps/mockup/admin-app/README.md).
