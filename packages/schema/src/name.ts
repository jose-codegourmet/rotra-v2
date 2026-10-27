import { z } from 'zod'

/** Accepts a required trimmed name; 60-character (prototype full-name limit) maximum is a placeholder pending a product rule. */
export const nameField = z.string().trim().min(1, 'Enter a name.').max(60)
