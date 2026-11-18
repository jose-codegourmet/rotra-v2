import type { Metadata } from 'next'
import { LegalPage } from '@/app/_components/legal-page/LegalPage'
import { privacyPolicy } from '@/app/_components/legal-page/privacy-content'

export const metadata: Metadata = {
  title: 'Privacy Policy · ROTRA',
}

/** /privacy: the Privacy Policy at its own URL (the old `#privacy` hash route redirects here). */
export default function PrivacyPage() {
  return (
    <LegalPage
      view="privacy"
      doc={privacyPolicy}
      other={{ href: '/terms', label: 'Terms of Service' }}
    />
  )
}
