import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { ChevronRight, ChevronDown, Terminal, Globe, Loader2 } from 'lucide-react';

/**
 * Live Reasoning Trace Streaming Indicator.
 * Matches Image 1: Blue-outlined pill on top, followed by "Thinking for Xs"
 * and real-time streaming reasoning steps and active tool traces.
 */
function ThinkingIndicator({ 
  elapsedSeconds = 0, 
  mode = 'role',
  liveStatus = '',
  liveThoughts = [],
  liveTools = []
}) {
  const [isExpanded, setIsExpanded] = useState(true);

  // Derive active summary text
  let statusText = liveStatus;
  if (!statusText) {
    if (liveTools.length > 0) {
      const activeTool = liveTools[liveTools.length - 1];
      statusText = `Executing ${activeTool.name}...`;
    } else if (liveThoughts.length > 0) {
      const lastThought = liveThoughts[liveThoughts.length - 1];
      const raw = lastThought.content.replace(/^[#*\s-]+/, '').trim();
      const firstLine = raw.split('\n')[0] || '';
      statusText = firstLine.length > 60 ? firstLine.slice(0, 58) + '...' : firstLine || 'Formulating reasoning trace...';
    } else {
      statusText = mode === 'role' ? 'Supervisor coordinating workspace agents...' : 'Analyzing query & formulating reasoning trace...';
    }
  }

  const formattedDuration = `${elapsedSeconds.toFixed(1)}s`;

  return (
    <div className={`reasoning-trace-wrapper is-live ${isExpanded ? 'is-expanded' : 'is-collapsed'}`}>
      {/* Top Blue-Outlined Pill Header (Matching Image 1) */}
      <div 
        className="reasoning-summary-pill live-pill"
        onClick={() => setIsExpanded(!isExpanded)}
        title="Click to toggle live reasoning stream"
      >
        <div className="reasoning-summary-left">
          <span className="reasoning-pulse-dot" />
          <span className="reasoning-summary-text">{statusText}</span>
        </div>
        <div className="reasoning-pill-chevron">
          <span className="reasoning-live-timer">{formattedDuration}</span>
          {isExpanded ? <ChevronDown size={15} /> : <ChevronRight size={15} />}
        </div>
      </div>

      {/* Live Expanded Trace (Matching Image 1 & Image 2) */}
      {isExpanded && (
        <div className="reasoning-details-card">
          <div className="reasoning-details-header">
            <span className="reasoning-duration-label">
              Thinking for {formattedDuration}
            </span>
            <Loader2 size={12} className="animate-spin text-sky" />
          </div>

          {/* Live Thoughts Stream */}
          {liveThoughts.length > 0 ? (
            <div className="reasoning-lines-list">
              {liveThoughts.map((t, idx) => (
                <div key={idx} className="reasoning-thought-line">
                  {t.content.replace(/^[\s•*-]+/, '')}
                </div>
              ))}
            </div>
          ) : (
            <div className="reasoning-lines-list">
              <div className="reasoning-thought-line text-muted-subtle">
                Interpreting request and evaluating architectural requirements...
              </div>
            </div>
          )}

          {/* Live Running Tools (Matching Image 2) */}
          {liveTools.length > 0 && (
            <div className="reasoning-actions-list">
              {liveTools.map((tool, idx) => {
                let icon = <Terminal size={13} className="action-icon action-icon-term" />;
                let label = `Executing ${tool.name}...`;

                if (tool.name.toLowerCase().includes('search') || tool.name.toLowerCase().includes('web')) {
                  icon = <Globe size={13} className="action-icon action-icon-web" />;
                  label = `Live Web Search: ${tool.name}...`;
                }

                return (
                  <div key={idx} className="reasoning-action-item is-running">
                    <div className="reasoning-action-row">
                      <div className="reasoning-action-left">
                        {icon}
                        <span className="reasoning-action-title">{label}</span>
                      </div>
                      <span className="reasoning-action-status">{tool.status || 'running'}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default ThinkingIndicator;
