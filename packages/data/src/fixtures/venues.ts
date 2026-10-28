import type { ClubVenue } from '../club-venue/clubVenue.types'

/** The demo club's two saved venues; peso fees converted to integer centavos. */
export const venues = [
  {
    id: 'a1954098-9620-5b1d-a4f2-40b681de0c8d',
    clubId: '6cd364d4-0e3a-5c3d-9e75-2116cc845714',
    name: 'RK Sports Center',
    address: 'Lapu-Lapu City, Cebu',
    courtFeeMinor: 35000,
    entranceFeeMinor: null,
    currency: 'PHP',
  },
  {
    id: '5e700d13-2119-548f-9653-2c2cd419428b',
    clubId: '6cd364d4-0e3a-5c3d-9e75-2116cc845714',
    name: 'Mactan Poona Zone',
    address: 'Lapu-Lapu City, Cebu',
    courtFeeMinor: 45000,
    entranceFeeMinor: 5000,
    currency: 'PHP',
  },
] satisfies ClubVenue[]
