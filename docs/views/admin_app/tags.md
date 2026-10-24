# Admin — Tag definitions (`/tags`)

## Access

- Nav **Tags** — super admin only.
- All admins use catalog via customer tag picker (read API).

## Layout

- Page title: **Tag definitions**
- Primary action (super admin): **Add tag definition**

## Table

| Column | Notes |
|--------|-------|
| Slug | Monospace |
| Label | |
| Assignable by | Any admin / Super admin only |
| Active | Yes/No pill |
| Created | Date |
| Actions | Edit (super admin) |

## Add dialog

Fields: Label (auto-slugify), Slug, Description (optional), Assignable by.

## Edit dialog

Fields: Label, Description, Assignable by, Active checkbox. Reserved slug: deactivate disabled with tooltip.

## Wireframe (ASCII)

```
[+ Add tag definition]

| Slug                  | Label    | Assignable by | Active | Created | Actions |
| tester-login-as-guest | Tester…  | Any admin     | Yes    | …       | Edit    |
```
