'use client'
import { useMyAccountVerification } from '@rotra/data/account-verification/useMyAccountVerification'
import { useSession } from '@rotra/data/auth/use-session'
import { useSignOut } from '@rotra/data/auth/use-sign-out'
import { OPEN_CONTACT_CHANGE_STATUSES } from '@rotra/data/contact-change-request/types'
import { useMyContactChangeRequest } from '@rotra/data/contact-change-request/useMyContactChangeRequest'
import { PLAYER_FIXTURE_NOW } from '@rotra/data/fixtures/player-games'
import { countYearCountedWins, manilaYear, weeklyPerformance } from '@rotra/data/player/rules'
import { PLAYING_LEVELS } from '@rotra/data/player/types'
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
import { ErrorState } from '@rotra/ui/error-state'
import type { GameRowPlayer } from '@rotra/ui/game-row'
import { usePhotoViewer } from '@rotra/ui/hooks/use-photo-viewer'
import { levelLabel } from '@rotra/ui/level-pill'
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
import { copyPlayerId } from '@/app/_components/copy-player-id/copyPlayerId'
import { GamePlayerProfile } from '@/app/_components/game-player-profile/GamePlayerProfile'
import { useBannerSheet } from '@/app/_components/profile-banner/useBannerSheet'
import { pictureSrc } from '@/app/_components/profile-picture/pictureSrc'
import { useProfilePictureSheet } from '@/app/_components/profile-picture/useProfilePictureSheet'
import { rankStatusFor } from '@/app/_components/rank-status/rankStatus'
import { usePlayerShareSheet } from '@/app/_components/share/usePlayerShareSheet'
import { usePlayerGoogleSignInEnabled } from '@/providers/PlayerFlagsProvider'
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
  const settings = useRankingSettings()
  const router = useRouter()
  const account = useAppSelector(selectAccount),
    { offline } = useAppSelector(selectDev),
    dispatch = useAppDispatch()
  const session = useSession('player')
  const isOwn = (session.data?.account.id ?? account?.id) === playerId
  // Ownership is checked first: a visitor's page never requests private contacts.
  const myAccount = useMyAccount(isOwn ? playerId : null),
    contactRequest = useMyContactChangeRequest(isOwn ? playerId : null),
    signOut = useSignOut('player')
  // D-2026-11-18-01: verification (and its chip and buttons) only while Google sign-in is on.
  const googleSignIn = usePlayerGoogleSignInEnabled()
  const verification = useMyAccountVerification(
    googleSignIn && session.data?.account.id === playerId ? playerId : null,
  )
  const openVerification = () => router.push('/profile/verification')
  // Clubs show on another player's readable profile (#766); the own Your clubs card moved to Home (P-HOME).
  const clubs = usePlayerClubs(isOwn ? null : playerId)
  // D-CLUB-PROFILE: a Clubs card row opens the club's profile card.
  const [clubCard, setClubCard] = useState<string | null>(null)
  // Recent sessions: the session whose matches dialog is open; a face on a court opens its card.
  const [openSessionId, setOpenSessionId] = useState<string | null>(null)
  const [openPlayer, setOpenPlayer] = useState<GameRowPlayer | null>(null)
  // Own profile only: pull down (or come back to the tab) refreshes the profile, recent games and
  // the rank, once every 10 seconds (mockup change 2026-11-12). A visitor's page has no pull.
  const refreshing = useThrottledRefresh(
    () => Promise.all([profile.refetch(), games.refetch(), rank.refetch()]),
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
  const subject = isOwn ? 'you' : firstName
  const requirement = settings.data.matchRequirement
  const levelCode =
    current.levelIndex === null ? null : (PLAYING_LEVELS[current.levelIndex] ?? null)
  const rankLevel = levelCode ? levelLabel(levelCode) : null
  const { status, rankText } = rankStatusFor(current, requirement, subject)
  // Weekly Performance, read-only (2026-11-13-player-weekly-performance): hidden from others when the
  // player turned off Show my weekly performance; the owner always sees it with the visibility chip.
  const now = Date.now()
  const year = manilaYear(now)
  const unclaimedStats = player.unclaimedSavedBy ? countYearCountedWins(games.data, now) : null
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
  const missingDetails = isOwn && (!player.playStyle || !player.experienceYears)
  const updatedLabel = games.dataUpdatedAt
    ? new Date(games.dataUpdatedAt).toLocaleTimeString([], {
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
              unclaimedFacts={
                unclaimedStats ? { ...unclaimedStats, year, levelLabel: rankLevel } : undefined
              }
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
              verification={googleSignIn ? (verification.data ?? undefined) : undefined}
              onOpenVerification={googleSignIn && isOwn ? openVerification : undefined}
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
                onOpenVerification={googleSignIn ? openVerification : undefined}
                onSignOut={leaveSignedOut}
              />
            ) : null}
            {isOwn ? null : clubs.isPending ? (
              <Skeleton className="h-36" />
            ) : clubs.isError ? (
              <ErrorState title="Couldn't load the clubs." onRetry={() => void clubs.refetch()} />
            ) : (
              <PlayerClubsCard
                isOwn={false}
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
            {player.unclaimedSavedBy ? (
              <Notice title="Not registered yet.">
                {player.unclaimedSavedBy} saved this player, so this is the club&apos;s version of
                them. The profile is public until they register with ROTRA.
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
            <ProfileRankingCard
              levelLabel={rankLevel}
              status={status}
              rankText={rankText}
              onShare={isOwn && current.levelIndex !== null ? sharing.openRank : undefined}
              onOpenRankDetail={() => router.push(`/players/${playerId}/rank`)}
              leaderboardPlaces={player.leaderboardPlaces ?? []}
              onOpenLeaderboard={(period) =>
                router.push(`/?period=${period}&player=${encodeURIComponent(playerId)}`)
              }
            />
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
