import { PrivacyAndContact } from './_components/privacy-and-contact/PrivacyAndContact'
export default async function Page(props: PageProps<'/profile/privacy-and-contact'>) {
  // `?highlight=weekly`: opened from the weekly chart's visibility chip (2026-11-13-player-stats-visibility).
  const { highlight } = await props.searchParams
  return (
    <PrivacyAndContact
      highlight={highlight === 'weekly' || highlight === 'stats' ? highlight : null}
    />
  )
}
