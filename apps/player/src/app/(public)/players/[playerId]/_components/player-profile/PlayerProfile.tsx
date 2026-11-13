'use client'
import { useSession } from '@rotra/data/auth/use-session'
import { useSignOut } from '@rotra/data/auth/use-sign-out'
import { OPEN_CONTACT_CHANGE_STATUSES } from '@rotra/data/contact-change-request/types'
import { useMyContactChangeRequest } from '@rotra/data/contact-change-request/useMyContactChangeRequest'
import { PLAYER_FIXTURE_NOW } from '@rotra/data/fixtures/player-games'
import { useLeaderboard } from '@rotra/data/leaderboard/useLeaderboard'
import { manilaYear, rankDisplayStatus, weeklyPerformance } from '@rotra/data/player/rules'
import { PLAYING_LEVELS } from '@rotra/data/player/types'
import { useMySessions } from '@rotra/data/player/useMySessions'
import { usePlayerGames } from '@rotra/data/player/usePlayerGames'
import { usePlayerProfile } from '@rotra/data/player/usePlayerProfile'
import { usePlayerRank } from '@rotra/data/player/usePlayerRank'
import { PROFILE_LOGIN_MESSAGE, PROFILE_PRIVATE_MESSAGE } from '@rotra/data/player/visibility'
import { useMyAccount } from '@rotra/data/player-account/useMyAccount'
import { usePlayerClubs } from '@rotra/data/player-club/usePlayerClubs'
import { useRankingSettings } from '@rotra/data/ranking-settings'
import { useThrottledRefresh } from '@rotra/data/refresh/useThrottledRefresh'
import { AccountPanel } from '@rotra/ui/account-panel'
import { Button } from '@rotra/ui/button'
import { ContactRequestStatus } from '@rotra/ui/contact-request-status'
import { EligibilityCard, type RankStatusChip } from '@rotra/ui/eligibility-card'
import { ErrorState } from '@rotra/ui/error-state'
import type { GameRowPlayer } from '@rotra/ui/game-row'
import { usePhotoViewer } from '@rotra/ui/hooks/use-photo-viewer'
import { MySessionsCard } from '@rotra/ui/my-sessions-card'
import { Notice } from '@rotra/ui/notice'
import { PhotoViewer } from '@rotra/ui/photo-viewer'
import { PlayerAboutCard } from '@rotra/ui/player-about-card'
import { PlayerClubsCard } from '@rotra/ui/player-clubs-card'
import { PlayerIdentityCard } from '@rotra/ui/player-identity-card'
import { ProfileLayout } from '@rotra/ui/profile-layout'
import { ProfileNotFound } from '@rotra/ui/profile-not-found'
import { ProfileRankingCard } from '@rotra/ui/profile-ranking-card'
import { ProfileSessionsCard } from '@rotra/ui/profile-sessions-card'
import { PullToRefresh } from '@rotra/ui/pull-to-refresh'
import { RecentGamesCard } from '@rotra/ui/recent-games-card'
import { SessionMatchesSheet } from '@rotra/ui/session-matches-sheet'
import { Skeleton } from '@rotra/ui/skeleton'
import { toast } from '@rotra/ui/toaster'
import {
  WeeklyPerformanceChart,
  type WeeklyVisibility,
  WeeklyVisibilityChip,
} from '@rotra/ui/weekly-performance-chart'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { ClubCard } from '@/app/_components/club-card/ClubCard'
import { GamePlayerProfile } from '@/app/_components/game-player-profile/GamePlayerProfile'
import { copyPlayerId } from '@/app/_components/copy-player-id/copyPlayerId'
import { useBannerSheet } from '@/app/_components/profile-banner/useBannerSheet'
import { pictureSrc } from '@/app/_components/profile-picture/pictureSrc'
import { useProfilePictureSheet } from '@/app/_components/profile-picture/useProfilePictureSheet'
import { usePlayerShareSheet } from '@/app/_components/share/usePlayerShareSheet'
import { useAppDispatch, useAppSelector } from '@/store/hooks'
import { selectAccount, setAccount } from '@/store/slices/authSlice'
import { selectDev } from '@/store/slices/devSlice'
import Loading from '../../loading'

