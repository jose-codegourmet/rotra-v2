import { handleSessionRead } from '@rotra/db/auth/sign-in'
import { routeCookieAdapter } from '@rotra/db/service/route-cookies'
import { cookies } from 'next/headers'

export async function GET() {
  return handleSessionRead('admin', routeCookieAdapter(await cookies()))
}
