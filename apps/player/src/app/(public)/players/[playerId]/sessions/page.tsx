import { PlayerSessions } from './_components/player-sessions/PlayerSessions'
export default async function Page(props: PageProps<'/players/[playerId]/sessions'>) {
  const { playerId } = await props.params
  return <PlayerSessions key={playerId} playerId={playerId} />
}
