import { useState, useEffect } from 'react'
import Header from './components/Header.jsx'
import BrickCard from './components/BrickCard.jsx'
import EntryModal from './components/EntryModal.jsx'
import { getAllBricks, savePaver, signIn, isSignedIn } from './services/SheetsService.js'

export default function App() {
  const [inventory, setInventory]         = useState([])
  const [filtered, setFiltered]           = useState([])
  const [activeSection, setActiveSection] = useState('Section 1')
  const [searchQuery, setSearchQuery]     = useState('')
  const [selectedBrick, setSelectedBrick] = useState(null)
  const [modalOpen, setModalOpen]         = useState(false)
  const [isNewPaver, setIsNewPaver]       = useState(false)
  const [loadStatus, setLoadStatus]       = useState('Not signed in')
  const [authed, setAuthed]               = useState(false)

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

  return (
    <div style={{ minHeight: '100vh', background: '#1A1A1A', color: '#F5F0E8', fontFamily: 'Georgia, serif' }}>
      
      {/* Sign in screen */}
      {!authed && (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', gap: '24px', padding: '40px' }}>
          <h1 style={{ color: '#D4A843', fontSize: '2rem', fontWeight: 'bold', textAlign: 'center' }}>
            DDVM Monument Mapper
          </h1>
          <p style={{ color: '#888', textAlign: 'center' }}>
            Sign in with Google to access the paver inventory
          </p>
          <button
            onClick={handleSignIn}
            style={{ background: '#D4A843', color: '#1A1A1A', border: 'none', borderRadius: '16px', padding: '20px 40px', fontSize: '1.2rem', fontWeight: 'bold', cursor: 'pointer', width: '100%', maxWidth: '320px' }}
          >
            Sign in with Google
          </button>
          <p style={{ color: '#555', fontSize: '0.85rem' }}>{loadStatus}</p>
        </div>
      )}

      {/* Main app */}
      {authed && (
        <>
          <Header
            sections={SECTIONS}
            activeSection={activeSection}
            onSectionChange={setActiveSection}
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            loadStatus={loadStatus}
          />

          <div style={{ paddingTop: '8px' }}>
            {showNewButton && (
              <div style={{ padding: '16px' }}>
                <button
                  onClick={handleNewPaver}
                  style={{ width: '100%', padding: '24px', background: '#D4A843', color: '#1A1A1A', border: 'none', borderRadius: '16px', fontSize: '1.2rem', fontWeight: 'bold', cursor: 'pointer' }}
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
              <div style={{ textAlign: 'center', color: '#555', marginTop: '80px', fontSize: '1.1rem' }}>
                No pavers in {activeSection}
              </div>
            )}
          </div>

          {modalOpen && (
            <EntryModal
              brick={selectedBrick}
              isNew={isNewPaver}
              onSave={handleSave}
              onClose={() => setModalOpen(false)}
            />
          )}
        </>
      )}
    </div>
  )
}
