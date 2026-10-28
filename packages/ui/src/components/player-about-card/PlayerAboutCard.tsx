import type { PlayerProfile } from '@rotra/data/player/types'
import { Card } from '@rotra/ui/card'
import { Icon } from '@rotra/ui/icon'
export type PlayerAboutCardProps = { profile: PlayerProfile; isOwn?: boolean }
const PROVIDERS = { facebook: 'Facebook', instagram: 'Instagram', youtube: 'YouTube', linkedin: 'LinkedIn' }
export function PlayerAboutCard({ profile, isOwn = false }: PlayerAboutCardProps) {
  const years = profile.experienceYears ?? 0, months = profile.experienceMonths ?? 0
  const experience = [years ? `${years} ${years === 1 ? 'year' : 'years'}` : '', months ? `${months} ${months === 1 ? 'month' : 'months'}` : ''].filter(Boolean).join(', ')
  const links = Object.entries(profile.socialLinks).filter(([, url]) => Boolean(url))
  return <Card asChild><section className="flex flex-col gap-3">
    <h2>About</h2>
    <div className="flex flex-col gap-2"><span className="text-xs font-semibold tracking-[0.6px] text-fg2 uppercase">Playing style</span>
      <p className={profile.playingStyle ? undefined : 'text-fg2'}>{profile.playingStyle || `${isOwn ? "You haven't" : "This player hasn't"} added a playing style yet.`}</p>
    </div>
    <div className="flex flex-col gap-2"><span className="text-xs font-semibold tracking-[0.6px] text-fg2 uppercase">Experience</span>
      <p className={experience ? undefined : 'text-fg2'}>{experience ? `${experience} playing` : 'Not added'}</p>
      {experience ? <p className="text-xs text-fg2">Self-reported. Clubs may use it for a first assessment; it doesn't add rank points.</p> : null}
    </div>
    {links.length ? <div className="flex flex-col gap-2"><span className="text-xs font-semibold tracking-[0.6px] text-fg2 uppercase">Links</span>
      {links.map(([provider, url]) => <a key={provider} href={url} target="_blank" rel="noopener noreferrer" className="flex min-w-0 items-center gap-2.5 rounded-md border border-border px-2.5 py-2 text-fg no-underline hover:border-accent">
        <Icon name="external" className="shrink-0" /><span className="min-w-0 [overflow-wrap:anywhere]">{url.replace(/^https?:\/\/(www\.)?/, '')}</span><small className="ml-auto shrink-0 text-fg2">{PROVIDERS[provider as keyof typeof PROVIDERS]}</small>
      </a>)}
    </div> : null}
  </section></Card>
}
