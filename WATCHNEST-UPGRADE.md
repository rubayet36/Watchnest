# Watchnest: complete watching-experience upgrade

This cumulative package includes the earlier anime/movie/series streaming fixes and all seven requested improvements. It contains changed and new files, not a standalone copy of the whole repository. Apply it to your existing Watchnest checkout, preserving paths. No production dependency changes are required.

## Features included

1. Playback help: “Not playing?”, next-source switching, reload/fullscreen controls, issue selection and signed-in report submission for anime, movies and series.
2. Continue Watching: shelves on Discover and Home, history progress bars, correct episode/language links, source-aware resume, and exact timestamps for documented VidSrc events. Progress is local to the browser/device. Unsupported players retain episode progress without pretending to support timestamps.
3. Mobile player: 44px action controls, fullscreen button, source controls directly below the player and a native-dialog episode drawer with Escape/backdrop close and focus handling.
4. Availability: upcoming-title labels, “no sources” versus provider errors for anime, explicit missing episode metadata, and timeout/retry feedback. For third-party movie embeds, availability cannot be determined solely from an iframe load event; the UI does not label a loaded document as a verified playable video.
5. Unified search: /search combines TMDB movies/series and AniList anime, with type, genre, year and original-language filters, pagination, cancelled stale requests, partial-provider failures and error states. TMDB text-search genre/language/year filters apply within each page. AniList does not expose original audio language: choosing an original-language filter excludes anime and explains why. Original language is not a dub/sub availability filter.
6. Episode notifications: opt-in follow/unfollow controls, /episode-alerts management, release items in the existing notification dropdown, in-app alerts and existing VAPID push integration. The Netlify job runs every six hours and announces the latest newly observed episode since the subscription baseline; it does not import old releases or guarantee streaming availability.
7. Admin dashboard: /admin/streaming aggregates user reports by source/title, supports open/resolved filters and resolution/reopening, and is linked from the admin profile and desktop navigation. Both the API and database enforce admin access. Counts cover the latest 500 matching reports in 30 days and are not a provider uptime metric.

## Install in this order

### 1. Merge the files

Extract this ZIP into your existing Watchnest project, replacing matching files and adding new ones. Keep your current .env files, Supabase keys and all untouched project files. If you changed the same files since the source snapshot, merge those changes rather than overwriting them blindly.

### 2. Apply the database migration

In your Supabase project's SQL Editor, run:

    supabase/watch_experience_migration.sql

The original Watchnest schema and account_approval_migration.sql must already be installed, including public.profiles.account_type and public.is_admin(). The new migration adds stream_reports, episode_subscriptions and episode_alerts, policies, indexes and grants. It is safe to reapply. Existing notifications tables are not replaced.

The report/alert screens show a setup error until this migration exists. Do not try to solve that error by making the tables public or disabling row-level security.

### 3. Configure server environment variables

Keep your existing variables. Confirm these are set in your hosting provider:

| Variable | Use |
| --- | --- |
| NEXT_PUBLIC_SUPABASE_URL | Existing Supabase project URL |
| NEXT_PUBLIC_SUPABASE_ANON_KEY | Existing public Supabase client key |
| SUPABASE_SERVICE_ROLE_KEY | Server-only subscription baselines and release jobs; never prefix this with NEXT_PUBLIC |
| TMDB_API_KEY | TMDB catalogue and TV release lookups (existing NEXT_PUBLIC_TMDB_API_KEY also supported) |
| EPISODE_CRON_SECRET | New long random server-only secret, shared by Next route and Netlify functions |
| NEXT_PUBLIC_VAPID_PUBLIC_KEY | Existing optional browser push public key |
| VAPID_PRIVATE_KEY | Existing optional server push private key |
| VAPID_SUBJECT | Existing optional push contact, e.g. mailto address |

Generate EPISODE_CRON_SECRET locally using `openssl rand -hex 32` or your host's secret generator. Do not paste it into source code or chat.

