import React from 'react';
import ReactMarkdown from 'react-markdown';
import { Zap, Loader2 } from 'lucide-react';

/**
 * Pinter-style live execution & thinking indicator.
 * Displays real-time streaming reasoning (Thinking · Supervisor/Developer),
 * active running tools with spinners (yahoo_get_news running...), and dynamic status.
 */
function ThinkingIndicator({ 
  elapsedSeconds = 0, 
  mode = 'role',
  liveStatus = '',
  liveThoughts = [],
  liveTools = []
}) {
  const defaultAgent = mode === 'role' ? 'Supervisor' : 'Model';
  const displayStatus = liveStatus || (mode === 'role' ? 'Supervisor analyzing request...' : 'Formulating reasoning...');

  return (
    <div className="pinter-live-indicator-container">
      {/* Top Running Status (Matching Pinter: "○ Menjalankan / Running ...") */}
      {liveStatus && (
        <div className="pinter-live-top-status">
          <div className="pinter-top-spinner" />
          <span className="pinter-top-status-text">{liveStatus}</span>
        </div>
      )}

      {/* Live Thoughts Streamed in Real-Time */}
      {liveThoughts.length > 0 ? (
        <div className="pinter-live-thoughts-list">
          {liveThoughts.map((t, idx) => (
            <div key={idx} className="pinter-thought-card pinter-live-thought">
              <div className="pinter-agent-badge">
                <span className="pinter-badge-icon">⚡</span>
                <span className="pinter-badge-label">Thinking</span>
                <span className="pinter-badge-agent">{t.agent || defaultAgent}</span>
              </div>
              <div className="pinter-thought-text markdown-body">
                <ReactMarkdown>{t.content}</ReactMarkdown>
              </div>
            </div>
          ))}
        </div>
      ) : (
        /* Initial reasoning placeholder before first token */
        <div className="pinter-thought-card pinter-live-thought-placeholder">
          <div className="pinter-agent-badge">
            <span className="pinter-badge-icon">⚡</span>
            <span className="pinter-badge-label">Thinking</span>
            <span className="pinter-badge-agent">{defaultAgent}</span>
          </div>
          <div className="pinter-placeholder-content">
            <div className="pinter-skeleton-bar bar-1" />
            <div className="pinter-skeleton-bar bar-2" />
          </div>
        </div>
      )}

      {/* Live Running Tools (Matching Pinter: "○ yahoo_get_news running...") */}
      {liveTools.length > 0 && (
        <div className="pinter-live-tools-list">
          {liveTools.map((tool, idx) => (
            <div key={idx} className="pinter-live-tool-row">
              <div className="pinter-tool-spinner" />
              <span className="pinter-tool-name">{tool.name}</span>
              <span className="pinter-tool-status">{tool.status || 'running...'}</span>
            </div>
          ))}
        </div>
      )}

      {/* Active Pulse Bar */}
      <div className="pinter-active-pulse-bar">
        <div className="pinter-pulse-left">
          <Zap size={14} className="pinter-pulse-zap fill-amber" />
          <span className="pinter-pulse-title">
            Thinking ({elapsedSeconds.toFixed(1)}s)
          </span>
          <span className="pinter-pulse-dot">·</span>
          <span className="pinter-pulse-status">{displayStatus}</span>
        </div>

        <div className="pinter-pulse-dots">
          <span className="pdot pdot-1" />
          <span className="pdot pdot-2" />
          <span className="pdot pdot-3" />
        </div>
      </div>
    </div>
  );
}

export default ThinkingIndicator;
