import { parseSalesPeriod, readPlatformSales } from '@rotra/db/admin/sales'
import { handleAccountRequest } from '@rotra/db/service/handler'
import { routeCookieAdapter } from '@rotra/db/service/route-cookies'
import { cookies } from 'next/headers'

/** A-SALES for one period (`?period=7d|30d|12m`, default 30d), computed in Postgres on read. */
export async function GET(request: Request) {
  return handleAccountRequest('admin', routeCookieAdapter(await cookies()), async (admin) => {
    const period = parseSalesPeriod(new URL(request.url).searchParams.get('period'))
    return { body: { report: await readPlatformSales(admin, period) } }
  })
}
