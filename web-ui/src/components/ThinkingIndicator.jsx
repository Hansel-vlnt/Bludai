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
    <div className="border border-gray-800 rounded-xl bg-[#0a0a0a] overflow-hidden mb-3">
      {/* Top Header */}
      <div 
        className="flex items-center justify-between px-4 py-3 cursor-pointer hover:bg-gray-800/30 transition-colors"
        onClick={() => setIsExpanded(!isExpanded)}
        title="Click to toggle live reasoning stream"
      >
        <div className="flex items-center gap-3 text-sm text-gray-300">
          <div className="w-4 h-4 border-2 border-t-cyan-500 border-gray-800 rounded-full animate-spin" />
          <span>{statusText}</span>
        </div>
        <div className="flex items-center gap-3 text-gray-500">
          <span className="text-xs text-gray-600 font-mono">{formattedDuration}</span>
          {isExpanded ? <ChevronDown size={15} /> : <ChevronRight size={15} />}
        </div>
      </div>

      {/* Live Expanded Trace */}
      {isExpanded && (
        <div className="px-4 py-3 border-t border-gray-800/60">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs text-gray-600 font-mono">
              Thinking for {formattedDuration}
            </span>
            <Loader2 size={12} className="animate-spin text-cyan-400" />
          </div>

          {/* Live Thoughts Stream */}
          <div className="space-y-2 mt-2">
            {liveThoughts.length > 0 ? (
              liveThoughts.map((t, idx) => (
                <div key={idx} className="flex items-start gap-2 text-sm text-gray-400 pl-2 border-l-2 border-gray-800">
                  {t.content.replace(/^[\s•*-]+/, '')}
                </div>
              ))
            ) : (
              <div className="flex items-start gap-2 text-sm text-gray-400 pl-2 border-l-2 border-gray-800 text-gray-500">
                Interpreting request and evaluating architectural requirements...
              </div>
            )}
          </div>

          {/* Live Running Tools */}
          {liveTools.length > 0 && (
            <div className="space-y-2 mt-4 pt-3 border-t border-gray-800/30">
              {liveTools.map((tool, idx) => {
                let icon = <Terminal size={13} className="shrink-0 text-cyan-400" />;
                let label = `Executing ${tool.name}...`;

                if (tool.name.toLowerCase().includes('search') || tool.name.toLowerCase().includes('web')) {
                  icon = <Globe size={13} className="shrink-0 text-cyan-400" />;
                  label = `Live Web Search: ${tool.name}...`;
                }

                return (
                  <div key={idx} className="flex items-center gap-2 text-xs text-gray-500 bg-gray-900/50 rounded px-2 py-1">
                    {icon}
                    <span className="font-medium text-gray-300">{label}</span>
                    <span className="ml-auto text-cyan-500 animate-pulse">{tool.status || 'running'}</span>
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
