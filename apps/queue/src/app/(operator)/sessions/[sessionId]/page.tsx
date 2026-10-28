import { SessionConsole } from './_components/session-console/SessionConsole'

export default async function SessionPage(props: PageProps<'/sessions/[sessionId]'>) {
  const { sessionId } = await props.params
  return <SessionConsole sessionId={sessionId} />
}
