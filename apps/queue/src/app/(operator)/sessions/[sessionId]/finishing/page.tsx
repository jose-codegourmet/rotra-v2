import { FinalizeProgressScreen } from './_components/finalize-progress-screen/FinalizeProgressScreen'

export default async function FinishingPage(props: PageProps<'/sessions/[sessionId]/finishing'>) {
  const { sessionId } = await props.params
  return <FinalizeProgressScreen sessionId={sessionId} />
}
