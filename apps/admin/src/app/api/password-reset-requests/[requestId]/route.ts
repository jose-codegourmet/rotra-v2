import { reviewPasswordResetRequest } from '@rotra/db/admin/password-resets'
import { handleAccountRequest } from '@rotra/db/service/handler'
import { readJsonBody, text } from '@rotra/db/service/request'
import { routeCookieAdapter } from '@rotra/db/service/route-cookies'
import { cookies } from 'next/headers'

export async function POST(
  request: Request,
  { params }: { params: Promise<{ requestId: string }> },
) {
  return handleAccountRequest('admin', routeCookieAdapter(await cookies()), async (admin) => {
    const { requestId } = await params
    const body = await readJsonBody(request)
    return {
      body: await reviewPasswordResetRequest(admin, requestId, {
        action: text(body.action),
        ownershipVerified: body.ownershipVerified === true,
      }),
    }
  })
}
