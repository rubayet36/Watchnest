const spinKeyframes = `
@keyframes wn-spin { to { transform: rotate(360deg); } }
@keyframes wn-pulse { 0%,100%{opacity:1} 50%{opacity:.4} }
@keyframes wn-shimmer { 0%{background-position:-400px 0} 100%{background-position:400px 0} }
`

export function LoadingSpinner({ size = 'md' }) {
  const px = size === 'sm' ? 16 : size === 'lg' ? 48 : 32
  return (
    <>
      <style>{spinKeyframes}</style>
      <div style={{ width: px, height: px, flexShrink: 0 }}>
        <div style={{
          width: '100%', height: '100%', borderRadius: '50%',
          border: '2px solid rgba(139,92,246,0.2)',
          borderTopColor: '#8b5cf6',
          animation: 'wn-spin .7s linear infinite',
        }} />
      </div>
    </>
  )
}

export function PageLoader() {
  return (
    <>
      <style>{spinKeyframes}</style>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', gap: '1rem' }}>
        <div style={{ fontSize: '2.5rem' }}>🎬</div>
        <LoadingSpinner size="lg" />
        <p style={{ color: '#64748b', fontSize: '0.875rem', animation: 'wn-pulse 2s ease-in-out infinite' }}>
          Loading WatchNest…
        </p>
      </div>
    </>
  )
}

export function CardSkeleton() {
  const sh = {
    background: 'linear-gradient(90deg,rgba(255,255,255,0.03) 25%,rgba(255,255,255,0.08) 50%,rgba(255,255,255,0.03) 75%)',
    backgroundSize: '400px 100%',
    animation: 'wn-shimmer 1.4s ease-in-out infinite',
    borderRadius: 8,
  }
  return (
    <>
      <style>{spinKeyframes}</style>
      <div style={{ background: 'rgba(28,28,46,0.6)', border: '1px solid rgba(139,92,246,0.1)', borderRadius: 20, overflow: 'hidden' }}>
        <div style={{ padding: '1rem', display: 'flex', gap: '0.75rem' }}>
          <div style={{ ...sh, width: 36, height: 36, borderRadius: '50%', flexShrink: 0 }} />
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div style={{ ...sh, height: 12, width: '55%' }} />
            <div style={{ ...sh, height: 10, width: '35%' }} />
          </div>
        </div>
        <div style={{ display: 'flex', gap: '1rem', padding: '0 1rem 1rem' }}>
          <div style={{ ...sh, width: 88, height: 128, borderRadius: 12, flexShrink: 0 }} />
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 8, paddingTop: 8 }}>
            <div style={{ ...sh, height: 16, width: '75%' }} />
            <div style={{ ...sh, height: 12, width: '50%' }} />
            <div style={{ ...sh, height: 11, width: '100%' }} />
            <div style={{ ...sh, height: 11, width: '90%' }} />
            <div style={{ ...sh, height: 11, width: '65%' }} />
          </div>
        </div>
      </div>
    </>
  )
}

export function EmptyState({ icon = '🎬', title, message, action }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '5rem 1rem', gap: '1rem', textAlign: 'center' }}>
      <div style={{ fontSize: '3rem' }}>{icon}</div>
      <h3 style={{ margin: 0, fontSize: '1.125rem', fontWeight: 700, color: '#e2e8f0' }}>{title}</h3>
      <p style={{ margin: 0, color: '#64748b', maxWidth: 320, fontSize: '0.875rem', lineHeight: 1.6 }}>{message}</p>
      {action}
    </div>
  )
}
