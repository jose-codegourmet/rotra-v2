import type { AccountVerification } from '@rotra/data/account-verification/types'
import { Button } from '@rotra/ui/button'
import { Card } from '@rotra/ui/card'
import { Chip } from '@rotra/ui/chip'
import { ErrorState } from '@rotra/ui/error-state'
import { PageHeader } from '@rotra/ui/page-header'
import { Skeleton } from '@rotra/ui/skeleton'
import { VerificationCard } from '@rotra/ui/verification-card'
import { VerificationStep } from '@rotra/ui/verification-step'

type VerificationPageState =
  | { kind: 'loading' }
  | { kind: 'error'; onRetry: () => void; retrying: boolean }
  | {
      kind: 'ready'
      verification: AccountVerification
      deadline: string
      onConnectGoogle?: () => void
      connectingGoogle: boolean
      onAddPhone: () => void
      onChangeEmail: (email: string) => void
    }

export type VerificationPageProps = {
  state: VerificationPageState
  onBack?: () => void
}

/** P-VERIFICATION, the owner's account status and three checks. */
export function VerificationPage({ state, onBack }: VerificationPageProps) {
  return (
    <main className="mx-auto flex max-w-[640px] flex-col gap-4 pt-5 pr-[max(16px,env(safe-area-inset-right,0px))] pb-[120px] pl-[max(16px,env(safe-area-inset-left,0px))]">
      <div className="flex flex-col gap-1.5">
        {onBack ? (
          <Button variant="ghost" size="sm" className="-ml-2.5 self-start" onClick={onBack}>
            ← My profile
          </Button>
        ) : null}
        <PageHeader
          title="Verification"
          description="Show that this ROTRA account is really yours. Only you and ROTRA Admin see these details."
        />
      </div>
      {state.kind === 'loading' ? (
        <Card aria-busy="true" aria-label="Loading your verification status">
          <Skeleton className="h-6 w-1/3" />
          <Skeleton className="mt-3 h-16" />
          <Skeleton className="mt-3 h-16" />
          <Skeleton className="mt-3 h-16" />
        </Card>
      ) : state.kind === 'error' ? (
        <ErrorState
          title="Couldn't load your verification status."
          retryLabel="Retry"
          onRetry={state.onRetry}
          retrying={state.retrying}
        >
          Check your connection, then try again.
        </ErrorState>
      ) : (
        <VerificationChecklist {...state} />
      )}
      <Card asChild>
        <section className="flex flex-col gap-3">
          <h2>Why verify?</h2>
          <p className="text-[13px] text-fg2">
            Verification ties your account to a Google account, a mobile number and an email you
            control, so no one else can take over your profile, games or rank. What changes for
            players who aren't verified is still being decided.
          </p>
        </section>
      </Card>
    </main>
  )
}

function VerificationChecklist({
  verification: { completedSteps, verifiedByAdmin, googleEmail, maskedPhone, email },
  deadline,
  onConnectGoogle,
  connectingGoogle,
  onAddPhone,
  onChangeEmail,
}: Extract<VerificationPageState, { kind: 'ready' }>) {
  const emailStatus =
    email.kind === 'match'
      ? `Both are ${email.rotraEmail}`
      : email.kind === 'mismatch'
        ? `Your ROTRA email is ${email.rotraEmail}, but your Google account is ${email.googleEmail}.`
        : 'Connect Google first.'
  return (
    <VerificationCard
      completedSteps={completedSteps}
      verifiedByAdmin={verifiedByAdmin}
      deadline={deadline}
    >
      <VerificationStep
        number={1}
        title="Connect your Google account"
        status={googleEmail ? `Connected · ${googleEmail}` : 'You sign in with it from now on.'}
        done={Boolean(googleEmail)}
        actions={
          !googleEmail && onConnectGoogle ? (
            <Button
              variant="primary"
              size="sm"
              onClick={onConnectGoogle}
              loading={connectingGoogle}
            >
              Connect Google
            </Button>
          ) : null
        }
      />
      <VerificationStep
        number={2}
        title="Add your mobile number"
        status={
          maskedPhone
            ? `On your account · ${maskedPhone}`
            : 'Clubs use it to find you. Hide it from clubs any time.'
        }
        done={Boolean(maskedPhone)}
        actions={
          maskedPhone ? null : (
            <Button size="sm" onClick={onAddPhone}>
              Add phone number
            </Button>
          )
        }
      />
      <VerificationStep
        number={3}
        title="Use your Google email as your ROTRA email"
        status={emailStatus}
        done={email.kind === 'match'}
        chip={
          email.kind === 'mismatch' && email.pendingEmailRequest ? (
            <Chip tone="warn">Change sent for Admin review</Chip>
          ) : null
        }
        actions={
          email.kind === 'mismatch' && !email.pendingEmailRequest ? (
            <>
              <Button size="sm" onClick={() => onChangeEmail(email.googleEmail)}>
                Change my ROTRA email to {email.googleEmail}
              </Button>
              {onConnectGoogle ? (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onConnectGoogle}
                  loading={connectingGoogle}
                >
                  Connect the Google account for {email.rotraEmail}
                </Button>
              ) : null}
            </>
          ) : null
        }
      />
    </VerificationCard>
  )
}
