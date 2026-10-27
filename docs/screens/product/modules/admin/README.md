# Admin screen modules

**Audience:** platform owner. Club operators do not receive this access through their club credential.

| Module | Surfaces |
|---|---|
| [Access and workspace](access-navigation.md) | Admin access, focused navigation, failure states |
| [Clubs and licenses](clubs-licenses.md) | Club directory/detail, adding a club, per-club price, monthly/yearly activation/renewal, expiry/retention |
| [Players and requests](players-requests.md) | Identity oversight, contact requests, review/application status |
| [Configuration](configuration.md) | 70/30 ranking weights, recent-match threshold, feature flags and adding a flag |

Screen IDs begin with `A-`. No winner correction, manual offline reconstruction, full moderation suite, or invented analytics dashboards are included.

Business source: [Admin](../../../../business_logic/product/admin/README.md).

## Reference prototype

[`docs/frames/admin-app/rotra-admin.html`](../../../../frames/admin-app/rotra-admin.html) (October 27, 2026) shows every surface above. Open it in a browser; sign-in is a mock, and any input signs in as the platform owner. Its **Prototype** menu (access denied, offline, failed saves, demo reset) is not a product feature. Notes in its [README](../../../../frames/admin-app/README.md).
