import { ConnectGoogle } from './_components/connect-google/ConnectGoogle'

export default async function Page(props: PageProps<'/connect-google'>) {
  const { returnTo } = await props.searchParams
  return <ConnectGoogle returnToVerification={returnTo === '/profile/verification'} />
}
