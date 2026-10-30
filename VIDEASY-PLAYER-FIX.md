# Videasy sandbox compatibility fix

Apply this patch after the Full Upgrade and Production Patch. Copy the included files to their matching paths, commit, and redeploy. If you have since edited the media page, merge just the removal of its SANDBOXED badge instead of replacing that page.

The screenshot shows Videasy's own sandbox rejection screen. The shared player previously set a sandbox attribute for every source. The player now omits that attribute only for the exact HTTPS origin `https://player.videasy.to`. Other sources retain the previous restrictions. An empty sandbox string is not a fix: it applies all sandbox restrictions.

Omitting sandbox allows more third-party player behavior, including pop-ups and user-initiated navigation. Browser cross-origin isolation still applies. The misleading SANDBOXED badge was removed. The duplicate legacy allowFullScreen attribute was also removed; the allow policy still enables fullscreen. The load callback is now optional.

Changed files:
- `components/media/EmbedPlayer.jsx`
- `lib/embed-policy.mjs` (new)
- `app/(main)/media/[mediaType]/[tmdbId]/page.jsx` (badge removed)
- `tests/embed-policy.test.mjs` (new)

After deployment, hard-refresh The Dark Knight page, select Videasy and inspect the iframe. It should have no sandbox attribute; switching to VidSrc should retain one. Test actual video playback. This patch fixes the known host-side configuration conflict; live provider playback has not been verified.

Other attached-log issues are separate:
- `chrome-extension://invalid` and extension message-channel errors originate from browser extensions. Compare in a browser profile with extensions disabled.
- `ERR_BLOCKED_BY_CLIENT` indicates a client-side block. The blocked seed request may affect playback even after the sandbox fix.
- Videasy stats 429 is an external rate limit.
- Episode alerts 503 needs the database diagnosis/migration described in `PRODUCTION-TROUBLESHOOTING.md`.
- TMDB movie 210702 returned 404 in the log; verify that title's ID and whether it is a movie or TV entry. It is unrelated to The Dark Knight's movie ID 155.
- HMR/Fast Refresh and localhost:3000 entries indicate this attached log includes a development session.

This patch supersedes the earlier generic advice to retain sandbox for every provider: the screenshot supplies concrete evidence of an incompatibility for Videasy.
