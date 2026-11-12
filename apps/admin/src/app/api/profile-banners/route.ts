import { addProfileBanner, readProfileBanners } from '@rotra/db/admin/profile-banners'
import { ServiceError } from '@rotra/db/service/errors'
import { handleAccountRequest } from '@rotra/db/service/handler'
import { readJsonBody } from '@rotra/db/service/request'
import { routeCookieAdapter } from '@rotra/db/service/route-cookies'
import { cookies } from 'next/headers'

/** One 2 MB image as base64 in JSON, plus room for the id. */
const MAX_BODY_BYTES = 2_900_000

/** A-BANNERS: the whole library, hidden banners included, in upload order. */
export async function GET() {
  return handleAccountRequest('admin', routeCookieAdapter(await cookies()), async (admin) => ({
    body: { banners: await readProfileBanners(admin) },
  }))
}

/**
 * A-BANNERS › upload one banner: `{ id, image }`, where `id` is a client UUID (a retry returns the
 * saved row) and `image` the browser's 5:2 crop as a PNG, JPEG or WebP data URL up to 2 MB.
 */
export async function POST(request: Request) {
  return handleAccountRequest('admin', routeCookieAdapter(await cookies()), async (admin) => {
    const declared = Number(request.headers.get('content-length') ?? 0)
    if (!Number.isFinite(declared) || declared > MAX_BODY_BYTES) throw new ServiceError('invalid')
    const body = await readJsonBody(request)
    const banner = await addProfileBanner(admin, { id: body.id, image: body.image })
    return { status: 201, body: { banner } }
  })
}
