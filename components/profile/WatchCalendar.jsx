'use client'

import { useState, useMemo, useRef, useCallback } from 'react'

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const DAYS   = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

function getCellColor(count, type) {
  if (!count) return 'rgba(255,255,255,0.04)'
  const alpha = Math.min(0.2 + count * 0.18, 1)
  if (type === 'movie') return `rgba(255,106,61,${alpha})`
  if (type === 'tv')    return `rgba(63,221,168,${alpha})`
  if (type === 'anime') return `rgba(232,178,61,${alpha})`
  return `rgba(255,106,61,${alpha})`
}

function getDominantType(entries) {
  if (!entries?.length) return null
  const counts = { movie: 0, tv: 0, anime: 0 }
  for (const e of entries) {
    const isAnime = e.media_type === 'tv' && e.genres?.includes('Animation')
    if (isAnime) counts.anime++
    else if (e.media_type === 'tv') counts.tv++
    else counts.movie++
  }
  return Object.entries(counts).sort((a, b) => b[1] - a[1])[0][0]
}

function buildGrid(posts) {
  const byDay = {}
  for (const p of (posts || [])) {
    if (!p.created_at) continue
    const d = p.created_at.slice(0, 10)
    if (!byDay[d]) byDay[d] = []
    byDay[d].push(p)
  }

  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const start = new Date(today)
  start.setDate(today.getDate() - 363)
  start.setDate(start.getDate() - start.getDay()) // rewind to Sunday

  const weeks  = []
  const cursor = new Date(start)

  while (cursor <= today) {
    const week = []
    for (let d = 0; d < 7; d++) {
      const key     = cursor.toISOString().slice(0, 10)
      const entries = byDay[key] || []
      week.push({ date: new Date(cursor), key, entries })
      cursor.setDate(cursor.getDate() + 1)
    }
    weeks.push(week)
  }

  return { weeks }
}

function getMonthLabels(weeks) {
  const labels  = []
  let lastMonth = -1
  weeks.forEach((week, wi) => {
    const month = week[0].date.getMonth()
    if (month !== lastMonth) {
      labels.push({ wi, label: MONTHS[month] })
      lastMonth = month
    }
  })
  return labels
}

