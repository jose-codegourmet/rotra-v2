'use client'

import { Avatar } from '@rotra/ui/avatar'
import { Button } from '@rotra/ui/button'
import { Icon, type IconName } from '@rotra/ui/icon'
import { Sheet } from '@rotra/ui/sheet'

export type PlayerActionSheetProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Full name */
  name: string
  photoUrl?: string
  team: 'A' | 'B'
  matchNo: number
  /** Opens the Substitute picker with this player coming off */
  onSubstitute: () => void
  /** Opens the Replace picker with this player coming out */
  onReplace: () => void
  /** Opens the player's profile */
  onViewProfile: () => void
  /** Back to match: returns to the Playing match sheet */
  onBack: () => void
}

function Choice({
  icon,
  title,
  note,
  label,
  onClick,
}: {
  icon: IconName
  title: string
  note: string
  label: string
  onClick: () => void
}) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      className="flex min-h-[132px] min-w-0 cursor-pointer flex-col items-center justify-center gap-1.5 rounded-lg border border-border-strong bg-bg px-3 py-[18px] text-center hover:border-accent hover:bg-accent-subtle focus-visible:border-accent"
    >
      <Icon name={icon} className="text-accent" />
      <b className="text-[22px] leading-[1.1] font-extrabold">{title}</b>
      <span className="text-[13px] text-fg2">{note}</span>
    </button>
  )
}

/**
 * "Change NAME?" (the prototype's SHEETS.playerAction): tapping a player in a Playing match offers
 * two big choices side by side, Substitute ("Has to leave") and Replace ("Fix a mistake"), with the
 * longer explanations in their accessible names, a View profile link and Back to match.
 */
export function PlayerActionSheet({
  open,
  onOpenChange,
  name,
  photoUrl,
  team,
  matchNo,
  onSubstitute,
  onReplace,
  onViewProfile,
  onBack,
}: PlayerActionSheetProps) {
  const first = name.split(' ')[0] ?? name
  return (
    <Sheet
      open={open}
      onOpenChange={onOpenChange}
      title={`Change ${name}?`}
      footer={<Button onClick={onBack}>Back to match</Button>}
    >
      <div className="flex min-w-0 items-center gap-3">
        <Avatar name={name} src={photoUrl} size={52} />
        <div className="min-w-0">
          <b className="[overflow-wrap:anywhere]">{name}</b>
          <p className="m-0 text-[13px] text-fg2">
            Team {team} · match {matchNo}, playing
          </p>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2.5">
        <Choice
          icon="substitute"
          title="Substitute"
          note="Has to leave"
          label={`Substitute: ${first} has to leave mid-game`}
          onClick={onSubstitute}
        />
        <Choice
          icon="replace"
          title="Replace"
          note="Fix a mistake"
          label="Replace: fix a mistake, the wrong player was put in"
          onClick={onReplace}
        />
      </div>
      <Button size="sm" variant="ghost" className="self-start" onClick={onViewProfile}>
        View {first}'s profile
      </Button>
    </Sheet>
  )
}
