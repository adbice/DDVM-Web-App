/**
 * OCRService.js
 * Tesseract.js wrapper optimized for DDVM paver types:
 * - Black Granite: white filled text on dark background (high contrast)
 * - Brick Red: dark pressed text on dark background (low contrast, needs processing)
 */

import { createWorker } from 'tesseract.js'

let worker = null
let isInitializing = false

// ─────────────────────────────────────────────────────────────────────────────
// WORKER MANAGEMENT
// ─────────────────────────────────────────────────────────────────────────────

export async function initOCR() {
  if (worker) return
  if (isInitializing) {
    await new Promise(resolve => setTimeout(resolve, 500))
    return
  }
  isInitializing = true
  try {
    worker = await createWorker('eng')
    await worker.setParameters({
      tessedit_char_whitelist: "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789 '-.",
      tessedit_pageseg_mode: '6',
      preserve_interword_spaces: '1'
    })
  } finally {
    isInitializing = false
  }
}

export async function terminateOCR() {
  if (worker) {
    await worker.terminate()
    worker = null
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// PAVER TYPE DETECTION
// Samples center pixels to determine if this is granite (dark) or brick (red)
// ─────────────────────────────────────────────────────────────────────────────

function detectPaverType(ctx, width, height) {
  const sampleSize = Math.floor(Math.min(width, height) * 0.3)
  const startX = Math.floor((width - sampleSize) / 2)
  const startY = Math.floor((height - sampleSize) / 2)
  const imageData = ctx.getImageData(startX, startY, sampleSize, sampleSize).data

  let rSum = 0, gSum = 0, bSum = 0
  const pixels = sampleSize * sampleSize

  for (let i = 0; i < imageData.length; i += 4) {
    rSum += imageData[i]
    gSum += imageData[i + 1]
    bSum += imageData[i + 2]
  }

  const avgR = rSum / pixels
  const avgG = gSum / pixels
  const avgB = bSum / pixels
  const avgBrightness = (avgR + avgG + avgB) / 3

  // Black granite: very dark, low brightness, low red dominance
  // Brick red: medium brightness, red channel dominant
  const isGranite = avgBrightness < 80 && avgR < 100
  const isBrick = avgR > avgB + 20 && avgBrightness > 80

  return {
    type: isGranite ? 'granite' : isBrick ? 'brick' : 'unknown',
    avgR: Math.round(avgR),
    avgG: Math.round(avgG),
    avgB: Math.round(avgB),
    brightness: Math.round(avgBrightness)
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// IMAGE PROCESSING PIPELINES
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Processes a canvas for BLACK GRANITE pavers.
 * White text on dark background — boost contrast, keep as-is.
 */
function processGranite(sourceCanvas, width, height) {
  const canvas = document.createElement('canvas')
  canvas.width = width * 2  // Upscale for better OCR
  canvas.height = height * 2
  const ctx = canvas.getContext('2d')

  ctx.imageSmoothingEnabled = false
  ctx.drawImage(sourceCanvas, 0, 0, width * 2, height * 2)

  // High contrast — white text pops even more
  ctx.filter = 'contrast(2) brightness(1.1) grayscale(1)'
  ctx.drawImage(canvas, 0, 0)

  return canvas
}

/**
 * Processes a canvas for BRICK pavers.
 * Dark pressed text on dark-ish red background.
 * Strategy: grayscale → heavy contrast → sharpen edges → invert if needed
 */
function processBrick(sourceCanvas, width, height) {
  const canvas = document.createElement('canvas')
  canvas.width = width * 2
  canvas.height = height * 2
  const ctx = canvas.getContext('2d')

  ctx.imageSmoothingEnabled = false
  ctx.drawImage(sourceCanvas, 0, 0, width * 2, height * 2)

  // Step 1: Grayscale + heavy contrast to pull pressed text shadows out
  ctx.filter = 'grayscale(1) contrast(3) brightness(1.4)'
  ctx.drawImage(canvas, 0, 0)

  // Step 2: Check if text is dark-on-light or light-on-dark after processing
  // Sample center — if still dark, invert
  const sample = ctx.getImageData(
    Math.floor(width * 0.5),
    Math.floor(height * 0.5),
    20, 20
  ).data
  let brightnessCheck = 0
  for (let i = 0; i < sample.length; i += 4) {
    brightnessCheck += sample[i]
  }
  brightnessCheck /= (sample.length / 4)

  // If background is still dark after processing, invert so text is dark on white
  if (brightnessCheck < 128) {
    ctx.filter = 'invert(1)'
    ctx.drawImage(canvas, 0, 0)
  }

  // Step 3: Final sharpening pass
  ctx.filter = 'contrast(1.5)'
  ctx.drawImage(canvas, 0, 0)

  return canvas
}

// ─────────────────────────────────────────────────────────────────────────────
// SCAN — Main entry point
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Scans a video frame and returns the detected inscription.
 * Auto-detects paver type and applies appropriate processing.
 *
 * @param {HTMLVideoElement} videoEl
 * @returns {Promise<{ text: string, confidence: number, paverType: string, warning: string|null }>}
 */
export async function scanInscription(videoEl) {
  if (!worker) await initOCR()

  const w = videoEl.videoWidth
  const h = videoEl.videoHeight

  if (!w || !h) {
    return { text: '', confidence: 0, paverType: 'unknown', warning: 'Camera not ready. Try again.' }
  }

  // Capture raw frame
  const rawCanvas = document.createElement('canvas')
  rawCanvas.width = w
  rawCanvas.height = h
  const rawCtx = rawCanvas.getContext('2d')
  rawCtx.drawImage(videoEl, 0, 0, w, h)

  // Detect paver type from raw frame
  const paverInfo = detectPaverType(rawCtx, w, h)

  // Apply appropriate processing pipeline
  let processedCanvas
  if (paverInfo.type === 'granite') {
    processedCanvas = processGranite(rawCanvas, w, h)
  } else {
    // Default to brick processing for both brick and unknown
    processedCanvas = processBrick(rawCanvas, w, h)
  }

  // Run OCR on processed canvas
  const { data } = await worker.recognize(processedCanvas)

  const text = data.text
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9 '\-.()]/g, '')
    .replace(/\s+/g, ' ')

  const confidence = Math.round(data.confidence)

  // Build helpful warning based on paver type and confidence
  let warning = null
  if (confidence < 60 && paverInfo.type === 'brick') {
    warning = `Brick paver text is hard to read (${confidence}% confidence). Tips: get closer, shade the paver with your hand to reduce glare, hold phone parallel to the ground.`
  } else if (confidence < 60) {
    warning = `Low confidence (${confidence}%). Hold steady and fill the frame with just the paver.`
  }

  return { text, confidence, paverType: paverInfo.type, warning }
}

// ─────────────────────────────────────────────────────────────────────────────
// CAMERA — Samsung Android optimized
// ─────────────────────────────────────────────────────────────────────────────

export async function openCamera() {
  if (!navigator.mediaDevices?.getUserMedia) {
    throw new Error('Camera not supported on this device.')
  }

  return navigator.mediaDevices.getUserMedia({
    video: {
      facingMode: { exact: 'environment' },
      width: { ideal: 1920 },
      height: { ideal: 1080 },
      focusMode: 'continuous'  // Keep Samsung camera auto-focusing
    },
    audio: false
  })
}

export function closeCamera(stream) {
  if (stream) stream.getTracks().forEach(track => track.stop())
}
