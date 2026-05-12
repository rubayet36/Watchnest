const VARIANT_STYLES = {
  default: { background: 'rgba(139,92,246,0.15)', color: '#c4b5fd', border: '1px solid rgba(139,92,246,0.25)' },
  genre:   { background: 'rgba(100,116,139,0.2)',  color: '#94a3b8',  border: '1px solid rgba(100,116,139,0.25)' },
  amber:   { background: 'rgba(245,158,11,0.15)',  color: '#fbbf24',  border: '1px solid rgba(245,158,11,0.25)' },
  rose:    { background: 'rgba(244,63,94,0.15)',   color: '#fb7185',  border: '1px solid rgba(244,63,94,0.25)' },
  green:   { background: 'rgba(16,185,129,0.15)',  color: '#6ee7b7',  border: '1px solid rgba(16,185,129,0.25)' },
}

export default function Badge({ children, variant = 'default' }) {
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center',
      padding: '2px 8px', borderRadius: 99,
      fontSize: '0.6875rem', fontWeight: 600,
      ...VARIANT_STYLES[variant] || VARIANT_STYLES.default,
    }}>
      {children}
    </span>
  )
}
