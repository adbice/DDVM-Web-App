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
        <h1 className="text-sm font-bold uppercase tracking-widest text-gold">
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
      <div className="flex overflow-x-auto gap-2 px-4 pb-3 scroll-smooth"
        style={{ scrollbarWidth: 'none' }}
      >
        {sections.map(sec => (
          <button
            key={sec}
            onClick={() => onSectionChange(sec)}
            className={`whitespace-nowrap px-5 py-2 rounded-full text-sm font-bold transition-all ${
              activeSection === sec
                ? 'bg-gold text-stone'
                : 'bg-transparent border border-gray-600 text-gray-400'
            }`}
          >
            {sec === 'POW/MIA Section' ? 'POW/MIA' : sec.replace('Section ', 'Sec ')}
          </button>
        ))}
      </div>

      {/* Search bar */}
      <div className="relative px-4 pb-4">
        <input
          type="search"
          value={searchQuery}
          onChange={e => onSearchChange(e.target.value)}
          placeholder="Search name or scan inscription..."
          className="w-full px-5 py-4 text-lg rounded-xl text-white"
          style={{
            background: '#000',
            border: '2px solid var(--gold)',
            fontSize: '16px' // Prevents Samsung auto-zoom on focus
          }}
          autoComplete="off"
          autoCorrect="off"
          autoCapitalize="characters"
        />
        {searchQuery && (
          <button
            onClick={() => onSearchChange('')}
            className="absolute right-8 top-1/2 -translate-y-1/2 text-gold text-xl"
          >
            ✕
          </button>
        )}
      </div>
    </div>
  )
}
