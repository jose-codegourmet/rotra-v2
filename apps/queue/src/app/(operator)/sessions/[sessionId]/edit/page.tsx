import { SessionSetup } from '../../_components/session-setup/SessionSetup'

/**
 * Edit preparation. `?step=0|1|2` opens the editor on that page and `?from=settings` makes Back,
 * Cancel and a save return to the preparation page's Settings tab (the Settings cards' Edit buttons).
 */
export default async function EditSessionPage(props: PageProps<'/sessions/[sessionId]/edit'>) {
  const { sessionId } = await props.params
  const { step, from } = await props.searchParams
  const page = Number(typeof step === 'string' ? step : Number.NaN)
  return (
    <SessionSetup
      mode="edit"
      sessionId={sessionId}
      initialStep={Number.isInteger(page) && page >= 0 && page <= 2 ? page : undefined}
      returnToSettings={from === 'settings'}
    />
  )
}
