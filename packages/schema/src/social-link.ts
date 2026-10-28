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
