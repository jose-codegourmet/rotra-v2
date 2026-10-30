import { PlayerDetail } from './_components/player-detail/PlayerDetail'

export default async function PlayerDetailPage(props: PageProps<'/players/[playerId]'>) {
  const { playerId } = await props.params
  const search = await props.searchParams
  // Already decoded once by Next; it is the directory's own query string ("q=…&account=…&shown=…").
  const from = typeof search.from === 'string' ? search.from : ''
  return <PlayerDetail playerId={playerId} from={from} />
}
