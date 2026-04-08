'use client'

import { useAppMode, AppMode, MODE_META } from '../context/AppModeContext'

const MODES: AppMode[] = ['analyst', 'strategist', 'cleaner']

export function ModeSelector() {
  const { mode, setMode } = useAppMode()

  return (
    <div className="flex items-center gap-1 p-1 rounded-pill"
      style={{ background: '#EFEFEF', border: '1px solid #E5E7EB' }}>
      {MODES.map((m) => {
        const active = m === mode
        return (
          <button
            key={m}
            onClick={() => setMode(m)}
            title={MODE_META[m].hint}
            className="relative font-sans text-xs font-medium px-4 py-1.5 rounded-pill transition-all"
            style={{
              background: active ? '#FFFFFF' : 'transparent',
              color:      active ? '#111827' : '#6B7280',
              boxShadow:  active ? '0 1px 4px rgba(0,0,0,0.08)' : 'none',
            }}
            aria-pressed={active}
          >
            {active && (
              <span
                style={{
                  position:     'absolute',
                  left:         8,
                  top:          '50%',
                  transform:    'translateY(-50%)',
                  width:        5,
                  height:       5,
                  borderRadius: '50%',
                  background:   '#FACC15',
                  boxShadow:    '0 0 5px rgba(250,204,21,0.5)',
                }}
              />
            )}
            <span style={{ paddingLeft: active ? 8 : 0 }}>
              {MODE_META[m].label}
            </span>
          </button>
        )
      })}
    </div>
  )
}
