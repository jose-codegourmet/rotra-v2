import { SessionPreparation } from './_components/session-preparation/SessionPreparation'

export default async function PreparationPage(
  props: PageProps<'/sessions/[sessionId]/preparation'>,
) {
  const { sessionId } = await props.params
  return <SessionPreparation sessionId={sessionId} />
}
