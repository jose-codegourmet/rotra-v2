'use client'

import { createContext, type ReactNode, useContext, useEffect, useId, useMemo, useRef } from 'react'

export type SwapTeam = 'A' | 'B'

/** One place in a lineup: the team and the position on it */
export type SwapSlot = { team: SwapTeam; index: number }

/** The hint a swappable player carries as its title and in its accessible description */
export const SWAP_SIDES_HINT =
  'Drag onto a player on the other team, or press the left or right arrow, to switch sides'

export type SwapSidesAreaProps = {
  /**
   * The two slots to exchange. Reports only: the owner changes the lineup (a queue card becomes
   * protected, Suggest changes its shown lineup, the lineup editor changes its slots).
   */
  onSwap: (from: SwapSlot, to: SwapSlot) => void
  /** Lineup editor: a player can also be dropped onto an empty slot on the other team */
  allowEmptyTargets?: boolean
  children: ReactNode
}

type Registered = { element: HTMLElement; empty: boolean }

export type SwapSidesContextValue = {
  /** Scopes drops: a player can only land on a slot of the same area */
  areaId: string
  allowEmptyTargets: boolean
  /** Each SwappablePlayer registers its element while mounted */
  register: (slot: SwapSlot, entry: Registered) => () => void
  /** Reports the swap; when `focus` is set, focus follows the moved player to `to` after the owner re-renders */
  swap: (from: SwapSlot, to: SwapSlot, focus: boolean) => void
  /** The slot opposite: same position on the other team, or its last when that team is smaller */
  opposite: (slot: SwapSlot) => SwapSlot | null
}

const SwapSidesContext = createContext<SwapSidesContextValue | null>(null)

/** The enclosing SwapSidesArea, or null outside one (a SwappablePlayer then renders a plain wrapper). */
export function useSwapSides() {
  return useContext(SwapSidesContext)
}

const key = (slot: SwapSlot) => `${slot.team}:${slot.index}`

const FOCUSABLE = 'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'

/**
 * The switch-sides behaviour (decided October 27, 2026), shared by queue cards, Suggest, the lineup
 * editor and Start match: renders no element of its own, only the scope for the SwappablePlayers
 * inside it. Dragging a player onto someone on the other team, or pressing ← / → on a focused player,
 * reports onSwap(from, to); dropping anywhere else or on a teammate does nothing.
 */
export function SwapSidesArea({ onSwap, allowEmptyTargets = false, children }: SwapSidesAreaProps) {
  const areaId = useId()
  const registry = useRef(new Map<string, Registered>())
  const pendingFocus = useRef<SwapSlot | null>(null)
  const onSwapRef = useRef(onSwap)
  onSwapRef.current = onSwap

  // Focus follows the moved player: once the owner has re-rendered the new lineup, the element at
  // the target slot holds the player who moved. Never lets focus fall to the page top.
  useEffect(() => {
    const slot = pendingFocus.current
    if (!slot) return
    pendingFocus.current = null
    const entry = registry.current.get(key(slot))
    if (!entry) return
    const target = entry.element.matches(FOCUSABLE)
      ? entry.element
      : entry.element.querySelector<HTMLElement>(FOCUSABLE)
    target?.focus()
  })

  const value = useMemo<SwapSidesContextValue>(
    () => ({
      areaId,
      allowEmptyTargets,
      register: (slot, entry) => {
        registry.current.set(key(slot), entry)
        return () => {
          if (registry.current.get(key(slot)) === entry) registry.current.delete(key(slot))
        }
      },
      swap: (from, to, focus) => {
        if (from.team === to.team) return
        if (focus) pendingFocus.current = to
        onSwapRef.current(from, to)
      },
      opposite: (slot) => {
        const team: SwapTeam = slot.team === 'A' ? 'B' : 'A'
        let count = 0
        for (const k of registry.current.keys()) if (k.startsWith(`${team}:`)) count++
        if (count === 0) return null
        const to = { team, index: Math.min(slot.index, count - 1) }
        const entry = registry.current.get(key(to))
        if (!entry || (entry.empty && !allowEmptyTargets)) return null
        return to
      },
    }),
    [areaId, allowEmptyTargets],
  )

  return <SwapSidesContext.Provider value={value}>{children}</SwapSidesContext.Provider>
}
