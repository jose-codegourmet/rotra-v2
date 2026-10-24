## ADDED Requirements

### Requirement: Additive client authentication role flags
Every resolved client profile SHALL have the authentication role `user`. `tester` SHALL be added when `isTesterAccount` is true. `admin` or `super_admin` SHALL be added from the existing `adminRole` value. These flags MUST be derived and MUST NOT introduce a shared role table or replace club-scoped domain roles.

#### Scenario: Profile carries multiple flags
- GIVEN a profile with `isTesterAccount` true and `adminRole` equal to `admin`
- WHEN the client resolves the profile
- THEN its authentication roles are `user`, `tester`, and `admin`

## Source

- `apps/client/src/lib/server/current-profile.ts`
