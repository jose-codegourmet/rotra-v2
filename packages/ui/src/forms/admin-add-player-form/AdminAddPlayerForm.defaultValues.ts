import type { AdminPlayerCreateValues } from '@rotra/schema/admin-player'
export const adminAddPlayerDefaultValues: AdminPlayerCreateValues = {
  name: '',
  nickname: '',
  phone: '',
  email: '',
  place: 'CEB',
  clubId: '',
  allowDuplicate: false,
}
