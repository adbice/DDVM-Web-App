import { useState } from 'react'
import LocationService from '../services/LocationService.js'

/**
 * CalibrationPanel.jsx
 * On-site GPS calibration for section polygon vertices.
 * No code changes needed — all saved to localStorage.
 *
 * HOW TO USE ON SITE:
 * 1. Walk to a physical corner of a section
 * 2. Select the section and vertex
 * 3. Tap "Capture My Position"
 * 4. Saved automatically — takes effect immediately
 */

const VERTEX_LABELS = [
  '0 — 101 Side Left',
  '1 — 101 Side Right',
  '2 — Bay Side Right',
  '3 — Bay Side Left',
]

const SECTIONS = [
  'Section 1', 'Section 2', 'Section 3', 'Section 4',
  'Section 5', 'Section 6', 'Section 7', 'Section 8',
  'POW/MIA Section'
]

export default function CalibrationPanel({ onClose }) {
  const [selectedSection, setSelectedSection] = useState('Section 1')
  const [selectedVertex, setSelectedVertex]   = useState(0)
  const [status, setStatus]                   = useState(null)
  const [capturing, setCapturing]             = useState(false)
  const [history, setHistory]                 = useState(
    LocationService.getCalibrationHistory()
  )
  const [calibStats, setCalibStats]           = useState(
    LocationService.getCalibrationStatus()
  )
  const [showHistory, setShowHistory]         = useState(false)
  const [showReset, setShowReset]             = useState(false)

  async function handleCapture() {
    setCapturing(true)
    setStatus({ type: 'info', message: 'Getting GPS position...' })
    try {
      const result = await LocationService.calibrateAnchor(selectedSection, selectedVertex)
      setStatus({
        type: 'success',
        message: `✅ Saved! [${result.lat.toFixed(6)}, ${result.lng.toFixed(6)}] ±${Math.round(result.accuracy)}m`
      })
      // Refresh stats and history
      setHistory(LocationService.getCalibrationHistory())
      setCalibStats(LocationService.getCalibrationStatus())
    } catch (err) {
      setStatus({ type: 'error', message: `❌ ${err.message}` })
    } finally {
      setCapturing(false)
    }
  }

  function handleReset() {
    LocationService.resetCalibration()
    setHistory({})
    setCalibStats(LocationService.getCalibrationStatus())
    setShowReset(false)
    setStatus({ type: 'info', message: 'Reset to factory defaults.' })
  }

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      background: '#1A1A1A',
      zIndex: 100,
      overflowY: 'auto',
      padding: '20px',
      fontFamily: 'Georgia, serif',
      color: '#F5F0E8'
    }}>

      {/* Header */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '24px',
        borderBottom: '2px solid #D4A843',
        paddingBottom: '12px'
      }}>
        <div>
          <h2 style={{ color: '#D4A843', margin: 0, fontSize: '1.2rem' }}>
            GPS Calibration
          </h2>
          <p style={{ color: '#666', margin: '4px 0 0', fontSize: '0.8rem' }}>
            Stand at a section corner and capture your position
          </p>
        </div>
        <button
          onClick={onClose}
          style={{
            background: 'transparent',
            border: '1px solid #444',
            color: '#888',
            borderRadius: '8px',
            padding: '8px 16px',
            cursor: 'pointer',
            fontSize: '0.9rem'
          }}
        >
          ✕ Close
        </button>
      </div>

      {/* Calibration progress */}
      <div style={{
        background: '#2C2C2C',
        borderRadius: '12px',
        padding: '16px',
        marginBottom: '20px'
      }}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '8px'
        }}>
          <span style={{ color: '#888', fontSize: '0.85rem' }}>
            Vertices calibrated on-site
          </span>
          <span style={{ color: '#D4A843', fontWeight: 'bold' }}>
            {calibStats.calibrated} / {calibStats.total}
          </span>
        </div>
        <div style={{
          height: '6px',
          background: '#1A1A1A',
          borderRadius: '3px',
          overflow: 'hidden'
        }}>
          <div style={{
            height: '100%',
            width: `${calibStats.percent}%`,
            background: '#D4A843',
            borderRadius: '3px',
            transition: 'width 0.3s'
          }} />
        </div>
        <p style={{
          color: '#555',
          fontSize: '0.75rem',
          margin: '8px 0 0',
          lineHeight: 1.4
        }}>
          Walk to each section corner on-site and capture to improve accuracy.
          Uncalibrated vertices use calculated GPS estimates.
        </p>
      </div>

      {/* Section selector */}
      <label style={{ color: '#888', fontSize: '0.8rem', textTransform: 'uppercase' }}>
        Section
      </label>
      <div style={{
        display: 'flex',
        flexWrap: 'wrap',
        gap: '8px',
        margin: '8px 0 20px'
      }}>
        {SECTIONS.map(sec => (
          <button
            key={sec}
            onClick={() => setSelectedSection(sec)}
            style={{
              padding: '8px 14px',
              borderRadius: '20px',
              border: 'none',
              background: selectedSection === sec ? '#D4A843' : '#2C2C2C',
              color: selectedSection === sec ? '#1A1A1A' : '#888',
              fontWeight: selectedSection === sec ? 'bold' : 'normal',
              fontSize: '0.85rem',
              cursor: 'pointer'
            }}
          >
            {sec === 'POW/MIA Section' ? 'POW/MIA' : sec.replace('Section ', 'Sec ')}
          </button>
        ))}
      </div>

      {/* Vertex selector */}
      <label style={{ color: '#888', fontSize: '0.8rem', textTransform: 'uppercase' }}>
        Corner Vertex
      </label>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', margin: '8px 0 20px' }}>
        {VERTEX_LABELS.map((label, idx) => {
          const key = `${selectedSection}_v${idx}`
          const isCalibrated = !!history[key]
          return (
            <button
              key={idx}
              onClick={() => setSelectedVertex(idx)}
              style={{
                padding: '14px 16px',
                borderRadius: '12px',
                border: selectedVertex === idx
                  ? '2px solid #D4A843'
                  : '2px solid #333',
                background: selectedVertex === idx ? '#2C2C2C' : '#1A1A1A',
                color: selectedVertex === idx ? '#F5F0E8' : '#666',
                textAlign: 'left',
                cursor: 'pointer',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}
            >
              <span style={{ fontSize: '0.9rem' }}>{label}</span>
              {isCalibrated && (
                <span style={{
                  fontSize: '0.7rem',
                  color: '#4a9e4a',
                  background: '#1a2d1a',
                  padding: '2px 8px',
                  borderRadius: '10px'
                }}>
                  ✓ Calibrated
                </span>
              )}
            </button>
          )
        })}
      </div>

      {/* Capture button */}
      <button
        onClick={handleCapture}
        disabled={capturing}
        style={{
          width: '100%',
          padding: '20px',
          background: capturing ? '#555' : '#D4A843',
          color: '#1A1A1A',
          border: 'none',
          borderRadius: '16px',
          fontSize: '1.1rem',
          fontWeight: 'bold',
          cursor: capturing ? 'not-allowed' : 'pointer',
          marginBottom: '16px'
        }}
      >
        {capturing ? '📡 Getting GPS...' : '📍 Capture My Position'}
      </button>

      {/* Status message */}
      {status && (
        <div style={{
          padding: '14px 16px',
          borderRadius: '12px',
          marginBottom: '20px',
          background: status.type === 'success' ? '#1a2d1a'
            : status.type === 'error' ? '#2d1a1a'
            : '#2C2C2C',
          border: `1px solid ${
            status.type === 'success' ? '#4a9e4a'
            : status.type === 'error' ? '#9e4a4a'
            : '#444'
          }`,
          color: status.type === 'success' ? '#4a9e4a'
            : status.type === 'error' ? '#e07070'
            : '#888',
          fontSize: '0.9rem'
        }}>
          {status.message}
        </div>
      )}

      {/* Calibration history */}
      <button
        onClick={() => setShowHistory(!showHistory)}
        style={{
          width: '100%',
          padding: '12px',
          background: 'transparent',
          border: '1px solid #333',
          color: '#666',
          borderRadius: '12px',
          cursor: 'pointer',
          fontSize: '0.85rem',
          marginBottom: '12px'
        }}
      >
        {showHistory ? '▲ Hide' : '▼ Show'} Calibration History
        ({Object.keys(history).filter(k => !k.startsWith('REF_')).length} entries)
      </button>

      {showHistory && (
        <div style={{
          background: '#2C2C2C',
          borderRadius: '12px',
          padding: '12px',
          marginBottom: '20px'
        }}>
          {Object.keys(history).length === 0 ? (
            <p style={{ color: '#555', textAlign: 'center', margin: 0 }}>
              No calibrations yet
            </p>
          ) : (
            Object.entries(history)
              .filter(([k]) => !k.startsWith('REF_'))
              .sort(([,a], [,b]) => new Date(b.timestamp) - new Date(a.timestamp))
              .map(([key, entry]) => (
                <div key={key} style={{
                  padding: '10px 0',
                  borderBottom: '1px solid #333',
                  fontSize: '0.8rem'
                }}>
                  <div style={{ color: '#D4A843', marginBottom: '2px' }}>
                    {entry.label}
                  </div>
                  <div style={{ color: '#888', fontFamily: 'monospace' }}>
                    [{entry.lat.toFixed(6)}, {entry.lng.toFixed(6)}]
                    ±{Math.round(entry.accuracy)}m
                  </div>
                  <div style={{ color: '#555', fontSize: '0.75rem' }}>
                    {new Date(entry.timestamp).toLocaleString()}
                  </div>
                </div>
              ))
          )}
        </div>
      )}

      {/* Reset button */}
      {!showReset ? (
        <button
          onClick={() => setShowReset(true)}
          style={{
            width: '100%',
            padding: '12px',
            background: 'transparent',
            border: '1px solid #5a1a1a',
            color: '#9e4a4a',
            borderRadius: '12px',
            cursor: 'pointer',
            fontSize: '0.85rem'
          }}
        >
          ⚠️ Reset All Calibrations to Defaults
        </button>
      ) : (
        <div style={{
          background: '#2d1a1a',
          border: '1px solid #9e4a4a',
          borderRadius: '12px',
          padding: '16px'
        }}>
          <p style={{ color: '#e07070', margin: '0 0 12px', fontSize: '0.9rem' }}>
            This will erase all on-site calibrations and revert to calculated GPS estimates. Are you sure?
          </p>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              onClick={handleReset}
              style={{
                flex: 1,
                padding: '12px',
                background: '#9e4a4a',
                color: '#fff',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer',
                fontWeight: 'bold'
              }}
            >
              Yes, Reset
            </button>
            <button
              onClick={() => setShowReset(false)}
              style={{
                flex: 1,
                padding: '12px',
                background: '#2C2C2C',
                color: '#888',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer'
              }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
