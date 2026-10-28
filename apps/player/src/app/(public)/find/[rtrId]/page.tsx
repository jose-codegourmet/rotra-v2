import { FindPlayer } from './_components/find-player/FindPlayer'
export default async function Page(props: PageProps<'/find/[rtrId]'>) {
  const { rtrId } = await props.params
  return <FindPlayer rtrId={rtrId} />
}
