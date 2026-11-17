import { LegalDocument } from '@rotra/ui/legal-document'
import type { Metadata } from 'next'
import { termsOfService } from './content'

export const metadata: Metadata = { title: 'Terms of Service · ROTRA' }

/** P-TERMS: public, static; linked from the Google sign-in consent screen and P-LOGIN. */
export default function Page() {
  return <LegalDocument {...termsOfService} />
}
