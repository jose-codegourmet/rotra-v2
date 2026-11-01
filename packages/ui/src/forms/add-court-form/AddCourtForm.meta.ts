import type { ComponentMeta } from '@rotra/ui/meta'

export const addCourtFormMeta = {
  name: 'AddCourtForm',
  description:
    'The Add court sheet (Q-ADD-COURT), titled "Add LABEL?" live from the label field: Court label (defaults to the next "Court N"), Open until (with the session, or at a set time on the session\'s day), the planned-window preview, and the primary "Add LABEL".',
  usage: [
    'Open it from "Add a court…" (CourtsAndTimeSheet) or the + Add court tile. Pass defaultLabel = nextCourtLabel(courts.length), the actual start once live (scheduled start in preparation) and scheduledEndAt, and optionally now (Date.now() otherwise).',
    'onSubmit receives { label, startsAt, openUntil } with openUntil null for "Until the session ends", ready for useAddCourt. The container owns the mutation, the "LABEL added · open until HH:MM" toast and serverError; a failed add keeps what was typed.',
    "A set time is placed on the session's day and rolls to the next day when earlier than the start (overnight sessions), like the prototype's timeOnSession(). makeAddCourtSchema() rejects an empty time, a start outside the session, an end not after the planned start, and an end after the session end (extend the session first).",
    'Pass editing and defaultValues to edit a booking; lockedStartsAt fixes a used start while its advisory end stays editable.',
    'The preview uses planned start to close for booking length, counts down to a future start, and shows the submit error beside its field immediately for invalid windows. Past endings remain advisory.',
    'ROTRA does not stop a game at the closing time; the court card shows it as a reminder.',
  ],
  prototype: {
    file: 'apps/mockup/queue-app/rotra-queue.html',
    screen: 'SHEETS.addCourt (ACT.quickAddCourt, ACT.confirmAddCourt, timeOnSession())',
  },
  docs: [
    'docs/screens/product/modules/queue/session-console.md#q-add-court--add-a-court',
    'docs/business_logic/product/queue/modules/sessions/README.md#running',
    'docs/coding-conventions.md#6-forms',
  ],
  // Individual booking starts control dispatch; ends remain advisory.
  related: ['CourtsAndTimeSheet', 'ChoiceGroup', 'TimeField', 'Sheet', 'Field'],
} satisfies ComponentMeta
