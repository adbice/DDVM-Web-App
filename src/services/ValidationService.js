/**
 * ValidationService.js
 * DDVM Monument Mapper — Style Detection & Data Integrity Engine
 *
 * Handles:
 *  1. Camera-based color analysis to identify paver style (Black vs Brick/Red)
 *  2. Style vs Section mismatch detection
 *  3. Required-field validation before writing to Google Sheets
 *  4. Duplicate paver ID detection
 */

// ─────────────────────────────────────────────────────────────────────────────
// COLOR PROFILE DEFINITIONS
// These HSL ranges were tuned for outdoor granite/brick paver photography.
// Adjust SAMPLE_AREA_PERCENT to change how much of the camera frame is sampled.
// ─────────────────────────────────────────────────────────────────────────────

const STYLE_PROFILES = {
  Black: {
    label: "Black (Granite)",
    // Dark gray to black: low lightness, near-neutral saturation
    hue: { min: 0, max: 360 },       // Any hue (dark = grayscale)
    saturation: { min: 0, max: 25 }, // Low saturation = gray/black
    lightness: { min: 0, max: 35 },  // Dark
  },
  Brick: {
    label: "Brick (Red Old Style)",
    // Terracotta/brick red: red-orange hue, medium saturation and lightness
    hue: { min: 0, max: 30 },        // Red to orange
    saturation: { min: 30, max: 100 },
    lightness: { min: 20, max: 65 },
  },
};

// Percentage of the frame (centered square) used for color sampling
const SAMPLE_AREA_PERCENT = 0.3; // 30% center crop

// Minimum fraction of sampled pixels that must match a profile to confirm it
const CONFIDENCE_THRESHOLD = 0.45;

// ─────────────────────────────────────────────────────────────────────────────
// COLOR MATH UTILITIES
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Converts an RGB triplet to HSL.
 * @returns {{ h: number, s: number, l: number }} h: 0-360, s/l: 0-100
 */
function rgbToHsl(r, g, b) {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h, s;
  const l = (max + min) / 2;

  if (max === min) {
    h = s = 0;
  } else {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
      case g: h = ((b - r) / d + 2) / 6; break;
      case b: h = ((r - g) / d + 4) / 6; break;
    }
  }

  return { h: h * 360, s: s * 100, l: l * 100 };
}

/**
 * Tests if an HSL color falls within a style profile's defined ranges.
 */
function matchesProfile(hsl, profile) {
  const { hue, saturation, lightness } = profile;
  const hMatch = hsl.h >= hue.min && hsl.h <= hue.max;
  const sMatch = hsl.s >= saturation.min && hsl.s <= saturation.max;
  const lMatch = hsl.l >= lightness.min && hsl.l <= lightness.max;
  return hMatch && sMatch && lMatch;
}

// ─────────────────────────────────────────────────────────────────────────────
// CAMERA COLOR ANALYSIS
// ─────────────────────────────────────────────────────────────────────────────

