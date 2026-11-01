'use client'
import type { AdminPlayer } from '@rotra/data/admin-player/types'
import { OverflowMenu } from '@rotra/ui/overflow-menu'
export type AdminPlayerActionsProps = {
  player: AdminPlayer
  offline?: boolean
  pending?: boolean
  onAction: (
    action:
      | 'quick'
      | 'profile'
      | 'history'
      | 'copy'
      | 'link'
      | 'edit'
      | 'archive'
      | 'restore'
      | 'remove',
  ) => void
}
export function AdminPlayerActions({
  player: p,
  offline,
  pending,
  onAction,
}: AdminPlayerActionsProps) {
  const unavailable = offline
    ? 'Reconnect to change player records'
    : pending
      ? 'Saving…'
      : undefined
  return (
    <OverflowMenu
      label={`Actions for ${p.name}`}
      items={[
        { label: 'Quick view', onSelect: () => onAction('quick') },
        { label: 'View full profile', onSelect: () => onAction('profile') },
        { label: 'View full history', onSelect: () => onAction('history') },
        { label: 'Copy RTR ID', onSelect: () => onAction('copy') },
        {
          label: 'Copy registration link',
          disabledReason:
            unavailable ??
            (p.claimed
              ? 'Already registered'
              : p.archivedAt
                ? 'Restore this player first'
                : undefined),
          onSelect: () => onAction('link'),
        },
        { label: 'Edit profile', disabledReason: unavailable, onSelect: () => onAction('edit') },
        {
          label: p.archivedAt ? 'Restore' : 'Archive',
          disabledReason: unavailable,
          onSelect: () => onAction(p.archivedAt ? 'restore' : 'archive'),
        },
        {
          label: 'Remove',
          disabledReason: unavailable ?? p.removalReason ?? undefined,
          destructive: true,
          onSelect: () => onAction('remove'),
        },
      ]}
    />
  )
}
