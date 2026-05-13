export const runtime = 'edge'

export async function GET() {
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
      { src: "/Red Black Typography Nine Brand Logo.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/Red Black Typography Nine Brand Logo.png", sizes: "512x512", type: "image/png", purpose: "maskable" }
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
