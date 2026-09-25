import React, { useState } from 'react';
import { ChevronRight, ChevronDown, Terminal, Globe, Loader2 } from 'lucide-react';

/**
 * Live Reasoning Trace Streaming Indicator.
 * Antigravity Dark Slate palette.
 */
function ThinkingIndicator({ 
  elapsedSeconds = 0, 
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
      statusText = 'Supervisor coordinating workspace agents...';
    }
  }

  const formattedDuration = `${elapsedSeconds.toFixed(1)}s`;

  return (
    <div className="border border-white/[0.08] rounded-xl bg-[#0d0e12] overflow-hidden mb-3">
      {/* Top Header */}
      <div 
        className="flex items-center justify-between px-4 py-2.5 cursor-pointer hover:bg-white/[0.03] transition-colors"
        onClick={() => setIsExpanded(!isExpanded)}
        title="Click to toggle live reasoning stream"
      >
        <div className="flex items-center gap-2.5 text-xs text-zinc-300">
          <div className="w-3.5 h-3.5 border-2 border-t-zinc-200 border-white/20 rounded-full animate-spin" />
          <span className="truncate">{statusText}</span>
        </div>
        <div className="flex items-center gap-2.5 text-zinc-500 shrink-0">
          <span className="text-[11px] text-zinc-500 font-mono">{formattedDuration}</span>
          {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
        </div>
      </div>

      {/* Live Expanded Trace */}
      {isExpanded && (
        <div className="px-4 py-3 border-t border-white/[0.08]">
          <div className="flex items-center justify-between mb-2.5">
            <span className="text-[11px] text-zinc-500 font-mono">
              Thinking for {formattedDuration}
            </span>
            <Loader2 size={12} className="animate-spin text-zinc-400" />
          </div>

          {/* Live Thoughts Stream */}
          <div className="space-y-1.5 mt-2">
            {liveThoughts.length > 0 ? (
              liveThoughts.map((t, idx) => (
                <div key={idx} className="flex items-start gap-2 text-xs text-zinc-300 pl-2.5 border-l-2 border-white/10 font-mono">
                  {t.content.replace(/^[\s•*-]+/, '')}
                </div>
              ))
            ) : (
              <div className="flex items-start gap-2 text-xs text-zinc-500 pl-2.5 border-l-2 border-white/10 font-mono">
                Interpreting request and evaluating architectural requirements...
              </div>
            )}
          </div>

          {/* Live Running Tools */}
          {liveTools.length > 0 && (
            <div className="space-y-1.5 mt-3 pt-2.5 border-t border-white/[0.08]">
              {liveTools.map((tool, idx) => {
                let icon = <Terminal size={12} className="shrink-0 text-zinc-400" />;
                let label = `Executing ${tool.name}...`;

                if (tool.name.toLowerCase().includes('search') || tool.name.toLowerCase().includes('web')) {
                  icon = <Globe size={12} className="shrink-0 text-zinc-400" />;
                  label = `Live Web Search: ${tool.name}...`;
                }

                return (
                  <div key={idx} className="flex items-center gap-2 text-xs text-zinc-400 bg-white/[0.03] border border-white/[0.08] rounded-lg px-2.5 py-1.5 font-mono">
                    {icon}
                    <span className="text-zinc-200 truncate">{label}</span>
                    <span className="ml-auto text-[10px] text-amber-400 animate-pulse uppercase">{tool.status || 'running'}</span>
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
