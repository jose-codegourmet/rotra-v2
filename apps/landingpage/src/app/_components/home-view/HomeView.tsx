import { HomeHero } from '@/app/_components/home-hero/HomeHero'
import { HomeLadder } from '@/app/_components/home-ladder/HomeLadder'
import { HomeRanking } from '@/app/_components/home-ranking/HomeRanking'
import { HomeReal } from '@/app/_components/home-real/HomeReal'
import { HomeRecord } from '@/app/_components/home-record/HomeRecord'

/** Player landing (#home). */
export function HomeView() {
  return (
    <main className="view" data-view="home">
      {/* 00 HERO: the court with a hole. Scroll and Tara drops through it into the story */}
      <HomeHero />
      {/* 01 THE PROBLEM */}
      <HomeReal />
      {/* 03 HOW A RANK MOVES */}
      <HomeRanking />
      {/* 04 THE LADDER */}
      <HomeLadder />
      {/* 04 ONE RECORD */}
      <HomeRecord />
    </main>
  )
}
