import type { AddClubFormInput } from './AddClubForm.schema'

export const addClubDefaultValues: AddClubFormInput = {
  name: '',
  foundingAddress: '',
  cityCode: '',
  username: '',
  password: '',
  price: { pricing: 'paid', monthly: '', yearly: '' },
}
