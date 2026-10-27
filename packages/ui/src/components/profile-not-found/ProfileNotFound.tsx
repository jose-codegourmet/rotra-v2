import { Notice } from '@rotra/ui/notice'
export function ProfileNotFound({ id }: { id: string }) {
  return (
    <section className="flex flex-col gap-4">
      <h1>Profile not found</h1>
      <Notice tone="info">
        No ROTRA profile has the ID <span className="font-mono">{id}</span>. Check the ID and try
        again.
      </Notice>
    </section>
  )
}
