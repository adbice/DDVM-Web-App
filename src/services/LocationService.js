/**
 * LocationService.js
 * DDVM Monument Mapper — David Dewett Veterans Memorial, Coos Bay OR
 *
 * All section polygons derived from 7 verified GPS anchor points captured
 * via Google Maps satellite imagery, with section boundaries computed using
 * physical tape measurements and wall bearing angles.
 *
 * GPS Anchors (ground truth):
 *   SW  = [43.450436, -124.225491]  Left corner, 101 side
 *   LW  = [43.450486, -124.225574]  Left walkway edge, 101 side
 *   RW  = [43.450508, -124.225598]  Right walkway edge, 101 side
 *   SE  = [43.450582, -124.225651]  Right corner, 101 side
 *   NW  = [43.450407, -124.225530]  Left corner, bay side
 *   CB  = [43.450470, -124.225633]  Center bay (splits S7/S8)
 *   NE  = [43.450562, -124.225697]  Right corner, bay side
 *
 * Monument geometry:
 *   101 face bearing:  321.5°
 *   Left wall bearing: 224.3°  (SW → NW)
 *   Right wall bearing: 239.1° (SE → NE)
 *   Bay face bearing:  322.0°  (NW → NE)
 *   Wall angle: 10° (angled wings per blueprint)
 *
 * Layout (left → right, standing on 101 side facing bay):
 *   101 side: S6 border | S4 | S2 | walkway | S1 | S3 | S5 border
 *   Bay side: S7 (left half) | S8 (right half)
 *   S5/S6 are trapezoidal side borders connecting 101 to bay
 *   S7/S8 are the bay-side rows (~35" wide), separated from 101 sections by pedestals
 *   POW/MIA is a separate area with its own independently verified vertices
 */

// ---------------------------------------------------------------------------
// SECTION POLYGONS
// Each polygon is [lat, lng] vertices in clockwise order:
// [101-left, 101-right, bay-right, bay-left]
// ---------------------------------------------------------------------------
const DEFAULT_POLYGONS = {

  "Section 6": {
    label: "Section 6 — Left Side Border",
    style: "Brick",
    // Trapezoidal: 80" wide at 101 side, 32" wide at bay side
    vertices: [
      [43.450436, -124.225491], // SW corner 101
      [43.450448, -124.225510], // S6 right edge 101
      [43.450413, -124.225536], // S6 right edge bay
      [43.450407, -124.225530], // NW corner bay
    ]
  },

  "Section 4": {
    label: "Section 4 — Left Wing (outer)",
    style: "Brick",
    vertices: [
      [43.450448, -124.225510], // S4 left 101
      [43.450473, -124.225553], // S4 right 101
      [43.450447, -124.225594], // S4 right bay
      [43.450420, -124.225550], // S4 left bay
    ]
  },

  "Section 2": {
    label: "Section 2 — Left Wing (inner)",
    style: "Brick",
    vertices: [
      [43.450473, -124.225553], // S2 left 101
      [43.450486, -124.225574], // S2 right 101 (left walkway edge)
      [43.450461, -124.225616], // S2 right bay
      [43.450447, -124.225594], // S2 left bay
    ]
  },

  "Section 1": {
    label: "Section 1 — Right Wing (inner)",
    style: "Brick",
    vertices: [
      [43.450508, -124.225598], // S1 left 101 (right walkway edge)
      [43.450542, -124.225622], // S1 right 101
      [43.450519, -124.225667], // S1 right bay
      [43.450484, -124.225641], // S1 left bay
    ]
  },

  "Section 3": {
    label: "Section 3 — Right Wing (outer)",
    style: "Brick",
    vertices: [
      [43.450542, -124.225622], // S3 left 101
      [43.450566, -124.225639], // S3 right 101
      [43.450545, -124.225685], // S3 right bay
      [43.450519, -124.225667], // S3 left bay
    ]
  },

  "Section 5": {
    label: "Section 5 — Right Side Border",
    style: "Brick",
    // Trapezoidal: 80" wide at 101 side, 32" wide at bay side
    vertices: [
      [43.450566, -124.225639], // S5 left 101
      [43.450582, -124.225651], // SE corner 101
      [43.450562, -124.225697], // NE corner bay
      [43.450556, -124.225691], // S5 left bay
    ]
  },

  "Section 7": {
    label: "Section 7 — Bay Side Left",
    style: "Black",
    // ~35" deep strip along bay wall, left half (NW to center bay)
    vertices: [
      [43.450407, -124.225530], // NW corner (outer bay)
      [43.450470, -124.225633], // Center bay (outer)
      [43.450475, -124.225624], // Center bay (inner, toward 101)
      [43.450413, -124.225522], // NW inner (toward 101)
    ]
  },

  "Section 8": {
    label: "Section 8 — Bay Side Right",
    style: "Black",
    // ~35" deep strip along bay wall, right half (center bay to NE)
    vertices: [
      [43.450470, -124.225633], // Center bay (outer)
      [43.450562, -124.225697], // NE corner (outer bay)
      [43.450566, -124.225687], // NE inner (toward 101)
      [43.450475, -124.225624], // Center bay (inner, toward 101)
    ]
  },

  "POW/MIA Section": {
    label: "POW/MIA Section",
    style: "Black",
    // Separately verified GPS vertices — independent of main monument
    vertices: [
      [43.450411, -124.225439],
      [43.450474, -124.225564],
      [43.450476, -124.225550],
      [43.450365, -124.225333],
    ]
  },
}

