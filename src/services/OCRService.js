/**
 * OCRService.js
 * Tesseract.js wrapper for scanning paver inscriptions via camera.
 * Optimized for chiseled granite/brick text in outdoor lighting.
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
    // Wait for existing init to finish
    await new Promise(resolve => setTimeout(resolve, 500))
    return
  }

  isInitializing = true

  try {
    worker = await createWorker('eng')

    // Tuned for chiseled stone lettering:
    // Only capital letters, numbers, spaces, hyphens, apostrophes, periods
    await worker.setParameters({
      tessedit_char_whitelist: "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789 '-.",
      tessedit_pageseg_mode: '6',  // Assume a single uniform block of text
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
// SCAN — Extract inscription from camera frame or image
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Scans a video frame or image and returns the detected inscription.
 *
 * @param {HTMLVideoElement|HTMLCanvasElement|HTMLImageElement} source
 * @returns {Promise<{ text: string, confidence: number, warning: string|null }>}
 *
 * USAGE IN REACT:
 *   const videoRef = useRef()
 *   const result = await scanInscription(videoRef.current)
 *   setInscription(result.text)
 */
export async function scanInscription(source) {
  if (!worker) await initOCR()

  // Capture frame to canvas for processing
  const canvas = document.createElement('canvas')
  const ctx = canvas.getContext('2d')

  const w = source.videoWidth || source.naturalWidth || source.width
  const h = source.videoHeight || source.naturalHeight || source.height

  if (!w || !h) {
    return { text: '', confidence: 0, warning: 'Camera not ready. Try again.' }
  }

  canvas.width = w
  canvas.height = h
  ctx.drawImage(source, 0, 0, w, h)

  // Boost contrast for outdoor stone text
  ctx.filter = 'contrast(1.8) grayscale(1)'
  ctx.drawImage(canvas, 0, 0)

  const { data } = await worker.recognize(canvas)

  const text = data.text
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9 '\-.]/g, '') // Strip any unexpected characters
    .replace(/\s+/g, ' ')            // Collapse multiple spaces

  const confidence = Math.round(data.confidence)

  let warning = null
  if (confidence < 50) {
    warning = `Low confidence (${confidence}%). Hold steady, ensure good lighting, and fill the frame with the inscription.`
  }

  return { text, confidence, warning }
}

// ─────────────────────────────────────────────────────────────────────────────
// CAMERA HELPERS — For Samsung Android Chrome
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Opens the rear camera stream.
 * Requests highest resolution available on Samsung devices.
 *
 * @returns {Promise<MediaStream>}
 */
export async function openCamera() {
  if (!navigator.mediaDevices?.getUserMedia) {
    throw new Error('Camera not supported on this device.')
  }

  return navigator.mediaDevices.getUserMedia({
    video: {
      facingMode: { exact: 'environment' }, // Force rear camera
      width: { ideal: 1920 },
      height: { ideal: 1080 },
    },
    audio: false
  })
}

/**
 * Stops all tracks on a media stream.
 * Always call this when done to release the camera.
 *
 * @param {MediaStream} stream
 */
export function closeCamera(stream) {
  if (stream) {
    stream.getTracks().forEach(track => track.stop())
  }
}
