import { useState, useEffect } from 'react'
import Header from './components/Header.jsx'
import BrickCard from './components/BrickCard.jsx'
import EntryModal from './components/EntryModal.jsx'
import { getAllBricks, savePaver } from './services/SheetsService.js'

export default function App() {
  const [inventory, setInventory]     = useState([])
  const [filtered, setFiltered]       = useState([])
  const [activeSection, setActiveSection] = useState('Section 1')
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedBrick, setSelectedBrick] = useState(null)
  const [modalOpen, setModalOpen]     = useState(false)
  const [isNewPaver, setIsNewPaver]   = useState(false)
  const [loadStatus, setLoadStatus]   = useState('Loading...')
  const [pendingCount, setPendingCount] = useState(0)

  const SECTIONS = [
    'Section 1', 'Section 2', 'Section 3', 'Section 4',
    'Section 5', 'Section 6', 'Section 7', 'Section 8',
    'POW/MIA Section'
  ]

  // Load inventory when section changes
  useEffect(() => {
    loadInventory()
  }, [activeSection])

  // Filter results when search query changes
  useEffect(() => {
    if (!searchQuery.trim()) {
      setFiltered(inventory)
      return
    }
    const q = searchQuery.toLowerCase()
    setFiltered(
      inventory.filter(b =>
        b.inscription && b.inscription.toLowerCase().includes(q)
      )
    )
  }, [searchQuery, inventory])

  async function loadInventory() {
    setLoadStatus('Loading...')
    try {
      const data = await getAllBricks(activeSection)
      setInventory(data)
      setFiltered(data)
      setLoadStatus(`${data.length} pavers`)
    } catch (err) {
      setLoadStatus('Offline')
      console.error('Failed to load inventory:', err)
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
    <div className="min-h-screen bg-granite text-cream font-serif">
      <Header
        sections={SECTIONS}
        activeSection={activeSection}
        onSectionChange={setActiveSection}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        loadStatus={loadStatus}
        pendingCount={pendingCount}
      />

      <div className="pt-2">
        {showNewButton && (
          <div className="p-4">
            <button
              onClick={handleNewPaver}
              className="w-full py-6 bg-gold text-stone font-bold text-xl rounded-2xl"
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
          <div className="text-center text-gray-500 mt-20 text-lg">
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
    </div>
  )
}