const ValidationService = {

  /**
   * Analyzes a video frame or image element to detect paver style.
   * Draws a center crop onto an offscreen canvas and samples pixel colors.
   *
   * @param {HTMLVideoElement|HTMLImageElement|HTMLCanvasElement} source
   * @returns {{ detectedStyle: string|null, confidence: number, avgHex: string, warning: string|null }}
   *
   * USAGE IN REACT:
   *   const videoRef = useRef();
   *   const result = ValidationService.analyzeFrame(videoRef.current);
   */
  analyzeFrame(source) {
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");

    const srcW = source.videoWidth || source.naturalWidth || source.width;
    const srcH = source.videoHeight || source.naturalHeight || source.height;

    if (!srcW || !srcH) {
      return { detectedStyle: null, confidence: 0, avgHex: null, warning: "Camera frame not ready." };
    }

    // Center-crop sample area
    const cropSize = Math.floor(Math.min(srcW, srcH) * SAMPLE_AREA_PERCENT);
    const cropX = Math.floor((srcW - cropSize) / 2);
    const cropY = Math.floor((srcH - cropSize) / 2);

    canvas.width = cropSize;
    canvas.height = cropSize;
    ctx.drawImage(source, cropX, cropY, cropSize, cropSize, 0, 0, cropSize, cropSize);

    const imageData = ctx.getImageData(0, 0, cropSize, cropSize).data;
    const totalPixels = cropSize * cropSize;

    let rSum = 0, gSum = 0, bSum = 0;
    const styleCounts = { Black: 0, Brick: 0, Unknown: 0 };

    for (let i = 0; i < imageData.length; i += 4) {
      const r = imageData[i];
      const g = imageData[i + 1];
      const b = imageData[i + 2];
      rSum += r; gSum += g; bSum += b;

      const hsl = rgbToHsl(r, g, b);

      if (matchesProfile(hsl, STYLE_PROFILES.Black)) {
        styleCounts.Black++;
      } else if (matchesProfile(hsl, STYLE_PROFILES.Brick)) {
        styleCounts.Brick++;
      } else {
        styleCounts.Unknown++;
      }
    }

    // Average color as hex
    const avgR = Math.round(rSum / totalPixels);
    const avgG = Math.round(gSum / totalPixels);
    const avgB = Math.round(bSum / totalPixels);
    const avgHex = `#${avgR.toString(16).padStart(2,"0")}${avgG.toString(16).padStart(2,"0")}${avgB.toString(16).padStart(2,"0")}`;

    // Determine best match
    const blackRatio  = styleCounts.Black   / totalPixels;
    const brickRatio  = styleCounts.Brick   / totalPixels;

    let detectedStyle = null;
    let confidence = 0;

    if (blackRatio >= CONFIDENCE_THRESHOLD && blackRatio >= brickRatio) {
      detectedStyle = "Black";
      confidence = Math.round(blackRatio * 100);
    } else if (brickRatio >= CONFIDENCE_THRESHOLD && brickRatio > blackRatio) {
      detectedStyle = "Brick";
      confidence = Math.round(brickRatio * 100);
    }

    const warning = !detectedStyle
      ? `Color analysis inconclusive (avg: ${avgHex}). Ensure good lighting and fill the frame with the paver.`
      : null;

    return { detectedStyle, confidence, avgHex, warning };
  },

  // ─────────────────────────────────────────────────────────────────────────
  // STYLE vs SECTION MISMATCH CHECK
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Checks if the detected paver style matches the expected style for a section.
   *
   * @param {string} detectedStyle - "Black" or "Brick"
   * @param {string} section - e.g. "Section 1"
   * @param {string} expectedStyle - From LocationService.getExpectedStyle()
   * @returns {{ valid: boolean, message: string|null }}
   */
  checkStyleMatch(detectedStyle, section, expectedStyle) {
    if (!detectedStyle || !expectedStyle) {
      return { valid: true, message: null }; // Can't validate without both values
    }

    if (detectedStyle !== expectedStyle) {
      return {
        valid: false,
        message: `⚠️ Style mismatch: Camera detected "${detectedStyle}" but ${section} expects "${expectedStyle}". Verify the paver before saving.`,
      };
    }

    return { valid: true, message: null };
  },

  // ─────────────────────────────────────────────────────────────────────────
  // REQUIRED FIELD VALIDATION
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Validates a paver record before writing to Google Sheets.
   * Matches the column structure: A=Section, B=Brick#, C=Location,
   * D=PaverPresent, E=Condition, F=Inscription, G=Notes, H=Style, I=Size
   *
   * @param {Object} record
   * @param {string} record.section
   * @param {string|number} record.brickID
   * @param {string} record.inscription
   * @param {string} record.style         - "Black" | "Brick"
   * @param {string} record.size          - "8x8" | "4x8"
   * @param {number} [record.lat]
   * @param {number} [record.lng]
   * @returns {{ valid: boolean, errors: string[] }}
   */
  validateRecord(record) {
    const errors = [];

    if (!record.section || !record.section.trim()) {
      errors.push("Section is required.");
    }

    if (!record.brickID && record.brickID !== 0) {
      errors.push("Brick ID is required.");
    }

    if (!record.inscription || !record.inscription.trim()) {
      errors.push("Inscription cannot be empty.");
    } else if (record.inscription.trim().length > 200) {
      errors.push("Inscription is too long (max 200 characters).");
    }

    if (!record.style) {
      errors.push("Style (Black or Brick) must be selected.");
    } else if (!["Black", "Brick"].includes(record.style)) {
      errors.push(`Invalid style "${record.style}". Must be "Black" or "Brick".`);
    }

    if (!record.size) {
      errors.push("Size must be selected.");
    } else if (!["8x8", "4x8"].includes(record.size)) {
      errors.push(`Invalid size "${record.size}". Must be "8x8" or "4x8".`);
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  },

  // ─────────────────────────────────────────────────────────────────────────
  // DUPLICATE DETECTION
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Checks if a brickID already exists in the local inventory for a given section.
   *
   * @param {string|number} brickID
   * @param {string} section
   * @param {Array<{brickID: string, section: string}>} inventory - Current loaded inventory
   * @returns {{ isDuplicate: boolean, existingRecord: Object|null }}
   */
  checkDuplicate(brickID, section, inventory) {
    const existing = inventory.find(
      (item) =>
        String(item.brickID) === String(brickID) &&
        item.section === section
    );

    return {
      isDuplicate: !!existing,
      existingRecord: existing || null,
    };
  },

  /**
   * Checks for duplicate inscriptions within a section (catches OCR errors / re-scans).
   *
   * @param {string} inscription
   * @param {string} section
   * @param {Array} inventory
   * @returns {{ isDuplicate: boolean, matches: Array }}
   */
  checkInscriptionDuplicate(inscription, section, inventory) {
    if (!inscription) return { isDuplicate: false, matches: [] };

    const normalized = inscription.trim().toUpperCase();
    const matches = inventory.filter(
      (item) =>
        item.section === section &&
        item.inscription &&
        item.inscription.trim().toUpperCase() === normalized
    );

    return { isDuplicate: matches.length > 0, matches };
  },

  // ─────────────────────────────────────────────────────────────────────────
  // FULL RECORD VALIDATION (combines all checks)
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Runs all validation checks and returns a combined result.
   * Use this before calling the Google Sheets write functions.
   *
   * @param {Object} record - Paver record to validate
   * @param {string} expectedStyle - From LocationService.getExpectedStyle()
   * @param {Array} inventory - Current inventory for duplicate checking
   * @param {boolean} isNewRecord - If true, check for duplicate IDs
   * @returns {{ valid: boolean, errors: string[], warnings: string[] }}
   */
  fullValidation(record, expectedStyle, inventory, isNewRecord = false) {
    const errors = [];
    const warnings = [];

    // 1. Required fields
    const fieldCheck = this.validateRecord(record);
    errors.push(...fieldCheck.errors);

    // 2. Style vs section mismatch
    if (record.style && expectedStyle) {
      const styleCheck = this.checkStyleMatch(record.style, record.section, expectedStyle);
      if (!styleCheck.valid) warnings.push(styleCheck.message);
    }

    // 3. Duplicate ID check (new records only)
    if (isNewRecord && record.brickID) {
      const dupCheck = this.checkDuplicate(record.brickID, record.section, inventory);
      if (dupCheck.isDuplicate) {
        errors.push(
          `Brick ID ${record.brickID} already exists in ${record.section}. Use "Edit" to update it.`
        );
      }
    }

    // 4. Duplicate inscription check (warn, don't block)
    if (record.inscription) {
      const insCheck = this.checkInscriptionDuplicate(record.inscription, record.section, inventory);
      if (insCheck.isDuplicate) {
        warnings.push(
          `Inscription "${record.inscription}" already appears in ${record.section}. Double-check this is a different paver.`
        );
      }
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
    };
  },
};

export default ValidationService;
