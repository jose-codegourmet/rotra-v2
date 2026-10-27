import type { ClubVenue } from '../club-venue/clubVenue.types'

/** Queue prototype's three saved venues; peso fees converted to integer centavos. */
export const venues = [
  {
    id: 'a1954098-9620-5b1d-a4f2-40b681de0c8d',
    clubId: '6cd364d4-0e3a-5c3d-9e75-2116cc845714',
    name: 'Banilad Sports Hub',
    address: 'Gov. M. Cuenco Ave, Banilad, Cebu City',
    courtFeeMinor: 35000,
    entranceFeeMinor: null,
    currency: 'PHP',
  },
  {
    id: '44485f6f-de48-5344-81d7-29b9b6a27a30',
    clubId: '6cd364d4-0e3a-5c3d-9e75-2116cc845714',
    name: 'Lahug Covered Court',
    address: 'Salinas Dr, Lahug, Cebu City',
    courtFeeMinor: 25000,
    entranceFeeMinor: null,
    currency: 'PHP',
  },
  {
    id: '5e700d13-2119-548f-9653-2c2cd419428b',
    clubId: '6cd364d4-0e3a-5c3d-9e75-2116cc845714',
    name: 'Talamban Shuttle Courts',
    address: 'Talamban, Cebu City',
    courtFeeMinor: 30000,
    entranceFeeMinor: 8000,
    currency: 'PHP',
  },
] satisfies ClubVenue[]
