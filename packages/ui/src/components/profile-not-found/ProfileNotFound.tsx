import { Button } from '@rotra/ui/button'
import { Notice } from '@rotra/ui/notice'
export type ProfileNotFoundProps = { id: string; loginRequired?: boolean; onSignIn?: () => void }
export function ProfileNotFound({ id, loginRequired, onSignIn }: ProfileNotFoundProps) {
  if (loginRequired)
    return (
      <section className="flex flex-col gap-4">
        <h1>Log in with ROTRA</h1>
        <Notice>Log in with ROTRA to see this profile.</Notice>
        <Button className="self-start" variant="primary" onClick={onSignIn}>
          Sign in
        </Button>
      </section>
    )
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
