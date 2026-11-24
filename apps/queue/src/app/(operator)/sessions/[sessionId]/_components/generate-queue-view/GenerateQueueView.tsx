'use client'

import { AutoQueue } from '@/app/(operator)/sessions/[sessionId]/_components/auto-queue/AutoQueue'
import type { ConsoleViewProps } from '@/app/(operator)/sessions/[sessionId]/_components/session-console/SessionConsole'

/**
 * Q-AUTO, the console's Generate Queue tab: the draft workspace on its own tab (no Main Queue |
 * Generate matches switch). Adding reviewed drafts returns the console to the Main Queue tab.
 */
export function GenerateQueueView({ sessionId, onOpenQueue }: ConsoleViewProps) {
  return <AutoQueue sessionId={sessionId} onAddedToMainQueue={onOpenQueue} />
}
