## Quick orientation — what this project is

- Expo + React Native application using expo-router (file-based routes under `app/`).
- Auth and user profiles are managed with Supabase; client is created in `lib/supabase.ts` (uses AsyncStorage for session persistence).
- App routes are split by user role: `app/driver/*` and `app/passenger/*`. Role-based redirects happen in `app/_layout.tsx` using the `SessionProvider`/`useSession` context.

## Key files to read first

- `app/_layout.tsx` — root layout, notification handler and role-based routing logic.
- `contexts/AuthContext.tsx` — SessionProvider, session/user loading, `supabase.auth.onAuthStateChange` and profile fetch (`profiles` table).
- `lib/supabase.ts` — Supabase client configured with AsyncStorage and auto-refresh.
- `utils/supabaseClient.tsx` — simpler client used by some utilities; watch for multiple clients.
- `app/index.tsx`, `app/passenger/*`, `app/driver/*`, `app/auth/*` — example routes and redirect patterns.
- `package.json` — scripts: `npm run dev` (expo start), `npm run android` / `npm run ios` for device builds.

## Architecture & conventions (concrete)

- Routing: file-system routing via `expo-router`. Leading underscores (e.g., `_layout.tsx`) are layout files. Pages live under `app/`.
- Auth model: Supabase session -> fetch `profiles` row. The app relies on `user.role` to determine whether to send users to `/driver` or `/passenger`. See `SessionProvider` in `contexts/AuthContext.tsx`.
- State & hooks: local context (`contexts/*`) and small hooks in `hooks/` (e.g., `useAuth.ts`) are preferred over global containers for auth-related data.
- Styling/theme: shared theme in `utils/theme.ts` (use its spacing/typography constants for consistency).
- Components: reusable UI lives under `components/` and `components/ui/` (e.g., `Button`, `Card`, `Input`). Follow existing prop patterns when adding components.

## Supabase specifics you must know

- Env vars: EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY are required. The client expects them (non-null asserted in code).
- Client config: `lib/supabase.ts` uses AsyncStorage and sets `detectSessionInUrl: false` (mobile-first). When editing auth/session behavior, update that file.
- Profile access: profiles are queried with `.from('profiles').select('*').eq('id', userId).single()` — expect the `User` type in `types/index.ts` to match DB.

## Dev workflows / commands

- Install: `npm install` (project root).
- Local dev (Metro): `npm run dev` (maps to `expo start`). If Metro cache causes issues use `npm start` which runs `expo start --reset-cache`.
- Run on device/emulator: `npm run android` / `npm run ios` (uses Expo-managed native builds). For production builds see `eas.json` / Expo docs.

## Common editing patterns & pitfalls

- When changing routing or route names, update redirects in `app/_layout.tsx` and any `useEffect` based redirects in `app/index.tsx`.
- Don't create another Supabase client in random files — prefer adding exports in `lib/supabase.ts` or `utils/supabaseClient.tsx` and import them consistently.
- `SessionProvider` blocks rendering until `loading` is false; to avoid blank screens, ensure fetchUserProfile resolves quickly and handles errors (see `contexts/AuthContext.tsx`).
- Notifications: `app/_layout.tsx` config includes iOS-specific flags (`shouldShowBanner`, `shouldShowList`). Keep them when modifying notification behavior.

## Examples (how to do common tasks)

- Redirect based on role (pattern used): in `app/_layout.tsx` the code does:

- Persisted auth client (pattern used): use `lib/supabase.ts` which creates client with AsyncStorage so sessions persist across app restarts.

## Integration points & external deps

- Supabase (auth + Postgres) — see SQL in `lib/migrations/` for table changes.
- Map rendering uses MapLibre / `react-native-maps` (see `@maplibre/maplibre-react-native` and `react-native-maps` in `package.json`).
- Expo SDK (notifications, device APIs, camera, etc.). Keep Expo SDK versions in `package.json` in sync with native SDK expectations.

## When to ask for help / unknowns to clarify

- If you need DB schema details beyond `lib/migrations/*`, ask for access to the Supabase project or schema export.
- If you plan to change auth/session model (magic links, OTP), confirm expected behavior for drivers vs passengers and where server-side hooks live.

If any of these sections are unclear or you want different emphasis (tests, CI, or release notes), tell me what to expand and I will iterate.