Netlify provides URL automatically. Outside Netlify, configure NEXT_PUBLIC_APP_ORIGIN to your site origin and arrange a scheduler that POSTs to /api/cron/episode-alerts with Authorization: Bearer <EPISODE_CRON_SECRET>, following nextCursor until null. No ChatGPT automation is required.

Without VAPID credentials or a device subscription, in-app episode alerts still work. Users must opt into device notifications in Settings for push.

### 4. Build and deploy

    npm ci
    node --test tests/*.test.mjs
    npm run build

Commit and push the merged changes, then redeploy with your existing Netlify setup. Check the Functions screen for episode-alerts (scheduled) and episode-alerts-background. The scheduled function only enqueues work; the background worker processes bounded batches and continues in a new invocation before its runtime limit. A scheduler calling the Next route directly must supply the secret and follow pagination.

The scheduled job runs on published Netlify deploys, not local dev or preview deploys. Its cron expression is 0 */6 * * * in UTC. It only creates alerts for users who explicitly followed a series.

### 5. Smoke-test after deployment

- Search for a movie, series and anime; test type/genre/year/original-language filters and Next/Previous.
- Start a series, choose an episode from the drawer, switch sources and submit a report.
- For VidSrc, play long enough for an actual PLAYER_EVENT, then open History and Resume. Confirm the same source/episode and timestamp. Other providers intentionally offer episode-level resume only.
- Test fullscreen, reload, and episode picker on a phone. Some browsers/providers can restrict fullscreen or sandboxed embeds.
- Sign in as an admin, visit /admin/streaming and resolve the report. Confirm a non-admin cannot access the API.
- Follow a currently airing series and confirm it appears in /episode-alerts. Run the Netlify schedule manually once to verify its setup. It should not alert on the already-current episode; future release changes trigger alerts.
- Check device notifications separately after opting in through Settings.

## Verification completed

- Production build passed with all new routes.
- 22 unit/behavior tests passed, including episode transitions, untrusted iframe-message rejection, timestamp merge behavior, release ordering, duplicate alert prevention and failed lookup handling.
- Targeted ESLint passed for new features and edited player/navigation/history/notification code. The repository-wide historical lint backlog was not rewritten.
- Browser checks at a 390px mobile viewport passed unified search/filtering, no horizontal overflow, episode drawer navigation, trusted timestamp persistence, report submission, following/unfollowing, exact-source/timestamp resume, admin report resolution and release alert rendering. A 1440px desktop layout check also passed. These tests used an isolated copy with mocked authentication/catalogue/player/backend responses; they did not alter production authentication or prove third-party video availability.
- Isolated PostgreSQL-compatible PGlite checks passed migration reapplication, user-owned report visibility, duplicate constraints, admin-only resolution, private alerts, read-only alert field updates, server-only subscription creation and unfollow cascade deletion.
- Running-app checks returned 401 for unauthenticated reporting/admin/alerts/cron calls and 400 for invalid catalogue filters.

## Limits and deployment state

No changes have been pushed to GitHub, no live Supabase migration has been applied, and no live scheduler or push notifications have been activated. Production credentials were not supplied. The live AniList request from this environment returned non-JSON content, so real release delivery must be verified on the deployed host; UI and job behavior were tested with controlled fixtures.

Only VidSrc's verified PLAYER_EVENT format is used for exact timestamps. Events must match both the iframe window/origin and the requested title/episode. Anime and other sources do not fabricate elapsed-time data. History remains device-local; this upgrade does not claim account-wide cross-device resume.

External streaming providers can still fail or restrict embedding. The app never bypasses provider restrictions. Release alerts rely on catalogue metadata; AniList only aims to guarantee future airing-data accuracy, so missing historical schedule records can mean no alert until a new release is observed. The worker deduplicates by subscription and episode, and skips regressions.

Reference documentation used: https://vidsrc.sh/vidsrc/docs/ ; https://docs.anilist.co/reference/object/page ; https://docs.netlify.com/build/functions/scheduled-functions/ ; https://docs.netlify.com/build/functions/background-functions/

Source base commit: f0ad2a2ffcdd0f78aaaeee4107fc2e3a5a892ee6
