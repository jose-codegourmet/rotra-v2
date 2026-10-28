'use client'
import { useSignOut } from '@rotra/data/auth/use-sign-out'
import { PLAYER_FIXTURE_NOW } from '@rotra/data/fixtures/player-games'
import { useLeaderboard } from '@rotra/data/leaderboard/useLeaderboard'
import { rankDisplayStatus } from '@rotra/data/player/rules'
import { PLAYING_LEVELS } from '@rotra/data/player/types'
import { usePlayerGames } from '@rotra/data/player/usePlayerGames'
import { usePlayerProfile } from '@rotra/data/player/usePlayerProfile'
import { usePlayerRank } from '@rotra/data/player/usePlayerRank'
import { useMyAccount } from '@rotra/data/player-account/useMyAccount'
import { useRankingSettings } from '@rotra/data/ranking-settings'
import { AccountPanel } from '@rotra/ui/account-panel'
import { Button } from '@rotra/ui/button'
import { EligibilityCard } from '@rotra/ui/eligibility-card'
import { ErrorState } from '@rotra/ui/error-state'
import { Notice } from '@rotra/ui/notice'
import { PlayerAboutCard } from '@rotra/ui/player-about-card'
import { PlayerIdentityCard } from '@rotra/ui/player-identity-card'
import { ProfileLayout } from '@rotra/ui/profile-layout'
import { ProfileNotFound } from '@rotra/ui/profile-not-found'
import { RecentGamesCard } from '@rotra/ui/recent-games-card'
import { SharedRankCard } from '@rotra/ui/shared-rank-card'
import { toast } from '@rotra/ui/toaster'
import { useRouter } from 'next/navigation'
import { useAppDispatch, useAppSelector } from '@/store/hooks'
import { selectAccount, setAccount } from '@/store/slices/authSlice'
import { selectDev } from '@/store/slices/devSlice'
import Loading from '../../loading'

/** "yesterday", "3 days ago", measured from the fixtures' clock like the rest of the rank data. */
function finishedAgo(finishedAt: string) {
  const hours = (PLAYER_FIXTURE_NOW.getTime() - Date.parse(finishedAt)) / 3_600_000
  const format = new Intl.RelativeTimeFormat('en', { numeric: 'auto' })
  return hours < 24
    ? format.format(-Math.max(1, Math.round(hours)), 'hour')
    : format.format(-Math.round(hours / 24), 'day')
}

