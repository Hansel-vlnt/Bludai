import React from 'react';
import { 
  Activity, Wrench, Cpu, Timer, CheckCircle, 
  Loader2, Sparkles, Terminal, X
} from 'lucide-react';

const TelemetryPanel = ({ 
  isOpen, 
  onClose, 
  isTyping, 
  elapsedSeconds, 
  liveStatus, 
  liveTools = [], 
  liveThoughts = [],
  lastTokens = null,
  lastDuration = null
}) => {
  if (!isOpen) return null;

  return (
    <div className="w-[340px] h-full bg-[#161622] border-l border-white/5 flex flex-col shrink-0 overflow-hidden select-none z-20">
      {/* Panel Header */}
      <div className="h-[52px] px-4 flex items-center justify-between border-b border-white/5 bg-[#141420] shrink-0">
        <div className="flex items-center gap-2">
          <Activity size={14} className="text-zinc-400" />
          <span className="text-xs font-semibold text-zinc-200 uppercase tracking-wider">Live Telemetry</span>
        </div>
        <div className="flex items-center gap-2">
          <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[10px] font-mono border ${
            isTyping 
              ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' 
              : 'bg-white/5 text-zinc-400 border-white/10'
          }`}>
            <span className={`w-1.5 h-1.5 rounded-full ${isTyping ? 'bg-emerald-400 animate-pulse' : 'bg-zinc-500'}`} />
            {isTyping ? 'Streaming' : 'Idle'}
          </span>
          {onClose && (
            <button 
              onClick={onClose} 
              className="p-1 text-zinc-400 hover:text-zinc-200 hover:bg-white/5 rounded-md transition-colors"
              title="Close telemetry panel"
            >
              <X size={14} />
            </button>
          )}
        </div>
      </div>

      {/* Content Body: Clean vertical flex stack with minimal dividers */}
      <div className="flex-1 overflow-y-auto divide-y divide-white/5 custom-scrollbar">
        {/* 1. Execution Status */}
        <div className="p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-[11px] font-medium text-neutral-400 uppercase tracking-wider">
              <Timer size={13} className="text-zinc-500" />
              <span>Orchestration Status</span>
            </div>
            <span className="text-[11px] font-mono text-zinc-300 bg-white/5 px-2 py-0.5 rounded border border-white/10">
              {elapsedSeconds > 0 ? `${elapsedSeconds.toFixed(1)}s` : (lastDuration ? `${lastDuration}s` : '0.0s')}
            </span>
          </div>
          
          <div className="flex items-center gap-3 bg-white/[0.02] border border-white/5 rounded-lg p-3">
            {isTyping ? (
              <Loader2 size={16} className="text-zinc-300 animate-spin shrink-0" />
            ) : (
              <CheckCircle size={16} className="text-emerald-400 shrink-0" />
            )}
            <div className="flex flex-col min-w-0">
              <span className="text-xs font-medium text-zinc-200 truncate">
                {isTyping ? (liveStatus || 'Processing task...') : 'Workflow idle / ready'}
              </span>
              <span className="text-[11px] text-neutral-400 truncate">
                {isTyping ? 'Supervisor coordinating nodes' : 'Standing by for user request'}
              </span>
            </div>
          </div>
        </div>

        {/* 2. Tool Invocations Stream */}
        <div className="p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-[11px] font-medium text-neutral-400 uppercase tracking-wider">
              <Wrench size={13} className="text-zinc-500" />
              <span>Tool Invocations ({liveTools.length})</span>
            </div>
            {liveTools.length > 0 && (
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-white/5 text-zinc-300 border border-white/10">
                Active
              </span>
            )}
          </div>

          {liveTools.length === 0 ? (
            <div className="bg-white/[0.02] border border-white/5 rounded-lg p-3 text-center">
              <Terminal size={18} className="mx-auto text-zinc-600 mb-1.5" />
              <p className="text-xs text-zinc-400 font-medium">No tools executing</p>
              <p className="text-[10px] text-zinc-600 mt-0.5">Filesystem and shell commands stream here</p>
            </div>
          ) : (
            <div className="space-y-1.5">
              {liveTools.map((t, idx) => (
                <div key={idx} className="flex items-center justify-between bg-white/[0.02] border border-white/5 rounded-lg px-2.5 py-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <Terminal size={12} className="text-zinc-400 shrink-0" />
                    <span className="text-xs font-mono text-zinc-200 truncate">{t.name}</span>
                  </div>
                  <span className={`text-[9px] font-mono uppercase px-1.5 py-0.5 rounded border shrink-0 ${
                    t.status === 'running' 
                      ? 'bg-amber-500/10 text-amber-400 border-amber-500/20 animate-pulse'
                      : t.status === 'completed'
                      ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                      : 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                  }`}>
                    {t.status || 'running'}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 3. Resource & Token Gauge */}
        <div className="p-4 space-y-3">
          <div className="flex items-center gap-1.5 text-[11px] font-medium text-neutral-400 uppercase tracking-wider">
            <Cpu size={13} className="text-zinc-500" />
            <span>Resource &amp; Token Telemetry</span>
          </div>

          <div className="grid grid-cols-3 gap-2">
            <div className="bg-white/[0.02] border border-white/5 rounded-lg p-2 text-center">
              <span className="text-[10px] text-neutral-400 uppercase block">Input</span>
              <span className="text-xs font-mono font-medium text-zinc-200 mt-0.5 block">
                {lastTokens?.input ? lastTokens.input.toLocaleString() : '0'}
              </span>
            </div>
            <div className="bg-white/[0.02] border border-white/5 rounded-lg p-2 text-center">
              <span className="text-[10px] text-neutral-400 uppercase block">Output</span>
              <span className="text-xs font-mono font-medium text-zinc-200 mt-0.5 block">
                {lastTokens?.output ? lastTokens.output.toLocaleString() : '0'}
              </span>
            </div>
            <div className="bg-white/[0.02] border border-white/5 rounded-lg p-2 text-center">
              <span className="text-[10px] text-neutral-400 uppercase block">Total</span>
              <span className="text-xs font-mono font-medium text-zinc-200 mt-0.5 block">
                {lastTokens?.total ? lastTokens.total.toLocaleString() : '0'}
              </span>
            </div>
          </div>

          <div className="pt-2 flex items-center justify-between text-[11px] text-neutral-400 min-w-0">
            <span>Gateway Proxy:</span>
            <span className="font-mono text-zinc-300">9Router (20128)</span>
          </div>
        </div>

        {/* 4. Live Agent Thought Stream */}
        {liveThoughts.length > 0 && (
          <div className="p-4 space-y-2.5">
            <div className="flex items-center gap-1.5 text-[11px] font-medium text-neutral-400 uppercase tracking-wider">
              <Sparkles size={13} className="text-zinc-500" />
              <span>Live Agent Reasoning</span>
            </div>
            <div className="bg-white/[0.02] border border-white/5 rounded-lg p-3 font-mono text-[11px] text-zinc-300 max-h-48 overflow-y-auto custom-scrollbar space-y-2">
              {liveThoughts.map((th, i) => (
                <div key={i} className="border-b border-white/5 pb-1.5 last:border-none last:pb-0">
                  <span className="text-zinc-400 font-semibold font-sans text-[10px] block mb-0.5">
                    {th.agent}:
                  </span>
                  <p className="whitespace-pre-wrap leading-relaxed text-zinc-200 text-[11px]">{th.content}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default TelemetryPanel;
