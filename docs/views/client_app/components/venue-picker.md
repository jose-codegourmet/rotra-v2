# Component: VenuePicker

## Purpose

Typeahead search over confirmed places plus a "pin new location" flow for session venue selection. Used in `QuickSessionSheet` to replace separate location and address text fields.

**Client path:** `apps/client/src/components/ui/venue-picker/VenuePicker.tsx`

---

## Props

```tsx
export interface VenuePickerValue {
  name: string;
  address: string;
  latitude: number | null;
  longitude: number | null;
  /** Set when user picks from confirmed places DB */
  placeId?: string;
  /** Set when user pins a brand-new location not yet in DB */
  isNewSubmission?: boolean;
}

interface VenuePickerProps {
  value?: VenuePickerValue | null;
  onChange: (value: VenuePickerValue | null) => void;
  disabled?: boolean;
  className?: string;
}
```

---

## UX modes

### Mode A — Search existing (default)

1. User types in the search input (debounced 300ms).
2. `GET /api/places/search?q=` returns up to 6 confirmed places.
3. Dropdown shows name + truncated address for each result.
4. **Pin a new location** appears at the bottom of the dropdown.
5. Selecting a confirmed place sets `placeId`, `latitude`, `longitude`, and `isNewSubmission: false`.
6. A summary card shows the selected venue with a clear button.

### Mode B — Pin new location

1. Activated when the user clicks **Pin a new location**.
2. Renders `AddressPinField` (lazy-loaded with `ssr: false` inside `VenuePicker`).
3. When the user pins and names a location, `onChange` fires with `isNewSubmission: true` and `placeId` cleared.
4. Summary card shows **New venue: {name}** with a back arrow to return to Mode A.

---

## Fire-and-forget place submission

`VenuePicker` does not submit places itself. After a Quick Session is created, `useQuickSessionMutation` posts to `POST /api/places/submit` when `venue.isNewSubmission === true`. This runs in the background and does not block navigation or session creation.

---

## react-hook-form integration

```tsx
<Controller
  control={control}
  name="venue"
  render={({ field }) => (
    <VenuePicker
      value={field.value}
      onChange={field.onChange}
      disabled={createMutation.isPending}
    />
  )}
/>
```

Import `VenuePicker` directly — no `ssr: false` wrapper is needed at the parent level. `AddressPinField` is already lazy-loaded inside `VenuePicker`.

```tsx
import { VenuePicker } from "@/components/ui/venue-picker/VenuePicker";
```

---

## API dependencies

| Endpoint | Purpose |
|----------|---------|
| `GET /api/places/search` | Typeahead for confirmed places |
| `POST /api/places/submit` | Background submission of new pins (via mutation hook) |

---

## Storybook

Stories import fixtures from `@/constants/places-mocks`:

- `MOCK_VENUE_PICKER_CONFIRMED` — selected confirmed place
- `MOCK_VENUE_PICKER_NEW` — new pin submission

Stories cover: empty/default, confirmed selection, new pin set, disabled.
