# Component: AddressPinField

## Purpose

A compact map picker with geocoding search that lets users set a physical venue location by typing an address or placing/dragging a pin on a mini map.

**Client path (Phase 4a):** `apps/client/src/components/ui/address-pin-field/AddressPinField.tsx`

**Map style:** Uses the client app's dark branded Mapbox style (`rotra-dark-style.json`), not the admin light style.

> **Note:** The admin app implementation ships in Phase 2. The client copy will be built independently in Phase 4a with the same props contract but client-specific styling.

---

## Props

```tsx
export interface AddressPinValue {
  name: string;
  address: string;
  latitude: number;
  longitude: number;
}

interface AddressPinFieldProps {
  value?: AddressPinValue | null;
  onChange: (value: AddressPinValue | null) => void;
  label?: string;        // default: "Location"
  placeholder?: string;  // address search placeholder
  disabled?: boolean;
  className?: string;
}
```

---

## Anatomy

```
AddressPinField
├── Name input          ← free text, controlled independently
├── Address search      ← Mapbox forward geocoding suggestions
├── Mini map (280px)    ← react-map-gl/mapbox with draggable pin
└── Cleared state hint  ← "No location set" when no pin
```

---

## Behavior

### Mode A — Text search

1. User types in the address search input.
2. Input is debounced (300ms) and calls `forwardGeocode()`.
3. Suggestions appear in a dropdown.
4. User selects a suggestion → pin flies to that location → `onChange` fires with geocoded `address`, `latitude`, and `longitude` (preserving the current `name`).

### Mode B — Map interaction

1. User clicks anywhere on the mini map → pin is placed → `reverseGeocode()` resolves the address → `onChange` fires.
2. User drags the pin → same reverse-geocode flow → `onChange` fires.

### Name field

The venue **name** is separate from the geocoded **address**. Editing the name updates only `name` and does not reset coordinates.

### Disabled state

When `disabled` is true, both text inputs are locked and the pin cannot be dragged or placed via map click.

---

## SSR / Dynamic import

`mapbox-gl` requires browser APIs. Import `AddressPinField` dynamically with `ssr: false` in any server-rendered parent:

```tsx
import dynamic from "next/dynamic";

const AddressPinField = dynamic(
  () =>
    import("@/components/ui/address-pin-field/AddressPinField").then(
      (m) => m.AddressPinField,
    ),
  {
    ssr: false,
    loading: () => (
      <div className="h-[340px] animate-pulse rounded-xl bg-bg-elevated" />
    ),
  },
);
```

Import the **file** directly (`/AddressPinField`), not a folder barrel.

---

## react-hook-form integration

```tsx
<Controller
  name="location"
  control={control}
  render={({ field }) => (
    <AddressPinField
      value={field.value}
      onChange={field.onChange}
      label="Venue location"
    />
  )}
/>
```

---

## Geocoding helpers

Both apps use `forwardGeocode()` and `reverseGeocode()` from their respective `lib/geo/geocode.ts` modules. Geocoding is scoped to the Philippines (`country=PH`).

---

## Environment

Requires `NEXT_PUBLIC_MAPBOX_TOKEN` in `apps/client/.env.local`.
