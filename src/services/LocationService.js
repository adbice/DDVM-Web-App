/**
 * LocationService.js
 * DDVM Monument Mapper — Geospatial & Polygon Assignment Engine
 *
 * Handles high-accuracy GPS capture and Point-in-Polygon assignment
 * for the 8 main sections + POW/MIA area, including non-90° angled edges.
 *
 * SETUP INSTRUCTIONS:
 * Replace the placeholder GPS coordinates in SECTION_POLYGONS with real
 * anchor points captured on-site using the calibrateAnchor() function.
 * Each vertex should be captured while standing at that corner of the section.
 */

// ─────────────────────────────────────────────────────────────────────────────
// SECTION POLYGON DEFINITIONS
// Each section is defined by its corner vertices in [lat, lng] order.
// Vertices must be in clockwise or counter-clockwise order (consistent).
//
// HOW TO CALIBRATE ON-SITE:
// 1. Open the app at each physical corner of a section.
// 2. Call calibrateAnchor(sectionId, vertexIndex) to capture the point.
// 3. Saved anchors persist to localStorage and override these defaults.
// ─────────────────────────────────────────────────────────────────────────────

const DEFAULT_POLYGONS = {
  "Section 1": {
    label: "Section 1 — North Pedestal",
    style: "Black",         // Expected paver style for this section
    vertices: [
      // [lat, lng] — REPLACE WITH REAL SITE COORDINATES
      [0.0000, 0.0000],
      [0.0001, 0.0000],
      [0.0001, 0.0001],
      [0.0000, 0.0001],
    ]
  },
  "Section 2": {
    label: "Section 2",
    style: "Black",
    vertices: [
      [0.0002, 0.0000],
      [0.0003, 0.0000],
      [0.0003, 0.0001],
      [0.0002, 0.0001],
    ]
  },
  "Section 3": {
    label: "Section 3",
    style: "Black",
    vertices: [
      [0.0004, 0.0000],
      [0.0005, 0.0000],
      [0.0005, 0.0001],
      [0.0004, 0.0001],
    ]
  },
  "Section 4": {
    label: "Section 4",
    style: "Black",
    vertices: [
      [0.0000, 0.0002],
      [0.0001, 0.0002],
      [0.0001, 0.0003],
      [0.0000, 0.0003],
    ]
  },
  "Section 5": {
    label: "Section 5",
    style: "Brick",
    vertices: [
      [0.0002, 0.0002],
      [0.0003, 0.0002],
      [0.0003, 0.0003],
      [0.0002, 0.0003],
    ]
  },
  "Section 6": {
    label: "Section 6",
    style: "Brick",
    vertices: [
      [0.0004, 0.0002],
      [0.0005, 0.0002],
      [0.0005, 0.0003],
      [0.0004, 0.0003],
    ]
  },
  "Section 7": {
    label: "Section 7",
    style: "Brick",
    vertices: [
      [0.0000, 0.0004],
      [0.0001, 0.0004],
      [0.0001, 0.0005],
      [0.0000, 0.0005],
    ]
  },
  "Section 8": {
    label: "Section 8",
    style: "Brick",
    vertices: [
      [0.0002, 0.0004],
      [0.0003, 0.0004],
      [0.0003, 0.0005],
      [0.0002, 0.0005],
    ]
  },
  "POW/MIA Section": {
    label: "POW/MIA Section",
    style: "Black",
    // This section has the non-90° angled corners — define all real vertices
    vertices: [
      [0.0004, 0.0004],
      [0.0005, 0.0004],
      [0.00055, 0.00045],  // Angled corner — NE diagonal edge
      [0.0005, 0.0005],
      [0.0004, 0.0005],
    ]
  }
};

