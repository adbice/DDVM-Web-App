import { useState, useEffect, useRef } from 'react'
import LocationService from '../services/LocationService.js'

// ---------------------------------------------------------------------------
// CONSTANTS
// ---------------------------------------------------------------------------
const SECTIONS = LocationService.getAllSections()

const SECTION_COLORS = {
  'Section 1': '#C8A95A',
  'Section 2': '#C8A95A',
  'Section 3': '#C8A95A',
  'Section 4': '#C8A95A',
  'Section 5': '#8B7340',
  'Section 6': '#8B7340',
  'Section 7': '#4A6B8A',
  'Section 8': '#4A6B8A',
  'POW/MIA Section': '#8A4A4A',
}

const SECTION_LABELS = {
  'Section 1': 'S1',
  'Section 2': 'S2',
  'Section 3': 'S3',
  'Section 4': 'S4',
  'Section 5': 'S5',
  'Section 6': 'S6',
  'Section 7': 'S7',
  'Section 8': 'S8',
  'POW/MIA Section': 'POW',
}

// ---------------------------------------------------------------------------
// GPS → CANVAS HELPERS
// ---------------------------------------------------------------------------

/**
 * Compute map bounds from all sections EXCEPT POW/MIA,
 * which sits far away and would distort the canvas.
 */
function getBounds() {
  let minLat = Infinity, maxLat = -Infinity
  let minLng = Infinity, maxLng = -Infinity

  Object.entries(SECTIONS).forEach(([name, sec]) => {
    if (name === 'POW/MIA Section') return  // excluded — far outlier
    sec.vertices.forEach(([lat, lng]) => {
      if (lat < minLat) minLat = lat
      if (lat > maxLat) maxLat = lat
      if (lng < minLng) minLng = lng
      if (lng > maxLng) maxLng = lng
    })
  })

  // Comfortable padding so sections don't butt against canvas edges
  const latPad = (maxLat - minLat) * 0.20
  const lngPad = (maxLng - minLng) * 0.20

  return {
    minLat: minLat - latPad,
    maxLat: maxLat + latPad,
    minLng: minLng - lngPad,
    maxLng: maxLng + lngPad,
  }
}

/** Convert GPS lat/lng to canvas pixel coordinates. */
function gpsToCanvas(lat, lng, bounds, canvasW, canvasH) {
  const x = ((lng - bounds.minLng) / (bounds.maxLng - bounds.minLng)) * canvasW
  const y = ((bounds.maxLat - lat) / (bounds.maxLat - bounds.minLat)) * canvasH
  return { x, y }
}

