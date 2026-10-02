import React, { useState, useEffect, useCallback } from 'react';
import { Loader2 } from 'lucide-react';

export default function TerminalApprovalCard({ interruptData, onRespond, onClose, className = '' }) {
  const [submitting, setSubmitting] = useState(false);
  const [activeKey, setActiveKey] = useState(null);

  // Normalize interrupt fields from backend payloads or demo mocks
  const agent = interruptData?.agent || interruptData?.worker || (interruptData?.command ? 'executor' : 'specialist');
  
  let action = interruptData?.action;
  if (!action) {
    if (interruptData?.command) {
      action = `run shell command: ${interruptData.command}`;
    } else if (interruptData?.description) {
      action = interruptData.description;
    } else {
      action = 'run privileged terminal operation on workspace';
    }
  }

  let scope = interruptData?.scope;
  if (!scope) {
    if (interruptData?.cwd) {
      scope = `directory: ${interruptData.cwd} • isolated execution`;
    } else if (interruptData?.description && interruptData?.command) {
      scope = interruptData.description;
    } else {
      scope = 'workspace runtime • system security policy';
    }
  }

  const handleAction = useCallback(async (option) => {
    if (submitting) return;
    setSubmitting(true);
    setActiveKey(option);

    try {
      if (option === 1) {
        // Approve Once
        await onRespond?.(true);
      } else if (option === 2) {
        // Always Allow for Session
        try {
          const stored = JSON.parse(sessionStorage.getItem('bludai_allowed_scopes') || '[]');
          stored.push(scope);
          sessionStorage.setItem('bludai_allowed_scopes', JSON.stringify(stored));
        } catch {}
        await onRespond?.(true);
      } else if (option === 3) {
        // Deny
        await onRespond?.(false);
      }
    } catch (err) {
      console.error('Approval action error:', err);
    } finally {
      setSubmitting(false);
      setActiveKey(null);
    }
  }, [onRespond, scope, submitting]);

  // Global keyboard listeners: '1', '2', '3' and 'Escape'
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Do not trigger hotkeys if user is focused on a text input or textarea
      if (e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.isContentEditable)) {
        return;
      }
      if (e.key === '1') {
        e.preventDefault();
        handleAction(1);
      } else if (e.key === '2') {
        e.preventDefault();
        handleAction(2);
      } else if (e.key === '3') {
        e.preventDefault();
        handleAction(3);
      } else if (e.key === 'Escape' && onClose) {
        e.preventDefault();
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleAction, onClose]);

  return (
    <div 
      className={`font-mono select-none w-full max-w-[740px] mx-auto transition-all text-xs relative ${className}`}
      role="alertdialog"
      aria-label="Permission Required"
    >
      {/* Seamless Outer TUI Box with continuous 1px border */}
      <div className="relative border border-zinc-700/90 bg-[#0e1015]/95 shadow-2xl shadow-black/95">
        {/* Top TUI Title Notch */}
        <div className="absolute -top-2.5 left-4 flex items-center gap-1.5 bg-[#0c0d12] px-2 text-[11px] select-none">
          <span className="text-zinc-600 font-bold font-mono">┌─</span>
          <span className="text-amber-400 font-semibold lowercase tracking-wide font-mono">
            permission required
          </span>
          <span className="text-zinc-600 font-bold font-mono">─┐</span>
        </div>

        {/* Top-Right Dismiss Hotkey */}
        {onClose && (
          <div className="absolute -top-2.5 right-4 bg-[#0c0d12] px-1.5 text-[10px] select-none">
            <button
              type="button"
              onClick={onClose}
              className="text-zinc-500 hover:text-zinc-300 font-mono transition-colors cursor-pointer"
              title="Dismiss (Esc)"
            >
              [esc]
            </button>
          </div>
        )}

        {/* Inner Content */}
        <div className="px-4 pt-3.5 pb-2.5 space-y-2">
          {/* TUI Body: Agent action request & scope */}
          <div className="space-y-0.5">
            <div className="text-zinc-200 leading-snug break-words text-xs">
              <span className="text-white font-bold tracking-tight">{agent}</span>{' '}
              <span className="text-zinc-300">wants to {action}</span>
            </div>
            <div className="text-[11px] text-zinc-400 leading-snug flex items-baseline gap-2 break-all">
              <span className="text-zinc-500 font-medium shrink-0">scope:</span>
              <span className="text-zinc-300/90">{scope}</span>
            </div>
          </div>

          {/* TUI Action Prompt line with keyboard shortcuts */}
          <div className="pt-2 border-t border-zinc-800/80 flex flex-wrap items-center gap-2.5 text-xs">
            <span className="text-amber-400 font-bold select-none text-sm leading-none shrink-0">&gt;</span>

            {/* Option 1: Yes */}
            <button
              type="button"
              onClick={() => handleAction(1)}
              disabled={submitting}
              className={`group flex items-center gap-1.5 px-2.5 py-1 rounded bg-[#13151d] border ${
                activeKey === 1 ? 'border-amber-400 bg-amber-400/20 text-white' : 'border-zinc-700/80 hover:border-amber-400/80 hover:bg-amber-400/10 text-zinc-200'
              } transition-colors cursor-pointer disabled:opacity-50`}
              title="Shortcut: Press '1'"
            >
              <span className="text-amber-400 font-bold group-hover:text-amber-300">[1]</span>
              <span className="font-medium">Yes</span>
            </button>

            {/* Option 2: Yes, don't ask again */}
            <button
              type="button"
              onClick={() => handleAction(2)}
              disabled={submitting}
              className={`group flex items-center gap-1.5 px-2.5 py-1 rounded bg-[#13151d] border ${
                activeKey === 2 ? 'border-cyan-400 bg-cyan-400/20 text-white' : 'border-zinc-700/80 hover:border-cyan-400/80 hover:bg-cyan-400/10 text-zinc-200'
              } transition-colors cursor-pointer disabled:opacity-50`}
              title="Shortcut: Press '2'"
            >
              <span className="text-cyan-400 font-bold group-hover:text-cyan-300">[2]</span>
              <span className="font-medium">Yes, don't ask again</span>
            </button>

            {/* Option 3: No */}
            <button
              type="button"
              onClick={() => handleAction(3)}
              disabled={submitting}
              className={`group flex items-center gap-1.5 px-2.5 py-1 rounded bg-[#13151d] border ${
                activeKey === 3 ? 'border-rose-400 bg-rose-400/20 text-white' : 'border-zinc-700/80 hover:border-rose-400/80 hover:bg-rose-500/10 text-zinc-200'
              } transition-colors cursor-pointer disabled:opacity-50`}
              title="Shortcut: Press '3'"
            >
              <span className="text-rose-400 font-bold group-hover:text-rose-300">[3]</span>
              <span className="font-medium">No</span>
            </button>

            {submitting && (
              <span className="text-zinc-400 text-[11px] animate-pulse ml-2 flex items-center gap-1.5">
                <Loader2 size={12} className="animate-spin text-amber-400" />
                <span>processing...</span>
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
