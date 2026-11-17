# Player legal pages

**Surfaces:** `P-PRIVACY`, `P-TERMS`. **Source:** [D-2026-11-17-01](../../../../mvp/decisions.md#d-2026-11-17-01), [identity module](../../../../business_logic/product/player-information/modules/identity/README.md#privacy-policy-and-terms-of-service-pages). Mockup log: [2026-11-17-player-legal-pages](../../../../mockup-changes/2026-11-17-player-legal-pages.md).

The Google sign-in consent screen links to both pages (`https://player.rotra.club/privacy` and `https://player.rotra.club/terms`). P-LOGIN links to them too.

| Screen | Route | Title (browser tab) |
|---|---|---|
| P-PRIVACY | `/privacy` | Privacy Policy · ROTRA |
| P-TERMS | `/terms` | Terms of Service · ROTRA |

- **Who sees it:** everyone. No sign-in, in mock and real mode. A signed-in password player past the Google deadline still reaches them (the P-GOOGLE-REQUIRED stop does not cover them).
- **Layout:** the normal public page shell (top bar). A page head with the title ("Privacy Policy" / "Terms of Service") and the muted line "Effective November 17, 2026". Then each section: an `h2` heading followed by paragraphs and bulleted lists, in one readable column, max width 720 px. Same at 375 px and 1280 px, dark and light.
- **Copy:** the full text is in the mockup (`LEGAL`) and, word for word, in `apps/player/src/app/(public)/privacy/content.ts` and `.../terms/content.ts`. Change both together.
- **States:** none beyond the static page. No controls, loading, empty or error states.
- **Component:** `@rotra/ui/legal-document`.
