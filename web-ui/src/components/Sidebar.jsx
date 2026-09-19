import React, { useState, useEffect } from 'react';
import { Cpu, Plus, Power, Settings, Users, MessageSquare, ExternalLink, Bot, Code, Terminal, ShieldCheck, Search } from 'lucide-react';

const ICON_MAP = {
  Code: Code,
  Terminal: Terminal,
  ShieldCheck: ShieldCheck,
  Search: Search,
  Bot: Bot
};

const Sidebar = ({ 
  sessions = [], 
  currentThread, 
  handleNewChat, 
  loadSession, 
  handleExit, 
  setShowSettings, 
  setShowWorkplace,
  agents: propAgents
}) => {
  const [agents, setAgents] = useState(propAgents || []);

  useEffect(() => {
    if (propAgents && propAgents.length > 0) {
      setAgents(propAgents);
    } else {
      fetch('http://localhost:8000/api/agents')
        .then(res => res.json())
        .then(json => {
          if (json && json.data) setAgents(json.data);
        })
        .catch(err => console.error("Sidebar agents fetch error", err));
    }
  }, [propAgents]);

  const activeAgents = agents.filter(a => a.enabled);

  return (
    <div className="w-[300px] h-full border-r border-[#2d2e42] flex flex-col bg-[#161622] shrink-0 select-none shadow-2xl z-10">
      {/* Brand Header */}
      <div className="h-[65px] px-5 flex items-center justify-between border-b border-[#2d2e42] bg-[#11111a] shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="flex items-center justify-center w-8 h-8 rounded-xl bg-[#cba6f7]/15 border border-[#cba6f7]/30 text-[#cba6f7]">
            <Cpu size={18} />
          </div>
          <div className="flex flex-col">
            <span className="text-sm font-bold text-[#cdd6f4] tracking-tight">Bludai AI</span>
            <span className="text-[10px] font-mono text-[#a6adc8]">Multi-Agent OS</span>
          </div>
        </div>
        <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-[#a6e3a1]/15 text-[#a6e3a1] border border-[#a6e3a1]/30">
          v2.0
        </span>
      </div>
      
      {/* Action / New Chat Button */}
      <div className="p-3">
        <button 
          className="w-full flex items-center justify-center gap-2 px-4 py-2.5 text-xs font-bold text-[#11111b] bg-[#cba6f7] rounded-xl hover:bg-[#b4befe] shadow-[0_0_20px_rgba(203,166,247,0.25)] hover:shadow-[0_0_25px_rgba(203,166,247,0.35)] transition-all cursor-pointer"
          onClick={handleNewChat}
        >
          <Plus size={16} strokeWidth={2.5} /> New Orchestration
        </button>
      </div>

      {/* 1. Multi-Agent Fleet Roster */}
      <div className="px-3 pb-2 border-b border-[#2d2e42]">
        <div className="flex items-center justify-between px-1 mb-2">
          <div className="flex items-center gap-1.5 text-[11px] font-semibold text-[#a6adc8] uppercase tracking-wider">
            <Users size={12} className="text-[#cba6f7]" />
            <span>Active Fleet ({activeAgents.length})</span>
          </div>
          <button 
            onClick={() => setShowWorkplace(true)}
            className="text-[11px] text-[#cba6f7] hover:text-[#b4befe] hover:underline flex items-center gap-1 cursor-pointer font-medium"
          >
            Manage
          </button>
        </div>

        <div className="space-y-1.5 max-h-48 overflow-y-auto custom-scrollbar pr-1">
          {agents.length === 0 ? (
            <div className="text-[11px] text-[#6c7086] text-center py-2 italic">Loading fleet...</div>
          ) : (
            agents.map(a => {
              const IconComp = ICON_MAP[a.icon] || Bot;
              return (
                <div 
                  key={a.id}
                  onClick={() => setShowWorkplace(true)}
                  className={`flex items-center justify-between px-3 py-2 rounded-xl border transition-all cursor-pointer ${
                    a.enabled 
                      ? 'bg-[#222336] border-[#383a54] hover:border-[#585b70] shadow-sm' 
                      : 'bg-[#1a1b28]/60 border-[#2d2e42]/60 opacity-60 hover:opacity-100'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span 
                      className="w-2 h-2 rounded-full shrink-0" 
                      style={{ 
                        backgroundColor: a.enabled ? (a.color || '#cba6f7') : '#585b70',
                        boxShadow: a.enabled ? `0 0 6px ${a.color || '#cba6f7'}` : 'none'
                      }}
                    />
                    <div className="flex flex-col min-w-0">
                      <span className="text-xs font-bold text-[#cdd6f4] truncate">{a.name}</span>
                      <span className="text-[10px] text-[#a6adc8] truncate">{a.title || 'Specialist'}</span>
                    </div>
                  </div>
                  <span className={`text-[9px] font-semibold uppercase px-1.5 py-0.5 rounded border shrink-0 ${
                    a.enabled 
                      ? 'bg-[#a6e3a1]/15 text-[#a6e3a1] border-[#a6e3a1]/30' 
                      : 'bg-[#585b70]/20 text-[#6c7086] border-[#585b70]/30'
                  }`}>
                    {a.enabled ? 'ON' : 'OFF'}
                  </span>
                </div>
              );
            })
          )}
        </div>
      </div>
      
      {/* 2. Session History List */}
      <div className="flex-1 overflow-y-auto px-3 py-3 space-y-1.5 custom-scrollbar">
        <div className="flex items-center gap-1.5 px-1 mb-2 text-[11px] font-semibold text-[#a6adc8] uppercase tracking-wider">
          <MessageSquare size={12} className="text-[#cba6f7]" />
          <span>Recent Sessions</span>
        </div>

        {sessions.length === 0 ? (
          <div className="text-[11px] text-[#6c7086] text-center py-6 italic">No past sessions</div>
        ) : (
          sessions.map(s => {
            const isActive = s.thread_id === currentThread;
            return (
              <div 
                key={s.thread_id} 
                className={`w-full text-left px-3 py-2.5 text-xs rounded-xl cursor-pointer transition-all truncate border ${
                  isActive 
                    ? 'bg-[#222336] border-[#cba6f7]/60 text-[#cdd6f4] shadow-md shadow-black/40 ring-1 ring-[#cba6f7]/30' 
                    : 'bg-[#1a1b2a] border-[#2d2e42] text-[#a6adc8] hover:bg-[#222336] hover:text-[#cdd6f4] hover:border-[#383a54]'
                }`}
                onClick={() => loadSession(s.thread_id)}
              >
                <div className="font-semibold truncate">{s.title || "New Orchestration"}</div>
                <div className="text-[10px] text-[#6c7086] mt-1 flex items-center justify-between">
                  <span>{new Date(s.updated_at).toLocaleDateString([], {month: 'short', day: 'numeric'})}</span>
                  <span>{new Date(s.updated_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                </div>
              </div>
            );
          })
        )}
      </div>
      
      {/* Bottom Action Bar */}
      <div className="border-t border-[#2d2e42] bg-[#11111a] p-3 space-y-2">
        <button 
          onClick={() => setShowWorkplace(true)}
          className="w-full flex items-center justify-center gap-2 px-3 py-2 text-xs font-bold text-[#cdd6f4] bg-[#222336] border border-[#383a54] rounded-xl hover:border-[#cba6f7] hover:text-[#cba6f7] transition-all shadow-sm cursor-pointer"
        >
          ⚡ Agent Workplace Roster
        </button>
        <div className="grid grid-cols-2 gap-2">
          <button 
            onClick={() => setShowSettings(true)}
            className="flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-medium text-[#a6adc8] bg-[#1a1b28] border border-[#2d2e42] rounded-xl hover:bg-[#222336] hover:text-[#cdd6f4] transition-all cursor-pointer"
          >
            <Settings size={14} /> Settings
          </button>
          <button 
            onClick={handleExit}
            className="flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-medium text-[#f38ba8] bg-[#f38ba8]/10 border border-[#f38ba8]/30 rounded-xl hover:bg-[#f38ba8]/20 transition-all cursor-pointer"
          >
            <Power size={14} /> Exit
          </button>
        </div>
      </div>
    </div>
  );
};

export default Sidebar;
