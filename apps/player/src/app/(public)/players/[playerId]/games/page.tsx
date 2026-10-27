import { GameHistory } from './_components/game-history/GameHistory'
export default async function Page(props: PageProps<'/players/[playerId]/games'>) {
  const { playerId } = await props.params
  return <GameHistory key={playerId} playerId={playerId} />
}
