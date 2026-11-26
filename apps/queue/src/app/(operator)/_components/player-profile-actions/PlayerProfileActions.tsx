'use client'

import { savedPlayerName } from '@rotra/data/club-player/clubNickname-rules'
import type { DeleteImpact } from '@rotra/data/club-player/types'
import { useClubPlayerDetails } from '@rotra/data/club-player/useClubPlayerDetails'
import { useClubPlayers } from '@rotra/data/club-player/useClubPlayers'
import { useCreatePlayerInvite } from '@rotra/data/club-player/useCreatePlayerInvite'
import { useDeleteClubPlayer } from '@rotra/data/club-player/useDeleteClubPlayer'
import { useSetClubNickname } from '@rotra/data/club-player/useSetClubNickname'
import { useConnectivity } from '@rotra/data/connectivity/useConnectivity'
import { DeletePlayerSheet } from '@rotra/ui/delete-player-sheet'
import { ClubNicknameForm } from '@rotra/ui/forms/club-nickname-form'
import { InviteSheet } from '@rotra/ui/invite-sheet'
import { toast } from '@rotra/ui/toaster'
import { useState } from 'react'
import { EditPlayerDetails } from '../edit-player-details/EditPlayerDetails'

/** A saved player as useClubPlayers lists them (what every profile sheet shows). */
type ClubPlayer = NonNullable<ReturnType<typeof useClubPlayers>['data']>['players'][number]

type Action =
  | { kind: 'edit'; id: string }
  | { kind: 'invite'; id: string }
  | { kind: 'nickname'; id: string }
  | { kind: 'delete'; id: string; name: string; shortName: string; impact: DeleteImpact }

export type PlayerProfileActionsOptions = {
  /** Hide the profile sheet while another sheet takes its place */
  hideProfile: () => void
  /** Show this saved player's profile again (after Edit details or Club nickname, or after a move) */
  showProfile: (clubPlayerId: string) => void
  /** The profile's flow is over: invite closed or the player was deleted */
  closeProfile: () => void
}

/**
 * The profile sheet's own actions on every operator screen (the prototype's one profile(sh)):
 * Edit details and Invite for guests and unclaimed players, Club nickname for registered players,
 * and Delete player for anyone. `profileProps(profile)` goes onto PlayerProfileSheet; render
 * `sheets` beside it. The sheet itself hides Delete and Club nickname when opened from a dialog.
 */
export function usePlayerProfileActions(
  profile: ClubPlayer | undefined,
  { hideProfile, showProfile, closeProfile }: PlayerProfileActionsOptions,
) {
  const offline = !useConnectivity().online
  const clubPlayers = useClubPlayers()
  const [action, setAction] = useState<Action | null>(null)
  const setClubNickname = useSetClubNickname()
  const del = useDeleteClubPlayer()
  const invite = useCreatePlayerInvite()
  const byId = (id: string | undefined) => clubPlayers.data?.players.find((p) => p.id === id)
  const editable = (p: ClubPlayer | undefined) =>
    p?.identity === 'guest' || p?.identity === 'unclaimed'
  // Load Edit details while the profile is open, so choosing it swaps sheets with no blank gap.
  useClubPlayerDetails(editable(profile) && !action ? (profile?.id ?? null) : null)

  const open = (next: Action) => {
    hideProfile()
    setAction(next)
  }
  const back = (id: string) => {
    setAction(null)
    showProfile(id)
  }

  const openInvite = (id: string) => {
    open({ kind: 'invite', id })
    if (!offline)
      invite.mutate(id, {
        onError: (error) => {
          setAction(null)
          closeProfile()
          toast.error(error.message)
        },
      })
  }
  const removePlayer = (id: string, asked: boolean) =>
    del.remove.mutate(id, {
      onSuccess: (result) => {
        toast(`${result.name} deleted`)
        setAction(null)
        closeProfile()
      },
      onError: (error) => {
        if (!asked) toast.error(error.message)
      },
    })
  /** Delete player: acts at once unless they're in the Active Session, which asks first. */
  const startDelete = (p: ClubPlayer) =>
    del.check.mutate(p.id, {
      onSuccess: (impact) => {
        if (!impact.activeSession) {
          removePlayer(p.id, false)
          return
        }
        del.remove.reset()
        open({ kind: 'delete', id: p.id, name: p.fullName, shortName: savedPlayerName(p), impact })
      },
      onError: (error) => toast.error(error.message),
    })
  const copyLink = async (link: string) => {
    try {
      await navigator.clipboard.writeText(link)
      toast('Invite link copied')
    } catch {
      toast('Select the link and copy it')
    }
  }

  const profileProps = (p: ClubPlayer) => ({
    onClubNickname:
      p.identity === 'registered' ? () => open({ kind: 'nickname', id: p.id }) : undefined,
    onInvite: editable(p) ? () => openInvite(p.id) : undefined,
    onEdit: editable(p) ? () => open({ kind: 'edit', id: p.id }) : undefined,
    onDelete: () => startDelete(p),
    deleting: del.check.isPending || (del.remove.isPending && action?.kind !== 'delete'),
  })

  const invitee = action?.kind === 'invite' ? byId(action.id) : undefined
  const nicknamePlayer = action?.kind === 'nickname' ? byId(action.id) : undefined
  const sheets = (
    <>
      {action?.kind === 'delete' && action.impact.activeSession ? (
        <DeletePlayerSheet
          open
          onOpenChange={(next) => {
            if (!next && !del.remove.isPending) setAction(null)
          }}
          name={action.name}
          shortName={action.shortName}
          sessionTitle={action.impact.activeSession.title}
          waitingMatches={action.impact.activeSession.waitingMatches}
          busy={action.impact.busy}
          isPending={del.remove.isPending}
          error={del.remove.error?.message}
          onConfirm={() => removePlayer(action.id, true)}
        />
      ) : null}
      {action?.kind === 'edit' ? (
        <EditPlayerDetails
          key={action.id}
          clubPlayerId={action.id}
          onClose={() => back(action.id)}
          onMoved={(intoId) => back(intoId)}
        />
      ) : null}
      {nicknamePlayer?.identity === 'registered' ? (
        <ClubNicknameForm
          key={nicknamePlayer.id}
          open
          onOpenChange={(next) => {
            if (next) return
            setClubNickname.reset()
            back(nicknamePlayer.id)
          }}
          name={nicknamePlayer.fullName}
          currentNickname={nicknamePlayer.clubNickname}
          accountNickname={nicknamePlayer.nickname}
          isPending={setClubNickname.isPending}
          serverError={setClubNickname.error?.message}
          onSubmit={(values) =>
            setClubNickname.mutate(
              { clubPlayerId: nicknamePlayer.id, clubNickname: values.nickname },
              {
                onSuccess: (result) => {
                  toast(result.message)
                  back(nicknamePlayer.id)
                },
              },
            )
          }
        />
      ) : null}
      {invitee && (invitee.identity === 'guest' || invitee.identity === 'unclaimed') ? (
        <InviteSheet
          open
          onOpenChange={(next) => {
            if (next) return
            setAction(null)
            closeProfile()
          }}
          name={invitee.fullName}
          identity={invitee.identity}
          emailOnFile={invitee.emailOnFile}
          link={invite.data?.url}
          offline={offline}
          onCopy={copyLink}
        />
      ) : null}
    </>
  )

  return { profileProps, sheets, openInvite }
}
