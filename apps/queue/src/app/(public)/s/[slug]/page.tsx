import { PublicSession } from './_components/public-session/PublicSession'

export default async function PublicSessionPage(props: PageProps<'/s/[slug]'>) {
  const { slug } = await props.params
  const { join } = await props.searchParams
  // ?join=1: the visitor came back from the ROTRA Player login; open Request to join.
  return <PublicSession slug={slug} viewer="visitor" openJoin={join === '1'} />
}
