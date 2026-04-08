/**
 * LocationService.js
 * DDVM Monument Mapper — David Dewett Veterans Memorial, Coos Bay OR
 *
 * Physical layout (left to right facing monument from 101 side):
 *
 *  [BAY SIDE - water]
 *  Sec 7 |centerline| Sec 8
 *  |                              |
 *  Sec 6 | Sec 4 | Sec 2 | WALKWAY | Sec 1 | Sec 3 | Sec 5
 *  |                              |
 *  [HWY 101 SIDE]
 *
 * Sections 6 & 5 are full-length side walls (101 to bay).
 * Sections 7 & 8 cap the bay end, meeting at the centerline.
 * Walkway splits left sections (6,4,2) from right sections (5,1,3).
 *
 * ON-SITE CALIBRATION:
 * Call calibrateAnchor(sectionName, vertexIndex) while standing at each
 * physical corner. Calibrated points are saved to localStorage and override
 * these defaults automatically on every future load — no code changes needed.
 * Call resetCalibration() to go back to defaults if needed.
 */

// ─────────────────────────────────────────────────────────────────────────────
// REFERENCE ANCHORS — Physical landmarks for cross-checking GPS accuracy
// ─────────────────────────────────────────────────────────────────────────────
const REFERENCE_ANCHORS = {
  LEFT_CORNER_101:    { lat: 43.450444, lng: -124.225528, label: "Left Corner 101 Side (SW)" },
  LEFT_BAY:           { lat: 43.450404, lng: -124.225570, label: "Left Bay Side (NW)" },
  RIGHT_CORNER_101:   { lat: 43.450600, lng: -124.225673, label: "Right Corner 101 Side (SE)" },
  RIGHT_BAY:          { lat: 43.450576, lng: -124.225721, label: "Right Bay Side (NE)" },
  L_WALKWAY_101:      { lat: 43.450530, lng: -124.225572, label: "Left Walkway 101 Side" },
  L_WALKWAY_MEMORIAL: { lat: 43.450501, lng: -124.225602, label: "Left Walkway Memorial Side" },
  R_WALKWAY_101:      { lat: 43.450533, lng: -124.225615, label: "Right Walkway 101 Side" },
  R_WALKWAY_MEMORIAL: { lat: 43.450530, lng: -124.225634, label: "Right Walkway Memorial Side" },
  CENTER_BAY_101:     { lat: 43.450430, lng: -124.225544, label: "Center Bay (101 side of centerline)" },
  CENTER_BAY:         { lat: 43.450489, lng: -124.225658, label: "Center Bay Side" },
  CENTER_MEMORIAL:    { lat: 43.450497, lng: -124.225650, label: "Center Memorial Side" },
  POW_FRONT:          { lat: 43.450365, lng: -124.225333, label: "POW/MIA Front" },
}

