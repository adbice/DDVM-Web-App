/**
 * LocationService.js
 * DDVM Monument Mapper — David Dewett Veterans Memorial, Coos Bay OR
 *
 * Monument is two rectangular wings meeting at center walkway entrance.
 * Wings run at ~326° bearing (NW-SE orientation), 10° wall angle.
 *
 * All polygon coordinates derived from:
 *   - Real GPS corner pins (4 monument corners + walkway corners)
 *   - Physical measurements + bearing angles calculated from GPS corners
 *   - Monument bearing: 326.0° along 101 side
 *   - Left wall bearing: 217.3°, Right wall bearing: 235.4°
 */

const REFERENCE_ANCHORS = {
  LEFT_CORNER_101:    { lat: 43.450444, lng: -124.225528, label: "Left Corner 101 (SW)" },
  LEFT_BAY:           { lat: 43.450404, lng: -124.225570, label: "Left Bay (NW)" },
  RIGHT_CORNER_101:   { lat: 43.450600, lng: -124.225673, label: "Right Corner 101 (SE)" },
  RIGHT_BAY:          { lat: 43.450576, lng: -124.225721, label: "Right Bay (NE)" },
  L_WALKWAY_101:      { lat: 43.450530, lng: -124.225572, label: "Left Walkway 101" },
  L_WALKWAY_MEMORIAL: { lat: 43.450501, lng: -124.225602, label: "Left Walkway Memorial" },
  R_WALKWAY_101:      { lat: 43.450533, lng: -124.225615, label: "Right Walkway 101" },
  R_WALKWAY_MEMORIAL: { lat: 43.450530, lng: -124.225634, label: "Right Walkway Memorial" },
  POW_FRONT:          { lat: 43.450365, lng: -124.225333, label: "POW/MIA Front" },
}

const DEFAULT_POLYGONS = {

  "Section 6": {
    label: "Section 6 — Left Side Wall",
    style: "Brick",
    vertices: [
      [43.450444, -124.225528],
      [43.450459, -124.225542],
      [43.450453, -124.225548],
      [43.450438, -124.225534],
    ]
  },

  "Section 4": {
    label: "Section 4 — Left Wing",
    style: "Brick",
    vertices: [
      [43.450459, -124.225542],
      [43.450524, -124.225602],
      [43.450507, -124.225620],
      [43.450442, -124.225560],
    ]
  },

  "Section 2": {
    label: "Section 2 — Left Wing",
    style: "Brick",
    vertices: [
      [43.450524, -124.225602],
      [43.450557, -124.225632],
      [43.450540, -124.225650],
      [43.450507, -124.225620],
    ]
  },

  "Section 1": {
    label: "Section 1 — Right Wing",
    style: "Brick",
    vertices: [
      [43.450561, -124.225637],
      [43.450528, -124.225607],
      [43.450516, -124.225631],
      [43.450549, -124.225661],
    ]
  },

  "Section 3": {
    label: "Section 3 — Right Wing",
    style: "Brick",
    vertices: [
      [43.450585, -124.225659],
      [43.450561, -124.225637],
      [43.450549, -124.225661],
      [43.450573, -124.225683],
    ]
  },

  "Section 5": {
    label: "Section 5 — Right Side Wall",
    style: "Brick",
    vertices: [
      [43.450600, -124.225673],
      [43.450585, -124.225659],
      [43.450581, -124.225667],
      [43.450596, -124.225681],
    ]
  },

  "Section 7": {
    label: "Section 7 — Bay Side Left",
    style: "Black",
    vertices: [
      [43.450404, -124.225570],
      [43.450481, -124.225642],
      [43.450487, -124.225635],
      [43.450410, -124.225563],
    ]
  },

  "Section 8": {
    label: "Section 8 — Bay Side Right",
    style: "Black",
    vertices: [
      [43.450576, -124.225721],
      [43.450499, -124.225649],
      [43.450504, -124.225640],
      [43.450581, -124.225712],
    ]
  },

  "POW/MIA Section": {
    label: "POW/MIA Section",
    style: "Black",
    vertices: [
      [43.450411, -124.225439],
      [43.450474, -124.225564],
      [43.450476, -124.225550],
      [43.450365, -124.225333],
    ]
  }
}

const STORAGE_KEY = 'ddvm_calibrated_polygons'
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
      const dist = haversineDistance(lat, lng, centLat, centLng)
      if (dist < minDist) {
        minDist = dist
        closest = {
          section: name,
          label: config.label,
          style: config.style,
          distanceMeters: Math.round(dist)
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
