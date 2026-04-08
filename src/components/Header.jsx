export default function Header({
  sections,
  activeSection,
  onSectionChange,
  searchQuery,
  onSearchChange,
  loadStatus,
  pendingCount
}) {
  return (
    <div
      className="sticky top-0 z-50"
      style={{ background: 'var(--stone)', borderBottom: '3px solid var(--gold)' }}
    >
      {/* Top bar */}
      <div className="flex justify-between items-center px-4 py-3">
        <h1
          className="text-sm font-bold uppercase tracking-widest"
          style={{ color: 'var(--gold)' }}
        >
          DDVM Mapper
        </h1>
        <div className="flex items-center gap-2">
          {pendingCount > 0 && (
            <span className="text-xs bg-yellow-600 text-white px-2 py-1 rounded-full">
              {pendingCount} pending
            </span>
          )}
          <span className="text-xs border border-gray-600 text-gray-400 px-2 py-1 rounded-full">
            {loadStatus}
          </span>
        </div>
      </div>

      {/* Section navigation */}
      <div
        className="flex overflow-x-auto gap-2 px-4 pb-3"
        style={{ scrollbarWidth: 'none', WebkitOverflowScrolling: 'touch' }}
      >
        {sections.map(sec => (
          <button
            key={sec}
            onClick={() => onSectionChange(sec)}
            style={
              activeSection === sec
                ? { background: 'var(--gold)', color: 'var(--stone)', border: 'none' }
                : { background: 'transparent', border: '1px solid #444', color: '#888' }
            }
            className="whitespace-nowrap px-5 py-2 rounded-full text-sm font-bold"
          >
            {sec === 'POW/MIA Section' ? 'POW/MIA' : sec.replace('Section ', 'Sec ')}
          </button>
        ))}
      </div>

      {/* Search bar + paste button */}
      <div className="px-4 pb-4" style={{ display: 'flex', gap: '8px' }}>
        <input
          type="search"
          value={searchQuery}
          onChange={e => onSearchChange(e.target.value)}
          placeholder="Search or paste from Lens..."
          style={{
            flex: 1,
            padding: '16px',
            background: '#000',
            border: '2px solid var(--gold)',
            borderRadius: '12px',
            color: '#fff',
            fontSize: '16px'
          }}
          autoComplete="off"
          autoCorrect="off"
          autoCapitalize="characters"
        />
        <button
          onClick={async () => {
            try {
              const text = await navigator.clipboard.readText()
              onSearchChange(text.toUpperCase().trim())
            } catch {
              alert('Tap and hold the search box and choose Paste instead.')
            }
          }}
          style={{
            padding: '16px',
            background: 'var(--gold)',
            border: 'none',
            borderRadius: '12px',
            color: 'var(--stone)',
            fontWeight: 'bold',
            fontSize: '1.2rem',
            cursor: 'pointer',
            whiteSpace: 'nowrap'
          }}
        >
          📋 Paste
        </button>
      </div>
    </div>
  )
}
