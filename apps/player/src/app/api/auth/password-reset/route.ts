import { submitPasswordResetRequest } from '@rotra/db/admin/password-resets'
import { handleVisitorRequest } from '@rotra/db/service/handler'
import { readJsonBody, text } from '@rotra/db/service/request'

/** P-FORGOT: save for Admin review, with the same acknowledgement for every email. No email. */
export async function POST(request: Request) {
  return handleVisitorRequest('player.password-reset', async () => {
    const body = await readJsonBody(request)
    return { body: await submitPasswordResetRequest(text(body.email)) }
  })
}
