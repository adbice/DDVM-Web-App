export default function BrickCard({ brick, onTap }) {
  const hasInscription = brick.inscription && brick.inscription.trim()
  const hasStyle = brick.style && brick.style.trim()
  const hasSize = brick.size && brick.size.trim()

  return (
    <div
      onClick={() => onTap(brick)}
      className="mx-4 my-3 p-5 rounded-xl active:scale-95 transition-transform cursor-pointer"
      style={{
        background: 'var(--slate)',
        borderLeft: '6px solid var(--gold)'
      }}
    >
      {/* Inscription */}
      <div className="text-lg font-bold mb-1">
        {hasInscription ? brick.inscription : (
          <span className="text-gray-500 italic">Empty Paver</span>
        )}
      </div>

      {/* Section + ID */}
      <div className="text-sm text-yellow-400 font-mono mb-3">
        {brick.section} · ID {brick.brickID}
      </div>

      {/* Style + Size badges */}
      <div className="flex gap-2">
        <span className={`text-xs px-3 py-1 rounded-full border ${
          hasStyle
            ? 'border-gray-500 text-gray-300'
            : 'border-gray-700 text-gray-600'
        }`}>
          {hasStyle ? brick.style : 'No Style'}
        </span>
        <span className={`text-xs px-3 py-1 rounded-full ${
          hasSize
            ? 'bg-blue-900 text-blue-200'
            : 'bg-transparent border border-gray-700 text-gray-600'
        }`}>
          {hasSize ? brick.size : 'No Size'}
        </span>
        {!hasInscription && (
          <span className="text-xs px-3 py-1 rounded-full bg-yellow-900 text-yellow-300">
            Needs Entry
          </span>
        )}
      </div>
    </div>
  )
}
