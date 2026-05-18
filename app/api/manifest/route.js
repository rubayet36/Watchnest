export const runtime = 'edge'

export async function GET(request) {
  // Derive the origin so icon URLs are absolute.
  // Browsers resolve relative manifest icon paths relative to the manifest URL
  // (/api/manifest), NOT the site root — so /icon.png would resolve to
  // /api/icon.png which 404s. Absolute URLs fix this.
  const origin = new URL(request.url).origin

  const manifest = JSON.stringify({
    name: "WatchNest",
    short_name: "WatchNest",
    description: "Your circle's movie hub - share, discover, and track movies with friends",
    start_url: "/",
    display: "standalone",
    background_color: "#0d0d1a",
    theme_color: "#7c3aed",
    orientation: "portrait-primary",
    categories: ["entertainment", "social"],
    icons: [
      { src: `${origin}/android-chrome-192x192.png`, sizes: "192x192", type: "image/png", purpose: "any" },
      { src: `${origin}/android-chrome-512x512.png`, sizes: "512x512", type: "image/png", purpose: "any maskable" }
    ],
    shortcuts: [
      { name: "Home Feed", url: "/", description: "View your movie feed" },
      { name: "Watchlist", url: "/watchlist", description: "Your saved movies" },
      { name: "Search", url: "/search", description: "Search movies" }
    ]
  })

  return new Response(manifest, {
    status: 200,
    headers: { 'Content-Type': 'application/manifest+json' }
  })
}
