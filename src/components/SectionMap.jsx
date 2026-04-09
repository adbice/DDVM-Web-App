import { useState, useEffect } from 'react'

/**
 * SectionMap.jsx
 */

const SECTION_GRIDS = {
  'Section 1': { cols: 22, rows: 24, direction: 'rtl' },
  'Section 2': { cols: 22, rows: 24, direction: 'ltr' },
  'Section 3': { cols: 16, rows: 24, direction: 'rtl' },
  'Section 4': { cols: 16, rows: 24, direction: 'ltr' },
  'Section 5': { cols: 5,  rows: 48, direction: 'ltr' },
  'Section 6': { cols: 5,  rows: 48, direction: 'ltr' },
  'Section 7': { cols: 10, rows: 24, direction: 'ltr' },
  'Section 8': { cols: 10, rows: 24, direction: 'ltr' },
  'POW/MIA Section': { cols: 5, rows: 20, direction: 'ltr' },
}

function getPaverStatus(brick) {
  if (!brick) return 'empty'
  if (brick.inscription && brick.inscription.trim()) return 'filled'
  return 'present'
}

function getStatusColor(status) {
  switch (status) {
    case 'filled':  return { background: '#2d4a2d', border: '1px solid #4a9e4a' }
    case 'present': return { background: '#2d2d4a', border: '1px solid #4a4a9e' }
    case 'empty':   return { background: '#1a1a1a', border: '1px solid #333' }
    default:        return { background: '#1a1a1a', border: '1px solid #333' }
  }
}

export default function SectionMap({ section, inventory, onPaverTap }) {
  const [grid, setGrid] = useState([])
  const [stats, setStats] = useState({ filled: 0, present: 0, empty: 0, total: 0 })

  const config = SECTION_GRIDS[section]

  useEffect(() => {
    if (!config) return

    // Build lookup from brickID -> inventory record
    // Normalize both section name and brickID for reliable matching
    const lookup = {}
    inventory.forEach(b => {
      if (String(b.section).trim() === section) {
        lookup[String(b.brickID).trim()] = b
      }
    })

    const rows = []
    let filled = 0, present = 0, empty = 0
    const totalPavers = config.rows * config.cols

    // Generate every slot from 1 to total regardless of whether
    // it exists in the sheet yet — paver 1 is always top-left cell
    for (let row = 0; row < config.rows; row++) {
      const cells = []
      for (let col = 0; col < config.cols; col++) {
        const slotNum = row * config.cols + col + 1
        const brickID = String(slotNum)
        const brick = lookup[brickID] || null
        const status = getPaverStatus(brick)

        if (status === 'filled') filled++
        else if (status === 'present') present++
        else empty++

        cells.push({ brickID, brick, status })
      }

      // RTL sections count right to left — reverse display row
      if (config.direction === 'rtl') cells.reverse()

      rows.push(cells)
    }

    setGrid(rows)
    setStats({ filled, present, empty, total: totalPavers })
  }, [section, inventory])

  if (!config) {
    return (
      <div style={{ padding: '20px', color: '#888', textAlign: 'center' }}>
        Map not available for {section}
      </div>
    )
  }

  const fillPercent = stats.total > 0
    ? Math.round((stats.filled / stats.total) * 100)
    : 0

  return (
    <div style={{ padding: '12px' }}>

      {/* Stats bar */}
      <div style={{
        display: 'flex',
        gap: '12px',
        marginBottom: '12px',
        flexWrap: 'wrap'
      }}>
        <StatBadge color="#4a9e4a" label="Logged"   value={stats.filled} />
        <StatBadge color="#4a4a9e" label="Present"  value={stats.present} />
        <StatBadge color="#555"    label="Empty"    value={stats.empty} />
        <StatBadge color="#D4A843" label="Complete" value={`${fillPercent}%`} />
      </div>

      {/* Progress bar */}
      <div style={{
        height: '6px',
        background: '#333',
        borderRadius: '3px',
        marginBottom: '16px',
        overflow: 'hidden'
      }}>
        <div style={{
          height: '100%',
          width: `${fillPercent}%`,
          background: '#D4A843',
          borderRadius: '3px',
          transition: 'width 0.3s ease'
        }} />
      </div>

      {/* Legend */}
      <div style={{
        display: 'flex',
        gap: '16px',
        marginBottom: '12px',
        fontSize: '11px',
        color: '#888'
      }}>
        <span>🟩 Logged</span>
        <span>🟦 Present</span>
        <span>⬛ Not logged</span>
      </div>

      {/* Paver grid — horizontally scrollable for Samsung */}
      <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
        <div style={{ display: 'inline-block', minWidth: 'fit-content' }}>
          {grid.map((row, rowIdx) => (
            <div
              key={rowIdx}
              style={{ display: 'flex', gap: '3px', marginBottom: '3px' }}
            >
              {row.map(({ brickID, brick, status }) => (
                <PaverCell
                  key={brickID}
                  brickID={brickID}
                  brick={brick}
                  status={status}
                  onTap={() => onPaverTap(brick || {
                    brickID,
                    section,
                    inscription: '',
                    style: '',
                    size: ''
                  })}
                />
              ))}
            </div>
          ))}
        </div>
      </div>

      {/* Footer */}
      <div style={{
        marginTop: '12px',
        fontSize: '11px',
        color: '#555',
        textAlign: 'center'
      }}>
        {config.rows} rows × {config.cols} cols · {stats.total} total pavers
      </div>
    </div>
  )
}

function PaverCell({ brickID, brick, status, onTap }) {
  const colors = getStatusColor(status)
  const hasInscription = brick?.inscription?.trim()

  return (
    <div
      onClick={onTap}
      title={hasInscription ? `#${brickID}: ${brick.inscription}` : `#${brickID} — Not logged`}
      style={{
        width: '36px',
        height: '36px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: '4px',
        cursor: 'pointer',
        flexShrink: 0,
        overflow: 'hidden',
        WebkitTapHighlightColor: 'rgba(212,168,67,0.3)',
        ...colors,
      }}
    >
      {/* Paver ID */}
      <div style={{
        fontSize: '8px',
        color: status === 'filled' ? '#4a9e4a' : '#555',
        lineHeight: 1,
        fontFamily: 'monospace'
      }}>
        {brickID}
      </div>

      {/* Inscription initials if logged */}
      {hasInscription && (
        <div style={{
          fontSize: '7px',
          color: '#aaa',
          lineHeight: 1,
          marginTop: '1px',
          maxWidth: '34px',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
          textAlign: 'center'
        }}>
          {brick.inscription.split(' ').map(w => w[0]).join('').slice(0, 4)}
        </div>
      )}
    </div>
  )
}

function StatBadge({ color, label, value }) {
  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: '2px'
    }}>
      <span style={{
        fontSize: '18px',
        fontWeight: 'bold',
        color,
        fontFamily: 'monospace'
      }}>
        {value}
      </span>
      <span style={{ fontSize: '10px', color: '#666', textTransform: 'uppercase' }}>
        {label}
      </span>
    </div>
  )
}
