import { Notice } from '@rotra/ui/notice'

export type ShortOnPlayersBannerProps = {
  /** All present players, busy or not */
  present: number
  /** Open courts the present players can fill with doubles (4 a court) */
  doublesCourts?: number
  /** Open courts the present players can fill with singles (2 a court), after doubles */
  singlesCourts?: number
  /** Present players left over each game; 0 drops the second sentence */
  sitOut?: number
  /** The standard game named when no court can run: "not enough for a doubles game." */
  standardFormat?: 'doubles' | 'singles'
  className?: string
}

const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? '' : 's'}`

/**
 * The live console's warning above Courts when the present players can't fill every free open court:
 * "7 players present: enough for 1 doubles court. 3 sit out each game." No buttons. The container
 * counts the courts and the players (Queueing › Short on players) and hides it once the free players
 * can fill every free open court; the banner only words the counts.
 */
export function ShortOnPlayersBanner({
  present,
  doublesCourts = 0,
  singlesCourts = 0,
  sitOut = 0,
  standardFormat = 'doubles',
  className,
}: ShortOnPlayersBannerProps) {
  const courts = [
    doublesCourts > 0 ? plural(doublesCourts, 'doubles court') : null,
    singlesCourts > 0 ? plural(singlesCourts, 'singles court') : null,
  ]
    .filter(Boolean)
    .join(' and ')
  return (
    <Notice tone="warn" className={className}>
      {plural(present, 'player')} present:{' '}
      {courts
        ? `enough for ${courts}.${sitOut > 0 ? ` ${sitOut} sit${sitOut === 1 ? 's' : ''} out each game.` : ''}`
        : `not enough for a ${standardFormat} game.`}
    </Notice>
  )
}
