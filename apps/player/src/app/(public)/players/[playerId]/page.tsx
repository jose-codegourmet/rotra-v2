import { PlayerProfile } from './_components/player-profile/PlayerProfile'
export default async function Page(props: PageProps<'/players/[playerId]'>) {
  const { playerId } = await props.params
  return <PlayerProfile key={playerId} playerId={playerId} />
}