// Reference anchors — physical landmarks for cross-checking position accuracy
const REFERENCE_ANCHORS = {
  REF_WALKWAY_NORTH:  { lat: 0.0000, lng: 0.0000, label: "North Walkway Entrance" },
  REF_LEFT_CORNER:    { lat: 0.0000, lng: 0.0005, label: "Left Corner (SW)" },
  REF_RIGHT_CORNER:   { lat: 0.0000, lng: 0.0003, label: "Right Corner (SE)" },
  REF_CENTER_FLAG:    { lat: 0.0003, lng: 0.0003, label: "Center Flagpole" },
};

// ─────────────────────────────────────────────────────────────────────────────
// CORE GEOMETRY — Ray Casting Point-in-Polygon
// Works for any polygon shape including non-orthogonal (angled) boundaries.
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Determines if a point [lat, lng] lies inside a polygon defined by an array
 * of [lat, lng] vertices. Uses the ray casting algorithm.
 *
 * @param {number[]} point - [lat, lng]
 * @param {number[][]} polygon - Array of [lat, lng] vertices
 * @returns {boolean}
 */
function pointInPolygon(point, polygon) {
  const [px, py] = point;
  let inside = false;
  const n = polygon.length;

  for (let i = 0, j = n - 1; i < n; j = i++) {
    const [xi, yi] = polygon[i];
    const [xj, yj] = polygon[j];

    // Check if the ray from the point crosses this edge
    const intersects =
      yi > py !== yj > py &&
      px < ((xj - xi) * (py - yi)) / (yj - yi) + xi;

    if (intersects) inside = !inside;
  }

  return inside;
}

/**
 * Calculates the distance in meters between two GPS coordinates.
 * Uses the Haversine formula.
 *
 * @param {number} lat1
 * @param {number} lng1
 * @param {number} lat2
 * @param {number} lng2
 * @returns {number} Distance in meters
 */
