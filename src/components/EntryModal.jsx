import { useState, useEffect } from 'react'
import ValidationService from '../services/ValidationService.js'

export default function EntryModal({ brick, onSave, onClose }) {
  const [inscription, setInscription] = useState(brick.inscription || '')
  const [style, setStyle]             = useState(brick.style || '')
  const [size, setSize]               = useState(brick.size || '')
  const [saving, setSaving]           = useState(false)
  const [errors, setErrors]           = useState([])
  const [warnings, setWarnings]       = useState([])

  useEffect(() => {
    setInscription(brick.inscription || '')
    setStyle(brick.style || '')
    setSize(brick.size || '')
    setErrors([])
    setWarnings([])
  }, [brick])

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
      await onSave({ ...brick, inscription, style, size })
    } catch (err) {
      setErrors([err.message])
      setSaving(false)
    }
  }

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
        padding: '24px'
      }}>
        <h2 style={{ color: '#fff', fontSize: '1.25rem', fontWeight: 'bold', margin: '0 0 4px' }}>
          {inscription || '[Empty Paver]'}
        </h2>
        <p style={{ color: '#D4A843', fontFamily: 'monospace', fontSize: '0.85rem', margin: '0 0 24px' }}>
          {brick.section} · ID {brick.brickID}
        </p>

        <label style={labelStyle}>Inscription</label>
        <input
          type="text"
          value={inscription}
          onChange={e => setInscription(e.target.value.toUpperCase())}
          placeholder="Name on paver..."
          autoCapitalize="characters"
          autoCorrect="off"
          style={{
            width: '100%', padding: '12px 16px',
            background: '#111', border: '2px solid var(--gold)',
            borderRadius: '12px', color: '#fff',
            fontSize: '16px', marginBottom: '20px',
            boxSizing: 'border-box'
          }}
        />

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
          {saving ? 'Saving...' : 'CONFIRM & SAVE'}
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
