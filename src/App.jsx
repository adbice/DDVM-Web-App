import { useState, useEffect } from 'react'
import Header from './components/Header.jsx'
import BrickCard from './components/BrickCard.jsx'
import EntryModal from './components/EntryModal.jsx'
import SectionMap from './components/SectionMap.jsx'
import CalibrationPanel from './components/CalibrationPanel.jsx'
import { getAllBricks, savePaver, signIn, isSignedIn } from './services/SheetsService.js'

export default function App() {
  const [inventory, setInventory]             = useState([])
  const [filtered, setFiltered]               = useState([])
  const [activeSection, setActiveSection]     = useState('Section 1')
  const [searchQuery, setSearchQuery]         = useState('')
  const [selectedBrick, setSelectedBrick]     = useState(null)
  const [modalOpen, setModalOpen]             = useState(false)
  const [isNewPaver, setIsNewPaver]           = useState(false)
  const [loadStatus, setLoadStatus]           = useState('Not signed in')
  const [authed, setAuthed]                   = useState(false)
  const [viewMode, setViewMode]               = useState('list')
  const [pendingCount, setPendingCount]       = useState(0)
  const [showCalibration, setShowCalibration] = useState(false)

  const SECTIONS = [
    'Section 1', 'Section 2', 'Section 3', 'Section 4',
    'Section 5', 'Section 6', 'Section 7', 'Section 8',
    'POW/MIA Section'
  ]

  useEffect(() => {
    if (authed) loadInventory()
  }, [activeSection, authed])

  useEffect(() => {
    if (!searchQuery.trim()) { setFiltered(inventory); return }
    const q = searchQuery.toLowerCase()
    setFiltered(inventory.filter(b =>
      b.inscription && b.inscription.toLowerCase().includes(q)
    ))
  }, [searchQuery, inventory])

  async function handleSignIn() {
    try {
      setLoadStatus('Signing in...')
      await signIn()
      setAuthed(true)
    } catch (err) {
      setLoadStatus('Sign in failed')
      console.error(err)
    }
  }

  async function loadInventory() {
    setLoadStatus('Loading...')
    try {
      const data = await getAllBricks(activeSection)
      setInventory(data)
      setFiltered(data)
      setLoadStatus(`${data.length} pavers`)
    } catch (err) {
      setLoadStatus('Load failed')
      console.error(err)
    }
  }

  function handleCardTap(brick) {
    setSelectedBrick(brick)
    setIsNewPaver(false)
    setModalOpen(true)
  }

  function handleNewPaver() {
    const id = prompt('Enter Brick ID #:')
    if (!id) return
    setSelectedBrick({
      brickID: id,
      section: activeSection,
      inscription: searchQuery.toUpperCase(),
      style: '',
      size: ''
    })
    setIsNewPaver(true)
    setModalOpen(true)
  }

  async function handleSave(record) {
    try {
      await savePaver(record, isNewPaver)
      setModalOpen(false)
      loadInventory()
    } catch (err) {
      alert('Save failed: ' + err.message)
    }
  }

  const showNewButton = searchQuery.length > 1 && filtered.length === 0

  // ─── Sign in screen ───────────────────────────────────────────────────────
  if (!authed) {
    return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        gap: '24px',
        padding: '40px',
        background: '#1A1A1A'
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '3rem', marginBottom: '8px' }}>🪖</div>
          <h1 style={{ color: '#D4A843', fontSize: '1.8rem', fontWeight: 'bold', margin: 0 }}>
            DDVM Monument Mapper
          </h1>
          <p style={{ color: '#555', marginTop: '8px', fontSize: '0.9rem' }}>
            David Dewett Veterans Memorial · Coos Bay, OR
          </p>
        </div>
        <button
          onClick={handleSignIn}
          style={{
            background: '#D4A843',
            color: '#1A1A1A',
            border: 'none',
            borderRadius: '16px',
            padding: '20px 40px',
            fontSize: '1.2rem',
            fontWeight: 'bold',
            cursor: 'pointer',
            width: '100%',
            maxWidth: '320px'
          }}
        >
          Sign in with Google
        </button>
        <p style={{ color: '#555', fontSize: '0.85rem' }}>{loadStatus}</p>
      </div>
    )
  }

  // ─── Main app ─────────────────────────────────────────────────────────────
  return (
    <div style={{ minHeight: '100vh', background: '#1A1A1A', color: '#F5F0E8', fontFamily: 'Georgia, serif' }}>

      <Header
        sections={SECTIONS}
        activeSection={activeSection}
        onSectionChange={(sec) => { setActiveSection(sec); setSearchQuery('') }}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        loadStatus={loadStatus}
        pendingCount={pendingCount}
      />

      {/* View mode toggle + action buttons */}
      <div style={{
        display: 'flex',
        gap: '8px',
        padding: '12px 16px 12px',
        borderBottom: '1px solid #2C2C2C',
        alignItems: 'center'
      }}>
        <ViewToggleBtn
          label="☰ List"
          active={viewMode === 'list'}
          onClick={() => setViewMode('list')}
        />
        <ViewToggleBtn
          label="⊞ Map"
          active={viewMode === 'map'}
          onClick={() => setViewMode('map')}
        />
        <div style={{ flex: 1 }} />
        <button
          onClick={loadInventory}
          style={{
            background: 'transparent',
            border: '1px solid #444',
            color: '#888',
            borderRadius: '8px',
            padding: '6px 12px',
            fontSize: '12px',
            cursor: 'pointer'
          }}
        >
          ↻ Refresh
        </button>
        <button
          onClick={() => setShowCalibration(true)}
          style={{
            background: 'transparent',
            border: '1px solid #444',
            color: '#888',
            borderRadius: '8px',
            padding: '6px 12px',
            fontSize: '12px',
            cursor: 'pointer'
          }}
        >
          📍 Calibrate
        </button>
      </div>

      {/* LIST VIEW */}
      {viewMode === 'list' && (
        <div style={{ paddingTop: '8px' }}>
          {showNewButton && (
            <div style={{ padding: '16px' }}>
              <button
                onClick={handleNewPaver}
                style={{
                  width: '100%',
                  padding: '24px',
                  background: '#D4A843',
                  color: '#1A1A1A',
                  border: 'none',
                  borderRadius: '16px',
                  fontSize: '1.2rem',
                  fontWeight: 'bold',
                  cursor: 'pointer'
                }}
              >
                ➕ CREATE NEW: {searchQuery.toUpperCase()}
              </button>
            </div>
          )}

          {filtered.slice(0, 20).map(brick => (
            <BrickCard
              key={`${brick.section}-${brick.brickID}`}
              brick={brick}
              onTap={handleCardTap}
            />
          ))}

          {filtered.length === 0 && !showNewButton && (
            <div style={{
              textAlign: 'center',
              color: '#555',
              marginTop: '80px',
              fontSize: '1.1rem'
            }}>
              No pavers logged in {activeSection}
            </div>
          )}

          {filtered.length > 20 && (
            <div style={{
              textAlign: 'center',
              color: '#555',
              padding: '16px',
              fontSize: '0.9rem'
            }}>
              Showing 20 of {filtered.length} — search to narrow results
            </div>
          )}
        </div>
      )}

      {/* MAP VIEW */}
      {viewMode === 'map' && (
        <SectionMap
          section={activeSection}
          inventory={inventory}
          onPaverTap={handleCardTap}
        />
      )}

      {/* MODALS */}
      {modalOpen && (
        <EntryModal
          brick={selectedBrick}
          isNew={isNewPaver}
          onSave={handleSave}
          onClose={() => setModalOpen(false)}
        />
      )}

      {showCalibration && (
        <CalibrationPanel onClose={() => setShowCalibration(false)} />
      )}

    </div>
  )
}

function ViewToggleBtn({ label, active, onClick }) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: '8px 16px',
        borderRadius: '8px',
        border: 'none',
        background: active ? '#D4A843' : 'transparent',
        color: active ? '#1A1A1A' : '#888',
        fontWeight: active ? 'bold' : 'normal',
        fontSize: '13px',
        cursor: 'pointer',
        transition: 'all 0.15s'
      }}
    >
      {label}
    </button>
  )
}
