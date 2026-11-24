'use client'
import { useSetMyGender } from '@rotra/data/player/useSetMyGender'
import { toast } from '@rotra/ui/toaster'

/**
 * Registration creates the account without a gender (the create calls take none), so Your details
 * saves the required Male / Female pick right after the account exists (mock and real mode).
 * Call the returned function from the create call's onSuccess.
 */
export function useSaveRegistrationGender() {
  const setGender = useSetMyGender()
  return (gender: 'male' | 'female' | '') => {
    if (gender === '') return
    setGender.mutate(gender, { onError: (error) => toast.error(error.message) })
  }
}