function haversineDistance(lat1, lng1, lat2, lng2) {
  const R = 6371000; // Earth radius in meters
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// ─────────────────────────────────────────────────────────────────────────────
// POLYGON MANAGEMENT — Load calibrated anchors from localStorage
// ─────────────────────────────────────────────────────────────────────────────

function loadPolygons() {
  try {
    const saved = localStorage.getItem("ddvm_polygons");
    if (saved) {
      const parsed = JSON.parse(saved);
      // Merge saved polygons over defaults (saved data wins per-section)
      return { ...DEFAULT_POLYGONS, ...parsed };
    }
  } catch (e) {
    console.warn("Failed to load saved polygons, using defaults:", e);
  }
  return { ...DEFAULT_POLYGONS };
}

function savePolygons(polygons) {
  localStorage.setItem("ddvm_polygons", JSON.stringify(polygons));
}

// ─────────────────────────────────────────────────────────────────────────────
// PUBLIC API
// ─────────────────────────────────────────────────────────────────────────────

const LocationService = {

  /**
   * Captures a high-accuracy GPS position from the device.
   * Retries up to 3 times before rejecting.
   *
   * @returns {Promise<{lat: number, lng: number, accuracy: number}>}
   */
  async getCurrentPosition() {
    if (!navigator.geolocation) {
      throw new Error("Geolocation is not supported by this device.");
    }

    const options = {
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 0,
    };

    return new Promise((resolve, reject) => {
      let attempts = 0;

      const attempt = () => {
        navigator.geolocation.getCurrentPosition(
          (pos) => {
            resolve({
              lat: pos.coords.latitude,
              lng: pos.coords.longitude,
              accuracy: pos.coords.accuracy, // meters
              timestamp: pos.timestamp,
            });
          },
          (err) => {
            attempts++;
            if (attempts < 3) {
              console.warn(`GPS attempt ${attempts} failed, retrying...`, err);
              setTimeout(attempt, 1500);
            } else {
              reject(new Error(`GPS unavailable after 3 attempts: ${err.message}`));
            }
          },
          options
        );
      };

      attempt();
    });
  },

  /**
   * Detects which monument section contains the given GPS coordinate.
   * Returns the section name, or null if no match found.
   *
   * @param {number} lat
   * @param {number} lng
   * @returns {{ section: string, label: string, style: string } | null}
   */
  detectSection(lat, lng) {
    const polygons = loadPolygons();

    for (const [sectionName, config] of Object.entries(polygons)) {
      if (pointInPolygon([lat, lng], config.vertices)) {
        return {
          section: sectionName,
          label: config.label,
          style: config.style,
        };
      }
    }

    return null; // Point not inside any defined section
  },

  /**
   * Finds the nearest section based on distance to polygon centroids.
   * Used as a fallback when pointInPolygon returns no match (e.g., GPS drift).
   *
   * @param {number} lat
   * @param {number} lng
   * @returns {{ section: string, label: string, style: string, distanceMeters: number }}
   */
  findNearestSection(lat, lng) {
    const polygons = loadPolygons();
    let closest = null;
    let minDist = Infinity;

    for (const [sectionName, config] of Object.entries(polygons)) {
      // Calculate centroid of polygon
      const centroidLat =
        config.vertices.reduce((s, v) => s + v[0], 0) / config.vertices.length;
      const centroidLng =
        config.vertices.reduce((s, v) => s + v[1], 0) / config.vertices.length;

      const dist = haversineDistance(lat, lng, centroidLat, centroidLng);

      if (dist < minDist) {
        minDist = dist;
        closest = { section: sectionName, label: config.label, style: config.style, distanceMeters: Math.round(dist) };
      }
    }

    return closest;
  },

  /**
   * Full auto-detect flow: tries polygon match first, falls back to nearest centroid.
   * Returns a result object with a confidence level.
   *
   * @returns {Promise<{section: string, label: string, style: string, confidence: 'high'|'low', accuracy: number}>}
   */
  async autoDetectSection() {
    const { lat, lng, accuracy } = await this.getCurrentPosition();

    // Warn if GPS accuracy is poor (>10 meters for monument-scale work)
    const accuracyWarning = accuracy > 10
      ? `⚠️ GPS accuracy is ${Math.round(accuracy)}m — move to open sky for better precision.`
      : null;

    const exact = this.detectSection(lat, lng);
    if (exact) {
      return { ...exact, confidence: "high", accuracy, accuracyWarning, lat, lng };
    }

    const nearest = this.findNearestSection(lat, lng);
    return { ...nearest, confidence: "low", accuracy, accuracyWarning, lat, lng };
  },

  /**
   * Saves a calibrated GPS anchor point for a specific section vertex.
   * Call this while standing at the physical corner of a section on-site.
   *
   * @param {string} sectionName - e.g. "Section 1"
   * @param {number} vertexIndex - Which corner vertex to update
   * @returns {Promise<void>}
   */
  async calibrateAnchor(sectionName, vertexIndex) {
    const { lat, lng, accuracy } = await this.getCurrentPosition();
    const polygons = loadPolygons();

    if (!polygons[sectionName]) throw new Error(`Unknown section: ${sectionName}`);

    polygons[sectionName].vertices[vertexIndex] = [lat, lng];
    savePolygons(polygons);

    console.log(
      `✅ Calibrated ${sectionName} vertex ${vertexIndex}: [${lat}, ${lng}] (±${Math.round(accuracy)}m)`
    );
    return { lat, lng, accuracy };
  },

  /**
   * Returns the expected paver style for a given section.
   *
   * @param {string} sectionName
   * @returns {string|null} "Black" | "Brick" | null
   */
  getExpectedStyle(sectionName) {
    const polygons = loadPolygons();
    return polygons[sectionName]?.style ?? null;
  },

  /**
   * Returns all defined section configs (for map rendering or admin UI).
   */
  getAllSections() {
    return loadPolygons();
  },

  /**
   * Returns the static reference anchors (walkway, corners, flagpole).
   */
  getReferenceAnchors() {
    return REFERENCE_ANCHORS;
  },

  haversineDistance,
};

export default LocationService;
