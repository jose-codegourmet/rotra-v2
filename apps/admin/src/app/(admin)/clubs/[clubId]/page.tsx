import { ClubDetail } from './_components/club-detail/ClubDetail'
import { CLUB_DETAIL_TABS } from './_components/club-detail/ClubDetail.tabs'

export default async function ClubDetailPage(props: PageProps<'/clubs/[clubId]'>) {
  const { clubId } = await props.params
  const search = await props.searchParams
  const tab = CLUB_DETAIL_TABS.find((value) => value === search.tab) ?? 'overview'
  // Already decoded once by Next; it is the directory's own query string ("q=…&access=…").
  const from = typeof search.from === 'string' ? search.from : ''
  return <ClubDetail clubId={clubId} tab={tab} from={from} />
}
