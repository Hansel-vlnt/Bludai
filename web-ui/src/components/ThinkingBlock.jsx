import React, { useState } from 'react';
import { ChevronDown, ChevronRight, Copy, Check, Terminal, Globe, FileCode } from 'lucide-react';

/**
 * Thinking & Reasoning Trace Block.
 * Antigravity Dark Slate palette.
 */
function ThinkingBlock({ thinking, duration }) {
  const [isExpanded, setIsExpanded] = useState(true);
  const [copied, setCopied] = useState(false);
  const [expandedToolIdx, setExpandedToolIdx] = useState(null);

  if (!thinking || !thinking.trim()) {
    return null;
  }

  const handleCopy = (e) => {
    e.stopPropagation();
    navigator.clipboard.writeText(thinking.trim());
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const toggleToolDetail = (idx) => {
    setExpandedToolIdx(expandedToolIdx === idx ? null : idx);
  };

  const formattedDuration = duration ? `${duration}s` : 'a few seconds';

  // Parse multi-step agent sections if separated by '---'
  const rawSections = thinking.trim().split(/\n\n---\n\n/);
  const thoughtLines = [];
  const toolActions = [];

  rawSections.forEach((sec, sIdx) => {
    const trimmed = sec.trim();

    // Check if Tool pattern: 🔧 **Tool executed (<name>)**:\n```\n<content>\n```
    const toolMatch = trimmed.match(/^(?:🔧\s*)?\*{0,2}Tool executed\s*\(([^)]+)\)\*{0,2}:?\s*\n?([\s\S]*)$/i);
    if (toolMatch) {
      const toolName = toolMatch[1].trim();
      let toolContent = toolMatch[2].trim();
      toolContent = toolContent.replace(/^```[a-z]*\n?/i, '').replace(/\n?```$/i, '').trim();
      toolActions.push({
        name: toolName,
        content: toolContent,
        id: `tool-${sIdx}`
      });
      return;
    }

    // Extract thought text
    let thoughtText = trimmed;
    const thinkingMatch = trimmed.match(/^(?:⚡\s*)?\*{0,2}Thinking\s*[·•-]\s*([a-zA-Z0-9_-]+)\*{0,2}:?\s*\n?([\s\S]*)$/i);
    if (thinkingMatch) {
      thoughtText = thinkingMatch[2].trim();
    }

    // Split into individual thought sentences / bullet lines
    const lines = thoughtText.split('\n');
    lines.forEach((l) => {
      const cleanL = l.replace(/^[\s•*-]+/, '').trim();
      if (cleanL) {
        thoughtLines.push(cleanL);
      }
    });
  });

  // Pick top summary title (first sentence or primary thought)
  let summaryTitle = '';
  if (thoughtLines.length > 0) {
    const firstLine = thoughtLines[0].replace(/<[^>]+>/g, '').trim();
    summaryTitle = firstLine.length > 70 ? firstLine.slice(0, 68) + '...' : firstLine;
  }
  if (!summaryTitle) {
    summaryTitle = toolActions.length > 0 
      ? `Executed ${toolActions.length} action${toolActions.length === 1 ? '' : 's'}` 
      : `Thought for ${formattedDuration}`;
  }

  return (
    <div className="border border-white/[0.08] rounded-xl bg-[#0d0e12] overflow-hidden mb-3">
      {/* Top Header */}
      <div 
        className="flex items-center justify-between px-4 py-2.5 cursor-pointer hover:bg-white/[0.03] transition-colors"
        onClick={() => setIsExpanded(!isExpanded)}
        title="Click to toggle reasoning trace"
      >
        <div className="flex items-center gap-2 text-xs text-zinc-300">
          <span>{summaryTitle}</span>
        </div>
        <div className="text-zinc-500 transition-transform">
          {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
        </div>
      </div>

      {/* Expanded Details Card */}
      {isExpanded && (
        <div className="px-4 py-3 border-t border-white/[0.08]">
          <div className="flex items-center justify-between mb-2.5">
            <span className="text-[11px] text-zinc-500 font-mono">
              Thought for {formattedDuration}
            </span>
            <button 
              className="p-1 text-zinc-500 hover:text-zinc-200 transition-colors rounded flex items-center gap-1 cursor-pointer" 
              onClick={handleCopy}
              title="Copy reasoning trace"
            >
              {copied ? <Check size={11} className="text-emerald-400" /> : <Copy size={11} />}
              <span className={copied ? "text-[11px] text-emerald-400" : "text-[11px]"}>{copied ? 'Copied' : 'Copy'}</span>
            </button>
          </div>

          {/* Thought Sentences */}
          {thoughtLines.length > 0 && (
            <div className="text-xs text-zinc-300 font-mono leading-relaxed mb-3">
              {thoughtLines.map((line, idx) => (
                <div key={idx} className="mb-1">
                  {line}
                </div>
              ))}
            </div>
          )}

          {/* Tool Action Traces */}
          {toolActions.length > 0 && (
            <div className="space-y-1.5 mt-3 pt-2.5 border-t border-white/[0.08]">
              {toolActions.map((tool, idx) => {
                const isToolOpen = expandedToolIdx === idx;
                let icon = <Terminal size={12} className="shrink-0 mt-0.5 text-zinc-400" />;
                let label = `Ran command: ${tool.name}`;
                
                if (tool.name.toLowerCase().includes('search') || tool.name.toLowerCase().includes('web')) {
                  icon = <Globe size={12} className="shrink-0 mt-0.5 text-zinc-400" />;
                  label = `Live Web Search: ${tool.name}`;
                } else if (tool.name.toLowerCase().includes('file')) {
                  icon = <FileCode size={12} className="shrink-0 mt-0.5 text-zinc-400" />;
                  label = `File operation: ${tool.name}`;
                }

                return (
                  <div key={tool.id} className="flex flex-col border-b border-white/[0.04] last:border-0 pb-1.5">
                    <div 
                      className="flex items-center justify-between cursor-pointer py-1"
                      onClick={() => toggleToolDetail(idx)}
                    >
                      <div className="flex items-start gap-2.5 flex-1 min-w-0">
                        {icon}
                        <span className="text-xs font-mono text-zinc-300 truncate">{label}</span>
                      </div>
                      <div className="text-zinc-500">
                        {isToolOpen ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
                      </div>
                    </div>
                    {isToolOpen && tool.content && (
                      <pre className="text-[11px] text-zinc-400 font-mono mt-1.5 bg-[#161822] p-2 rounded-lg border border-white/[0.08] overflow-x-auto">{tool.content}</pre>
                    )}
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

export default ThinkingBlock;
