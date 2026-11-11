import { readShownProfileBanners } from '@rotra/db/admin/profile-banners'
import { handlePublicRead } from '@rotra/db/service/handler'

/** The Player banner picker (Edit profile › Name › Banner): shown banners only, in upload order. */
export async function GET() {
  return handlePublicRead('profile-banner.shown', async () => ({
    body: { banners: await readShownProfileBanners() },
  }))
}
