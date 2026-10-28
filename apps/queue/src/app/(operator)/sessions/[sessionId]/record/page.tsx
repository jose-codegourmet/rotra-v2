import { SessionRecord } from './_components/session-record/SessionRecord'

export default async function RecordPage(props: PageProps<'/sessions/[sessionId]/record'>) {
  const { sessionId } = await props.params
  return <SessionRecord sessionId={sessionId} />
}
