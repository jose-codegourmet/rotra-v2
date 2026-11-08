import { GuestRegistration } from './_components/guest-registration/GuestRegistration'

export default async function RegisterPage(props: PageProps<'/register/[clubId]'>) {
  const [{ clubId }, search] = await Promise.all([props.params, props.searchParams])
  return (
    <GuestRegistration
      clubId={clubId}
      returnTo={typeof search.next === 'string' ? search.next : undefined}
    />
  )
}
