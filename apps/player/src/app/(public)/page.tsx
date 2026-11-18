import { LeaderboardPage } from './_components/leaderboard-page/LeaderboardPage'
export default async function Page(props: PageProps<'/'>) {
  // `?player=<id>`: the profile's Overall box opens the leaderboard at that row (it flashes).
  // `?q=<name>`: the name search opens already filled in (rotra.club's "Find your profile" sends a name here; an
  // RTR ID goes to /find/<id> instead).
  const { player, q } = await props.searchParams
  return (
    <LeaderboardPage
      focusPlayerId={typeof player === 'string' ? player : undefined}
      initialQuery={typeof q === 'string' ? q : undefined}
    />
  )
}
