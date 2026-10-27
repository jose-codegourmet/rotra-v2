import { SessionSetup } from '../../_components/session-setup/SessionSetup'

export default async function EditSessionPage(props: PageProps<'/sessions/[sessionId]/edit'>) {
  const { sessionId } = await props.params
  return <SessionSetup mode="edit" sessionId={sessionId} />
}
