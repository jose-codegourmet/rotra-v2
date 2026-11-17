import { LegalDocument } from '@rotra/ui/legal-document'
import type { Metadata } from 'next'
import { privacyPolicy } from './content'

export const metadata: Metadata = { title: 'Privacy Policy · ROTRA' }

/** P-PRIVACY: public, static; linked from the Google sign-in consent screen and P-LOGIN. */
export default function Page() {
  return <LegalDocument {...privacyPolicy} />
}
