'use client'

import { cn } from '@rotra/ui/cn'
import { Tabs as TabsPrimitive } from 'radix-ui'
import type { ComponentProps, ReactNode } from 'react'

export type TabBadge = {
  /** Always shown, e.g. "2/3" or "14" */
  text: string
  /** Appended on wide screens only, e.g. " courts in use" */
  longText?: string
  /** warn: needs attention ("1 request", "Countdown"); error: something failed ("Failed") */
  tone?: 'neutral' | 'warn' | 'error'
}

export type TabItem = {
  value: string
  label: string
  /** Replaces the label on phones (≤ 640 px), e.g. "Board" for "Leaderboard" */
  shortLabel?: string
  badges?: TabBadge[]
  disabled?: boolean
}

export type TabsProps = {
  items: TabItem[]
  value: string
  onChange: (value: string) => void
  /** Names the tab list, e.g. "Console views" */
  'aria-label': string
  /** The panels: one TabsContent per item */
  children?: ReactNode
  className?: string
}

const badgeClass = (tone: TabBadge['tone']) =>
  cn(
    'inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-semibold whitespace-nowrap',
    'max-[640px]:px-1.5 max-[640px]:py-0 max-[640px]:text-[10px]',
    tone === 'warn'
      ? 'border-warn/45 bg-warn-subtle text-warn'
      : tone === 'error'
        ? 'border-error/45 bg-error-subtle text-error'
        : 'border-border-strong text-fg2',
  )

/**
 * The prototypes' .tabs: an underlined tab row (Radix Tabs). On phones the tabs share the width
 * equally, stack label over count, and use short labels, so nothing scrolls sideways.
 */
export function Tabs({ items, value, onChange, children, className, ...aria }: TabsProps) {
  return (
    <TabsPrimitive.Root
      value={value}
      onValueChange={onChange}
      className={cn('flex flex-col gap-5', className)}
    >
      <TabsPrimitive.List
        aria-label={aria['aria-label']}
        className={cn(
          'flex gap-1 overflow-x-auto border-b border-border',
          'max-[640px]:grid max-[640px]:grid-cols-[repeat(auto-fit,minmax(64px,1fr))] max-[640px]:gap-0 max-[640px]:overflow-visible',
        )}
      >
        {items.map((item) => (
          <TabsPrimitive.Trigger
            key={item.value}
            value={item.value}
            disabled={item.disabled}
            className={cn(
              'inline-flex items-center gap-1.5 border-0 border-b-2 border-transparent bg-transparent px-3.5 py-2.5 font-bold whitespace-nowrap text-fg2',
              'hover:text-fg data-[state=active]:border-accent data-[state=active]:text-fg',
              'disabled:cursor-not-allowed disabled:opacity-45 touch:min-h-12',
              'max-[640px]:flex-col max-[640px]:justify-center max-[640px]:gap-[3px] max-[640px]:px-1 max-[640px]:py-[9px]',
              'max-[640px]:text-center max-[640px]:text-[13px] max-[640px]:leading-tight max-[640px]:whitespace-normal',
            )}
          >
            {item.shortLabel ? (
              <>
                <span className="max-[640px]:hidden">{item.label}</span>
                <span className="hidden max-[640px]:inline">{item.shortLabel}</span>
              </>
            ) : (
              item.label
            )}
            {item.badges?.map((badge) => (
              <span key={badge.text + (badge.longText ?? '')} className={badgeClass(badge.tone)}>
                {badge.text}
                {badge.longText ? (
                  <span className="max-[640px]:hidden">{badge.longText}</span>
                ) : null}
              </span>
            ))}
          </TabsPrimitive.Trigger>
        ))}
      </TabsPrimitive.List>
      {children}
    </TabsPrimitive.Root>
  )
}

export type TabsContentProps = ComponentProps<typeof TabsPrimitive.Content>

/** One tab's panel; value must match a TabItem. */
export function TabsContent({ className, ...props }: TabsContentProps) {
  return (
    <TabsPrimitive.Content
      className={cn('min-w-0 focus-visible:outline-offset-4', className)}
      {...props}
    />
  )
}
