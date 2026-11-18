import { ClubsView } from '@/app/_components/clubs-view/ClubsView'
import { FindPage } from '@/app/_components/find-page/FindPage'
import { HomeView } from '@/app/_components/home-view/HomeView'
import { LegalPage } from '@/app/_components/legal-page/LegalPage'
import { privacyPolicy } from '@/app/_components/legal-page/privacy-content'
import { termsOfService } from '@/app/_components/legal-page/terms-content'
import { LogoDefs } from '@/app/_components/logo-defs/LogoDefs'
import { RankingPage } from '@/app/_components/ranking-page/RankingPage'
import { RequestPage } from '@/app/_components/request-page/RequestPage'
import { SiteBoot } from '@/app/_components/site-boot/SiteBoot'
import { SiteFooter } from '@/app/_components/site-footer/SiteFooter'
import { SiteHeader } from '@/app/_components/site-header/SiteHeader'
import { SiteScripts } from '@/app/_components/site-scripts/SiteScripts'

/**
 * The whole site is this one page; hash routes (#home, #clubs, #ranking, #request, #find, #privacy, #terms) show one
 * <main class="view"> at a time. The markup is server-rendered once; SiteScripts brings it to life.
 */
export default function Page() {
  return (
    <>
      <LogoDefs />
      <SiteBoot />
      <SiteHeader />
      <HomeView />
      {/* ===================== LANDING: For clubs (club owners and Queue Masters) ===================== */}
      <ClubsView />
      {/* ===================== PAGE: How ranking works ===================== */}
      <RankingPage />
      {/* ===================== PAGE: Partner request ===================== */}
      <RequestPage />
      {/* ===================== PAGE: Find your profile ===================== */}
      <FindPage />
      {/* ===================== PAGES: Privacy Policy and Terms of Service ===================== */}
      <LegalPage
        view="privacy"
        doc={privacyPolicy}
        other={{ href: '#terms', label: 'Terms of Service' }}
      />
      <LegalPage
        view="terms"
        doc={termsOfService}
        other={{ href: '#privacy', label: 'Privacy Policy' }}
      />
      <SiteFooter />
      <SiteScripts />
    </>
  )
}
