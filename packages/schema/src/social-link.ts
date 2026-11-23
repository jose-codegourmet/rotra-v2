import { z } from 'zod'

/** The four supported profile link providers, with the prototype's hosts and example links. */
export const SOCIAL_PROVIDERS = [
  {
    key: 'facebook',
    label: 'Facebook',
    hosts: ['facebook.com', 'fb.com'],
    example: 'https://facebook.com/yourname',
  },
  {
    key: 'instagram',
    label: 'Instagram',
    hosts: ['instagram.com'],
    example: 'https://instagram.com/yourname',
  },
  {
    key: 'youtube',
    label: 'YouTube',
    hosts: ['youtube.com', 'youtu.be'],
    example: 'https://youtube.com/@yourchannel',
  },
  {
    key: 'linkedin',
    label: 'LinkedIn',
    hosts: ['linkedin.com'],
    example: 'https://linkedin.com/in/yourname',
  },
] as const

export type SocialProvider = (typeof SOCIAL_PROVIDERS)[number]['key']

function matchesProvider(value: string, hosts: readonly string[]) {
  try {
    const url = new URL(value)
    return (
      (url.protocol === 'http:' || url.protocol === 'https:') &&
      hosts.some((host) => url.hostname === host || url.hostname.endsWith(`.${host}`))
    )
  } catch {
    return false
  }
}

/**
 * Accepts an empty string or a full http(s) link whose host is the provider's domain or a subdomain
 * of it (m.facebook.com passes, facebook.com.evil.example does not); trims whitespace. A link is a
 * description, never a sign-in method. Public visibility is an open decision ('Profile editing').
 */
export function socialLinkField(provider: SocialProvider) {
  const { label, hosts, example } = SOCIAL_PROVIDERS.find((entry) => entry.key === provider) ?? {
    label: provider,
    hosts: [],
    example: '',
  }
  return z
    .string()
    .trim()
    .refine((value) => !value || matchesProvider(value, hosts), {
      message: `Enter a full ${label} link, like ${example}.`,
    })
}

/** The four optional profile links as one object shape, for forms and mock input validation. */
export const socialLinksShape = {
  facebook: socialLinkField('facebook'),
  instagram: socialLinkField('instagram'),
  youtube: socialLinkField('youtube'),
  linkedin: socialLinkField('linkedin'),
}

/**
 * #1019: a social link is an entry key for an unclaimed player, like an email. Two links that
 * normalize to the same key are one person while unclaimed. Normalizing: the scheme may be left
 * out; `www.`, `m.` and `mobile.` and the provider's other hosts (fb.com, youtu.be) become its
 * site; the query string, hash and trailing slash are dropped; lower case. A bare site with no
 * profile path is not a link. Registered players are never matched by a link.
 */
export type NormalizedSocialLink = {
  provider: SocialProvider
  /** e.g. `facebook.com/jun.bautista` */
  key: string
  /** The link as typed, trimmed, with `https://` added when the scheme was left out */
  url: string
}

export const SOCIAL_LINK_ERROR =
  'Enter a Facebook, Instagram, YouTube or LinkedIn profile link, or leave it empty.'

/** New player: the link typed already belongs to one of the club's saved players. */
export const socialLinkAlreadySaved = (name: string) =>
  `That social link is already ${name} in your saved players.`

export function normalizeSocialLink(typed: string | null | undefined): NormalizedSocialLink | null {
  const value = typed?.trim() ?? ''
  if (!value) return null
  const url = /^https?:\/\//i.test(value) ? value : `https://${value}`
  let parsed: URL
  try {
    parsed = new URL(url)
  } catch {
    return null
  }
  const host = parsed.hostname.toLowerCase().replace(/^(www\.|m\.|mobile\.)/, '')
  const entry = SOCIAL_PROVIDERS.find((p) => (p.hosts as readonly string[]).includes(host))
  const path = parsed.pathname.replace(/\/+$/, '').toLowerCase()
  if (!entry || !path) return null
  return { provider: entry.key, key: `${entry.hosts[0]}${path}`, url }
}

/** The entry keys of a set of profile links (empty and malformed links are skipped). */
export function socialLinkKeys(links: Partial<Record<SocialProvider, string>> | null | undefined) {
  return Object.values(links ?? {})
    .map((link) => normalizeSocialLink(link)?.key)
    .filter((key): key is string => !!key)
}
