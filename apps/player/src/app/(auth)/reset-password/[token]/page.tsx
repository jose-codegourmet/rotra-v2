import { ResetPassword } from './_components/reset-password/ResetPassword'
export default async function Page(props: PageProps<'/reset-password/[token]'>) {
  const { token } = await props.params
  return <ResetPassword key={token} token={token} />
}
