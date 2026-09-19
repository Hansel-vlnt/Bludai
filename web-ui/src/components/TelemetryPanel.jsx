import React from 'react';
import { 
  Activity, Wrench, Cpu, Timer, CheckCircle, 
  AlertCircle, Loader2, Sparkles, Terminal, X,
  Layers, ShieldAlert
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
    <div className="w-[360px] h-full bg-[#161622] border-l border-[#2d2e42] flex flex-col shrink-0 overflow-hidden shadow-2xl z-20 animate-in slide-in-from-right-5 duration-200">
      {/* Panel Header */}
      <div className="h-[65px] px-5 flex items-center justify-between border-b border-[#2d2e42] bg-[#11111a] shrink-0">
        <div className="flex items-center gap-2.5">
          <Activity size={18} className="text-[#cba6f7]" />
          <span className="text-sm font-bold text-[#cdd6f4] tracking-tight">Live Telemetry</span>
        </div>
        <div className="flex items-center gap-2">
          <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${
            isTyping 
              ? 'bg-[#a6e3a1]/15 text-[#a6e3a1] border-[#a6e3a1]/30' 
              : 'bg-[#585b70]/20 text-[#a6adc8] border-[#585b70]/30'
          }`}>
            <span className={`w-1.5 h-1.5 rounded-full ${isTyping ? 'bg-[#a6e3a1] animate-pulse' : 'bg-[#6c7086]'}`}></span>
            {isTyping ? 'Streaming' : 'Idle'}
          </span>
          {onClose && (
            <button 
              onClick={onClose} 
              className="p-1.5 text-[#a6adc8] hover:text-[#cdd6f4] hover:bg-[#222336] rounded-lg transition-colors"
              title="Close telemetry panel"
            >
              <X size={16} />
            </button>
          )}
        </div>
      </div>

      {/* Content Body */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
        {/* 1. Execution Status Card */}
        <div className="bg-[#222336] border border-[#383a54] rounded-2xl p-4 shadow-lg shadow-black/40">
          <div className="flex items-center justify-between mb-2.5">
            <div className="flex items-center gap-2 text-xs font-semibold text-[#a6adc8] uppercase tracking-wider">
              <Timer size={14} className="text-[#cba6f7]" />
              <span>Orchestration Status</span>
            </div>
            <span className="text-xs font-mono font-semibold text-[#cba6f7] bg-[#cba6f7]/10 px-2 py-0.5 rounded border border-[#cba6f7]/20">
              {elapsedSeconds > 0 ? `${elapsedSeconds.toFixed(1)}s` : (lastDuration ? `${lastDuration}s` : '0.0s')}
            </span>
          </div>
          <div className="flex items-center gap-3 bg-[#141420] border border-[#2d2e42] rounded-xl p-3">
            {isTyping ? (
              <Loader2 size={18} className="text-[#cba6f7] animate-spin shrink-0" />
            ) : (
              <CheckCircle size={18} className="text-[#a6e3a1] shrink-0" />
            )}
            <div className="flex flex-col min-w-0">
              <span className="text-xs font-semibold text-[#cdd6f4] truncate">
                {isTyping ? (liveStatus || 'Processing task...') : 'Workflow idle / ready'}
              </span>
              <span className="text-[11px] text-[#a6adc8]">
                {isTyping ? 'Supervisor coordinating nodes' : 'Standing by for user request'}
              </span>
            </div>
          </div>
        </div>

        {/* 2. Tool Invocations Stream Card */}
        <div className="bg-[#222336] border border-[#383a54] rounded-2xl p-4 shadow-lg shadow-black/40">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2 text-xs font-semibold text-[#a6adc8] uppercase tracking-wider">
              <Wrench size={14} className="text-[#00E5FF]" />
              <span>Tool Invocations ({liveTools.length})</span>
            </div>
            {liveTools.length > 0 && (
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#00E5FF]/10 text-[#00E5FF] border border-[#00E5FF]/20">
                Active
              </span>
            )}
          </div>

          {liveTools.length === 0 ? (
            <div className="bg-[#141420] border border-[#2d2e42] rounded-xl p-4 text-center">
              <Terminal size={24} className="mx-auto text-[#585b70] mb-2 opacity-60" />
              <p className="text-xs text-[#a6adc8] font-medium">No tools currently executing</p>
              <p className="text-[11px] text-[#6c7086] mt-0.5">Filesystem and shell commands stream here live</p>
            </div>
          ) : (
            <div className="space-y-2">
              {liveTools.map((t, idx) => (
                <div key={idx} className="flex items-center justify-between bg-[#141420] border border-[#2d2e42] rounded-xl px-3 py-2.5">
                  <div className="flex items-center gap-2 min-w-0">
                    <Terminal size={14} className="text-[#cba6f7] shrink-0" />
                    <span className="text-xs font-mono text-[#cdd6f4] truncate">{t.name}</span>
                  </div>
                  <span className={`text-[10px] font-semibold uppercase px-2 py-0.5 rounded-full border shrink-0 ${
                    t.status === 'running' 
                      ? 'bg-[#f9e2af]/15 text-[#f9e2af] border-[#f9e2af]/30 animate-pulse'
                      : t.status === 'completed'
                      ? 'bg-[#a6e3a1]/15 text-[#a6e3a1] border-[#a6e3a1]/30'
                      : 'bg-[#f38ba8]/15 text-[#f38ba8] border-[#f38ba8]/30'
                  }`}>
                    {t.status || 'running'}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 3. Resource & Token Gauge Card */}
        <div className="bg-[#222336] border border-[#383a54] rounded-2xl p-4 shadow-lg shadow-black/40">
          <div className="flex items-center gap-2 text-xs font-semibold text-[#a6adc8] uppercase tracking-wider mb-3">
            <Cpu size={14} className="text-[#a6e3a1]" />
            <span>Resource &amp; Token Telemetry</span>
          </div>
          <div className="grid grid-cols-3 gap-2">
            <div className="bg-[#141420] border border-[#2d2e42] rounded-xl p-2.5 text-center">
              <span className="text-[10px] font-semibold text-[#a6adc8] uppercase block">Input</span>
              <span className="text-xs font-mono font-bold text-[#cdd6f4] mt-0.5 block">
                {lastTokens?.input ? lastTokens.input.toLocaleString() : '0'}
              </span>
            </div>
            <div className="bg-[#141420] border border-[#2d2e42] rounded-xl p-2.5 text-center">
              <span className="text-[10px] font-semibold text-[#a6adc8] uppercase block">Output</span>
              <span className="text-xs font-mono font-bold text-[#cdd6f4] mt-0.5 block">
                {lastTokens?.output ? lastTokens.output.toLocaleString() : '0'}
              </span>
            </div>
            <div className="bg-[#141420] border border-[#2d2e42] rounded-xl p-2.5 text-center">
              <span className="text-[10px] font-semibold text-[#a6adc8] uppercase block">Total</span>
              <span className="text-xs font-mono font-bold text-[#a6e3a1] mt-0.5 block">
                {lastTokens?.total ? lastTokens.total.toLocaleString() : '0'}
              </span>
            </div>
          </div>
          <div className="mt-3 pt-2.5 border-t border-[#2d2e42] flex items-center justify-between text-[11px] text-[#a6adc8]">
            <span>Gateway Proxy:</span>
            <span className="font-mono text-[#cba6f7]">9Router (20128)</span>
          </div>
        </div>

        {/* 4. Live Agent Thought Stream */}
        {liveThoughts.length > 0 && (
          <div className="bg-[#222336] border border-[#383a54] rounded-2xl p-4 shadow-lg shadow-black/40">
            <div className="flex items-center gap-2 text-xs font-semibold text-[#a6adc8] uppercase tracking-wider mb-2.5">
              <Sparkles size={14} className="text-[#cba6f7]" />
              <span>Live Agent Reasoning</span>
            </div>
            <div className="bg-[#141420] border border-[#2d2e42] rounded-xl p-3 font-mono text-xs text-[#a6adc8] max-h-48 overflow-y-auto custom-scrollbar space-y-2">
              {liveThoughts.map((th, i) => (
                <div key={i} className="border-b border-[#2d2e42]/60 pb-1.5 last:border-none last:pb-0">
                  <span className="text-[#cba6f7] font-semibold font-sans text-[11px] block mb-0.5">
                    ⚡ {th.agent}:
                  </span>
                  <p className="whitespace-pre-wrap leading-relaxed text-[#cdd6f4] text-[11px]">{th.content}</p>
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
