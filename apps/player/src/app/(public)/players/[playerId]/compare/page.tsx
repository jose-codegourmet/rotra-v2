import { PlayerCompare } from './_components/player-compare/PlayerCompare'

export default async function Page(props: PageProps<'/players/[playerId]/compare'>) {
  const { playerId } = await props.params
  return <PlayerCompare key={playerId} playerId={playerId} />
}
