import { PrismaClient, type Prisma } from '@prisma/client'

const prisma = new PrismaClient()

/** Matches docs/database/05_reviews_and_ratings.md — Seed Data (Phase 1). */
const skillDimensions: Array<{
  name: string
  label: string
  subSkills: Prisma.InputJsonValue
}> = [
  {
    name: 'attack',
    label: 'Attack',
    subSkills: [
      'Smash',
      'Half Smash',
      'Jump Smash',
      'Cross Smash',
      'Drive',
      'Cross Drive',
      'Backhand Smash',
    ],
  },
  {
    name: 'defense',
    label: 'Defense',
    subSkills: ['Clear', 'Backhand', 'Backhand Clear'],
  },
  {
    name: 'net_touch',
    label: 'Net & Touch',
    subSkills: ['Net Play', 'Setting', 'Push', 'Drop', 'Backhand Drop'],
  },
  {
    name: 'precision',
    label: 'Precision & Control',
    subSkills: ['Slice', 'Backhand Slice', 'Cross Drop', 'Placing', 'Deception'],
  },
  {
    name: 'athleticism',
    label: 'Athleticism',
    subSkills: ['Footwork', 'Anticipation'],
  },
  {
    name: 'game_iq',
    label: 'Game Intelligence',
    subSkills: ['Critical Thinking', 'Teamwork', 'Deception', 'Placing'],
  },
]

/** Matches docs/database/06_gamification.md — Seed Data. */
const rankingTiers: Array<{
  tierName: string
  label: string
  minExp: number
  badgeLabel: string
  sortOrder: number
}> = [
  { tierName: 'shuttle_bird', label: 'Shuttle Bird', minExp: 0, badgeLabel: 'Default', sortOrder: 1 },
  { tierName: 'rally_rookie', label: 'Rally Rookie', minExp: 100, badgeLabel: 'Bronze', sortOrder: 2 },
  { tierName: 'net_fighter', label: 'Net Fighter', minExp: 300, badgeLabel: 'Silver', sortOrder: 3 },
  { tierName: 'court_ace', label: 'Court Ace', minExp: 600, badgeLabel: 'Gold', sortOrder: 4 },
  { tierName: 'smash_legend', label: 'Smash Legend', minExp: 1000, badgeLabel: 'Platinum', sortOrder: 5 },
  { tierName: 'elite_master', label: 'Elite Master', minExp: 2000, badgeLabel: 'Diamond', sortOrder: 6 },
]

async function main() {
  for (const row of skillDimensions) {
    await prisma.skillDimension.upsert({
      where: { name: row.name },
      create: {
        name: row.name,
        label: row.label,
        subSkills: row.subSkills,
      },
      update: {
        label: row.label,
        subSkills: row.subSkills,
      },
    })
  }

  for (const row of rankingTiers) {
    await prisma.rankingTierConfig.upsert({
      where: { tierName: row.tierName },
      create: {
        tierName: row.tierName,
        label: row.label,
        minExp: row.minExp,
        badgeLabel: row.badgeLabel,
        sortOrder: row.sortOrder,
      },
      update: {
        label: row.label,
        minExp: row.minExp,
        badgeLabel: row.badgeLabel,
        sortOrder: row.sortOrder,
      },
    })
  }
}

main()
  .then(async () => {
    await prisma.$disconnect()
  })
  .catch(async (e) => {
    console.error(e)
    await prisma.$disconnect()
    process.exit(1)
  })
