import { AppStep } from '../types';
import { LLM_PROVIDERS_CONFIG } from '../constants';

interface TurnActionBarProps {
  currentAppStep: AppStep;
  onSynthesize: (providerId: string) => void;
  availableProviders: string[]; // provider ids that have responses to synthesize from
  isLoading?: boolean;
  // Ensemble additions
  selectedSynthModelIds?: string[]; // models selected in ModelTray to act as synthesizers
  onStartEnsemble?: () => void; // when user clicks Ensemble button from TurnActionBar
  ensembleActive?: boolean;
}

const TurnActionBar = ({ currentAppStep, onSynthesize, availableProviders, isLoading = false, selectedSynthModelIds = [], onStartEnsemble, ensembleActive = false }: TurnActionBarProps) => {
  // Guard: only render in awaitingSynthesis state and when providers exist
  if (currentAppStep !== 'awaitingSynthesis' || availableProviders.length === 0) return null;

  // Keep button order aligned with global provider config, but only show available ones
  const providersToShow = LLM_PROVIDERS_CONFIG.filter(p => availableProviders.includes(p.id));

  // Ensemble button visibility per spec: last AI turn has >=2 providers AND ModelTray has >=2 selected
  const showEnsemble = availableProviders.length >= 2 && selectedSynthModelIds.length >= 2;

  const formatList = (ids: string[], max = 3) => {
    const names = ids.map(id => LLM_PROVIDERS_CONFIG.find(p => p.id === id)?.name || id);
    if (names.length <= max) return names.join(', ');
    const head = names.slice(0, max).join(', ');
    return `${head}, +${names.length - max} more`;
  };

  const tooltip = `Ensemble perspectives from: ${formatList(availableProviders)} — Ensemble with: ${formatList(selectedSynthModelIds)}`;

  return (
    <div
      className="turn-action-bar"
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        padding: '12px 14px',
        border: '1px solid #334155',
        background: '#1e293b',
        borderRadius: '12px',
        marginTop: '8px',
      }}
    >
      <span style={{ color: '#94a3b8', fontSize: 12 }}>Synthesize with…</span>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        {providersToShow.map(provider => (
          <button
            key={provider.id}
            onClick={() => !isLoading && onSynthesize(provider.id)}
            disabled={isLoading}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              padding: '8px 12px',
              borderRadius: 8,
              border: '1px solid #475569',
              background: isLoading ? '#334155' : '#334155',
              color: '#e2e8f0',
              fontSize: 12,
              cursor: isLoading ? 'not-allowed' : 'pointer',
              transition: 'background 0.15s ease, transform 0.03s ease',
            }}
            onMouseDown={e => {
              // Micro press feedback
              (e.currentTarget as HTMLButtonElement).style.transform = 'translateY(1px)';
            }}
            onMouseUp={e => {
              (e.currentTarget as HTMLButtonElement).style.transform = 'translateY(0)';
            }}
            title={`Synthesize with ${provider.name}`}
          >
            <span style={{ filter: 'grayscale(0.1)', opacity: 0.9 }}>✨</span>
            <span>{provider.name}</span>
          </button>
        ))}
      </div>

      {/* Spacer */}
      <div style={{ flex: 1 }} />

      {/* Ensemble Button (TurnActionBar path) */}
      {showEnsemble && (
        <button
          onClick={() => onStartEnsemble && !ensembleActive && onStartEnsemble()}
          disabled={ensembleActive || isLoading}
          title={tooltip}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            padding: '8px 12px',
            borderRadius: 8,
            border: '1px solid #475569',
            background: '#334155',
            color: '#e2e8f0',
            fontSize: 12,
            cursor: (ensembleActive || isLoading) ? 'not-allowed' : 'pointer',
            transition: 'background 0.15s ease, transform 0.03s ease',
            opacity: (ensembleActive || isLoading) ? 0.6 : 1,
          }}
        >
          <span style={{ filter: 'grayscale(0.1)', opacity: 0.9 }}>🧩</span>
          <span>Ensemble</span>
        </button>
      )}
    </div>
  );
};

export default TurnActionBar;
  