import { LeaderboardPage } from './_components/leaderboard-page/LeaderboardPage'
export default async function Page(props: PageProps<'/'>) {
  // `?player=<id>`: the profile's Overall box opens the leaderboard at that row (it flashes).
  const { player } = await props.searchParams
  return <LeaderboardPage focusPlayerId={typeof player === 'string' ? player : undefined} />
}
