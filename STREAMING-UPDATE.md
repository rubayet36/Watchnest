> For the cumulative feature upgrade, start with WATCHNEST-UPGRADE.md. This document describes the earlier streaming-only changes.

# Watchnest streaming update

## Install

This package contains only changed/new files. Copy the app/, lib/, and tests/ directories into your existing Watchnest repository, preserving their paths and replacing matching files. Keep your existing environment variables and all other project files.

Run:

```sh
npm ci
node --test tests/anime-stream.test.mjs
npm run build
```

Commit the files to your GitHub repository and redeploy through your existing hosting provider. No new npm dependencies or API key are required for the tested endpoint. This package does not deploy anything automatically.

## Changes

- `/api/anime/stream?anilistId=97821&ep=1&language=sub` resolves actual provider responses on the server.
- Default upstream: `https://reanime.to/api/flix/{anilistId}/{episode}`; optional MAL ID is passed through.
- Only HTTPS FlixCloud embed links returned by the provider are accepted. No guessed fallback URLs.
- Sub/dub choices are passed through detail and episode navigation. The player uses an iframe, not a video element.
- Anime metadata and episode numbering use AniList, removing the old scraper dependency from the UI.
- Legacy `/api/gogoanime/watch` delegates to the new resolver. Old bookmarks need an AniList ID in the query, as existing Watchnest-generated bookmarks normally have.
- Timeout, malformed response, empty sources, and retry states are handled. The iframe is sandboxed.

Optional server environment variable: `ANIME_STREAM_API_BASE` changes the API origin for a compatible endpoint. Never point it at an untrusted service. A different embed host also requires updating the explicit host validation in `lib/anime-stream.mjs`.

## Validation and limits

Eight automated tests passed. Changed source files passed targeted ESLint, and the production build passed. A live request through the running local route returned HD-1 and HD-2 FlixCloud links for AniList 97821, episode 1.

Actual video playback, autoplay, fullscreen, mobile behavior, and embedding permission on your deployed domain have not been verified. Test these after deployment. A successful iframe load is not evidence of successful video playback. The provider can restrict third-party embeds or become unavailable; this is an undocumented internal endpoint with no established public API support or reuse permission.

AniList episode numbers are catalogue/airing metadata, not a guarantee that a corresponding stream exists. Unreleased titles show no episodes; ongoing titles use the next scheduled episode to estimate aired episodes. If ongoing airing metadata is absent, only episode 1 is offered rather than guessing the entire announced season. Sub and dub may resolve to the same embedded player, which can have its own language controls.

## Quick deployment check

1. Open `/anime/97821`, choose Sub, and open episode 1.
2. Check the network response from `/api/anime/stream`; it should contain servers or an explicit provider error.
3. Confirm playback manually, switch HD-1/HD-2, test fullscreen and mobile.
4. Return to details, choose Dub, and confirm requests include `language=dub`.
5. Confirm episode navigation and saved watch-history links still open the correct episode.