/** The shared rank's status chip (the prototype's rankStatus chips). */
const STATUS_CHIPS: Record<ReturnType<typeof rankDisplayStatus>, RankStatusChip> = {
  'not-calculated': { label: 'Not calculated', tone: 'neutral' },
  'needs-reassessment': { label: 'Needs reassessment', tone: 'warn' },
  'on-leaderboard': { label: 'On the leaderboard', tone: 'accent' },
  updating: { label: 'Updating', tone: 'warn' },
  qualifies: { label: 'Qualifies', tone: 'accent' },
  provisional: { label: 'Provisional', tone: 'neutral' },
}

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
  const session = useSession('player')
  const isOwn = (session.data?.account.id ?? account?.id) === playerId
  // Ownership is checked first: a visitor's page never requests private contacts.
  const myAccount = useMyAccount(isOwn ? playerId : null),
    contactRequest = useMyContactChangeRequest(isOwn ? playerId : null),
    signOut = useSignOut('player')
  // Clubs show on every readable profile (#766); the read applies the profile's access rule.
  const clubs = usePlayerClubs(playerId)
  // D-CLUB-PROFILE: a Clubs card row opens the club's profile card.
  const [clubCard, setClubCard] = useState<string | null>(null)
  // Recent sessions: the session whose matches dialog is open; a face on a court opens its card.
  const [openSessionId, setOpenSessionId] = useState<string | null>(null)
  const [openPlayer, setOpenPlayer] = useState<GameRowPlayer | null>(null)
  const mySessions = useMySessions(isOwn ? playerId : null)
  // Own profile only: pull down (or come back to the tab) refreshes My sessions, recent games and
  // the rank, once every 10 seconds (mockup change 2026-11-12). A visitor's page has no pull.
  const refreshing = useThrottledRefresh(
    () => Promise.all([mySessions.refetch(), games.refetch(), rank.refetch()]),
    { refreshOnReturn: isOwn },
  )
  const player = profile.data,
    current = rank.data
  // Share profile shows on every readable profile (2026-11-13-profile-card-open-share, pass 3);
  // rank, result, performance and game shares stay on your own.
  const sharing = usePlayerShareSheet(playerId)
  const pictureEditor = useProfilePictureSheet(isOwn ? player : null)
  const bannerEditor = useBannerSheet(isOwn ? player : null)
  const photo = usePhotoViewer()
  const failed = profile.isError || rank.isError || games.isError || settings.isError
  const retry = () => {
    void profile.refetch()
    void rank.refetch()
    void games.refetch()
    void settings.refetch()
  }
  // Always private (D-2026-11-12-01): the private card for everyone but the player, no sign-in button.
  if (
    profile.error?.message === PROFILE_PRIVATE_MESSAGE ||
    rank.error?.message === PROFILE_PRIVATE_MESSAGE ||
    games.error?.message === PROFILE_PRIVATE_MESSAGE
  )
    return (
      <main className="mx-auto flex max-w-[920px] flex-col gap-5 px-4 pt-5">
        <Button size="sm" variant="ghost" onClick={() => router.push('/')}>
          ← Leaderboard
        </Button>
        <ProfileNotFound id={playerId} alwaysPrivate />
      </main>
    )
  if (
    profile.error?.message === PROFILE_LOGIN_MESSAGE ||
    rank.error?.message === PROFILE_LOGIN_MESSAGE ||
    games.error?.message === PROFILE_LOGIN_MESSAGE
  )
    return (
      <main className="mx-auto max-w-[920px] px-4 pt-5">
        <ProfileNotFound
          id={playerId ?? ''}
          loginRequired
          onSignIn={() =>
            router.push(`/login?returnTo=${encodeURIComponent(`/players/${playerId}`)}`)
          }
        />
      </main>
    )
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
  const statusChip = STATUS_CHIPS[status]
  const levelCode = current.levelIndex === null ? null : PLAYING_LEVELS[current.levelIndex]
  const levelLabel = levelCode
    ? levelCode
        .split('_')
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ')
    : null
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
  // Leaderboard ranking replaces eligibility once the player qualifies with a position
  // (2026-11-13-player-ranking-card); both carry the shared rank in their head.
  const ranked =
    current.recentCount >= requirement &&
    current.state !== 'needs_reassessment' &&
    current.position !== null
  const rankHead = {
    levelLabel,
    status: statusChip,
    onShare: isOwn && current.levelIndex !== null ? sharing.openRank : undefined,
    onOpenRankDetail: () => router.push(`/players/${playerId}/rank`),
  }
  // Weekly Performance, read-only (2026-11-13-player-weekly-performance): hidden from others when the
  // player turned off Show my weekly performance; the owner always sees it with the visibility chip.
  const year = manilaYear(Date.now())
  const weeklyShown = player.showWeeklyPerformance !== false
  const weeklyVisibility: WeeklyVisibility = !weeklyShown
    ? 'hidden'
    : player.profileVisibility === 'always_private'
      ? 'only-you'
      : player.profileVisibility === 'private'
        ? 'signed-in'
        : 'public'
  const gamesMe = {
    name: player.fullName,
    label: isOwn ? 'You' : firstName,
    picture: pictureSrc(player.picture, player.playerId, player.fullName) ?? null,
    playerId,
  }
  const openSession = games.data.find((entry) => entry.id === openSessionId) ?? null
  const idElementId = `profile-rtr-${playerId}`
  const leaveSignedOut = () =>
    signOut.mutate(undefined, {
      onSuccess: () => {
        dispatch(setAccount(null))
        router.push('/')
        toast('Signed out')
      },
      onError: (error) => toast.error(error.message),
    })
  const picture = pictureSrc(player.picture, player.playerId, player.fullName) ?? null
  const missingDetails = isOwn && (!player.playingStyle || !player.experienceYears)
  const updatedLabel = mySessions.dataUpdatedAt
    ? new Date(mySessions.dataUpdatedAt).toLocaleTimeString([], {
        hour: 'numeric',
        minute: '2-digit',
      })
    : undefined
  return (
    <PullToRefresh
      onRefresh={refreshing.refresh}
      throttled={!refreshing.canRefresh}
      offline={offline}
      refreshing={refreshing.isRefreshing}
      updatedLabel={updatedLabel}
      disabled={!isOwn}
    >
      <ProfileLayout
        side={
          <>
            <PlayerIdentityCard
              profile={{ ...player, picture }}
              isOwn={isOwn}
              bannerKey={player.bannerKey}
              bannerImageUrl={player.bannerImageUrl}
              idElementId={idElementId}
              onCopyId={() => void copyPlayerId(player.rtrId, idElementId)}
              onViewPicture={
                picture ? () => photo.show({ src: picture, name: player.fullName }) : undefined
              }
              onChangePicture={pictureEditor.openSheet}
              onChangeBanner={bannerEditor.openSheet}
              compareSignedIn={Boolean(session.data)}
              onCompare={
                session.isPending || session.isError
                  ? undefined
                  : () => {
                      const path = `/players/${encodeURIComponent(playerId)}/compare`
                      if (!session.data) {
                        toast('Sign in to compare')
                        router.push(`/login?returnTo=${encodeURIComponent(path)}`)
                      } else router.push(path)
                    }
              }
              onEdit={() => router.push('/profile/edit')}
              onOpenPlayerId={() => router.push('/profile/player-id')}
              onShare={sharing.openProfile}
            />
            {pictureEditor.sheet}
            {bannerEditor.sheet}
            {photo.viewerProps ? <PhotoViewer {...photo.viewerProps} /> : null}
            <ClubCard clubId={clubCard} onClose={() => setClubCard(null)} />
            {sharing.sheet}
            {isOwn && myAccount.data ? (
              <AccountPanel
                phone={myAccount.data.phone}
                email={myAccount.data.email}
                phoneHidden={myAccount.data.phoneHidden}
                requestSlot={
                  contactRequest.data &&
                  OPEN_CONTACT_CHANGE_STATUSES.includes(contactRequest.data.status) ? (
                    <ContactRequestStatus request={contactRequest.data} variant="compact" />
                  ) : null
                }
                onOpenPrivacy={() => router.push('/profile/privacy-and-contact')}
                onSignOut={leaveSignedOut}
              />
            ) : null}
            {clubs.isPending ? (
              <Skeleton className="h-36" />
            ) : clubs.isError ? (
              <ErrorState
                title={isOwn ? "Couldn't load your clubs." : "Couldn't load the clubs."}
                onRetry={() => void clubs.refetch()}
              />
            ) : (
              <PlayerClubsCard
                isOwn={isOwn}
                onOpenClub={setClubCard}
                clubs={(clubs.data ?? []).map((club) => ({
                  ...club,
                  clubPageHref: `/clubs/${encodeURIComponent(club.id)}`,
                }))}
              />
            )}
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
                {finishedAgo(current.updatePending.finishedAt)}. This is {isOwn ? 'your' : 'the'}{' '}
                last calculated rank until the update is ready.
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
            {ranked && current.position !== null ? (
              <ProfileRankingCard
                {...rankHead}
                position={current.position}
                total={total}
                recentCount={current.recentCount}
                matchRequirement={requirement}
                onOpenLeaderboard={() => router.push(`/?player=${encodeURIComponent(playerId)}`)}
              />
            ) : (
              <EligibilityCard
                recentCount={current.recentCount}
                matchRequirement={requirement}
                needsReassessment={current.state === 'needs_reassessment'}
                sentence={eligibility}
                rank={rankHead}
                rankText={sentence}
              />
            )}
            {isOwn || weeklyShown ? (
              <WeeklyPerformanceChart
                readOnly
                days={weeklyPerformance(games.data, year)}
                year={year}
                onSeeAllGames={() => router.push(`/players/${playerId}/games`)}
                visibility={
                  isOwn ? (
                    <WeeklyVisibilityChip
                      visibility={weeklyVisibility}
                      onOpenSetting={() =>
                        router.push('/profile/privacy-and-contact?highlight=weekly')
                      }
                    />
                  ) : undefined
                }
              />
            ) : null}
            {isOwn ? (
              mySessions.isPending ? (
                <Skeleton className="h-40" />
              ) : mySessions.isError ? (
                <ErrorState
                  title="Couldn't load your sessions."
                  onRetry={() => void mySessions.refetch()}
                />
              ) : (
                <MySessionsCard
                  sessions={mySessions.data?.sessions ?? []}
                  finished={mySessions.data?.finished}
                  onShareResult={sharing.openResult}
                />
              )
            ) : null}
            <ProfileSessionsCard
              sessions={games.data}
              onOpenSession={setOpenSessionId}
              onOpenAll={() => router.push(`/players/${playerId}/sessions`)}
            />
            <RecentGamesCard
              sessions={games.data}
              onOpenAll={() => router.push(`/players/${playerId}/games`)}
              me={gamesMe}
              onOpenPlayer={setOpenPlayer}
              onShareGame={isOwn ? sharing.openGame : undefined}
            />
            <SessionMatchesSheet
              session={openSession}
              onOpenChange={(open) => {
                if (!open) setOpenSessionId(null)
              }}
              whose={isOwn ? 'Your' : `${player.nickname || player.fullName}'s`}
              me={gamesMe}
              onOpenPlayer={setOpenPlayer}
              onShareGame={isOwn ? sharing.openGame : undefined}
              onSharePerformance={isOwn ? sharing.openPerformance : undefined}
            />
            <GamePlayerProfile
              player={openPlayer}
              viewerId={session.data?.account.id ?? account?.id}
              onClose={() => setOpenPlayer(null)}
            />
            <PlayerAboutCard profile={player} isOwn={isOwn} />
          </>
        }
      />
    </PullToRefresh>
  )
}
