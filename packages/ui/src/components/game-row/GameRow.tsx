import type { PlayerGame } from '@rotra/data/player/types'
import { cn } from '@rotra/ui/cn'
import { gameResultVariants } from './GameRow.variants'
export type GameRowProps = { game: PlayerGame; dateLine?: string }
const FORMATS = {
  singles: 'Singles',
  doubles: 'Doubles',
  fun_1v2: '1v2 fun',
  fun_3v3: '3v3 fun',
  fun_4v4: '4v4 fun',
  fun_5v5: '5v5 fun',
}
function people(names: string[]) {
  return new Intl.ListFormat('en', { style: 'long', type: 'conjunction' })
    .format(names)
    .replace(', and ', ' and ')
}
export function GameRow({ game, dateLine }: GameRowProps) {
  const partial = game.counting === 'partial'
  return (
    <div className="grid grid-cols-[30px_minmax(0,1fr)_auto] items-center gap-3 border-t border-border py-2.5 first:border-t-0 max-[480px]:grid-cols-[30px_minmax(0,1fr)]">
      <span
        role="img"
        aria-label={partial ? 'Not counted' : game.result === 'won' ? 'Won' : 'Lost'}
        className={gameResultVariants({ result: partial ? 'partial' : game.result })}
      >
        {partial ? '–' : game.result === 'won' ? 'W' : 'L'}
      </span>
      <div className="min-w-0">
        <b>{FORMATS[game.format]}</b>
        {game.partners.length > 0 && (
          <span className="text-fg2"> with {people(game.partners)}</span>
        )}
        {dateLine && <div className="text-[13px] text-fg2">{dateLine}</div>}
        <div className="text-[13px] text-fg2">vs {people(game.opponents)}</div>
        {game.note && <div className="text-[13px] text-warn">{game.note} · not counted</div>}
      </div>
      <span
        role="img"
        aria-label={game.score ? `Score ${game.score}` : undefined}
        className={cn(
          'text-right font-mono text-sm font-semibold whitespace-nowrap tabular-nums max-[480px]:col-start-2 max-[480px]:text-left',
          !game.score &&
            'max-w-[150px] font-sans text-xs font-medium whitespace-normal text-fg2 max-[480px]:max-w-none',
        )}
      >
        {game.score ?? 'Winner recorded; score not entered'}
      </span>
    </div>
  )
}
