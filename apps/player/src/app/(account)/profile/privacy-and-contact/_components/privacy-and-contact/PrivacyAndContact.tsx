'use client'
import { useSignOut } from '@rotra/data/auth/use-sign-out'
import { useMyAccount } from '@rotra/data/player-account/useMyAccount'
import { useSetPhonePrivacy } from '@rotra/data/player-account/useSetPhonePrivacy'
import { Button } from '@rotra/ui/button'
import { ContactDetailsCard } from '@rotra/ui/contact-details-card'
import { ContactRequestStatus } from '@rotra/ui/contact-request-status'
import { PageHeader } from '@rotra/ui/page-header'
import { PhonePrivacyCard } from '@rotra/ui/phone-privacy-card'
import { SignOutCard } from '@rotra/ui/sign-out-card'
import { toast } from '@rotra/ui/toaster'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { useAppDispatch, useAppSelector } from '@/store/hooks'
import { selectAccount, setAccount } from '@/store/slices/authSlice'
import { useContactChangeSheet } from '../../../_components/contact-change-sheet/useContactChangeSheet'

export function PrivacyAndContact() {
  const account = useAppSelector(selectAccount)
  const playerId = account?.id ?? null
  const myAccount = useMyAccount(playerId)
  const setPrivacy = useSetPhonePrivacy()
  const signOut = useSignOut('player')
  const contactChange = useContactChangeSheet(playerId)
  const [privacyError, setPrivacyError] = useState<string>()
  const router = useRouter()
  const dispatch = useAppDispatch()
  const data = myAccount.data
  if (!account || !data) return null
  const request = contactChange.request.data
  return (
    <main className="mx-auto flex max-w-[640px] flex-col gap-5 px-4 pt-5 pb-[120px]">
      <div className="flex flex-col gap-1.5">
        <Button
          variant="ghost"
          size="sm"
          className="self-start"
          onClick={() => router.push(`/players/${account.id}`)}
        >
          ← My profile
        </Button>
        <PageHeader title="Privacy and contact" />
      </div>
      <PhonePrivacyCard
        savedHidden={data.phoneHidden}
        isPending={setPrivacy.isPending}
        error={privacyError}
        onToggle={(next) => {
          if (setPrivacy.isPending) return
          setPrivacyError(undefined)
          setPrivacy.mutate(
            { phoneHidden: next },
            {
              onSuccess: (saved) =>
                toast(
                  saved.phoneHidden
                    ? 'Your phone number is now hidden from clubs'
                    : 'Clubs can now see your phone number',
                ),
              onError: (error) => {
                setPrivacyError(error.message)
                toast.error(error.message)
              },
            },
          )
        }}
      />
      <ContactDetailsCard
        phone={data.phone}
        email={data.email}
        hasOpenRequest={contactChange.hasOpenRequest}
        statusSlot={request ? <ContactRequestStatus request={request} /> : null}
        onRequestChange={contactChange.openSheet}
      />
      <SignOutCard
        isPending={signOut.isPending}
        onSignOut={() =>
          signOut.mutate(undefined, {
            onSuccess: () => {
              dispatch(setAccount(null))
              router.push('/')
              toast('Signed out')
            },
            onError: (error) => toast.error(error.message),
          })
        }
      />
      {contactChange.sheet}
    </main>
  )
}
