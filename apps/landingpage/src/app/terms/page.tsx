import type { Metadata } from 'next'
import { LegalPage } from '@/app/_components/legal-page/LegalPage'
import { termsOfService } from '@/app/_components/legal-page/terms-content'

export const metadata: Metadata = {
  title: 'Terms of Service · ROTRA',
}

/** /terms: the Terms of Service at its own URL (the old `#terms` hash route redirects here). */
export default function TermsPage() {
  return (
    <LegalPage
      view="terms"
      doc={termsOfService}
      other={{ href: '/privacy', label: 'Privacy Policy' }}
    />
  )
}