export default function WatchCalendar({ posts }) {
  // tooltip stores viewport-relative coords + data
  const [tooltip, setTooltip] = useState(null)

  const { weeks }     = useMemo(() => buildGrid(posts), [posts])
  const monthLabels   = useMemo(() => getMonthLabels(weeks), [weeks])
  const totalDaysActive = useMemo(() => weeks.flat().filter(c => c.entries.length > 0).length, [weeks])
  const totalLogged   = posts?.length || 0
  const todayKey      = new Date().toISOString().slice(0, 10)

  const handleMouseEnter = useCallback((e, cell) => {
    if (!cell.entries.length) return
    const rect = e.currentTarget.getBoundingClientRect()
    setTooltip({
      // place tooltip above and centred on the cell
      viewportX: rect.left + rect.width / 2,
      viewportY: rect.top,
      entries:   cell.entries,
      dateLabel: cell.date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }),
    })
  }, [])

  const handleMouseLeave = useCallback(() => setTooltip(null), [])

  return (
    <div style={{ marginTop: '1.25rem', paddingTop: '1rem', borderTop: '1px solid rgba(255,255,255,0.08)' }}>

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.85rem' }}>
        <div style={{
          fontFamily: "'JetBrains Mono', monospace", fontSize: '0.68rem',
          fontWeight: 800, color: '#FF6A3D', textTransform: 'uppercase', letterSpacing: '0.08em',
        }}>
          📅 WATCH HISTORY
        </div>
        <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '0.65rem', color: '#64748b', fontWeight: 600 }}>
          {totalLogged} logged · {totalDaysActive} active days
        </div>
      </div>

      {/* Heatmap grid — overflow-x for small screens */}
      <div style={{ overflowX: 'auto', overflowY: 'visible', paddingBottom: 4 }}>
        <div style={{ display: 'inline-flex', flexDirection: 'column', gap: 0 }}>

          {/* Month labels */}
          <div style={{ display: 'flex', marginBottom: 4, marginLeft: 24 }}>
            {weeks.map((_, wi) => {
              const lbl = monthLabels.find(m => m.wi === wi)
              return (
                <div key={wi} style={{ width: 11, marginRight: 2, flexShrink: 0 }}>
                  {lbl && (
                    <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '0.58rem', color: '#64748b', whiteSpace: 'nowrap' }}>
                      {lbl.label}
                    </span>
                  )}
                </div>
              )
            })}
          </div>

          {/* Day labels + week columns */}
          <div style={{ display: 'flex', gap: 0 }}>

            {/* Day labels */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 2, marginRight: 4, flexShrink: 0 }}>
              {[0, 1, 2, 3, 4, 5, 6].map(d => (
                <div key={d} style={{
                  height: 11, width: 18,
                  fontFamily: "'JetBrains Mono', monospace", fontSize: '0.52rem',
                  color: d % 2 === 0 ? '#64748b' : 'transparent',
                  lineHeight: '11px', userSelect: 'none',
                }}>
                  {DAYS[d].slice(0, 2)}
                </div>
              ))}
            </div>

            {/* Week columns */}
            {weeks.map((week, wi) => (
              <div key={wi} style={{ display: 'flex', flexDirection: 'column', gap: 2, marginRight: 2 }}>
                {week.map((cell) => {
                  const count   = cell.entries.length
                  const domType = getDominantType(cell.entries)
                  const bg      = getCellColor(count, domType)
                  const isToday = cell.key === todayKey

                  return (
                    <div
                      key={cell.key}
                      onMouseEnter={(e) => handleMouseEnter(e, cell)}
                      onMouseLeave={handleMouseLeave}
                      style={{
                        width: 11, height: 11, borderRadius: 2,
                        background: bg,
                        cursor: count ? 'pointer' : 'default',
                        outline: isToday ? '1.5px solid rgba(255,106,61,0.7)' : 'none',
                        outlineOffset: 1,
                        flexShrink: 0,
                      }}
                    />
                  )
                })}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Legend */}
      <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.6rem', alignItems: 'center', flexWrap: 'wrap' }}>
        {[
          { color: 'rgba(255,106,61,0.7)', label: 'Movie' },
          { color: 'rgba(63,221,168,0.7)', label: 'TV Series' },
          { color: 'rgba(232,178,61,0.7)', label: 'Anime' },
        ].map(({ color, label }) => (
          <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <div style={{ width: 9, height: 9, borderRadius: 2, background: color }} />
            <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '0.6rem', color: '#64748b', fontWeight: 600 }}>
              {label}
            </span>
          </div>
        ))}
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 4 }}>
          <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '0.6rem', color: '#64748b' }}>Less</span>
          {[0.15, 0.35, 0.55, 0.75, 1].map((a, i) => (
            <div key={i} style={{ width: 9, height: 9, borderRadius: 2, background: `rgba(255,106,61,${a})` }} />
          ))}
          <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '0.6rem', color: '#64748b' }}>More</span>
        </div>
      </div>

      {/* Tooltip — fixed to viewport, no parent rect needed */}
      {tooltip && (
        <div
          style={{
            position: 'fixed',
            left: tooltip.viewportX,
            top:  tooltip.viewportY - 8,
            transform: 'translate(-50%, -100%)',
            zIndex: 9999,
            background: '#1E2028',
            border: '1px solid rgba(255,255,255,0.12)',
            borderRadius: 10,
            padding: '0.6rem 0.75rem',
            minWidth: 180,
            maxWidth: 240,
            boxShadow: '0 8px 32px rgba(0,0,0,0.7)',
            pointerEvents: 'none',
          }}
        >
          <div style={{
            fontFamily: "'JetBrains Mono', monospace", fontSize: '0.65rem',
            color: '#FF6A3D', fontWeight: 800, marginBottom: '0.4rem',
            textTransform: 'uppercase', letterSpacing: '0.06em',
          }}>
            {tooltip.dateLabel}
          </div>

          {tooltip.entries.slice(0, 5).map((entry, i) => {
            const isAnime   = entry.media_type === 'tv' && entry.genres?.includes('Animation')
            const typeColor = isAnime ? '#E8B23D' : entry.media_type === 'tv' ? '#3FDDA8' : '#FF6A3D'
            const typeLabel = isAnime ? 'Anime' : entry.media_type === 'tv' ? 'TV' : 'Movie'
            return (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                {entry.poster_path && (
                  <img
                    src={`https://image.tmdb.org/t/p/w92${entry.poster_path}`}
                    alt={entry.title}
                    style={{ width: 22, height: 32, borderRadius: 3, objectFit: 'cover', flexShrink: 0 }}
                  />
                )}
                <div style={{ minWidth: 0 }}>
                  <div style={{
                    fontFamily: "'Manrope', sans-serif", fontSize: '0.75rem',
                    color: '#F2EFE9', fontWeight: 700,
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 160,
                  }}>
                    {entry.title}
                  </div>
                  <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '0.6rem', color: typeColor, fontWeight: 800 }}>
                    {typeLabel}
                  </div>
                </div>
              </div>
            )
          })}

          {tooltip.entries.length > 5 && (
            <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '0.6rem', color: '#64748b', marginTop: 2 }}>
              +{tooltip.entries.length - 5} more
            </div>
          )}
        </div>
      )}
    </div>
  )
}
