import { EmptyState } from '@rotra/ui/empty-state'
import Link from 'next/link'

export default function SessionNotFound() {
  return (
    <main className="mx-auto max-w-[860px] px-4 pt-5">
      <EmptyState title="This session isn't available." action={<Link href="/">Back to home</Link>}>
        It may belong to another club or have been removed.
      </EmptyState>
    </main>
  )
}
