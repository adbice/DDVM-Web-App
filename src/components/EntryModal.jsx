import { useState, useEffect } from 'react'
import ValidationService from '../services/ValidationService.js'

export default function EntryModal({ brick, isNew, onSave, onClose }) {
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
      await onSave({
        ...brick,
        inscription,
        style,
        size
      })
    } catch (err) {
      setErrors([err.message])
      setSaving(false)
    }
  }

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black bg-opacity-70 z-40"
        onClick={onClose}
      />

      {/* Modal panel — slides up from bottom, Samsung thumb-friendly */}
      <div
        className="fixed bottom-0 left-0 right-0 z-50 rounded-t-3xl p-6"
        style={{ background: 'var(--stone)', borderTop: '4px solid var(--gold)' }}
      >
        {/* Title */}
        <h2 className="text-xl font-bold text-white mb-1">
          {inscription || '[Empty Paver]'}
        </h2>
        <p className="text-yellow-400 font-mono text-sm mb-6">
          {isNew ? '➕ New Entry · ' : 'Editing · '}
          {brick.section} · ID {brick.brickID}
        </p>

        {/* Inscription input */}
        <label className="text-xs uppercase text-gray-400 mb-2 block">
          Inscription
        </label>
        <input
          type="text"
          value={inscription}
          onChange={e => setInscription(e.target.value.toUpperCase())}
          placeholder="Name on paver..."
          className="w-full px-4 py-3 rounded-xl text-white mb-5"
          style={{
            background: '#111',
            border: '2px solid var(--gold)',
            fontSize: '16px' // Prevents Samsung auto-zoom
          }}
          autoCapitalize="characters"
          autoCorrect="off"
        />

        {/* Style selection */}
        <label className="text-xs uppercase text-gray-400 mb-2 block">
          Style
        </label>
        <div className="grid grid-cols-2 gap-3 mb-4">
          {['Black', 'Brick'].map(s => (
            <button
              key={s}
              onClick={() => setStyle(s)}
              className={`py-5 rounded-2xl font-bold text-lg transition-all ${
                style === s
                  ? 'border-2 border-gold text-gold bg-black'
                  : 'border-2 border-gray-600 text-gray-500 bg-transparent'
              }`}
            >
              {s === 'Black' ? '⬛ BLACK' : '🧱 BRICK'}
            </button>
          ))}
        </div>

        {/* Size selection */}
        <label className="text-xs uppercase text-gray-400 mb-2 block">
          Size
        </label>
        <div className="grid grid-cols-2 gap-3 mb-6">
          {['8x8', '4x8'].map(z => (
            <button
              key={z}
              onClick={() => setSize(z)}
              className={`py-5 rounded-2xl font-bold text-lg transition-all ${
                size === z
                  ? 'border-2 border-blue-400 text-blue-300 bg-blue-950'
                  : 'border-2 border-gray-600 text-gray-500 bg-transparent'
              }`}
            >
              {z === '8x8' ? '8 × 8' : '4 × 8'}
            </button>
          ))}
        </div>

        {/* Errors */}
        {errors.length > 0 && (
          <div className="bg-red-950 border border-red-500 rounded-xl p-3 mb-4">
            {errors.map((e, i) => (
              <p key={i} className="text-red-300 text-sm">{e}</p>
            ))}
          </div>
        )}

        {/* Warnings */}
        {warnings.length > 0 && (
          <div className="bg-yellow-950 border border-yellow-500 rounded-xl p-3 mb-4">
            {warnings.map((w, i) => (
              <p key={i} className="text-yellow-300 text-sm">{w}</p>
            ))}
          </div>
        )}

        {/* Save button */}
        <button
          onClick={handleSave}
          disabled={saving}
          className="w-full py-5 rounded-2xl font-black text-xl text-stone mb-3"
          style={{ background: saving ? '#888' : 'var(--gold)' }}
        >
          {saving ? 'Saving...' : 'CONFIRM & SAVE'}
        </button>

        {/* Cancel */}
        <button
          onClick={onClose}
          className="w-full py-3 text-gray-500 text-sm"
        >
          Cancel
        </button>
      </div>
    </>
  )
}
