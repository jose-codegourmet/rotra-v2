'use client'
import { useSignIn } from '@rotra/data/auth/use-sign-in'
import { GOOGLE_SIGN_IN_DEADLINE } from '@rotra/data/google-sign-in/config'
import type { GoogleIdentity, InviteLink } from '@rotra/data/google-sign-in/types'
import { useGoogleDeadline } from '@rotra/data/google-sign-in/useGoogleDeadline'
import { useGoogleSignIn } from '@rotra/data/google-sign-in/useGoogleSignIn'
import { useInviteLanding } from '@rotra/data/google-sign-in/useInviteLanding'
import { consumeSessionReturn, rememberSessionReturn } from '@rotra/data/public-session/context'
import { isRealDataMode } from '@rotra/data/real/mode'
import { SignInForm, type SignInGoogle } from '@rotra/ui/sign-in-form'
import { toast } from '@rotra/ui/toaster'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { useGooglePicker } from '@/app/_components/google-sign-in/useGooglePicker'
import { usePlayerGoogleSignInEnabled } from '@/providers/PlayerFlagsProvider'
import { useAppDispatch, useAppSelector } from '@/store/hooks'
import { setAccount } from '@/store/slices/authSlice'
import { selectDev } from '@/store/slices/devSlice'
import { selectLoginEmail, setLoginEmail, setPendingLink } from '@/store/slices/googleSlice'
import { inviteLinkFromReturnTo } from './inviteContext'
import { returnDestination } from './returnDestination'

type SignInProps = { returnTo?: string; passwordSaved?: boolean }

/** After any sign-in: the Queue public session the player came from, else a safe same-app path, else Home (P-HOME). */
function useFinishSignIn(returnTo: string | undefined) {
  const router = useRouter()
  return (_playerId: string) => {
    const queueUrl = consumeSessionReturn(returnTo)
    if (queueUrl) window.location.assign(queueUrl)
    else router.replace(returnDestination(returnTo, '/home'))
  }
}

/**
 * P-LOGIN. With the `player_google_sign_in` flag off this is the email + password sign-in exactly as
 * before; with it on, Continue with Google, the invite context and the deadline copy come with it.
 */
export function SignIn(props: SignInProps) {
  return usePlayerGoogleSignInEnabled() ? (
    <GoogleSignIn {...props} />
  ) : (
    <PasswordSignIn {...props} />
  )
}

function PasswordSignIn({
  returnTo,
  passwordSaved = false,
  google,
  defaultEmail,
}: SignInProps & { google?: SignInGoogle; defaultEmail?: string }) {
  const mutation = useSignIn('player'),
    router = useRouter(),
    dispatch = useAppDispatch()
  const finish = useFinishSignIn(returnTo)
  const { offline } = useAppSelector(selectDev)
  useEffect(() => {
    rememberSessionReturn(returnTo)
  }, [returnTo])
  return (
    <SignInForm
      isPending={mutation.isPending}
      serverError={mutation.error?.message}
      offline={offline}
      prototypeHints={!isRealDataMode()}
      legalLinks={{ termsHref: '/terms', privacyHref: '/privacy' }}
      successNote={passwordSaved ? 'Password saved. Sign in with your new password.' : undefined}
      google={google}
      defaultValues={defaultEmail ? { email: defaultEmail } : undefined}
      onForgotPassword={() => router.push('/forgot-password')}
      onSubmit={(values) =>
        mutation.mutate(
          { identifier: values.email, password: values.password },
          {
            onSuccess: (session) => {
              dispatch(setAccount(session.account))
              finish(session.account.id)
              toast('Signed in')
            },
            onError: (error) => toast.error(error.message),
          },
        )
      }
    />
  )
}

/** Flag on: names the club or session an invite page sent the player from, then renders the sign-in. */
function GoogleSignIn(props: SignInProps) {
  const link = inviteLinkFromReturnTo(props.returnTo)
  return link ? <InviteGoogleSignIn {...props} link={link} /> : <GoogleSignInBody {...props} />
}

function InviteGoogleSignIn({ link, ...props }: SignInProps & { link: InviteLink }) {
  const card = useInviteLanding(link, null).data?.card
  const contextMessage =
    card?.kind === 'club'
      ? `Sign in to join ${card.club.name}.`
      : card?.kind === 'session'
        ? `Sign in to request a spot in ${card.session.title}.`
        : undefined
  return <GoogleSignInBody {...props} contextMessage={contextMessage} />
}

function GoogleSignInBody({
  returnTo,
  passwordSaved,
  contextMessage,
}: SignInProps & { contextMessage?: string }) {
  const router = useRouter(),
    dispatch = useAppDispatch(),
    store = useAppSelector(selectLoginEmail)
  const deadline = useGoogleDeadline().data
  const googleSignIn = useGoogleSignIn()
  const finish = useFinishSignIn(returnTo)
  // "Use my password instead" from P-GOOGLE-LINK: the email arrives through the store, never the URL.
  const [defaultEmail] = useState(store ?? undefined)
  useEffect(() => {
    dispatch(setLoginEmail(null))
  }, [dispatch])
  const result = googleSignIn.data
  const continueWith = (identity: GoogleIdentity) =>
    googleSignIn.mutate(
      { google: identity, context: 'login' },
      {
        onSuccess: (outcome) => {
          if (outcome.outcome === 'signed-in') {
            dispatch(setAccount(outcome.session.account))
            finish(outcome.session.account.id)
            toast('Signed in with Google')
          } else if (outcome.outcome === 'ask-to-connect') {
            dispatch(
              setPendingLink({
                google: outcome.google,
                playerId: outcome.playerId,
                playerName: outcome.playerName,
                returnTo,
              }),
            )
            router.push('/connect-google')
          }
        },
        onError: (error) => toast.error(error.message),
      },
    )
  // Real mode comes back here from Google; the same handler then reads what the server decided.
  const picker = useGooglePicker({ key: 'login', intent: 'login' }, continueWith)
  const google: SignInGoogle = {
    pending: googleSignIn.isPending,
    // The label is fixed configuration, so the first render has it (no hydration mismatch).
    deadlineLabel: deadline?.label ?? GOOGLE_SIGN_IN_DEADLINE.label,
    contextMessage,
    notConnectedEmail: result?.outcome === 'not-connected' ? result.triedEmail : undefined,
    onContinue: () => picker.start(continueWith),
  }
  return (
    <>
      <PasswordSignIn
        returnTo={returnTo}
        passwordSaved={passwordSaved}
        google={google}
        defaultEmail={defaultEmail}
      />
      {picker.sheet}
    </>
  )
}
