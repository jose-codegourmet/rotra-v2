import { PlayerMatchPage } from './_components/player-match-page/PlayerMatchPage'
export default async function Page(props: PageProps<'/matches/[matchId]'>) {
  const { matchId } = await props.params
  return <PlayerMatchPage key={matchId} matchId={matchId} />
}
