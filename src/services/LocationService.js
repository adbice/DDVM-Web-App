/**
 * LocationService.js
 * DDVM Monument Mapper — David Dewett Veterans Memorial, Coos Bay OR
 *
 * Layout (left to right, 101 side at bottom, bay at top):
 *   Sec6 | Sec4 | Sec2 | walkway | Sec1 | Sec3 | Sec5   (101 side)
 *   Sec6 |←—— Sec7 ——→|←—— Sec8 ——→| Sec5              (bay side)
 *
 * Coordinates derived from:
 *   - Real GPS corner pins (4 monument corners + walkway corners)
 *   - Physical tape measurements:
 *     Sec4: 28'5" x 7'10 3/8", Sec2: 14'4.5", Sec1: 14'5" x 7'10 3/8"
 *     Sec3: 10'5.25", Sec7&8: 2'11.75" wide x 34' long
 *     Sec6&5: 4 rows (bay) / 10 rows (101) x 8" pavers
 *     Walkway: 4' at 101, opens to 10' at bay
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
  CENTER_BAY_101:     { lat: 43.450430, lng: -124.225544, label: "Center Bay 101 side" },
  CENTER_BAY:         { lat: 43.450489, lng: -124.225658, label: "Center Bay" },
  POW_FRONT:          { lat: 43.450365, lng: -124.225333, label: "POW/MIA Front" },
}

const DEFAULT_POLYGONS = {

  "Section 6": {
    label: "Section 6 — Left Side Wall",
    style: "Brick",
    vertices: [
      [43.450444, -124.225528],  // Left corner 101 (SW)
      [43.450456, -124.225539],  // Sec6/Sec4 boundary 101
      [43.450445, -124.225606],  // Sec6/Sec7 boundary bay
      [43.450404, -124.225570],  // Left bay (NW)
    ]
  },

  "Section 4": {
    label: "Section 4 — 101 Side",
    style: "Brick",
    vertices: [
      [43.450456, -124.225539],  // Sec6/Sec4 101
      [43.450508, -124.225588],  // Sec4/Sec2 101
      [43.450491, -124.225610],  // Sec4/Sec2 bay edge
      [43.450439, -124.225557],  // Sec6/Sec4 bay edge
    ]
  },

  "Section 2": {
    label: "Section 2 — 101 Side",
    style: "Brick",
    vertices: [
      [43.450508, -124.225588],  // Sec4/Sec2 101
      [43.450530, -124.225572],  // Left walkway 101
      [43.450519, -124.225635],  // Left walkway bay edge
      [43.450494, -124.225607],  // Sec4/Sec2 bay edge
    ]
  },

  "Section 1": {
    label: "Section 1 — 101 Side Right of Walkway",
    style: "Brick",
    vertices: [
      [43.450533, -124.225615],  // Right walkway 101
      [43.450569, -124.225644],  // Sec1/Sec3 101
      [43.450555, -124.225668],  // Sec1/Sec3 bay edge
      [43.450529, -124.225639],  // Right walkway bay edge
    ]
  },

  "Section 3": {
    label: "Section 3 — 101 Side",
    style: "Brick",
    vertices: [
      [43.450569, -124.225644],  // Sec1/Sec3 101
      [43.450588, -124.225662],  // Sec3/Sec5 101
      [43.450575, -124.225686],  // Sec3/Sec5 bay edge
      [43.450557, -124.225664],  // Sec1/Sec3 bay edge
    ]
  },

  "Section 5": {
    label: "Section 5 — Right Side Wall",
    style: "Brick",
    vertices: [
      [43.450588, -124.225662],  // Sec3/Sec5 101
      [43.450600, -124.225673],  // Right corner 101 (SE)
      [43.450576, -124.225721],  // Right bay (NE)
      [43.450535, -124.225685],  // Sec8/Sec5 boundary bay
    ]
  },

  "Section 7": {
    label: "Section 7 — Bay Side Left",
    style: "Black",
    vertices: [
      [43.450444, -124.225528],  // Left corner 101 (SW)
      [43.450530, -124.225572],  // Left walkway 101
      [43.450490, -124.225645],  // Sec7/Sec8 center bay
      [43.450445, -124.225606],  // Sec6/Sec7 boundary bay
    ]
  },

  "Section 8": {
    label: "Section 8 — Bay Side Right",
    style: "Black",
    vertices: [
      [43.450533, -124.225615],  // Right walkway 101
      [43.450600, -124.225673],  // Right corner 101 (SE)
      [43.450535, -124.225685],  // Sec8/Sec5 boundary bay
      [43.450490, -124.225645],  // Sec7/Sec8 center bay
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
