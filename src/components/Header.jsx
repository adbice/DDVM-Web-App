{/* Search bar + paste button */}
<div className="px-4 pb-3" style={{ display: 'flex', gap: '8px' }}>
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
