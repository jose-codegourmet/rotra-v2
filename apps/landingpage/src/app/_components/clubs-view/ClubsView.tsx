import { ClubsAssessors } from '@/app/_components/clubs-assessors/ClubsAssessors'
import { ClubsHero } from '@/app/_components/clubs-hero/ClubsHero'
import { ClubsPartner } from '@/app/_components/clubs-partner/ClubsPartner'
import { ClubsRequest } from '@/app/_components/clubs-request/ClubsRequest'
import { ClubsRunNight } from '@/app/_components/clubs-run-night/ClubsRunNight'

/** Clubs landing (#clubs). */
export function ClubsView() {
  return (
    <main className="view" data-view="clubs" hidden>
      {/* CLUBS 00 HERO */}
      <ClubsHero />
      {/* 02 THE ASSESSORS */}
      <ClubsAssessors />
      {/* CLUBS 02 WHAT PARTNERS DO AND GET */}
      <ClubsRunNight />
      {/* 05 PRICING */}
      <ClubsPartner />
      {/* 06 REQUEST */}
      <ClubsRequest />
    </main>
  )
}
