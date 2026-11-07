import type { ComponentMeta } from '@rotra/ui/meta'

export const publicPagePreviewMeta = {
  name: 'PublicPagePreview',
  description:
    'The operator preview of the public session page: PublicPreviewBanner ("Public page preview. What anyone with the session link sees, no sign-in needed." with Back to Queue app) above the PublicSession container for the session\'s public slug.',
  usage: [
    'Rendered by /sessions/[sessionId]/public-page in the (preview) route group without the operator shell (no top bar, nav, sync pill or dock). Owning club only (#469): proxy.ts lets the path through, and page.tsx redirects anyone else (signed out, another club) to the visitor page /s/<slug>, which applies its own visibility rules.',
    'The banner shows the shareable visitor link (origin + /s/<slug>) with Copy link (toast "Session link copied"; clipboard failure shows the link in an error toast), so the preview address is not the one shared.',
    'Reached from Preview public page (preparation header and Session link card), Public page (console header), View public page (results) and Open public page (session record Public page tab).',
    "Back to Queue app → the console (active), the session record (completed or invalid) or the preparation (prepared), via sessionHref. An unknown or other club's session id renders not-found.",
    'The page itself is the visitor\'s page with viewer "operator": the same projection from the last synced state, so it never shows the operator\'s own unsynced edits.',
  ],
  docs: ['docs/screens/product/modules/queue/public-session.md#shared-composition'],
  related: ['PublicPreviewBanner', 'PublicSession'],
} satisfies ComponentMeta
