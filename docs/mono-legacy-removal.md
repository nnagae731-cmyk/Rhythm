# Mono cleanup notes

The redesigned Mono experience is now the active Light/Dark implementation. The persisted identifiers `minimal` (Mono Light) and `dark` (Mono Dark) remain unchanged so existing users and saved settings continue to load without migration.

## Retained shared foundations

The following are active application foundations, not obsolete settings data:

- `colors` and legacy shared styles in `app/styles/appStyles.ts`
- `minimal*` and `dark*` styles used by Home, Timeline, Analysis, Wish, Settings, Focus, and modal surfaces
- `headerMinimal` / `headerDark` in `app/components/Header.tsx`
- `bottomNavMinimal` / `bottomNavDark` in `app/components/BottomNav.tsx`
- `getThemeTokens` and `ThemeTokens` in `app/theme.ts`
- persisted values `minimal` and `dark`, `STORAGE_KEY`, and existing Premium/Photo/Design branches

Unused Mono-only helper styles were removed after a repository-wide reference scan. Shared styles that are also used by Design, Photo, Premium, or compatibility paths remain intentionally.

## Verification checklist

1. Search references with `rg` before deleting a style or helper.
2. Run `pnpm run typecheck` from `app/`.
3. Run `npx expo export --platform ios`.
4. Check Mono Light, Mono Dark, Design, Photo, Premium, settings, schedule, analysis, Wish, Focus, and recovery flows.

No persisted data, storage key, Premium boundary, or user-facing feature was changed by this cleanup.
