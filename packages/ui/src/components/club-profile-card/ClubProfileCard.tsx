'use client'

import { Button } from '@rotra/ui/button'
import { ClubLogo } from '@rotra/ui/club-logo'
import { Icon } from '@rotra/ui/icon'
import { type KeyValueItem, KeyValueList } from '@rotra/ui/key-value-list'
import { ProfileBannerCard, ProfileCardSection } from '@rotra/ui/profile-banner-card'
import { Sheet } from '@rotra/ui/sheet'
import type { ReactNode } from 'react'

/** The footer's named action: Open club page (Queue new tab, Player same tab) or Open club (Admin). */
export type ClubProfileCardAction = {
  label: string
  /** A link; with newTab it opens in a new tab and shows the new-tab icon */
  href?: string
  newTab?: boolean
  /** In-app navigation (Player, Admin); used when there is no href */
  onClick?: () => void
}

export type ClubProfileCardProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** The club's name: the bold line and the dialog's accessible name */
  name: string
  /** The muted line under the name: the address (Queue), city (Player) or username (Admin) */
  subline?: ReactNode
  /** The club's stored initials ("LS") when it has no logo */
  initials: string
  logoUrl?: string | null
  /** The banner strip: clubs pick none yet, so the default banner Admin sets */
  bannerKey?: string | null
  bannerImageUrl?: string | null
  /** The chip row: ROTRA club, N members, Your club, Happening now / Running now, access chips */
  chips?: ReactNode
  /** The club's description, muted under the chips */
  description?: string | null
  /** About rows (Members, Sessions in YEAR, Next up; Based in; Admin's Founded in, Address, Set up, Plan, Until, Price) */
  about: KeyValueItem[]
  /** Admin: the rows sit in a plain list without the About box */
  plainAbout?: boolean
  /** Anything after About (Admin: the Running now section) */
  children?: ReactNode
  action?: ClubProfileCardAction | null
  /** Admin: the right-hand side panel instead of a centred dialog */
  side?: boolean
}

/**
 * D-CLUB-PROFILE: the club variant of the profile card (2026-11-13-club-profile-card). No title bar,
 * the top half of the default banner, the round club logo centred on its bottom edge, the bold name
 * with a muted line, chips, About; footer Close and the open action. Queue: the session page's
 * organizer line; Player: the profile's Clubs card; Admin: Clubs and licenses rows (side panel).
 */
export function ClubProfileCard({
  open,
  onOpenChange,
  name,
  subline,
  initials,
  logoUrl,
  bannerKey,
  bannerImageUrl,
  chips,
  description,
  about,
  plainAbout = false,
  children,
  action,
  side = false,
}: ClubProfileCardProps) {
  const size = side ? 72 : 64
  const actionButton = action ? (
    action.href ? (
      <Button asChild variant="primary">
        <a
          href={action.href}
          {...(action.newTab
            ? {
                target: '_blank',
                rel: 'noopener noreferrer',
                'aria-label': `${action.label} in a new tab`,
              }
            : {})}
        >
          {action.label}
          {action.newTab ? <Icon name="external" size={16} /> : null}
        </a>
      </Button>
    ) : (
      <Button variant="primary" onClick={action.onClick}>
        {action.label}
      </Button>
    )
  ) : null
  return (
    <Sheet
      open={open}
      onOpenChange={onOpenChange}
      title={name}
      headerless
      side={side}
      footer={
        <>
          <Button onClick={() => onOpenChange(false)}>Close</Button>
          {actionButton}
        </>
      }
    >
      <ProfileBannerCard
        name={name}
        subline={subline}
        pictureSize={size}
        bannerKey={bannerKey}
        bannerImageUrl={bannerImageUrl}
        picture={
          <ClubLogo
            initials={initials}
            logoUrl={logoUrl}
            size="lg"
            className={
              side
                ? 'size-[72px] rounded-full text-[22px] shadow-[0_0_0_5px_var(--surface)]'
                : 'size-16 rounded-full text-xl shadow-[0_0_0_5px_var(--surface)]'
            }
          />
        }
        chips={chips}
      >
        {description ? <p className="m-0 text-fg2">{description}</p> : null}
        {plainAbout ? (
          <KeyValueList items={about} />
        ) : (
          <ProfileCardSection label="About">
            <KeyValueList items={about} />
          </ProfileCardSection>
        )}
        {children}
      </ProfileBannerCard>
    </Sheet>
  )
}
