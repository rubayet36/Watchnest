const DEFAULT_SANDBOX = 'allow-scripts allow-same-origin allow-forms allow-presentation'

export function iframeSandbox(url) {
  try {
    const parsed = new URL(url)
    // Videasy displays a blocking error when embedded with sandbox restrictions.
    // undefined omits the attribute; an empty string would impose all restrictions.
    if (parsed.origin === 'https://player.videasy.to' && !parsed.username && !parsed.password) return undefined
  } catch { /* Unknown URLs retain the restrictive default. */ }
  return DEFAULT_SANDBOX
}
