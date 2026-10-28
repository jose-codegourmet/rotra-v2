import { RankDetail } from '../../../_components/rank-detail/RankDetail'
export default async function Page(props: PageProps<'/players/[playerId]/rank'>) {
  const { playerId } = await props.params
  return <RankDetail key={playerId} playerId={playerId} />
}
