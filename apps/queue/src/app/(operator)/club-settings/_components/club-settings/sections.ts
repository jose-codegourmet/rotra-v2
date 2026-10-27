import type { ClubSettingsSection } from '@rotra/ui/club-settings-menu'

/** URL slug ↔ ClubSettingsMenu section */
const SLUGS: Record<ClubSettingsSection, string> = {
  identity: 'club-identity',
  defaults: 'session-defaults',
  post: 'facebook-post',
  license: 'license',
  device: 'this-device',
  account: 'account',
}

export function sectionFromSlug(slug: string): ClubSettingsSection {
  return (
    (Object.keys(SLUGS) as ClubSettingsSection[]).find((key) => SLUGS[key] === slug) ?? 'identity'
  )
}

export function slugFromSection(section: ClubSettingsSection): string {
  return SLUGS[section]
}
