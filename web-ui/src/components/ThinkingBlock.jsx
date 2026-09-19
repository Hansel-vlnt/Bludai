import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { ChevronDown, ChevronRight, Copy, Check, Terminal, Globe, FileCode, Search } from 'lucide-react';

/**
 * Thinking & Reasoning Trace Block.
 * Matches user's exact references:
 * - Image 1: Blue-outlined summary pill on top with dropdown chevron,
 *   followed by "Thought for Xs" and clean chain-of-thought reasoning lines.
 * - Image 2: Clean action/tool traces ("Ran command >", "Live Web Search >").
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
    <div className="border border-gray-800 rounded-xl bg-[#0a0a0a] overflow-hidden mb-3">
      {/* Top Header */}
      <div 
        className="flex items-center justify-between px-4 py-3 cursor-pointer hover:bg-gray-800/30 transition-colors"
        onClick={() => setIsExpanded(!isExpanded)}
        title="Click to toggle reasoning trace"
      >
        <div className="flex items-center gap-2 text-sm text-gray-400">
          <span>{summaryTitle}</span>
        </div>
        <div className="text-gray-500 transition-transform">
          {isExpanded ? <ChevronDown size={15} /> : <ChevronRight size={15} />}
        </div>
      </div>

      {/* Expanded Details Card */}
      {isExpanded && (
        <div className="px-4 py-3 border-t border-gray-800/60">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs text-gray-600 font-mono">
              Thought for {formattedDuration}
            </span>
            <button 
              className="p-1.5 text-gray-500 hover:text-white transition-colors rounded flex items-center gap-1" 
              onClick={handleCopy}
              title="Copy reasoning trace"
            >
              {copied ? <Check size={11} className="text-emerald-400" /> : <Copy size={11} />}
              <span className={copied ? "text-xs text-emerald-400" : "text-xs"}>{copied ? 'Copied' : 'Copy'}</span>
            </button>
          </div>

          {/* Thought Sentences */}
          {thoughtLines.length > 0 && (
            <div className="text-sm text-gray-300 font-mono leading-relaxed mb-4">
              {thoughtLines.map((line, idx) => (
                <div key={idx} className="mb-1">
                  {line}
                </div>
              ))}
            </div>
          )}

          {/* Tool Action Traces */}
          {toolActions.length > 0 && (
            <div className="space-y-2 mt-4 pt-3 border-t border-gray-800/30">
              {toolActions.map((tool, idx) => {
                const isToolOpen = expandedToolIdx === idx;
                let icon = <Terminal size={13} className="shrink-0 mt-0.5 text-cyan-400" />;
                let label = `Ran command: ${tool.name}`;
                
                if (tool.name.toLowerCase().includes('search') || tool.name.toLowerCase().includes('web')) {
                  icon = <Globe size={13} className="shrink-0 mt-0.5 text-cyan-400" />;
                  label = `Live Web Search: ${tool.name}`;
                } else if (tool.name.toLowerCase().includes('file')) {
                  icon = <FileCode size={13} className="shrink-0 mt-0.5 text-cyan-400" />;
                  label = `File operation: ${tool.name}`;
                }

                return (
                  <div key={tool.id} className="flex flex-col border-b border-gray-800/30 last:border-0 pb-2">
                    <div 
                      className="flex items-center justify-between cursor-pointer py-1"
                      onClick={() => toggleToolDetail(idx)}
                    >
                      <div className="flex items-start gap-3 flex-1">
                        {icon}
                        <span className="text-sm font-medium text-gray-200">{label}</span>
                      </div>
                      <div className="text-gray-500">
                        {isToolOpen ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
                      </div>
                    </div>
                    {isToolOpen && tool.content && (
                      <pre className="text-xs text-gray-500 font-mono mt-2 bg-gray-900/50 p-2 rounded overflow-x-auto">{tool.content}</pre>
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
