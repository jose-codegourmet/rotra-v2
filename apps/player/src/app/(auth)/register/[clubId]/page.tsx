import { GuestRegistration } from './_components/guest-registration/GuestRegistration'

export default async function RegisterPage(props: PageProps<'/register/[clubId]'>) {
  const { clubId } = await props.params
  return <GuestRegistration clubId={clubId} />
}
