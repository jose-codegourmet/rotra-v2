# Player legal pages

**Surfaces:** `P-PRIVACY`, `P-TERMS`. **Source:** [D-2026-11-17-01](../../../../mvp/decisions.md#d-2026-11-17-01), amended by [D-2026-11-18-02](../../../../mvp/decisions.md#d-2026-11-18-02), [identity module](../../../../business_logic/product/player-information/modules/identity/README.md#privacy-policy-and-terms-of-service-pages). Mockup logs: [2026-11-17-player-legal-pages](../../../../mockup-changes/2026-11-17-player-legal-pages.md), [2026-11-18-player-legal-text-rewrite](../../../../mockup-changes/2026-11-18-player-legal-text-rewrite.md).

The Google sign-in consent screen links to both pages (`https://player.rotra.club/privacy` and `https://player.rotra.club/terms`). P-LOGIN links to them too.

| Screen | Route | Title (browser tab) |
|---|---|---|
| P-PRIVACY | `/privacy` | Privacy Policy · ROTRA |
| P-TERMS | `/terms` | Terms of Service · ROTRA |

- **Who sees it:** everyone. No sign-in, in mock and real mode. A signed-in password player past the Google deadline still reaches them (the P-GOOGLE-REQUIRED stop does not cover them).
- **Layout:** the normal public page shell (top bar). A page head with the title ("Privacy Policy" / "Terms of Service") and the muted line "Effective November 18, 2026". Then each section: an `h2` heading followed by paragraphs and bulleted lists, in one readable column, max width 720 px. Same at 375 px and 1280 px, dark and light.
- **Copy:** the full text is in the mockup (`LEGAL`) and, word for word, in `apps/player/src/app/(public)/privacy/content.ts` and `.../terms/content.ts`, and on rotra.club (`#privacy`, `#terms`) in `apps/landingpage/src/app/_components/legal-page/privacy-content.ts` and `terms-content.ts`. Change all of them together. The text has three placeholders to fill before launch: `[OPERATOR LEGAL NAME]`, `[OPERATOR ADDRESS]` and `[OPERATOR CITY]`.
- **Privacy Policy sections:** Who we are · What we collect · People saved by a club before they register · Why we use your information · Levels, ranks and automated processing · What is public and what is private · Who we share it with · Where it is stored and how we protect it · If there is a breach · How long we keep it · Cookies and device storage · Your rights · Children · Links to other sites · Changes to this policy · Contact.
- **Terms of Service sections:** What ROTRA is · Who can use ROTRA · Your account · Club accounts and licenses · Clubs and Queue Sessions · Playing is at your own risk · Results, rank and leaderboards · Acceptable use · Your content · ROTRA's property · Other companies' services · Suspension and ending an account · The service as it is · Limits on our liability · If your actions cause a claim · Events outside our control · Changes to these terms · Governing law and disputes · General · Contact.
- **States:** none beyond the static page. No controls, loading, empty or error states.
- **Component:** `@rotra/ui/legal-document`.
