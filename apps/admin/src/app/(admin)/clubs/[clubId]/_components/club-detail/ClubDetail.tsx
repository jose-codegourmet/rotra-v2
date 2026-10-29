'use client'

import { useAuditEvents } from '@rotra/data/admin-audit/useAuditEvents'
import { useAdminClub } from '@rotra/data/club/useAdminClub'
import type { RetentionState } from '@rotra/data/license/types'
import { useLicenseTerms } from '@rotra/data/license/useLicenseTerms'
import { ActiveSessionCard } from '@rotra/ui/active-session-card'
import { ActivityLog } from '@rotra/ui/activity-log'
import { Breadcrumb } from '@rotra/ui/breadcrumb'
import { Card } from '@rotra/ui/card'
import { Chip } from '@rotra/ui/chip'
import { ClubAccountCard } from '@rotra/ui/club-account-card'
import { ClubIdentityCard } from '@rotra/ui/club-identity-card'
import { ClubLogo } from '@rotra/ui/club-logo'
import { ClubPriceCard } from '@rotra/ui/club-price-card'
import { DataTable } from '@rotra/ui/data-table'
import { DetailHero } from '@rotra/ui/detail-hero'
import { EmptyState } from '@rotra/ui/empty-state'
import { LicenseAccessChip } from '@rotra/ui/license-access-chip'
import { LicenseStatusCard } from '@rotra/ui/license-status-card'
import { NameChangeRequestCard } from '@rotra/ui/name-change-request-card'
import { RetentionCard } from '@rotra/ui/retention-card'
import { type TabBadge, Tabs, TabsContent } from '@rotra/ui/tabs'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useEffect, useId, useMemo, useRef, useState } from 'react'
import { type ClubNameDecision, ClubNameSheets } from '../club-name-sheets/ClubNameSheets'
import { ClubPriceSheet } from '../club-price-sheet/ClubPriceSheet'
import { LicenseSheet } from '../license-sheet/LicenseSheet'
import { CLUB_DETAIL_TABS, type ClubDetailTab } from './ClubDetail.tabs'
import { licensePaymentColumns } from './LicensePayments.columns'

/** The Public pages badge: a countdown or due deletion warns, a failed deletion is an error. */
function pagesBadge(retention: RetentionState): TabBadge | null {
  if (retention.k === 'failed') return { text: 'Failed', tone: 'error' }
  if (retention.k === 'stale' || retention.k === 'due') return { text: 'Countdown', tone: 'warn' }
  return null
}

/**
 * A-CLUB-DETAIL: club hero and the Overview, License, Public pages and Activity tabs. The tab lives
 * in ?tab (Overview when absent); `from` is the directory's query, so Back restores its search and
 * filter.
 */
