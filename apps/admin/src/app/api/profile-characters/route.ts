import { addProfileCharacter, readProfileCharacters } from '@rotra/db/admin/profile-characters'
import { ServiceError } from '@rotra/db/service/errors'
import { handleAccountRequest } from '@rotra/db/service/handler'
import { readJsonBody } from '@rotra/db/service/request'
import { routeCookieAdapter } from '@rotra/db/service/route-cookies'
import { cookies } from 'next/headers'

/** One 1 MB image as base64 in JSON, plus room for the id. */
const MAX_BODY_BYTES = 1_500_000

/** A-CHARACTERS: the whole library, hidden images included, in upload order. */
export async function GET() {
  return handleAccountRequest('admin', routeCookieAdapter(await cookies()), async (admin) => ({
    body: { characters: await readProfileCharacters(admin) },
  }))
}

/**
 * A-CHARACTERS › upload one image: `{ id, image }`, where `id` is a client UUID (a retry returns the
 * saved row) and `image` the browser's square crop as a PNG, JPEG or WebP data URL up to 1 MB.
 */
export async function POST(request: Request) {
  return handleAccountRequest('admin', routeCookieAdapter(await cookies()), async (admin) => {
    const declared = Number(request.headers.get('content-length') ?? 0)
    if (!Number.isFinite(declared) || declared > MAX_BODY_BYTES) throw new ServiceError('invalid')
    const body = await readJsonBody(request)
    const character = await addProfileCharacter(admin, { id: body.id, image: body.image })
    return { status: 201, body: { character } }
  })
}
