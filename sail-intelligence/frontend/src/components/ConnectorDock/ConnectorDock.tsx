/**
 * src/components/ConnectorDock/ConnectorDock.tsx
 *
 * Horizontal scrollable connector selector dock.
 * Each connector shows an icon + label with an on/off toggle.
 * Master "Analyze" toggle on the left — like "use profile context".
 */

import { useConnectorStore, ALL_CONNECTORS, type ConnectorDef } from '@/stores/connectorStore'

// ── Domain group labels ────────────────────────────────────────────────────────

const DOMAIN_ORDER = ['ecommerce', 'social', 'creator', 'secondhand', 'analytics', 'local']
const DOMAIN_LABELS: Record<string, string> = {
  ecommerce:  'Marketplace',
  social:     'Social & Ads',
  creator:    'Creator',
  secondhand: 'Resale',
  analytics:  'Analytics',
  local:      'Real Estate',
}

// ── Single connector pill ─────────────────────────────────────────────────────

function ConnectorPill({
  connector,
  enabled,
  onToggle,
}: {
  connector: ConnectorDef
  enabled:   boolean
  onToggle:  () => void
}) {
  return (
    <button
      onClick={onToggle}
      title={connector.description}
      className={[
        'relative flex flex-col items-center gap-1 px-3 py-2 rounded-xl border transition-all duration-150',
        'min-w-[68px] select-none group',
        enabled
          ? `${connector.color} shadow-sm scale-100`
          : 'bg-sail-800/40 border-sail-700/50 text-sail-muted hover:bg-sail-700/50 hover:text-white',
      ].join(' ')}
    >
      {/* Active indicator dot */}
      {enabled && (
        <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-sail-accent animate-pulse" />
      )}

      <span className="text-lg leading-none">{connector.icon}</span>
      <span className="text-[10px] font-medium leading-tight whitespace-nowrap">
        {connector.label}
      </span>
    </button>
  )
}

// ── Master toggle switch ──────────────────────────────────────────────────────

function MasterToggle({
  active,
  onChange,
  enabledCount,
}: {
  active:       boolean
  onChange:     (v: boolean) => void
  enabledCount: number
}) {
  return (
    <div className="flex flex-col items-center gap-1 pr-3 border-r border-sail-700/60 shrink-0">
      <button
        onClick={() => onChange(!active)}
        className={[
          'relative w-10 h-5 rounded-full transition-colors duration-200',
          active ? 'bg-sail-accent' : 'bg-sail-700',
        ].join(' ')}
        title={active ? 'Disable connector analysis' : 'Enable connector analysis'}
      >
        <span
          className={[
            'absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform duration-200',
            active ? 'translate-x-5' : 'translate-x-0.5',
          ].join(' ')}
        />
      </button>
      <span className="text-[9px] text-sail-muted whitespace-nowrap">
        {active ? `${enabledCount} active` : 'off'}
      </span>
    </div>
  )
}

// ── Main dock ─────────────────────────────────────────────────────────────────

export function ConnectorDock({ onImportClick }: { onImportClick: () => void }) {
  const {
    enabledIds,
    analysisActive,
    toggleConnector,
    enableAll,
    disableAll,
    setAnalysisActive,
  } = useConnectorStore()

  // Group connectors by domain
  const grouped = DOMAIN_ORDER.map((domain) => ({
    domain,
    label:      DOMAIN_LABELS[domain],
    connectors: ALL_CONNECTORS.filter((c) => c.domain === domain),
  })).filter((g) => g.connectors.length > 0)

  const enabledCount = enabledIds.size

  return (
    <div
      className={[
        'w-full rounded-xl border border-sail-700/60 bg-sail-800/40 backdrop-blur-sm',
        'transition-opacity duration-200',
        analysisActive ? 'opacity-100' : 'opacity-60',
      ].join(' ')}
    >
      {/* Header row */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-sail-700/40">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-white">Connector Analysis</span>
          <span className="text-[10px] text-sail-muted">
            — analiz etmek istediğin platformları seç
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={enableAll}
            className="text-[10px] text-sail-muted hover:text-sail-accent transition-colors"
          >
            Tümünü aç
          </button>
          <span className="text-sail-700">·</span>
          <button
            onClick={disableAll}
            className="text-[10px] text-sail-muted hover:text-sail-danger transition-colors"
          >
            Kapat
          </button>
          <span className="text-sail-700">·</span>
          <button
            onClick={onImportClick}
            className="text-[10px] text-sail-accent hover:text-white transition-colors flex items-center gap-1"
          >
            <span>+</span>
            <span>Verim Ekle</span>
          </button>
        </div>
      </div>

      {/* Dock row */}
      <div className="flex items-start gap-3 px-3 py-3 overflow-x-auto scrollbar-thin scrollbar-thumb-sail-700">
        {/* Master toggle */}
        <MasterToggle
          active={analysisActive}
          onChange={setAnalysisActive}
          enabledCount={enabledCount}
        />

        {/* Connector groups */}
        {grouped.map((group) => (
          <div key={group.domain} className="flex flex-col gap-1.5 shrink-0">
            <span className="text-[9px] text-sail-muted uppercase tracking-wider px-0.5">
              {group.label}
            </span>
            <div className="flex gap-1.5">
              {group.connectors.map((c) => (
                <ConnectorPill
                  key={c.id}
                  connector={c}
                  enabled={analysisActive && enabledIds.has(c.id)}
                  onToggle={() => toggleConnector(c.id)}
                />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
