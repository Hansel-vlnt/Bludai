import React, { useState, useEffect } from 'react';
import { Brain, Cpu, Sparkles } from 'lucide-react';

const ROLE_STATUSES = [
  "Supervisor analyzing request and breaking down subtasks...",
  "Consulting ChromaDB semantic vector memory & code chunks...",
  "Developer inspecting workspace and reviewing dependencies...",
  "Evaluating tool execution outputs and verification...",
  "Synthesizing final high-quality response..."
];

const BASIC_STATUSES = [
  "Formulating internal reasoning and chain-of-thought...",
  "Analyzing requirements and architectural best practices...",
  "Generating clean code and solution...",
  "Finalizing response..."
];

function ThinkingIndicator({ elapsedSeconds = 0, mode = 'role' }) {
  const [statusIndex, setStatusIndex] = useState(0);
  const statuses = mode === 'role' ? ROLE_STATUSES : BASIC_STATUSES;

  useEffect(() => {
    const interval = setInterval(() => {
      setStatusIndex((prev) => (prev + 1) % statuses.length);
    }, 2400);
    return () => clearInterval(interval);
  }, [statuses.length]);

  return (
    <div className="thinking-indicator-wrapper">
      <div className="thinking-indicator-card thinking-bg-animated">
        {/* Animated Cyber Glow Beam */}
        <div className="thinking-shimmer-beam" />

        <div className="thinking-indicator-header">
          <div className="thinking-indicator-title">
            <div className="thinking-pulse-icon">
              <Brain size={15} className="pulse-brain" />
            </div>
            <span className="thinking-elapsed-label">
              Thinking ({elapsedSeconds.toFixed(1)}s)...
            </span>
          </div>

          <div className="thinking-status-dots">
            <span className="dot dot-1" />
            <span className="dot dot-2" />
            <span className="dot dot-3" />
          </div>
        </div>

        <div className="thinking-indicator-status">
          <Sparkles size={12} className="status-sparkle-icon" />
          <span className="status-text">{statuses[statusIndex]}</span>
        </div>
      </div>
    </div>
  );
}

export default ThinkingIndicator;