// ---------------------------------------------------------------------------
// REFERENCE ANCHORS (for calibration UI)
// ---------------------------------------------------------------------------
const REFERENCE_ANCHORS = {
  SW:  { lat: 43.450436, lng: -124.225491, label: "SW — Left Corner 101" },
  NW:  { lat: 43.450407, lng: -124.225530, label: "NW — Left Corner Bay" },
  SE:  { lat: 43.450582, lng: -124.225651, label: "SE — Right Corner 101" },
  NE:  { lat: 43.450562, lng: -124.225697, label: "NE — Right Corner Bay" },
  LW:  { lat: 43.450486, lng: -124.225574, label: "Left Walkway Edge (101)" },
  RW:  { lat: 43.450508, lng: -124.225598, label: "Right Walkway Edge (101)" },
  CB:  { lat: 43.450470, lng: -124.225633, label: "Center Bay (S7/S8 split)" },
}

// ---------------------------------------------------------------------------
// STORAGE
// ---------------------------------------------------------------------------
const STORAGE_KEY        = 'ddvm_calibrated_polygons'
const ANCHOR_STORAGE_KEY = 'ddvm_calibrated_anchors'

function loadPolygons() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved) {
      const parsed = JSON.parse(saved)
      return { ...DEFAULT_POLYGONS, ...parsed }
    }
  } catch (e) {
    console.warn('Failed to load calibrated polygons, using defaults:', e)
  }
  return { ...DEFAULT_POLYGONS }
}

function savePolygons(polygons) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(polygons))
  } catch (e) {
    console.error('Failed to save calibrated polygons:', e)
  }
}

function loadCalibratedAnchors() {
  try {
    const saved = localStorage.getItem(ANCHOR_STORAGE_KEY)
    return saved ? JSON.parse(saved) : {}
  } catch (e) {
    return {}
  }
}

function saveCalibratedAnchors(anchors) {
  try {
    localStorage.setItem(ANCHOR_STORAGE_KEY, JSON.stringify(anchors))
  } catch (e) {
    console.error('Failed to save calibrated anchors:', e)
  }
}

// ---------------------------------------------------------------------------
// GEOMETRY HELPERS
// ---------------------------------------------------------------------------
function pointInPolygon(point, polygon) {
  const [px, py] = point
  let inside = false
  const n = polygon.length
  for (let i = 0, j = n - 1; i < n; j = i++) {
    const [xi, yi] = polygon[i]
    const [xj, yj] = polygon[j]
    const intersects =
      yi > py !== yj > py &&
      px < ((xj - xi) * (py - yi)) / (yj - yi) + xi
    if (intersects) inside = !inside
  }
  return inside
}

