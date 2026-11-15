-- name: ListLocationCodes :many
SELECT id, country_code, city_code, display_name
FROM location_codes
ORDER BY country_code, city_code;
