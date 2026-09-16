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
    <div className={`reasoning-trace-wrapper ${isExpanded ? 'is-expanded' : 'is-collapsed'}`}>
      {/* Top Blue-Outlined Pill Header (Matching Image 1) */}
      <div 
        className="reasoning-summary-pill"
        onClick={() => setIsExpanded(!isExpanded)}
        title="Click to toggle reasoning trace"
      >
        <span className="reasoning-summary-text">{summaryTitle}</span>
        <div className="reasoning-pill-chevron">
          {isExpanded ? <ChevronDown size={15} /> : <ChevronRight size={15} />}
        </div>
      </div>

      {/* Expanded Details Card (Matching Image 1 & Image 2) */}
      {isExpanded && (
        <div className="reasoning-details-card">
          <div className="reasoning-details-header">
            <span className="reasoning-duration-label">
              Thought for {formattedDuration}
            </span>
            <button 
              className="reasoning-copy-btn" 
              onClick={handleCopy}
              title="Copy reasoning trace"
            >
              {copied ? <Check size={11} className="text-emerald" /> : <Copy size={11} />}
              <span>{copied ? 'Copied' : 'Copy'}</span>
            </button>
          </div>

          {/* Thought Sentences (Matching Image 1) */}
          {thoughtLines.length > 0 && (
            <div className="reasoning-lines-list">
              {thoughtLines.map((line, idx) => (
                <div key={idx} className="reasoning-thought-line">
                  {line}
                </div>
              ))}
            </div>
          )}

          {/* Tool Action Traces (Matching Image 2: "Ran command >", "Searched web >") */}
          {toolActions.length > 0 && (
            <div className="reasoning-actions-list">
              {toolActions.map((tool, idx) => {
                const isToolOpen = expandedToolIdx === idx;
                let icon = <Terminal size={13} className="action-icon action-icon-term" />;
                let label = `Ran command: ${tool.name}`;
                
                if (tool.name.toLowerCase().includes('search') || tool.name.toLowerCase().includes('web')) {
                  icon = <Globe size={13} className="action-icon action-icon-web" />;
                  label = `Live Web Search: ${tool.name}`;
                } else if (tool.name.toLowerCase().includes('file')) {
                  icon = <FileCode size={13} className="action-icon action-icon-file" />;
                  label = `File operation: ${tool.name}`;
                }

                return (
                  <div key={tool.id} className="reasoning-action-item">
                    <div 
                      className="reasoning-action-row"
                      onClick={() => toggleToolDetail(idx)}
                    >
                      <div className="reasoning-action-left">
                        {icon}
                        <span className="reasoning-action-title">{label}</span>
                      </div>
                      <div className="reasoning-action-chevron">
                        {isToolOpen ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
                      </div>
                    </div>
                    {isToolOpen && tool.content && (
                      <pre className="reasoning-action-output">{tool.content}</pre>
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
