import { AiTurn, ProviderResponse, AppStep } from '../types';
import { BotIcon } from './Icons';
import ProviderResponseBlock from './ProviderResponseBlock';
import { useState, useEffect } from 'react';
import api from '../services/extension-api';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { ProviderPill } from './ProviderPill';

interface AiTurnBlockProps {
  aiTurn: AiTurn;
  isLive?: boolean;
  isReducedMotion?: boolean;
  currentAppStep?: AppStep;
  onResumeProvider?: (providerId: string) => void;
}

const AiTurnBlock = ({ aiTurn, isLive = false, isReducedMotion = false, currentAppStep, onResumeProvider }: AiTurnBlockProps) => {
  const [showPerspectives, setShowPerspectives] = useState(false);
  const [hiddenTurns, setHiddenTurns] = useState<AiTurn[]>([]);

  useEffect(() => {
    if (!aiTurn.sessionId || !aiTurn.id) {
      console.log('Skipping hidden turns load: missing sessionId or aiTurn.id');
      return;
    }

    // Skip if we don't have provider responses yet
    if (!aiTurn.providerResponses || Object.keys(aiTurn.providerResponses).length === 0) {
      console.log('Skipping hidden turns load: main message not ready');
      return;
    }
    
    let cancelled = false;
    
    const loadHidden = async () => {
      console.log('Loading hidden turns for aiTurn:', aiTurn.id);
      try {
        const session = await api.getHistorySession(aiTurn.sessionId!);
        if (!session?.messages) {
          console.log('No session messages found');
          return;
        }

        const hidden = (session.messages as any[])
          .filter((message): message is AiTurn => 
            message?.type === 'ai' && 
            message?.meta?.ensembleHidden === true
          )
          .map(message => ({
            ...message,
            createdAt: message.createdAt || Date.now(),
            providerResponses: message.providerResponses || {},
            sessionId: message.sessionId || aiTurn.sessionId
          }));

        if (!cancelled) {
          console.log(`Found ${hidden.length} hidden turns`);
          setHiddenTurns(hidden);
        }
      } catch (error) {
        console.error('Failed to load hidden turns:', error);
      }
    };
    
    if (showPerspectives) {
      loadHidden();
    } else {
      // Clear hidden turns when hiding the panel
      setHiddenTurns([]);
    }
    
    return () => { cancelled = true; };
  }, [showPerspectives, aiTurn.sessionId]);



  return (
    <div className="ai-turn-block" style={{
      background: 'rgba(30, 41, 59, 0.6)',
      border: '1px solid #334155',
      borderRadius: '1rem',
      padding: '16px',
      overflow: 'visible',
      minHeight: '80px'
    }}>
      {/* AI Turn Header */}
      <div
        className="ai-turn-header"
        style={{
          display: 'flex',
          gap: '8px',
          padding: '8px 12px',
          background: aiTurn.isEnsembleAnswer ? 'rgba(16,185,129,0.08)' : 'rgba(139, 92, 246, 0.05)',
          border: '1px solid rgba(139, 92, 246, 0.1)',
          borderRadius: '12px',
        }}
      >
        <div
          className="ai-avatar"
          style={{
            width: '32px',
            height: '32px',
            borderRadius: '8px',
            background: aiTurn.isEnsembleAnswer ? 'rgba(16,185,129,0.2)' : 'rgba(139, 92, 246, 0.2)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}
        >
          <BotIcon style={{ width: '18px', height: '18px', color: aiTurn.isEnsembleAnswer ? '#10b981' : '#8b5cf6' }} />
        </div>
        <div
          className="ai-turn-info"
          style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            gap: '4px',
          }}
        >
          <div
            style={{
              fontSize: '12px',
              fontWeight: 600,
              color: aiTurn.isEnsembleAnswer ? '#10b981' : '#8b5cf6',
            }}
          >
            {aiTurn.isEnsembleAnswer
              ? 'Ensemble Answer — Cross-validated'
              : aiTurn.isSynthesisAnswer
                ? 'Synthesis'
                : 'AI Response'} {isLive && '(Live)'}
          </div>
          <div
            style={{
              fontSize: '11px',
              color: '#94a3b8',
            }}
          >
            {new Date(aiTurn.createdAt).toLocaleTimeString()}
          </div>
        </div>
        {aiTurn.isEnsembleAnswer && (
          <button
            onClick={() => setShowPerspectives(s => !s)}
            title={showPerspectives ? 'Hide perspectives' : 'Show perspectives (hidden synths & originals)'}
            style={{ padding: '6px 10px', fontSize: 12, borderRadius: 8, border: '1px solid rgba(255,255,255,0.15)', background: 'rgba(255,255,255,0.06)', color: '#e2e8f0', cursor: 'pointer' }}
          >
            {showPerspectives ? 'Hide Perspectives' : 'Show Perspectives'}
          </button>
        )}
      </div>

      {/* Provider Responses Grid - Show First */}
      {Object.keys(aiTurn.providerResponses).length > 0 && (
        <ProviderResponseBlock
          providerResponses={aiTurn.providerResponses}
          isLoading={isLive}
          currentAppStep={currentAppStep || (isLive ? 'awaitingSynthesis' : 'synthesisDone')}
          isReducedMotion={isReducedMotion}
          onResumeProvider={onResumeProvider}
        />
      )}

      {/* Round-level action bar is rendered under UserTurnBlock now */}

      {/* Synthesis Response - Only show inside turn when finalized, to avoid duplication with sticky overlay */}
      {aiTurn.synthesisResponse && (
        (!isLive || currentAppStep === 'synthesis' || currentAppStep === 'synthesisDone')
      ) && (
        <div
          className="synthesis-section"
          style={{
            marginTop: '16px',
            padding: '16px',
            backgroundColor: 'rgba(30, 41, 59, 0.6)',
            border: '1px solid #334155',
            borderRadius: '1rem',
            position: 'relative',
          }}
        >
          <div
            style={{
              fontSize: '12px',
              fontWeight: 600,
              color: '#a78bfa',
              marginBottom: '8px',
            }}
          >
            Synthesis
          </div>
          <div
            style={{
              fontSize: '13px',
              lineHeight: '1.5',
              color: '#e2e8f0',
              whiteSpace: 'pre-wrap',
              background: 'rgba(0, 0, 0, 0.25)',
              borderRadius: '8px',
              padding: '12px',
            }}
          >
            {aiTurn.synthesisResponse.text ? (
              <ReactMarkdown remarkPlugins={[remarkGfm]}>{aiTurn.synthesisResponse.text}</ReactMarkdown>
            ) : (
              <span className="streaming-dots" />
            )}
          </div>
          <ProviderPill id={Object.keys(aiTurn.providerResponses)[0] as any} />
        </div>
      )}

      {/* Perspectives panel (hidden artifacts) */}
      {aiTurn.isEnsembleAnswer && showPerspectives && (
        <div style={{ marginTop: 12, padding: 12, border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12, background: 'rgba(255,255,255,0.04)' }}>
          <div style={{ fontSize: 12, color: '#94a3b8', marginBottom: 8 }}>Hidden perspectives (originals & synths)</div>
          {hiddenTurns.map((t, idx) => (
            <div key={t.id || idx} style={{ marginBottom: 8, padding: 8, border: '1px solid rgba(255,255,255,0.06)', borderRadius: 8 }}>
              <div style={{ fontSize: 12, color: '#a78bfa', marginBottom: 6 }}>
                {(t.meta as any)?.ensembleHiddenStage === 'batch' ? 'Hidden original outputs' : 'Hidden synth outputs'}
              </div>
              <ProviderResponseBlock providerResponses={t.providerResponses} isLoading={false} currentAppStep={'synthesisDone'} isReducedMotion={isReducedMotion} />
            </div>
          ))}
          {hiddenTurns.length === 0 && (
            <div style={{ fontSize: 12, color: '#64748b' }}>No hidden perspectives found in history.</div>
          )}
        </div>
      )}
    </div>
  );
};

export default AiTurnBlock;