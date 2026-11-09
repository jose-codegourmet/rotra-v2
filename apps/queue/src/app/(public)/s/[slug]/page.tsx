import { PublicSession } from './_components/public-session/PublicSession'

export default async function PublicSessionPage(props: PageProps<'/s/[slug]'>) {
  const { slug } = await props.params
  const { join, invite } = await props.searchParams
  // ?join=1: the visitor came back from the ROTRA Player login; open Request to join.
  // ?invite=<code>: a Session invite link; the code goes with Request to join as NAME.
  const inviteCode =
    typeof invite === 'string' && /^[A-Za-z0-9]{8}$/.test(invite) ? invite : undefined
  return (
    <PublicSession slug={slug} viewer="visitor" openJoin={join === '1'} inviteCode={inviteCode} />
  )
}
