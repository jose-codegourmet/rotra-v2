/** The signed-in player's private contacts. Only ever returned to that player. */
export type MyAccount = {
  playerId: string
  /** E.164 */
  phone: string
  email: string
  phoneHidden: boolean
}
