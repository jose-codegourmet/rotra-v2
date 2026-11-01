-- F07.34 · founding cities offered by A-ADD-CLUB (#275)
-- Reference rows only, no schema change. PROPOSAL under #244 (location registry): the six cities in
-- rotra-admin.html CITY_LIST, so a platform owner can add a club on a fresh database. Cebu City and
-- Manila keep the IDs the fictional fixtures use. Needs human sign-off (coding-conventions §13).

INSERT INTO "location_codes" ("id", "country_code", "city_code", "display_name", "updated_at") VALUES
  ('10c00000-0000-4000-8000-000000000001', 'PH', 'CEB', 'Cebu City', CURRENT_TIMESTAMP),
  ('10c00000-0000-4000-8000-000000000002', 'PH', 'MNL', 'Manila', CURRENT_TIMESTAMP),
  ('10c00000-0000-4000-8000-000000000003', 'PH', 'DVO', 'Davao City', CURRENT_TIMESTAMP),
  ('10c00000-0000-4000-8000-000000000004', 'PH', 'ILO', 'Iloilo City', CURRENT_TIMESTAMP),
  ('10c00000-0000-4000-8000-000000000005', 'PH', 'BCD', 'Bacolod City', CURRENT_TIMESTAMP),
  ('10c00000-0000-4000-8000-000000000006', 'PH', 'TAG', 'Tagbilaran City', CURRENT_TIMESTAMP)
ON CONFLICT ("country_code", "city_code") DO NOTHING;
