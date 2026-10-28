import { SessionResults } from './_components/session-results/SessionResults'

export default async function ResultsPage(props: PageProps<'/sessions/[sessionId]/results'>) {
  const { sessionId } = await props.params
  return <SessionResults sessionId={sessionId} />
}
