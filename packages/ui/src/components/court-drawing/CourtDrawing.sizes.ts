import { cn } from '@rotra/ui/cn'

/** Prototype .side.nN: clamp pictures and names to the court card's inline size (cqw). */
const AVATAR = [
  '[&>:first-child]:!size-[clamp(34px,15cqw,64px)] [&>:first-child]:!text-[length:clamp(12px,4.4cqw,19px)] [&>:last-child]:!max-w-[clamp(64px,24cqw,120px)] [&>:last-child]:px-[7px] [&>:last-child]:!text-[length:clamp(11px,4cqw,15px)]',
  '[&>:first-child]:!size-[clamp(30px,13cqw,52px)] [&>:first-child]:!text-[length:clamp(11px,3.8cqw,16px)] [&>:last-child]:!max-w-[clamp(64px,24cqw,120px)] [&>:last-child]:px-[7px] [&>:last-child]:!text-[length:clamp(11px,4cqw,15px)]',
  '[&>:first-child]:!size-[clamp(26px,10cqw,40px)] [&>:first-child]:!text-[length:clamp(10px,3cqw,14px)] [&>:last-child]:!max-w-[clamp(64px,24cqw,120px)] [&>:last-child]:px-[7px] [&>:last-child]:!text-[length:clamp(11px,3.4cqw,13px)]',
  '[&>:first-child]:!size-[clamp(24px,6.5cqw,32px)] [&>:first-child]:!text-[length:clamp(10px,2cqw,12px)] [&>:last-child]:!max-w-[52px] [&>:last-child]:px-[7px] [&>:last-child]:!text-[11px]',
] as const

const FRAME = [
  'size-[clamp(34px,15cqw,64px)]',
  'size-[clamp(30px,13cqw,52px)]',
  'size-[clamp(26px,10cqw,40px)]',
  'size-[clamp(24px,6.5cqw,32px)]',
] as const

const faceIndex = (n: number) => (n <= 1 ? 0 : n === 2 ? 1 : n === 3 ? 2 : 3)

export function courtFaceClass(n: number) {
  return AVATAR[faceIndex(n)] ?? AVATAR[3]
}

export function courtFaceFrameClass(n: number) {
  return FRAME[faceIndex(n)] ?? FRAME[3]
}

/** Prototype .pf-g: white at rest, accent on hover, no border; smaller on 4v4 / 5v5. */
export function courtGameBadgeClass(n: number) {
  return cn(
    'absolute grid place-items-center rounded-full border-0 bg-on-photo/90 font-extrabold tabular-nums',
    'text-[color:var(--bg)] [:is(html[data-theme=light])_&]:text-fg',
    'group-hover/slot:!bg-accent group-hover/slot:!text-on-accent',
    n >= 4
      ? '-top-[3px] -right-[5px] h-[15px] min-w-[15px] px-0.5 text-[9px] leading-none'
      : '-top-[3px] -right-[7px] h-[clamp(17px,5.5cqw,22px)] min-w-[clamp(17px,5.5cqw,22px)] px-1 text-[length:clamp(10px,3.2cqw,13px)] leading-none',
  )
}
