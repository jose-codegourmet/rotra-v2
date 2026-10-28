import { SignIn } from './_components/sign-in/SignIn'
export default async function Page(props: PageProps<'/login'>) {
  const params = await props.searchParams
  const returnTo =
    typeof params.next === 'string'
      ? params.next
      : typeof params.returnTo === 'string'
        ? params.returnTo
        : undefined
  return <SignIn returnTo={returnTo} passwordSaved={params.password === 'saved'} />
}
