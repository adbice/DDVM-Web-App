import { useState, useEffect, useRef } from 'react'
import ValidationService from '../services/ValidationService.js'
import { correctOCR } from '../services/OCRCorrections.js'
import { initOCR, openCamera, closeCamera, scanInscription } from '../services/OCRService.js'

export default function EntryModal({ brick, onSave, onClose }) {
  const [inscription, setInscription] = useState(brick.inscription || '')
  const [style, setStyle]             = useState(brick.style || '')
  const [size, setSize]               = useState(brick.size || '')
  const [saving, setSaving]           = useState(false)
  const [errors, setErrors]           = useState([])
  const [warnings, setWarnings]       = useState([])

  // Camera state
  const [cameraOpen, setCameraOpen]   = useState(false)
  const [scanning, setScanning]       = useState(false)
  const [scanResult, setScanResult]   = useState(null)  // { text, confidence, paverType, warning }
  const [stream, setStream]           = useState(null)
  const videoRef = useRef(null)

  useEffect(() => {
    setInscription(brick.inscription || '')
    setStyle(brick.style || '')
    setSize(brick.size || '')
    setErrors([])
    setWarnings([])
    setScanResult(null)
  }, [brick])

  // Pre-load Tesseract worker in background when modal opens
  useEffect(() => {
    initOCR().catch(() => {})
    return () => {
      // Clean up camera if modal closes while camera is open
      if (stream) closeCamera(stream)
    }
  }, [])

  // Attach stream to video element once camera opens
  useEffect(() => {
    if (stream && videoRef.current) {
      videoRef.current.srcObject = stream
      videoRef.current.play().catch(() => {})
    }
  }, [stream, cameraOpen])

  // -------------------------------------------------------------------------
  // CAMERA HANDLERS
  // -------------------------------------------------------------------------
  async function handleOpenCamera() {
    setScanResult(null)
    try {
      const s = await openCamera()
      setStream(s)
      setCameraOpen(true)
    } catch (err) {
      setErrors([`Camera error: ${err.message}`])
    }
  }

  function handleCloseCamera() {
    closeCamera(stream)
    setStream(null)
    setCameraOpen(false)
    setScanning(false)
  }

  async function handleScan() {
    if (!videoRef.current || scanning) return
    setScanning(true)
    setScanResult(null)
    try {
      const result = await scanInscription(videoRef.current)
      setScanResult(result)
    } catch (err) {
      setErrors([`Scan failed: ${err.message}`])
    } finally {
      setScanning(false)
    }
  }

  function handleAcceptScan() {
    if (!scanResult?.text) return
    setInscription(correctOCR(scanResult.text))
    // Auto-set style if paver type was detected
    if (scanResult.paverType === 'granite') setStyle('Black')
    if (scanResult.paverType === 'brick')   setStyle('Brick')
    handleCloseCamera()
  }

  function handleRetryScan() {
    setScanResult(null)
  }

  // -------------------------------------------------------------------------
  // SAVE
  // -------------------------------------------------------------------------
  function validate() {
    const result = ValidationService.validateRecord({
      section: brick.section,
      brickID: brick.brickID,
      inscription,
      style,
      size
    })
    setErrors(result.errors)
    return result.valid
  }

  async function handleSave() {
    if (!validate()) return
    setSaving(true)
    try {
      let lat = '', lng = ''
      try {
        const pos = await new Promise((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(resolve, reject, {
            enableHighAccuracy: true, timeout: 8000, maximumAge: 0
          })
        })
        lat = pos.coords.latitude.toFixed(6)
        lng = pos.coords.longitude.toFixed(6)
      } catch {
        // GPS unavailable — save without coordinates
      }

      await onSave({
        ...brick,
        inscription,
        style,
        size,
        location: lat && lng ? `${lat},${lng}` : ''
      })
    } catch (err) {
      setErrors([err.message])
      setSaving(false)
    }
  }

  // -------------------------------------------------------------------------
  // CAMERA OVERLAY
  // -------------------------------------------------------------------------
  if (cameraOpen) {
    return (
      <div style={{
        position: 'fixed', inset: 0, zIndex: 60,
        background: '#000',
        display: 'flex', flexDirection: 'column'
      }}>

        {/* Video feed */}
        <div style={{ position: 'relative', flex: 1, overflow: 'hidden' }}>
          <video
            ref={videoRef}
            playsInline
            muted
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
          />

          {/* Framing guide overlay */}
          <div style={{
            position: 'absolute', inset: 0,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            pointerEvents: 'none'
          }}>
            {/* Dark vignette outside the guide box */}
            <div style={{
              position: 'absolute', inset: 0,
              background: 'rgba(0,0,0,0.45)'
            }} />
            {/* Guide rectangle */}
            <div style={{
              position: 'relative',
              width: '80%', maxWidth: '340px',
              aspectRatio: '3 / 1',
              border: '2px solid #D4A843',
              borderRadius: '8px',
              boxShadow: '0 0 0 9999px rgba(0,0,0,0.45)'
            }}>
              {/* Corner accents */}
              {[
                { top: -2, left: -2, borderTop: '3px solid #D4A843', borderLeft: '3px solid #D4A843' },
                { top: -2, right: -2, borderTop: '3px solid #D4A843', borderRight: '3px solid #D4A843' },
                { bottom: -2, left: -2, borderBottom: '3px solid #D4A843', borderLeft: '3px solid #D4A843' },
                { bottom: -2, right: -2, borderBottom: '3px solid #D4A843', borderRight: '3px solid #D4A843' },
              ].map((s, i) => (
                <div key={i} style={{
                  position: 'absolute', width: 16, height: 16, ...s
                }} />
              ))}
            </div>
          </div>

          {/* Top bar */}
          <div style={{
            position: 'absolute', top: 0, left: 0, right: 0,
            padding: '16px',
            display: 'flex', justifyContent: 'space-between', alignItems: 'center'
          }}>
            <span style={{ color: '#D4A843', fontWeight: 'bold', fontFamily: 'monospace' }}>
              📷 SCAN PAVER
            </span>
            <button
              onClick={handleCloseCamera}
              style={{
                background: 'rgba(0,0,0,0.6)', border: '1px solid #555',
                color: '#fff', borderRadius: '20px',
                padding: '6px 14px', cursor: 'pointer', fontSize: '0.85rem'
              }}
            >
              ✕ Cancel
            </button>
          </div>

          {/* Hint text */}
          {!scanResult && (
            <div style={{
              position: 'absolute', bottom: 100, left: 0, right: 0,
              textAlign: 'center'
            }}>
              <span style={{
                background: 'rgba(0,0,0,0.65)', color: '#ccc',
                fontSize: '0.8rem', padding: '6px 14px', borderRadius: '20px'
              }}>
                Align inscription inside the box
              </span>
            </div>
          )}
        </div>

        {/* Bottom controls */}
        <div style={{
          background: '#1a1a1a',
          borderTop: '2px solid #2a2a2a',
          padding: '20px'
        }}>

          {/* Scan result preview */}
          {scanResult && (
            <div style={{
              background: '#111',
              border: `1px solid ${scanResult.confidence >= 60 ? '#4a9e4a' : '#9e7a00'}`,
              borderRadius: '12px',
              padding: '14px',
              marginBottom: '16px'
            }}>
              <div style={{
                display: 'flex', justifyContent: 'space-between',
                alignItems: 'center', marginBottom: '8px'
              }}>
                <span style={{ color: '#888', fontSize: '0.75rem', textTransform: 'uppercase' }}>
                  Detected Text
                </span>
                <span style={{
                  fontSize: '0.75rem', fontFamily: 'monospace',
                  color: scanResult.confidence >= 60 ? '#4a9e4a' : '#D4A843'
                }}>
                  {scanResult.confidence}% confidence
                  {scanResult.paverType !== 'unknown' && ` · ${scanResult.paverType}`}
                </span>
              </div>
              <p style={{
                color: '#fff', fontFamily: 'monospace',
                fontSize: '1.1rem', margin: '0 0 8px',
                wordBreak: 'break-word'
              }}>
                {scanResult.text || '(nothing detected)'}
              </p>
              {scanResult.warning && (
                <p style={{ color: '#D4A843', fontSize: '0.8rem', margin: 0 }}>
                  ⚠ {scanResult.warning}
                </p>
              )}
            </div>
          )}

          {scanResult ? (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <button
                onClick={handleRetryScan}
                style={{
                  padding: '16px', borderRadius: '14px',
                  background: 'transparent',
                  border: '2px solid #555',
                  color: '#ccc', fontSize: '1rem',
                  fontWeight: 'bold', cursor: 'pointer'
                }}
              >
                🔄 Retry
              </button>
              <button
                onClick={handleAcceptScan}
                disabled={!scanResult.text}
                style={{
                  padding: '16px', borderRadius: '14px',
                  background: scanResult.text ? '#D4A843' : '#555',
                  border: 'none',
                  color: '#1a1a1a', fontSize: '1rem',
                  fontWeight: 'bold',
                  cursor: scanResult.text ? 'pointer' : 'not-allowed'
                }}
              >
                ✓ Use This
              </button>
            </div>
          ) : (
            <button
              onClick={handleScan}
              disabled={scanning}
              style={{
                width: '100%', padding: '20px',
                background: scanning ? '#555' : '#D4A843',
                border: 'none', borderRadius: '16px',
                color: '#1a1a1a', fontSize: '1.1rem',
                fontWeight: 'bold',
                cursor: scanning ? 'not-allowed' : 'pointer'
              }}
            >
              {scanning ? '⏳ Scanning...' : '⚡ SCAN'}
            </button>
          )}
        </div>
      </div>
    )
  }

  // -------------------------------------------------------------------------
  // MAIN MODAL
  // -------------------------------------------------------------------------
  return (
    <>
      <div
        onClick={onClose}
        style={{
          position: 'fixed', inset: 0,
          background: 'rgba(0,0,0,0.7)', zIndex: 40
        }}
      />

      <div style={{
        position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 50,
        background: 'var(--stone)',
        borderTop: '4px solid var(--gold)',
        borderRadius: '24px 24px 0 0',
        padding: '24px',
        maxHeight: '90vh',
        overflowY: 'auto'
      }}>
        <h2 style={{ color: '#fff', fontSize: '1.25rem', fontWeight: 'bold', margin: '0 0 4px' }}>
          {inscription || '[Empty Paver]'}
        </h2>
        <p style={{ color: '#D4A843', fontFamily: 'monospace', fontSize: '0.85rem', margin: '0 0 24px' }}>
          {brick.section} · ID {brick.brickID}
        </p>

        {/* Inscription field + camera button */}
        <label style={labelStyle}>Inscription</label>
        <div style={{ position: 'relative', marginBottom: '20px' }}>
          <input
            type="text"
            value={inscription}
            onChange={e => setInscription(correctOCR(e.target.value))}
            placeholder="Name on paver..."
            autoCapitalize="characters"
            autoCorrect="off"
            style={{
              width: '100%', padding: '12px 52px 12px 16px',
              background: '#111', border: '2px solid var(--gold)',
              borderRadius: '12px', color: '#fff',
              fontSize: '16px',
              boxSizing: 'border-box'
            }}
          />
          {/* Camera icon button */}
          <button
            onClick={handleOpenCamera}
            title="Scan paver with camera"
            style={{
              position: 'absolute', right: '8px', top: '50%',
              transform: 'translateY(-50%)',
              background: 'transparent', border: 'none',
              cursor: 'pointer', fontSize: '1.4rem',
              lineHeight: 1, padding: '4px'
            }}
          >
            📷
          </button>
        </div>

        <label style={labelStyle}>Style</label>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
          {['Black', 'Brick'].map(s => (
            <button
              key={s}
              onClick={() => setStyle(s)}
              style={{
                padding: '20px',
                borderRadius: '16px',
                fontWeight: 'bold',
                fontSize: '1.1rem',
                cursor: 'pointer',
                background: style === s ? '#000' : 'transparent',
                border: `2px solid ${style === s ? 'var(--gold)' : '#555'}`,
                color: style === s ? 'var(--gold)' : '#666'
              }}
            >
              {s === 'Black' ? '⬛ BLACK' : '🧱 BRICK'}
            </button>
          ))}
        </div>

        <label style={labelStyle}>Size</label>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '24px' }}>
          {['8x8', '4x8'].map(z => (
            <button
              key={z}
              onClick={() => setSize(z)}
              style={{
                padding: '20px',
                borderRadius: '16px',
                fontWeight: 'bold',
                fontSize: '1.1rem',
                cursor: 'pointer',
                background: size === z ? '#0d2e4d' : 'transparent',
                border: `2px solid ${size === z ? '#4A9EFF' : '#555'}`,
                color: size === z ? '#90C8FF' : '#666'
              }}
            >
              {z === '8x8' ? '8 × 8' : '4 × 8'}
            </button>
          ))}
        </div>

        {errors.length > 0 && (
          <div style={{
            background: '#2d0000', border: '1px solid #9e4a4a',
            borderRadius: '12px', padding: '12px', marginBottom: '16px'
          }}>
            {errors.map((e, i) => (
              <p key={i} style={{ color: '#e07070', fontSize: '0.85rem', margin: 0 }}>{e}</p>
            ))}
          </div>
        )}

        {warnings.length > 0 && (
          <div style={{
            background: '#2d2000', border: '1px solid #9e7a00',
            borderRadius: '12px', padding: '12px', marginBottom: '16px'
          }}>
            {warnings.map((w, i) => (
              <p key={i} style={{ color: '#e0c070', fontSize: '0.85rem', margin: 0 }}>{w}</p>
            ))}
          </div>
        )}

        <button
          onClick={handleSave}
          disabled={saving}
          style={{
            width: '100%', padding: '20px',
            background: saving ? '#888' : 'var(--gold)',
            color: '#1A1A1A', border: 'none',
            borderRadius: '16px', fontSize: '1.2rem',
            fontWeight: 'bold', cursor: saving ? 'not-allowed' : 'pointer',
            marginBottom: '12px'
          }}
        >
          {saving ? '📡 Getting GPS & Saving...' : 'CONFIRM & SAVE'}
        </button>

        <button
          onClick={onClose}
          style={{
            width: '100%', padding: '12px',
            background: 'transparent', border: 'none',
            color: '#666', fontSize: '0.9rem', cursor: 'pointer'
          }}
        >
          Cancel
        </button>
      </div>
    </>
  )
}

const labelStyle = {
  display: 'block',
  color: '#888',
  fontSize: '0.75rem',
  textTransform: 'uppercase',
  marginBottom: '8px'
}