export function PlayerProfile({ playerId }: { playerId: string }) {
  const profile = usePlayerProfile(playerId),
    rank = usePlayerRank(playerId),
    games = usePlayerGames(playerId)
  const settings = useRankingSettings(),
    leaderboard = useLeaderboard(),
    router = useRouter()
  const account = useAppSelector(selectAccount),
    { offline } = useAppSelector(selectDev),
    dispatch = useAppDispatch()
  const isOwn = account?.id === playerId
  // Ownership is checked first: a visitor's page never requests private contacts.
  const myAccount = useMyAccount(isOwn ? playerId : null),
    signOut = useSignOut('player')
  const player = profile.data,
    current = rank.data
  const failed = profile.isError || rank.isError || games.isError || settings.isError
  const retry = () => {
    void profile.refetch()
    void rank.refetch()
    void games.refetch()
    void settings.refetch()
  }
  if (profile.data === null || rank.data === null)
    return (
      <main className="mx-auto flex max-w-[920px] flex-col gap-5 px-4 pt-5">
        <Button size="sm" variant="ghost" onClick={() => router.push('/')}>
          ← Leaderboard
        </Button>
        <ProfileNotFound id={playerId} />
      </main>
    )
  if (!player || !current || !games.data || !settings.data) {
    return failed ? (
      <main className="mx-auto max-w-[920px] px-4 pt-5">
        <ErrorState title="Couldn't load the profile." onRetry={retry}>
          Check your connection, then try again.
        </ErrorState>
      </main>
    ) : (
      <Loading />
    )
  }
  const firstName = player.nickname || player.fullName.split(' ')[0] || player.fullName
  const subject = isOwn ? 'you' : firstName,
    requirement = settings.data.matchRequirement
  const status = rankDisplayStatus({
    level: current.levelIndex,
    state: current.state,
    updatePending: current.updatePending,
    position: current.position,
    recentCount: current.recentCount,
    matchRequirement: requirement,
  })
  const label = {
    'not-calculated': 'Not calculated',
    'needs-reassessment': 'Needs reassessment',
    'on-leaderboard': 'On the leaderboard',
    updating: 'Updating',
    qualifies: 'Qualifies',
    provisional: 'Provisional',
  }[status]
  const levelCode = current.levelIndex === null ? null : PLAYING_LEVELS[current.levelIndex]
  const levelLabel = levelCode
    ? levelCode
        .split('_')
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ')
    : 'No rank yet'
  const total = leaderboard.data?.pages[0]?.total
  const sentence =
    status === 'not-calculated'
      ? `ROTRA calculates a rank once a club has assessed ${subject} and a session with that assessment is done. Until then there is no rank to show.`
      : status === 'needs-reassessment'
        ? `Last played more than three months ago, so this rank is out of date and not on the leaderboard. To return, a club gives ${subject} a fresh assessment and ${subject} ${isOwn ? 'play' : 'plays'} ${requirement} standard matches within three months.`
        : current.position !== null
          ? `${current.position.toLocaleString('en-PH')}${total === undefined ? '' : ` of ${total.toLocaleString('en-PH')} players`} on the overall ROTRA leaderboard.`
          : status === 'qualifies'
            ? `${isOwn ? 'You now have' : `${firstName} now has`} enough recent matches. The position appears after the next leaderboard update.`
            : `No overall position yet. ${current.recentCount} of ${requirement} standard matches in the last three months.`
  const remaining = Math.max(0, requirement - current.recentCount)
  const eligibility =
    current.state === 'needs_reassessment'
      ? `${isOwn ? 'You have' : `${firstName} has`} no standard matches in the last three months${current.olderCount ? `; ${current.olderCount} older matches no longer count` : ''}. A fresh club assessment plus ${requirement} new matches brings ${isOwn ? 'you' : 'them'} back.`
      : current.recentCount >= requirement
        ? `${isOwn ? 'You meet' : 'Meets'} the requirement of ${requirement} completed singles or doubles matches in the last three months. Falling below it removes the leaderboard position, though the rank stays visible.`
        : `${remaining} more standard ${remaining === 1 ? 'match' : 'matches'} in the next few weeks would put ${subject} on the leaderboard. Older matches drop out of the count as they pass three months.`
  const idElementId = `profile-rtr-${playerId}`
  const copyId = async () => {
    try {
      await navigator.clipboard.writeText(player.rtrId)
      toast('Player ID copied')
    } catch {
      const element = document.getElementById(idElementId)
      if (element) {
        const range = document.createRange()
        range.selectNodeContents(element)
        const selection = window.getSelection()
        selection?.removeAllRanges()
        selection?.addRange(range)
        toast('ID selected. Copy it from your device menu.')
      }
    }
  }
  const leaveSignedOut = () =>
    signOut.mutate(undefined, {
      onSuccess: () => {
        dispatch(setAccount(null))
        router.push('/')
        toast('Signed out')
      },
      onError: (error) => toast.error(error.message),
    })
  const missingDetails = isOwn && (!player.playingStyle || !player.experienceYears)
  return (
    <ProfileLayout
      side={
        <>
          <PlayerIdentityCard
            profile={player}
            isOwn={isOwn}
            idElementId={idElementId}
            onCopyId={() => void copyId()}
            onEdit={() => router.push('/profile/edit')}
            onOpenPlayerId={() => router.push('/profile/player-id')}
          />
          {isOwn && myAccount.data ? (
            <AccountPanel
              phone={myAccount.data.phone}
              email={myAccount.data.email}
              phoneHidden={myAccount.data.phoneHidden}
              onOpenPrivacy={() => router.push('/profile/privacy-and-contact')}
              onSignOut={leaveSignedOut}
            />
          ) : null}
        </>
      }
      main={
        <>
          {offline && isOwn ? (
            <Notice tone="warn">
              Saved copy. Your rank and games may have changed since this device was last online.
            </Notice>
          ) : null}
          {failed && !offline ? (
            <ErrorState title="Couldn't refresh the profile." onRetry={retry}>
              Showing the last saved copy.
            </ErrorState>
          ) : null}
          {current.updatePending ? (
            <Notice tone="warn" title={`Updating from ${current.updatePending.sessionTitle}.`}>
              {current.updatePending.clubName} finished the session{' '}
              {finishedAgo(current.updatePending.finishedAt)}. This is {isOwn ? 'your' : 'the'} last
              calculated rank until the update is ready.
            </Notice>
          ) : null}
          {missingDetails ? (
            <Notice
              tone="info"
              action={
                <Button size="xs" onClick={() => router.push('/profile/edit')}>
                  Add details
                </Button>
              }
            >
              Add your playing style and experience so clubs know your game. It's optional.
            </Notice>
          ) : null}
          <SharedRankCard
            level={current.levelIndex === null ? null : current.levelIndex + 1}
            levelLabel={levelLabel}
            position={current.position}
            status={label}
            sentence={sentence}
            subject={subject}
            onOpenRankDetail={() => router.push(`/players/${playerId}/rank`)}
          />
          <EligibilityCard
            recentCount={current.recentCount}
            matchRequirement={requirement}
            needsReassessment={current.state === 'needs_reassessment'}
            sentence={eligibility}
          />
          <RecentGamesCard
            sessions={games.data}
            onOpenAll={() => router.push(`/players/${playerId}/games`)}
          />
          <PlayerAboutCard profile={player} isOwn={isOwn} />
        </>
      }
    />
  )
}
