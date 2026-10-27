import { ClubSettings } from '../_components/club-settings/ClubSettings'
import { sectionFromSlug } from '../_components/club-settings/sections'

export default async function ClubSettingsPage(props: PageProps<'/club-settings/[section]'>) {
  const { section } = await props.params
  return <ClubSettings section={sectionFromSlug(section)} />
}
