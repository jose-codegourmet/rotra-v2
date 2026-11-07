import { Suspense } from 'react'
import { SessionPreparation } from './_components/session-preparation/SessionPreparation'

export default async function PreparationPage(
  props: PageProps<'/sessions/[sessionId]/preparation'>,
) {
  const { sessionId } = await props.params
  return (
    <Suspense>
      <SessionPreparation sessionId={sessionId} />
    </Suspense>
  )
}
