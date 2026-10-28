import { SessionConsole } from './_components/session-console/SessionConsole'

export default async function SessionPage(props: PageProps<'/sessions/[sessionId]'>) {
  const { sessionId } = await props.params
  const search = await props.searchParams
  return <SessionConsole sessionId={sessionId} resumeSessionDone={search.finish === '1'} />
}
