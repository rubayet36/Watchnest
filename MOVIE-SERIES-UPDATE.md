> For the cumulative feature upgrade, start with WATCHNEST-UPGRADE.md. This document describes the earlier streaming-only changes.

# Movie and series streaming update

This ZIP includes the earlier anime update and the movie/series changes. Copy its app/, components/, lib/, and tests/ directories into the existing Watchnest project, preserving paths and replacing matching files. Keep all existing environment variables and other project files. Commit and redeploy through your existing host; no additional API key or dependency is needed.

## Changes

- Provider URLs are centralized and validated in lib/media-stream.mjs.
- Videasy uses player.videasy.to directly, the destination observed when the original player.videasy.net URLs redirect.
- VidSrc uses vidsrc.sh and its documented /embed/movie/{tmdbId} and /embed/tv/{tmdbId}/{season}/{episode} routes.
- 2Embed uses 2embed.stream directly, the destination observed from www.2embed.online.
- A keyed iframe component isolates loading state between sources and episodes, offers a reload button, and shows a retry/source-switch prompt after 15 seconds without an iframe load event.
- Iframe load means the document loaded, not that video playback succeeded. The app cannot reliably inspect a cross-origin player's internal video errors. Use source switching for a loaded player that cannot play.
- The iframe is sandboxed; top-page redirects and popup permissions are not granted. If a provider rejects sandboxed embeds, choose another provider rather than disabling protections blindly.
- Season/episode menus no longer fabricate 10 seasons with 30 episodes. They use TMDB metadata. Titles without season metadata display an unavailable message.
- Saved series progress is restored before the first write, validated, and clamped to the known season. Blocked browser storage does not break playback initialization.

## Verification

- Production build passed.
- Targeted ESLint passed for all movie/series files changed in this update.
- All 13 tests passed (8 anime, 5 movie/series): node --test tests/*.test.mjs
- HTTP checks returned player HTML for movie 550 on all three configured providers and TV 1399 season 1 episode 1 on all three providers (Videasy observed through its old-domain redirect).
- 2Embed returned title-specific HTML for Fight Club and Game of Thrones S1 E1.
- These are endpoint checks, NOT successful video-playback tests. Your deployed domain, regional network, provider content availability, and mobile playback still need browser verification. No live site or remote GitHub changes have been made.

## Deployment checks

1. Run npm ci, node --test tests/*.test.mjs, and npm run build.
2. Redeploy with the updated files.
3. Open /media/movie/550, click Watch, press play inside the iframe, and test each source.
4. Open /media/tv/1399, choose a season/episode, test next episode, then close and reopen the player to check resume.
5. Test the reload button and switching sources on mobile and desktop, including fullscreen and subtitles.
6. If a player loads but reports an internal error, try another source and record the provider, title ID and episode. HTTP 200 alone does not prove that title is available.

## Provider references checked 2026-10-30

- https://vidsrc.sh/vidsrc/docs/
- https://player.videasy.net/movie/550 -> https://player.videasy.to/movie/550
- https://www.2embed.online/embed/movie/550 -> https://2embed.stream/embed/movie/550

Providers can change domains or availability. Change the central provider configuration when a replacement is verified. No direct video scraping, token extraction, or restriction bypass is implemented.