function haversineDistance(lat1, lng1, lat2, lng2) {
  const R = 6371000
  const dLat = ((lat2 - lat1) * Math.PI) / 180
  const dLng = ((lng2 - lng1) * Math.PI) / 180
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
    Math.cos((lat2 * Math.PI) / 180) *
    Math.sin(dLng / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

// ---------------------------------------------------------------------------
// LOCATION SERVICE
// ---------------------------------------------------------------------------
const LocationService = {

  async getCurrentPosition() {
    if (!navigator.geolocation) {
      throw new Error("Geolocation is not supported by this device.")
    }
    return new Promise((resolve, reject) => {
      let attempts = 0
      const attempt = () => {
        navigator.geolocation.getCurrentPosition(
          pos => resolve({
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
            accuracy: pos.coords.accuracy,
            timestamp: pos.timestamp,
          }),
          err => {
            attempts++
            if (attempts < 3) setTimeout(attempt, 1500)
            else reject(new Error(`GPS unavailable: ${err.message}`))
          },
          { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
        )
      }
      attempt()
    })
  },

  detectSection(lat, lng) {
    const polygons = loadPolygons()
    for (const [name, config] of Object.entries(polygons)) {
      if (pointInPolygon([lat, lng], config.vertices)) {
        return { section: name, label: config.label, style: config.style }
      }
    }
    return null
  },

  findNearestSection(lat, lng) {
    const polygons = loadPolygons()
    let closest = null
    let minDist = Infinity
    for (const [name, config] of Object.entries(polygons)) {
      const centLat = config.vertices.reduce((s, v) => s + v[0], 0) / config.vertices.length
      const centLng = config.vertices.reduce((s, v) => s + v[1], 0) / config.vertices.length
      const d = haversineDistance(lat, lng, centLat, centLng)
      if (d < minDist) {
        minDist = d
        closest = {
          section: name,
          label: config.label,
          style: config.style,
          distanceMeters: Math.round(d)
        }
      }
    }
    return closest
  },

  async autoDetectSection() {
    const { lat, lng, accuracy } = await this.getCurrentPosition()
    const accuracyWarning = accuracy > 10
      ? `⚠️ GPS accuracy is ${Math.round(accuracy)}m — move to open sky for better results.`
      : null
    const exact = this.detectSection(lat, lng)
    if (exact) return { ...exact, confidence: 'high', accuracy, accuracyWarning, lat, lng }
    const nearest = this.findNearestSection(lat, lng)
    return { ...nearest, confidence: 'low', accuracy, accuracyWarning, lat, lng }
  },

  async calibrateAnchor(sectionName, vertexIndex) {
    const { lat, lng, accuracy } = await this.getCurrentPosition()
    const polygons = loadPolygons()
    if (!polygons[sectionName]) throw new Error(`Unknown section: ${sectionName}`)
    polygons[sectionName].vertices[vertexIndex] = [lat, lng]
    savePolygons(polygons)
    const anchors = loadCalibratedAnchors()
    const key = `${sectionName}_v${vertexIndex}`
    anchors[key] = {
      lat, lng, accuracy,
      timestamp: new Date().toISOString(),
      label: `${sectionName} vertex ${vertexIndex}`
    }
    saveCalibratedAnchors(anchors)
    return { lat, lng, accuracy }
  },

  async calibrateReferenceAnchor(anchorKey) {
    const { lat, lng, accuracy } = await this.getCurrentPosition()
    const anchors = loadCalibratedAnchors()
    anchors[`REF_${anchorKey}`] = { lat, lng, accuracy, timestamp: new Date().toISOString() }
    saveCalibratedAnchors(anchors)
    return { lat, lng, accuracy }
  },

  resetCalibration() {
    try {
      localStorage.removeItem(STORAGE_KEY)
      localStorage.removeItem(ANCHOR_STORAGE_KEY)
      return true
    } catch (e) {
      return false
    }
  },

  getCalibrationHistory() {
    return loadCalibratedAnchors()
  },

  getCalibrationStatus() {
    const anchors = loadCalibratedAnchors()
    const total = Object.keys(DEFAULT_POLYGONS).reduce(
      (sum, sec) => sum + DEFAULT_POLYGONS[sec].vertices.length, 0
    )
    const calibrated = Object.keys(anchors).filter(k => !k.startsWith('REF_')).length
    return { calibrated, total, percent: Math.round((calibrated / total) * 100) }
  },

  getExpectedStyle(sectionName) {
    const polygons = loadPolygons()
    return polygons[sectionName]?.style ?? null
  },

  getAllSections() {
    return loadPolygons()
  },

  getReferenceAnchors() {
    return REFERENCE_ANCHORS
  },

  isInsideMonument(lat, lng) {
    const polygons = loadPolygons()
    return Object.values(polygons).some(s => pointInPolygon([lat, lng], s.vertices))
  },

  haversineDistance,
}

export default LocationService
