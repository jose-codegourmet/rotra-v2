import { PublicSession } from './_components/public-session/PublicSession'

export default async function PublicSessionPage(props: PageProps<'/s/[slug]'>) {
  const { slug } = await props.params
  return <PublicSession slug={slug} viewer="visitor" />
}