// ─────────────────────────────────────────────────────────────────────────────
// DEFAULT SECTION POLYGONS
// Vertices in clockwise order: 101-left, 101-right, bay-right, bay-left
// Proportionally interpolated from your real GPS corner pins.
//
// Grid layout reference:
//   Sec 4: cols M–AB, rows 29–52 (left to right, top to bottom)
//   Sec 2: cols AC–AX, rows 29–52
//   Sec 1: cols BO–CJ, rows 29–52 (right to left)
//   Sec 3: cols CK–CZ, rows 29–52 (right to left)
//   Sec 6: cols B–F (left side wall, full length)
//   Sec 5: cols DG–DK (right side wall, full length)
//   Sec 7 & 8: bay end, split at centerline
// ─────────────────────────────────────────────────────────────────────────────
const DEFAULT_POLYGONS = {

  "Section 6": {
    label: "Section 6 — Left Side Wall",
    style: "Brick",
    // Full length left wall, SW corner to NW corner
    // Cols B-F in map grid (5 of 43 cols on left side)
    vertices: [
      [43.450444, -124.225528],  // Left corner 101 (SW)
      [43.450454, -124.225533],  // Sec6/Sec4 boundary 101 side
      [43.450415, -124.225574],  // Sec6/Sec4 boundary bay side
      [43.450404, -124.225570],  // Left bay (NW)
    ]
  },

  "Section 4": {
    label: "Section 4 — 101 Side",
    style: "Brick",
    // Cols M-AB in map grid (16 of 43 cols on left side)
    vertices: [
      [43.450454, -124.225533],  // Sec6/Sec4 boundary 101
      [43.450486, -124.225549],  // Sec4/Sec2 boundary 101
      [43.450451, -124.225586],  // Sec4/Sec2 boundary bay
      [43.450415, -124.225574],  // Sec6/Sec4 boundary bay
    ]
  },

  "Section 2": {
    label: "Section 2 — 101 Side",
    style: "Brick",
    // Cols AC-AX in map grid (22 of 43 cols on left side)
    vertices: [
      [43.450486, -124.225549],  // Sec4/Sec2 boundary 101
      [43.450530, -124.225572],  // Left walkway 101 side
      [43.450501, -124.225602],  // Left walkway memorial side
      [43.450451, -124.225586],  // Sec4/Sec2 boundary bay
    ]
  },

  "Section 1": {
    label: "Section 1 — 101 Side Right of Walkway",
    style: "Brick",
    // Cols BO-CJ in map grid (22 of 43 cols on right side, counts R to L)
    vertices: [
      [43.450533, -124.225615],  // Right walkway 101 side
      [43.450567, -124.225645],  // Sec1/Sec3 boundary 101
      [43.450554, -124.225679],  // Sec1/Sec3 boundary bay
      [43.450530, -124.225634],  // Right walkway memorial side
    ]
  },

  "Section 3": {
    label: "Section 3 — 101 Side",
    style: "Brick",
    // Cols CK-CZ in map grid (16 of 43 cols on right side, counts R to L)
    vertices: [
      [43.450567, -124.225645],  // Sec1/Sec3 boundary 101
      [43.450592, -124.225666],  // Sec3/Sec5 boundary 101
      [43.450571, -124.225711],  // Sec3/Sec5 boundary bay
      [43.450554, -124.225679],  // Sec1/Sec3 boundary bay
    ]
  },

  "Section 5": {
    label: "Section 5 — Right Side Wall",
    style: "Brick",
    // Full length right wall, SE corner to NE corner
    // Cols DG-DK in map grid (5 of 43 cols on right side)
    vertices: [
      [43.450592, -124.225666],  // Sec3/Sec5 boundary 101
      [43.450600, -124.225673],  // Right corner 101 (SE)
      [43.450576, -124.225721],  // Right bay (NE)
      [43.450571, -124.225711],  // Sec3/Sec5 boundary bay
    ]
  },

  "Section 7": {
    label: "Section 7 — Bay Side Left",
    style: "Black",
    // Bay end left half — NW corner to centerline
    vertices: [
      [43.450404, -124.225570],  // Left bay (NW)
      [43.450430, -124.225544],  // Centerline 101 side
      [43.450489, -124.225658],  // Centerline bay side
      [43.450497, -124.225650],  // Center memorial side
    ]
  },

  "Section 8": {
    label: "Section 8 — Bay Side Right",
    style: "Black",
    // Bay end right half — centerline to NE corner
    vertices: [
      [43.450430, -124.225544],  // Centerline 101 side
      [43.450576, -124.225721],  // Right bay (NE)
      [43.450497, -124.225650],  // Center memorial side
      [43.450489, -124.225658],  // Centerline bay side
    ]
  },

  "POW/MIA Section": {
    label: "POW/MIA Section — Separate Area",
    style: "Black",
    // Standalone area near the star monument
    // Approximate boundary — refine with calibrateAnchor() on site
    vertices: [
      [43.450355, -124.225323],
      [43.450375, -124.225323],
      [43.450375, -124.225343],
      [43.450355, -124.225343],
    ]
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// LOCALSTORAGE PERSISTENCE
// Calibrated polygons saved here override defaults on every load.
// No code changes needed after on-site calibration.
// ─────────────────────────────────────────────────────────────────────────────
const STORAGE_KEY = 'ddvm_calibrated_polygons'
const ANCHOR_STORAGE_KEY = 'ddvm_calibrated_anchors'

function loadPolygons() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved) {
      const parsed = JSON.parse(saved)
      // Merge saved over defaults — saved data wins per section
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

// ─────────────────────────────────────────────────────────────────────────────
// CORE GEOMETRY — Ray Casting Point-in-Polygon
// Works for any polygon shape including non-orthogonal angled boundaries.
// ─────────────────────────────────────────────────────────────────────────────
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

// ─────────────────────────────────────────────────────────────────────────────
// PUBLIC API
// ─────────────────────────────────────────────────────────────────────────────
const LocationService = {

  /**
   * Captures high-accuracy GPS from the device.
   * Retries up to 3 times before rejecting.
   */
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
            if (attempts < 3) {
              console.warn(`GPS attempt ${attempts} failed, retrying...`, err)
              setTimeout(attempt, 1500)
            } else {
              reject(new Error(`GPS unavailable after 3 attempts: ${err.message}`))
            }
          },
          { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
        )
      }
      attempt()
    })
  },

  /**
   * Detects which section contains the given GPS coordinate.
   * Returns section info or null if outside all defined polygons.
   */
  detectSection(lat, lng) {
    const polygons = loadPolygons()
    for (const [name, config] of Object.entries(polygons)) {
      if (pointInPolygon([lat, lng], config.vertices)) {
        return { section: name, label: config.label, style: config.style }
      }
    }
    return null
  },

  /**
   * Finds the nearest section by centroid distance.
   * Used as fallback when GPS drifts outside polygon boundaries.
   */
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

  /**
   * Full auto-detect flow: polygon match first, centroid fallback second.
   * Returns confidence level and accuracy warning for UI display.
   */
  async autoDetectSection() {
    const { lat, lng, accuracy } = await this.getCurrentPosition()

    const accuracyWarning = accuracy > 10
      ? `⚠️ GPS accuracy is ${Math.round(accuracy)}m — move to open sky for better results.`
      : null

    const exact = this.detectSection(lat, lng)
    if (exact) {
      return { ...exact, confidence: 'high', accuracy, accuracyWarning, lat, lng }
    }

    const nearest = this.findNearestSection(lat, lng)
    return { ...nearest, confidence: 'low', accuracy, accuracyWarning, lat, lng }
  },

  /**
   * ON-SITE CALIBRATION — Call this while physically standing at a section corner.
   * Captures current GPS and saves it as the vertex for that section.
   * Persists to localStorage — no code changes needed.
   *
   * @param {string} sectionName - e.g. "Section 4"
   * @param {number} vertexIndex - 0=101-left, 1=101-right, 2=bay-right, 3=bay-left
   * @returns {Promise<{lat, lng, accuracy}>}
   *
   * USAGE IN APP:
   *   await LocationService.calibrateAnchor('Section 4', 0)
   *   // Standing at the 101-side left corner of Section 4
   */
  async calibrateAnchor(sectionName, vertexIndex) {
    const { lat, lng, accuracy } = await this.getCurrentPosition()
    const polygons = loadPolygons()

    if (!polygons[sectionName]) {
      throw new Error(`Unknown section: ${sectionName}`)
    }

    polygons[sectionName].vertices[vertexIndex] = [lat, lng]
    savePolygons(polygons)

    // Also log to calibration history
    const anchors = loadCalibratedAnchors()
    const key = `${sectionName}_v${vertexIndex}`
    anchors[key] = {
      lat, lng, accuracy,
      timestamp: new Date().toISOString(),
      label: `${sectionName} vertex ${vertexIndex}`
    }
    saveCalibratedAnchors(anchors)

    console.log(
      `✅ Calibrated ${sectionName} vertex ${vertexIndex}: [${lat}, ${lng}] ±${Math.round(accuracy)}m`
    )
    return { lat, lng, accuracy }
  },

  /**
   * Updates a reference anchor point (walkway corners, bay corners, etc.)
   * without touching section polygons.
   *
   * @param {string} anchorKey - Key from REFERENCE_ANCHORS e.g. "L_WALKWAY_101"
   */
  async calibrateReferenceAnchor(anchorKey) {
    const { lat, lng, accuracy } = await this.getCurrentPosition()
    const anchors = loadCalibratedAnchors()
    anchors[`REF_${anchorKey}`] = { lat, lng, accuracy, timestamp: new Date().toISOString() }
    saveCalibratedAnchors(anchors)
    console.log(`✅ Reference anchor ${anchorKey}: [${lat}, ${lng}] ±${Math.round(accuracy)}m`)
    return { lat, lng, accuracy }
  },

  /**
   * Resets all calibrated polygons back to the hardcoded defaults.
   * Use if calibration went wrong or you want a fresh start.
   */
  resetCalibration() {
    try {
      localStorage.removeItem(STORAGE_KEY)
      localStorage.removeItem(ANCHOR_STORAGE_KEY)
      console.log('✅ Calibration reset to defaults.')
      return true
    } catch (e) {
      console.error('Failed to reset calibration:', e)
      return false
    }
  },

  /**
   * Returns all calibration history entries (for admin review).
   */
  getCalibrationHistory() {
    return loadCalibratedAnchors()
  },

  /**
   * Returns how many vertices have been calibrated on-site.
   */
  getCalibrationStatus() {
    const anchors = loadCalibratedAnchors()
    const total = Object.keys(DEFAULT_POLYGONS).reduce(
      (sum, sec) => sum + DEFAULT_POLYGONS[sec].vertices.length, 0
    )
    const calibrated = Object.keys(anchors).filter(k => !k.startsWith('REF_')).length
    return { calibrated, total, percent: Math.round((calibrated / total) * 100) }
  },

  /**
   * Returns the expected paver style for a given section.
   * Used by ValidationService to flag style mismatches.
   */
  getExpectedStyle(sectionName) {
    const polygons = loadPolygons()
    return polygons[sectionName]?.style ?? null
  },

  /**
   * Returns all section configs including any calibrated overrides.
   */
  getAllSections() {
    return loadPolygons()
  },

  /**
   * Returns the static reference anchor definitions.
   */
  getReferenceAnchors() {
    return REFERENCE_ANCHORS
  },

  /**
   * Returns true if the given GPS point falls inside any section polygon.
   */
  isInsideMonument(lat, lng) {
    const polygons = loadPolygons()
    return Object.values(polygons).some(s =>
      pointInPolygon([lat, lng], s.vertices)
    )
  },

  haversineDistance,
}

export default LocationService
