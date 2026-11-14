import { readShownProfileBanners } from '@rotra/db/admin/profile-banners'
import { handlePublicRead } from '@rotra/db/service/handler'

/** Shown banners in upload order, with the Admin default: every card with no banner of its own. */
export async function GET() {
  return handlePublicRead('profile-banner.shown', async () => ({
    body: { banners: await readShownProfileBanners() },
  }))
}
