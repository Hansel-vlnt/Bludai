import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { Brain, ChevronDown, ChevronRight, Copy, Check } from 'lucide-react';

/**
 * Claude Code style Thinking Process Accordion.
 * Displays model chain-of-thought, reasoning steps, or multi-agent execution traces.
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

  return (
    <div className={`thinking-block ${isExpanded ? 'expanded' : 'collapsed'}`}>
      <div 
        className="thinking-header" 
        onClick={() => setIsExpanded(!isExpanded)}
        title="Click to expand/collapse thinking process"
      >
        <div className="thinking-header-left">
          <div className="thinking-icon-badge">
            <Brain size={14} className="thinking-brain-icon" />
          </div>
          <span className="thinking-title">
            {formattedDuration ? `Thought for ${formattedDuration}` : 'Thinking Process'}
          </span>
          <span className="thinking-pill">Reasoning</span>
        </div>

        <div className="thinking-header-right">
          <button 
            className="thinking-copy-btn" 
            onClick={handleCopy}
            title="Copy thought process"
          >
            {copied ? <Check size={13} className="text-success" /> : <Copy size={13} />}
            <span>{copied ? 'Copied' : 'Copy'}</span>
          </button>
          <div className="thinking-chevron-wrapper">
            {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
          </div>
        </div>
      </div>

      {isExpanded && (
        <div className="thinking-body">
          <div className="thinking-content markdown-body">
            <ReactMarkdown>{thinking.trim()}</ReactMarkdown>
          </div>
        </div>
      )}
    </div>
  );
}

export default ThinkingBlock;
