import { SessionSetup } from '../_components/session-setup/SessionSetup'

export default async function NewSessionPage(props: PageProps<'/sessions/new'>) {
  const params = await props.searchParams
  const date = typeof params.date === 'string' ? params.date : undefined
  const venueId = typeof params.venueId === 'string' ? params.venueId : undefined
  return <SessionSetup mode="create" date={date} venueId={venueId} />
}