// ---------------------------------------------------------------------------
// COMPONENT
// ---------------------------------------------------------------------------
export default function LiveMap({ inventory }) {
  const canvasRef = useRef(null)
  const [position, setPosition]   = useState(null)
  const [tracking, setTracking]   = useState(false)
  const [accuracy, setAccuracy]   = useState(null)
  const [inBounds, setInBounds]   = useState(null)
  const watchRef  = useRef(null)

  const bounds = getBounds()

  // Redraw whenever inventory or GPS position changes
  useEffect(() => {
    drawMap()
  }, [inventory, position])

  // Cleanup GPS watcher on unmount
  useEffect(() => {
    return () => {
      if (watchRef.current) navigator.geolocation.clearWatch(watchRef.current)
    }
  }, [])

  // -------------------------------------------------------------------------
  // GPS TRACKING
  // -------------------------------------------------------------------------
  function startTracking() {
    if (!navigator.geolocation) return
    setTracking(true)
    watchRef.current = navigator.geolocation.watchPosition(
      pos => {
        const { latitude: lat, longitude: lng, accuracy: acc } = pos.coords
        setPosition({ lat, lng })
        setAccuracy(Math.round(acc))
        setInBounds(LocationService.isInsideMonument(lat, lng))
      },
      err => console.warn('GPS error:', err),
      { enableHighAccuracy: true, maximumAge: 2000 }
    )
  }

  function stopTracking() {
    if (watchRef.current) navigator.geolocation.clearWatch(watchRef.current)
    setTracking(false)
    setPosition(null)
    setAccuracy(null)
    setInBounds(null)
  }

  // -------------------------------------------------------------------------
  // CANVAS DRAW
  // -------------------------------------------------------------------------
  function drawMap() {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    const W = canvas.width
    const H = canvas.height

    // Background
    ctx.clearRect(0, 0, W, H)
    ctx.fillStyle = '#111'
    ctx.fillRect(0, 0, W, H)

    // --- Draw section polygons ---
    Object.entries(SECTIONS).forEach(([name, config]) => {
      if (name === 'POW/MIA Section') return  // not shown on main map

      const pts = config.vertices.map(([lat, lng]) =>
        gpsToCanvas(lat, lng, bounds, W, H)
      )
      const color = SECTION_COLORS[name] || '#888'

      // Fill
      ctx.beginPath()
      ctx.moveTo(pts[0].x, pts[0].y)
      pts.slice(1).forEach(p => ctx.lineTo(p.x, p.y))
      ctx.closePath()
      ctx.fillStyle = color + '40'   // ~25% opacity fill
      ctx.fill()

      // Stroke
      ctx.strokeStyle = color
      ctx.lineWidth = 1.5
      ctx.stroke()

      // Label at centroid
      const cx = pts.reduce((s, p) => s + p.x, 0) / pts.length
      const cy = pts.reduce((s, p) => s + p.y, 0) / pts.length
      ctx.fillStyle = '#fff'
      ctx.font = 'bold 9px monospace'
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText(SECTION_LABELS[name] || name, cx, cy)
    })

    // --- Draw compass rose (small, top-left) ---
    drawCompass(ctx, 24, 24, 14)

    // --- Draw logged paver dots ---
    inventory.forEach(brick => {
      if (!brick.location) return
      const parts = brick.location.split(',')
      if (parts.length !== 2) return
      const lat = parseFloat(parts[0])
      const lng = parseFloat(parts[1])
      if (isNaN(lat) || isNaN(lng)) return

      const { x, y } = gpsToCanvas(lat, lng, bounds, W, H)
      ctx.beginPath()
      ctx.arc(x, y, 4, 0, Math.PI * 2)
      ctx.fillStyle = '#D4A843'
      ctx.fill()
      ctx.strokeStyle = '#fff'
      ctx.lineWidth = 0.8
      ctx.stroke()
    })

    // --- Draw live position dot ---
    if (position) {
      const { x, y } = gpsToCanvas(position.lat, position.lng, bounds, W, H)

      // Accuracy halo
      ctx.beginPath()
      ctx.arc(x, y, 14, 0, Math.PI * 2)
      ctx.fillStyle = 'rgba(100, 200, 255, 0.15)'
      ctx.fill()
      ctx.strokeStyle = 'rgba(100, 200, 255, 0.4)'
      ctx.lineWidth = 1
      ctx.stroke()

      // Position dot
      ctx.beginPath()
      ctx.arc(x, y, 6, 0, Math.PI * 2)
      ctx.fillStyle = '#64C8FF'
      ctx.fill()
      ctx.strokeStyle = '#fff'
      ctx.lineWidth = 2
      ctx.stroke()
    }
  }

  function drawCompass(ctx, cx, cy, r) {
    ctx.save()
    ctx.globalAlpha = 0.6

    // N pointer
    ctx.beginPath()
    ctx.moveTo(cx, cy - r)
    ctx.lineTo(cx - r * 0.35, cy + r * 0.5)
    ctx.lineTo(cx, cy)
    ctx.closePath()
    ctx.fillStyle = '#e05555'
    ctx.fill()

    // S pointer
    ctx.beginPath()
    ctx.moveTo(cx, cy + r)
    ctx.lineTo(cx + r * 0.35, cy - r * 0.5)
    ctx.lineTo(cx, cy)
    ctx.closePath()
    ctx.fillStyle = '#888'
    ctx.fill()

    // N label
    ctx.globalAlpha = 0.9
    ctx.fillStyle = '#fff'
    ctx.font = 'bold 8px monospace'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText('N', cx, cy - r - 6)

    ctx.restore()
  }

  // -------------------------------------------------------------------------
  // RENDER
  // -------------------------------------------------------------------------
  const loggedCount = inventory.filter(b => b.location).length

  return (
    <div style={{ padding: '12px' }}>

      {/* Stats bar */}
      <div style={{
        display: 'flex',
        gap: '12px',
        marginBottom: '12px',
        flexWrap: 'wrap',
        alignItems: 'center',
      }}>

        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px' }}>
          <span style={{
            fontSize: '18px', fontWeight: 'bold',
            color: '#D4A843', fontFamily: 'monospace',
          }}>
            {loggedCount}
          </span>
          <span style={{ fontSize: '10px', color: '#666', textTransform: 'uppercase' }}>
            GPS Tagged
          </span>
        </div>

        {accuracy !== null && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px' }}>
            <span style={{
              fontSize: '18px', fontWeight: 'bold', fontFamily: 'monospace',
              color: accuracy <= 5 ? '#4a9e4a' : accuracy <= 10 ? '#D4A843' : '#e07070',
            }}>
              ±{accuracy}m
            </span>
            <span style={{ fontSize: '10px', color: '#666', textTransform: 'uppercase' }}>
              Accuracy
            </span>
          </div>
        )}

        {inBounds !== null && (
          <div style={{
            padding: '6px 12px',
            borderRadius: '20px',
            background: inBounds ? '#1a2d1a' : '#2d1a1a',
            border: `1px solid ${inBounds ? '#4a9e4a' : '#9e4a4a'}`,
            color: inBounds ? '#4a9e4a' : '#e07070',
            fontSize: '0.8rem',
            fontWeight: 'bold',
          }}>
            {inBounds ? '✓ Inside Monument' : '⚠ Outside Boundary'}
          </div>
        )}

        <div style={{ flex: 1 }} />

        <button
          onClick={tracking ? stopTracking : startTracking}
          style={{
            padding: '8px 16px',
            borderRadius: '20px',
            border: 'none',
            background: tracking ? '#7a3030' : '#D4A843',
            color: tracking ? '#fff' : '#1A1A1A',
            fontWeight: 'bold',
            fontSize: '0.85rem',
            cursor: 'pointer',
            transition: 'background 0.2s',
          }}
        >
          {tracking ? '⏹ Stop' : '▶ Track Me'}
        </button>
      </div>

      {/* Legend */}
      <div style={{
        display: 'flex',
        gap: '16px',
        marginBottom: '10px',
        fontSize: '11px',
        color: '#666',
        flexWrap: 'wrap',
      }}>
        <span>
          <span style={{ color: '#C8A95A' }}>■</span> Brick sections (S1–S4)
        </span>
        <span>
          <span style={{ color: '#8B7340' }}>■</span> Border sections (S5–S6)
        </span>
        <span>
          <span style={{ color: '#4A6B8A' }}>■</span> Bay sections (S7–S8)
        </span>
        <span>
          <span style={{ color: '#D4A843' }}>●</span> Logged paver
        </span>
        {tracking && (
          <span>
            <span style={{ color: '#64C8FF' }}>●</span> You
          </span>
        )}
      </div>

      {/* Canvas map */}
      <div style={{
        border: '1px solid #2a2a2a',
        borderRadius: '12px',
        overflow: 'hidden',
        background: '#111',
        boxShadow: '0 4px 24px rgba(0,0,0,0.5)',
      }}>
        <canvas
          ref={canvasRef}
          width={380}
          height={500}
          style={{ width: '100%', height: 'auto', display: 'block' }}
        />
      </div>

      <p style={{
        color: '#444',
        fontSize: '11px',
        textAlign: 'center',
        marginTop: '8px',
      }}>
        {tracking
          ? 'Live tracking active — move slowly for best accuracy'
          : 'Tap ▶ Track Me to show your live position on the map'}
      </p>
    </div>
  )
}
