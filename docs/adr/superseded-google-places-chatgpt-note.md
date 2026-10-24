> **SUPERSEDED 2026-08-26.** Code uses **Mapbox** (zero Google Places/Maps references).
> Kept for historical context only. Do not implement from this note.
>
> See `.agents/context/known-drift.md` and `apps/*/lib/geo/geocode.ts`.

# Mapbox Missing Establishments — Problem, Options, and Recommended Solution

## Problem

Our application uses Mapbox for map rendering and location selection.

However, many establishments that are visible in Google Maps are not appearing in Mapbox. This creates several issues:

* Users cannot easily find known badminton courts and venues.
* Some local establishments may not exist in Mapbox's POI (Point of Interest) database.
* The availability and completeness of business listings differ between Google Maps and Mapbox.
* Relying solely on Mapbox POIs may result in missing locations and inconsistent user experience.

---

## Understanding the Issue

### Google Maps

Google maintains a massive business database through:

* Google Business Profiles
* User submissions
* Business owner updates
* Continuous validation and moderation

As a result, Google Maps generally has more complete business listings.

### Mapbox

Mapbox primarily provides:

* Map rendering
* Routing
* Geocoding
* Search services
* Custom map styling

While Mapbox does have POI data, its coverage may not match Google's, especially for local businesses and smaller establishments.

Therefore:

> A place existing in Google Maps does not guarantee it exists in Mapbox.

---

# Proposed Solution (Recommended)

## Create a Custom Places System

Instead of relying entirely on Mapbox's POI database, create a dedicated "Places" management module inside the admin dashboard.

### Admin Workflow

1. Admin creates a new badminton venue.

2. Admin searches for or pins a location on the map.

3. Admin enters:

   * Venue name
   * Address
   * Latitude
   * Longitude
   * Description
   * Contact details (optional)
   * Photos (optional)

4. Venue is stored in the application's database.

5. Venue appears as a marker inside the map.

### Example

```txt
Badminton Places

✓ Metro Sports Center
✓ Smash Badminton Center
✓ Mandaue Sports Complex
✓ Shuttle Masters Arena
```

Users will always see these venues regardless of whether Mapbox recognizes them.

---

# Recommended Database Structure

```sql
places
------
id
name
address
latitude
longitude
description
phone
website
is_active
created_at
updated_at
```

Optional:

```sql
images
-------
id
place_id
url
```

---

# Why This Is Recommended

Advantages:

* Full control over venue listings
* No dependency on Mapbox POI coverage
* Admin can add new venues instantly
* Supports future features:

  * Reviews
  * Ratings
  * Photos
  * Court availability
  * Reservations
  * Nearby venue search

This solution scales well and is commonly used by booking platforms.

---

# Option 1 — Custom Database Only (Recommended)

## Architecture

```txt
Supabase
    ↓
Places Table
    ↓
Mapbox
    ↓
Markers
```

### Pros

* Full control
* Simple implementation
* Reliable
* Scalable
* Future-proof

### Cons

* Admin must manually add venues

---

# Option 2 — Hybrid Approach (Best Long-Term)

## Architecture

```txt
Mapbox Search
      +
Custom Places Database
```

### Workflow

1. User searches.
2. App searches Mapbox first.
3. App also searches custom places.
4. Results are merged.

Example:

```txt
Search: "Metro"

Results:
- Metro Sports Center (Custom)
- Metro Bank (Mapbox)
- Metro Grocery (Mapbox)
```

### Pros

* Best user experience
* Access to Mapbox places
* Includes custom venues

### Cons

* Slightly more development work

---

# Option 3 — Mapbox Only

## Architecture

```txt
Mapbox Search API
      ↓
POIs
```

### Pros

* Fastest to implement
* No database needed

### Cons

* Missing establishments
* No admin control
* Dependent on Mapbox coverage

Not recommended for a badminton booking platform.

---

# Option 4 — Mapbox Dataset/Tileset

Mapbox allows custom GeoJSON datasets to be uploaded.

### Pros

* Places become part of map layers
* Useful for visual map overlays

### Cons

* Not ideal as a business database
* Harder to manage dynamically
* Requires republishing updates

Best suited for static map layers rather than venue management.

---

# Suggested MVP

For the first release:

## Admin

* Create Place
* Edit Place
* Delete Place
* Upload Image
* Pin Location on Map

## User

* View Places
* Search Places
* Open Place Details
* Navigate to Place

## Storage

* Supabase/Postgres
* Mapbox for rendering only

Architecture:

```txt
Admin Dashboard
      ↓
Supabase Places
      ↓
Mapbox Markers
      ↓
Users
```

This provides a reliable foundation while remaining simple to build.

---

# Future Enhancements

### Automatic Venue Discovery

Investigate Mapbox Search API to retrieve available establishments and merge them with custom places.

```txt
Custom Places
      +
Mapbox Search API
      ↓
Unified Search Results
```

### Additional Features

* Reviews
* Ratings
* Court availability
* Reservation management
* Tournament locations
* Distance calculations
* Nearby courts

---

# Final Recommendation

For a badminton queueing and booking application:

**Use Mapbox only as the map engine.**

**Store badminton venues in your own Places database managed through the admin dashboard.**

Then, optionally add Mapbox Search later as a secondary source of establishments.

This gives complete control, avoids missing venue issues, and provides the best long-term scalability.
