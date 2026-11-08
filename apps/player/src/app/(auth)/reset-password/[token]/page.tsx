import type { Metadata } from 'next'
import { ResetPassword } from './_components/reset-password/ResetPassword'
export default async function Page(props: PageProps<'/reset-password/[token]'>) {
  const { token } = await props.params
  return <ResetPassword key={token} token={token} />
}

export const metadata: Metadata = {
  referrer: 'no-referrer',
  robots: { index: false, follow: false },
}
