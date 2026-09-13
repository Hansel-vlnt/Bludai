import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { ChevronDown, ChevronRight, Copy, Check, Zap } from 'lucide-react';

/**
 * Pinter-style Thinking & Execution Block.
 * Displays dynamic model chain-of-thought, subagent reasoning (Thinking · Supervisor/Developer),
 * and executed tool traces with matching Pinter reference styling.
 */
function ThinkingBlock({ thinking, duration }) {
  const [isExpanded, setIsExpanded] = useState(true);
  const [copied, setCopied] = useState(false);

  if (!thinking || !thinking.trim()) {
    return null;
  }

  const handleCopy = (e) => {
    e.stopPropagation();
    navigator.clipboard.writeText(thinking.trim());
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const formattedDuration = duration ? `${duration}s` : null;

  // Split multi-step agent sections if separated by '---'
  const rawSections = thinking.trim().split(/\n\n---\n\n/);
  const sections = rawSections.map((sec, idx) => {
    const trimmed = sec.trim();
    
    // Check if Thinking pattern: ⚡ **Thinking · <Agent>**:\n<content>
    const thinkingMatch = trimmed.match(/^(?:⚡\s*)?\*{0,2}Thinking\s*[·•-]\s*([a-zA-Z0-9_-]+)\*{0,2}:?\s*\n?([\s\S]*)$/i);
    if (thinkingMatch) {
      return {
        type: 'thought',
        agent: thinkingMatch[1].trim(),
        content: thinkingMatch[2].trim(),
        key: idx
      };
    }

    // Check if Tool pattern: 🔧 **Tool executed (<name>)**:\n```\n<content>\n```
    const toolMatch = trimmed.match(/^(?:🔧\s*)?\*{0,2}Tool executed\s*\(([^)]+)\)\*{0,2}:?\s*\n?([\s\S]*)$/i);
    if (toolMatch) {
      const toolName = toolMatch[1].trim();
      let toolContent = toolMatch[2].trim();
      toolContent = toolContent.replace(/^```[a-z]*\n?/i, '').replace(/\n?```$/i, '').trim();
      return {
        type: 'tool',
        name: toolName,
        content: toolContent,
        key: idx
      };
    }

    // General reasoning block
    return {
      type: 'thought',
      agent: 'Model',
      content: trimmed,
      key: idx
    };
  });

  return (
    <div className={`pinter-thinking-block ${isExpanded ? 'expanded' : 'collapsed'}`}>
      <div 
        className="pinter-thinking-header" 
        onClick={() => setIsExpanded(!isExpanded)}
        title="Click to toggle reasoning trace"
      >
        <div className="pinter-header-left">
          <div className="pinter-zap-icon">
            <Zap size={13} className="fill-amber" />
          </div>
          <span className="pinter-header-title">
            Thinking Process
          </span>
          {formattedDuration && (
            <span className="pinter-duration-pill">{formattedDuration}</span>
          )}
          <span className="pinter-steps-count">
            {sections.length} {sections.length === 1 ? 'step' : 'steps'}
          </span>
        </div>

        <div className="pinter-header-right">
          <button 
            className="pinter-copy-btn" 
            onClick={handleCopy}
            title="Copy reasoning trace"
          >
            {copied ? <Check size={12} className="text-success" /> : <Copy size={12} />}
            <span>{copied ? 'Copied' : 'Copy'}</span>
          </button>
          <div className="pinter-chevron">
            {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
          </div>
        </div>
      </div>

      {isExpanded && (
        <div className="pinter-thinking-body">
          {sections.map((sec) => {
            if (sec.type === 'tool') {
              return (
                <div key={sec.key} className="pinter-tool-execution-card">
                  <div className="pinter-tool-header">
                    <span className="pinter-tool-spinner-done">✓</span>
                    <span className="pinter-tool-name">{sec.name}</span>
                    <span className="pinter-tool-tag">executed</span>
                  </div>
                  {sec.content && (
                    <pre className="pinter-tool-output-snippet">{sec.content}</pre>
                  )}
                </div>
              );
            }

            return (
              <div key={sec.key} className="pinter-thought-card">
                <div className="pinter-agent-badge">
                  <span className="pinter-badge-icon">⚡</span>
                  <span className="pinter-badge-label">Thinking</span>
                  <span className="pinter-badge-agent">{sec.agent}</span>
                </div>
                <div className="pinter-thought-text markdown-body">
                  <ReactMarkdown>{sec.content}</ReactMarkdown>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default ThinkingBlock;
