import type { PlayerRank } from '@rotra/data/player/types'
import type { RankStatusChip } from '@rotra/ui/eligibility-card'

/** The shared rank's status chip (the prototype's rankStatus chips). */
const STATUS_CHIPS = {
  'not-calculated': { label: 'Not calculated', tone: 'neutral' },
  'needs-reassessment': { label: 'Needs reassessment', tone: 'warn' },
  updating: { label: 'Updating', tone: 'warn' },
  provisional: { label: 'Provisional', tone: 'neutral' },
} satisfies Record<string, RankStatusChip>

/**
 * The status chip and explanation the shared rank card shows, for the own profile and Home alike.
 * `subject` is "you" or the player's first name.
 */
export function rankStatusFor(
  current: Pick<PlayerRank, 'levelIndex' | 'state' | 'recentCount' | 'updatePending'>,
  requirement: number,
  subject: string,
) {
  let status: RankStatusChip | undefined
  let rankText: string | undefined
  if (current.levelIndex === null) {
    status = STATUS_CHIPS['not-calculated']
    rankText = `ROTRA calculates a rank once a club has assessed ${subject} and a session with that assessment is done. Until then there is no rank to show.`
  } else if (current.state === 'needs_reassessment') {
    status = STATUS_CHIPS['needs-reassessment']
    rankText = `Last played more than three months ago, so this rank is out of date. A club gives ${subject} a fresh assessment to bring it up to date.`
  } else if (current.recentCount < requirement) {
    status = STATUS_CHIPS.provisional
    rankText = `This rank is still settling: ${current.recentCount} of ${requirement} standard matches in the last three months.`
  } else if (current.updatePending) {
    status = STATUS_CHIPS.updating
  }
  return { status, rankText }
}
