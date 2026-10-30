# Production error follow-up

This is a focused patch on top of the Full Upgrade. Merge the included files into your repository and redeploy. It improves diagnosis and prevents automatic retries on the stream lookup and episode management screens; it does not guarantee provider availability. No production database or deployment was changed by this patch's author.

## Anime lookup 502

The live Watchnest endpoint returned 502 for AniList 185874, episode 1, MAL 60636. The same upstream lookup returned HTTP 200 with two distinct embed URLs from this development environment, including through the existing Node resolver. This establishes an environment-dependent or intermittent failure, not its exact cause. An embed URL response is not proof of working video playback.

After deploying, inspect the JSON response in browser Network for `/api/anime/stream`. The response and server log now include a safe diagnostic code:

| Code | Action |
| --- | --- |
| PROVIDER_HTTP_ERROR | Check `upstreamStatus`. A 403 means the upstream refused the server request; 5xx means an upstream failure. Ask the provider about supported server integration. |
| PROVIDER_RATE_LIMITED | Upstream returned 429. Wait before retrying and check provider limits. |
| PROVIDER_INVALID_JSON | Upstream returned non-JSON, possibly an error or challenge page. Check provider availability from the deployment environment. |
| PROVIDER_INVALID_RESPONSE | JSON did not match the expected server-list contract. The integration may need updating. |
| PROVIDER_CONNECTION_FAILED | Check production outbound network/DNS/TLS and the configured API base. |
| PROVIDER_TIMEOUT | The request exceeded 12 seconds. Check upstream response time. |

Check `ANIME_STREAM_API_BASE`: omit it to use the existing default, or set it to the correct upstream origin (no `/api/flix/...` suffix). Redeploy after changing environment variables. The Reanime endpoint is an observed website endpoint, not a confirmed supported public API. This patch does not bypass provider restrictions.

## Episode endpoints 503

The original catch-all 503 cannot establish whether tables are missing, grants are incorrect, or the database is unavailable. After redeploying, the JSON code distinguishes these cases:

- `DATABASE_SETUP_REQUIRED`: apply `supabase/watch_experience_migration.sql` in the same Supabase project used by production. Its prerequisites are the existing schema and account approval migration defining `public.is_admin`. The migration is idempotent; inspect it before applying to your production database.
- `DATABASE_PERMISSION_DENIED`: check table grants and RLS policies. The included migration restores the intended policies; do not disable RLS.
- `SERVER_CONFIG_MISSING`: configure server-only `SUPABASE_SERVICE_ROLE_KEY` and `NEXT_PUBLIC_SUPABASE_URL` for episode subscription writes. Never prefix the service-role key with `NEXT_PUBLIC_` or paste it into a chat.
- `DATABASE_UNAVAILABLE`: inspect the deployment/Supabase health. This code does not imply a missing migration.

GET alerts and subscriptions use the signed-in user's client and do not require the service-role key. If only these GETs fail, focus first on their tables, permissions, and connectivity. Once fixed, reload the page. Scheduled new-episode notifications still require the scheduler configuration in `WATCHNEST-UPGRADE.md`.

## Embedded player console messages

- `ERR_BLOCKED_BY_CLIENT`: the browser or an extension blocked the request. Compare in a clean browser profile to isolate the cause. Do not assume a blocked analytics script is the playback failure.
- Videasy `/api/stats/hit` 429: the external provider rate-limited its statistics endpoint. Watchnest cannot change that limit. Try another source if playback itself fails.
- `cdn.anizara.store` image 522: the external CDN/origin failed. This is a cover-image request, not the Watchnest stream lookup. That hostname is not referenced by Watchnest source; if it belongs to the embedded player, its fallback behavior is controlled by the provider.
- `[SW] Registered`: normal service-worker registration, not an error.

Do not remove iframe isolation or add an arbitrary proxy to suppress console messages. Cross-origin iframe document loading does not prove the video is playable.

## Verification after deployment

1. Open the failing anime episode and inspect the single lookup's JSON and code. Use the visible Retry action for a new attempt.
2. Sign in and verify `/api/episode-alerts` and `/api/episode-subscriptions` return 200 after database setup.
3. Test actual movie/TV playback using the available source selector; record which provider, title, season and episode fail.
4. Share only the response code and upstream HTTP status if anime still fails. Do not share cookies, bearer tokens, or environment secrets.
