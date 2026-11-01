import { AdminGameHistory } from './_components/admin-game-history/AdminGameHistory'
export default async function Page(props: PageProps<'/players/[playerId]/games'>) {
  const { playerId } = await props.params
  return <AdminGameHistory playerId={playerId} />
}
