import { ProfileCardEmbed } from './_components/profile-card-embed/ProfileCardEmbed'

/**
 * `/card/<RTR ID>`: the participant profile card on its own, with no app chrome, for rotra.club's
 * "Find your profile" to show in a frame (next.config.ts allows only rotra.club to frame it).
 */
export default async function Page(props: PageProps<'/card/[rtrId]'>) {
  const { rtrId } = await props.params
  return <ProfileCardEmbed rtrId={rtrId} />
}
