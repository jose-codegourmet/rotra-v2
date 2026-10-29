/** A city a club can be founded in; its code goes into the RTR IDs of players the club creates. */
export type FoundingCity = { code: string; name: string }

/** rotra-admin.html CITY_LIST: the founding cities offered when adding a club (A-ADD-CLUB). */
export const foundingCities: FoundingCity[] = [
  { code: 'PH-CEB', name: 'Cebu City' },
  { code: 'PH-MNL', name: 'Manila' },
  { code: 'PH-DVO', name: 'Davao City' },
  { code: 'PH-ILO', name: 'Iloilo City' },
  { code: 'PH-BCD', name: 'Bacolod City' },
  { code: 'PH-TAG', name: 'Tagbilaran City' },
]
