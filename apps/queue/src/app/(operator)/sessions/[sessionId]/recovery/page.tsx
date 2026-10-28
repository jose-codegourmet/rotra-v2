import { SessionRecovery } from './_components/session-recovery/SessionRecovery'

export default async function SessionRecoveryPage(
  props: PageProps<'/sessions/[sessionId]/recovery'>,
) {
  const { sessionId } = await props.params
  return <SessionRecovery sessionId={sessionId} />
}
