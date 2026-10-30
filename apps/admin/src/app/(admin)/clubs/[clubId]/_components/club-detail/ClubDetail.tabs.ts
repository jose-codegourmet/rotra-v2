/** A-CLUB-DETAIL tab keys as the ?tab query carries them (rotra-admin.html viewClub TABS). */
export const CLUB_DETAIL_TABS = ['overview', 'license', 'pages', 'activity'] as const

export type ClubDetailTab = (typeof CLUB_DETAIL_TABS)[number]