export function ClubDetail({
  clubId,
  tab: initialTab,
  from,
}: {
  clubId: string
  tab: ClubDetailTab
  from: string
}) {
  const router = useRouter()
  const pathname = usePathname()
  const [tab, setTab] = useState(initialTab)
  const [sheet, setSheet] = useState<'license' | 'price' | null>(null)
  const [nameDecision, setNameDecision] = useState<ClubNameDecision | null>(null)
  const club = useAdminClub(clubId).data
  const terms = useLicenseTerms(clubId).data
  const audit = useAuditEvents({ targetType: 'club', targetId: clubId }).data
  const paymentsHeadingId = useId()
  const activityHeadingId = useId()

  const changeTab = (value: string) => {
    const next = CLUB_DETAIL_TABS.find((key) => key === value) ?? 'overview'
    setTab(next)
    const params = new URLSearchParams()
    if (next !== 'overview') params.set('tab', next)
    if (from) params.set('from', from)
    const query = params.toString()
    router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false })
  }

  // /clubs/{id}?tab=overview#name-request (Club names › Review): the card renders only once the club
  // has loaded, after the browser's own hash scroll, so scroll to it then. Once per visit.
  const scrolledToHash = useRef(false)
  const hasNameRequest = club?.pendingNameRequest != null
  useEffect(() => {
    if (scrolledToHash.current || !hasNameRequest || tab !== 'overview') return
    if (window.location.hash !== '#name-request') return
    scrolledToHash.current = true
    document.getElementById('name-request')?.scrollIntoView({ block: 'start' })
  }, [hasNameRequest, tab])

  const activityEntries = useMemo(
    () =>
      (audit ?? []).map((event) => ({
        id: event.id,
        text: event.summary,
        at: event.at,
        actor: event.actorEmail,
      })),
    [audit],
  )

  const back = (
    <Breadcrumb label="Clubs and licenses" href={from ? `/clubs?${from}` : '/clubs'} linkAs={Link} />
  )
  // Loading, not found and error states are A02.14.
  if (!club) return back

  const pages = pagesBadge(club.retention)
  const request = club.pendingNameRequest

  return (
    <>
      {back}
      <DetailHero
        media={
          <ClubLogo
            size="lg"
            initials={club.initials}
            logoUrl={club.logoUrl}
            tone={club.accent ? 'accent' : 'default'}
          />
        }
        title={club.name}
        meta={
          <>
            <LicenseAccessChip access={club.access} />
            {club.access.state !== 'none' ? <Chip>{club.access.plan}</Chip> : null}
            {club.runningSession ? (
              <span className="inline-flex items-center gap-1.5 text-[13px]">
                <i
                  aria-hidden
                  className="size-2 flex-none rounded-full bg-accent animate-[pulse_1.6s_infinite] motion-reduce:animate-none"
                />
                Session running
              </span>
            ) : null}
          </>
        }
      />
      <Tabs
        aria-label="Club sections"
        value={tab}
        onChange={changeTab}
        items={[
          {
            value: 'overview',
            label: 'Overview',
            badges: request ? [{ text: '1 request', tone: 'warn' }] : undefined,
          },
          { value: 'license', label: 'License' },
          { value: 'pages', label: 'Public pages', badges: pages ? [pages] : undefined },
          {
            value: 'activity',
            label: 'Activity',
            badges: audit ? [{ text: String(audit.length) }] : undefined,
          },
        ]}
      >
        <TabsContent value="overview" className="flex flex-col gap-5">
          {request ? (
            <NameChangeRequestCard
              currentName={club.name}
              requestedName={request.requestedName}
              requestedAt={request.requestedAt}
              onApprove={() => setNameDecision('approve')}
              onReject={() => setNameDecision('reject')}
            />
          ) : null}
          <div className="grid items-start gap-4 [grid-template-columns:repeat(auto-fit,minmax(min(100%,320px),1fr))]">
            <ClubAccountCard username={club.account.username} setUpOn={club.account.setUpOn} />
            <ClubIdentityCard
              foundingAddress={club.foundingAddress}
              cityCode={club.cityCode}
              earlierNames={club.earlierNames}
            />
            <ActiveSessionCard
              session={club.runningSession ?? undefined}
              exceptionNote={club.expiryExceptionNote ?? undefined}
            />
          </div>
        </TabsContent>
        <TabsContent value="license" className="flex flex-col gap-5">
          {/* The details step starts from the recorded terms, so the button waits for them. */}
          <LicenseStatusCard
            access={club.access}
            hasTerms={club.hasTerms}
            onOpenLicense={terms ? () => setSheet('license') : undefined}
          />
          <ClubPriceCard
            pricing={club.licensePricing}
            monthlyMinor={club.licenseMonthlyMinor}
            yearlyMinor={club.licenseYearlyMinor}
            yearlySavingPercent={club.yearlySavingPercent}
            onChangePrice={() => setSheet('price')}
          />
          <Card asChild>
            <section aria-labelledby={paymentsHeadingId} className="flex flex-col gap-3">
              <div className="flex min-w-0 flex-col gap-0.5">
                <h2 id={paymentsHeadingId}>Payment history</h2>
                <p className="m-0 text-[13px] text-fg2">
                  Recorded each time you activate or renew. The club sees the same list in Club
                  settings.
                </p>
              </div>
              {terms && terms.length === 0 ? (
                <EmptyState title="No payments recorded.">
                  Activate the license after the club pays to add the first one.
                </EmptyState>
              ) : (
                <>
                  <DataTable
                    aria-label="Payment history"
                    columns={licensePaymentColumns}
                    data={terms ?? []}
                    getRowId={(term) => term.id}
                  />
                  <p className="m-0 text-[13px] text-fg2">What the club actually paid each time.</p>
                </>
              )}
            </section>
          </Card>
        </TabsContent>
        <TabsContent value="pages" className="flex flex-col gap-5">
          <RetentionCard retention={club.retention} />
        </TabsContent>
        <TabsContent value="activity" className="flex flex-col gap-5">
          <Card asChild>
            <section aria-labelledby={activityHeadingId} className="flex flex-col gap-3">
              <h2 id={activityHeadingId}>Record of actions</h2>
              <ActivityLog
                entries={activityEntries}
                emptyText="No Admin actions recorded for this club yet."
              />
            </section>
          </Card>
        </TabsContent>
      </Tabs>
      {terms ? (
        <LicenseSheet
          club={club}
          terms={terms}
          open={sheet === 'license'}
          onOpenChange={(open) => setSheet(open ? 'license' : null)}
        />
      ) : null}
      <ClubPriceSheet
        club={club}
        open={sheet === 'price'}
        onOpenChange={(open) => setSheet(open ? 'price' : null)}
      />
      <ClubNameSheets club={club} decision={nameDecision} onClose={() => setNameDecision(null)} />
    </>
  )
}
