import { useState, useEffect, useRef } from 'react'
import LocationService from '../services/LocationService.js'

const SECTIONS = LocationService.getAllSections()

// Convert GPS lat/lng to canvas x/y pixels
function gpsToCanvas(lat, lng, bounds, canvasW, canvasH) {
  const x = ((lng - bounds.minLng) / (bounds.maxLng - bounds.minLng)) * canvasW
  const y = ((bounds.maxLat - lat) / (bounds.maxLat - bounds.minLat)) * canvasH
  return { x, y }
}

function getBounds() {
  let minLat = Infinity, maxLat = -Infinity
  let minLng = Infinity, maxLng = -Infinity
  Object.values(SECTIONS).forEach(sec => {
    sec.vertices.forEach(([lat, lng]) => {
      if (lat < minLat) minLat = lat
      if (lat > maxLat) maxLat = lat
      if (lng < minLng) minLng = lng
      if (lng > maxLng) maxLng = lng
    })
  })
  // Add padding
  const latPad = (maxLat - minLat) * 0.15
  const lngPad = (maxLng - minLng) * 0.15
  return {
    minLat: minLat - latPad,
    maxLat: maxLat + latPad,
    minLng: minLng - lngPad,
    maxLng: maxLng + lngPad
  }
}

const SECTION_COLORS = {
  'Section 1': '#4a6fa5',
  'Section 2': '#5a7fb5',
  'Section 3': '#6a8fc5',
  'Section 4': '#7a9fd5',
  'Section 5': '#8aafb5',
  'Section 6': '#9abfc5',
  'Section 7': '#6a9e6a',
  'Section 8': '#7aae7a',
  'POW/MIA Section': '#9e6a6a',
}

export default function LiveMap({ inventory }) {
  const canvasRef  = useRef(null)
  const [position, setPosition]   = useState(null)
  const [tracking, setTracking]   = useState(false)
  const [accuracy, setAccuracy]   = useState(null)
  const [inBounds, setInBounds]   = useState(null)
  const watchRef   = useRef(null)
  const bounds     = getBounds()

  useEffect(() => {
    drawMap()
  }, [inventory, position])

  useEffect(() => {
    return () => {
      if (watchRef.current) navigator.geolocation.clearWatch(watchRef.current)
    }
  }, [])

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

  function drawMap() {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    const W = canvas.width
    const H = canvas.height

    ctx.clearRect(0, 0, W, H)

    // Draw section polygons
    Object.entries(SECTIONS).forEach(([name, config]) => {
      const pts = config.vertices.map(([lat, lng]) =>
        gpsToCanvas(lat, lng, bounds, W, H)
      )

      ctx.beginPath()
      ctx.moveTo(pts[0].x, pts[0].y)
      pts.slice(1).forEach(p => ctx.lineTo(p.x, p.y))
      ctx.closePath()
      ctx.fillStyle = (SECTION_COLORS[name] || '#555') + '33' // transparent fill
      ctx.fill()
      ctx.strokeStyle = SECTION_COLORS[name] || '#555'
      ctx.lineWidth = 2
      ctx.stroke()

      // Section label
      const centX = pts.reduce((s, p) => s + p.x, 0) / pts.length
      const centY = pts.reduce((s, p) => s + p.y, 0) / pts.length
      ctx.fillStyle = '#fff'
      ctx.font = 'bold 10px monospace'
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText(name.replace('Section ', 'S'), centX, centY)
    })

    // Draw logged pavers as dots
    inventory.forEach(brick => {
      if (!brick.location) return
      const parts = brick.location.split(',')
      if (parts.length !== 2) return
      const lat = parseFloat(parts[0])
      const lng = parseFloat(parts[1])
      if (isNaN(lat) || isNaN(lng)) return

      const { x, y } = gpsToCanvas(lat, lng, bounds, W, H)
      ctx.beginPath()
      ctx.arc(x, y, 5, 0, Math.PI * 2)
      ctx.fillStyle = '#D4A843'
      ctx.fill()
      ctx.strokeStyle = '#fff'
      ctx.lineWidth = 1
      ctx.stroke()
    })

    // Draw current position
    if (position) {
      const { x, y } = gpsToCanvas(position.lat, position.lng, bounds, W, H)

      // Accuracy circle
      ctx.beginPath()
      ctx.arc(x, y, 12, 0, Math.PI * 2)
      ctx.fillStyle = 'rgba(100, 200, 255, 0.15)'
      ctx.fill()
      ctx.strokeStyle = 'rgba(100, 200, 255, 0.5)'
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

  const loggedCount = inventory.filter(b => b.location).length

  return (
    <div style={{ padding: '12px' }}>

      {/* Stats */}
      <div style={{
        display: 'flex',
        gap: '12px',
        marginBottom: '12px',
        flexWrap: 'wrap',
        alignItems: 'center'
      }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px' }}>
          <span style={{ fontSize: '18px', fontWeight: 'bold', color: '#D4A843', fontFamily: 'monospace' }}>
            {loggedCount}
          </span>
          <span style={{ fontSize: '10px', color: '#666', textTransform: 'uppercase' }}>GPS Tagged</span>
        </div>

        {accuracy !== null && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px' }}>
            <span style={{
              fontSize: '18px', fontWeight: 'bold', fontFamily: 'monospace',
              color: accuracy <= 5 ? '#4a9e4a' : accuracy <= 10 ? '#D4A843' : '#e07070'
            }}>
              ±{accuracy}m
            </span>
            <span style={{ fontSize: '10px', color: '#666', textTransform: 'uppercase' }}>Accuracy</span>
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
            fontWeight: 'bold'
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
            background: tracking ? '#9e4a4a' : '#D4A843',
            color: tracking ? '#fff' : '#1A1A1A',
            fontWeight: 'bold',
            fontSize: '0.85rem',
            cursor: 'pointer'
          }}
        >
          {tracking ? '⏹ Stop' : '▶ Track Me'}
        </button>
      </div>

      {/* Legend */}
      <div style={{
        display: 'flex', gap: '16px',
        marginBottom: '10px', fontSize: '11px', color: '#888'
      }}>
        <span>🟡 Logged paver</span>
        <span>🔵 Your position</span>
      </div>

      {/* Canvas map */}
      <div style={{
        border: '1px solid #333',
        borderRadius: '12px',
        overflow: 'hidden',
        background: '#111'
      }}>
        <canvas
          ref={canvasRef}
          width={360}
          height={480}
          style={{ width: '100%', height: 'auto', display: 'block' }}
        />
      </div>

      <p style={{ color: '#444', fontSize: '11px', textAlign: 'center', marginTop: '8px' }}>
        Tap ▶ Track Me to show your live position on the map
      </p>
    </div>
  )
}
