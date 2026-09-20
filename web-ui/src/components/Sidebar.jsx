import React, { useState, useEffect } from 'react';
import { Cpu, Plus, Power, Settings, Users, MessageSquare, ExternalLink, Bot, Code, Terminal, ShieldCheck, Search, Pencil, Trash2, Check, X } from 'lucide-react';

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
  agents: propAgents,
  refreshSessions
}) => {
  const [agents, setAgents] = useState(propAgents || []);
  const [editingId, setEditingId] = useState(null);
  const [editTitle, setEditTitle] = useState('');
  const [deletingId, setDeletingId] = useState(null);

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

  const groupSessionsByDate = (sessionList) => {
    const groups = {};
    const today = new Date();
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);

    const isSameDay = (d1, d2) => 
      d1.getFullYear() === d2.getFullYear() &&
      d1.getMonth() === d2.getMonth() &&
      d1.getDate() === d2.getDate();

    sessionList.forEach(s => {
      const rawDate = s.updated_at || s.created_at;
      const d = rawDate ? new Date(rawDate) : new Date();
      let label = '';
      if (isSameDay(d, today)) {
        label = 'Today';
      } else if (isSameDay(d, yesterday)) {
        label = 'Yesterday';
      } else {
        label = d.toLocaleDateString([], { month: 'short', day: 'numeric' });
      }
      if (!groups[label]) groups[label] = [];
      groups[label].push(s);
    });
    return groups;
  };

  const handleSaveRename = async (threadId) => {
    if (!editTitle.trim()) return;
    try {
      await fetch(`http://localhost:8000/api/sessions/${threadId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: editTitle.trim() })
      });
      if (refreshSessions) refreshSessions();
    } catch (err) {
      console.error("Failed to rename session", err);
    } finally {
      setEditingId(null);
    }
  };

  const handleConfirmDelete = async (threadId) => {
    try {
      await fetch(`http://localhost:8000/api/sessions/${threadId}`, {
        method: 'DELETE'
      });
      if (currentThread === threadId && handleNewChat) {
        handleNewChat();
      }
      if (refreshSessions) refreshSessions();
    } catch (err) {
      console.error("Failed to delete session", err);
    } finally {
      setDeletingId(null);
    }
  };

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
      <div className="px-3 pb-3 border-b border-[#2d2e42]">
        <div className="flex items-center justify-between px-2.5 py-1.5 mb-2.5 bg-[#141420] border border-[#2d2e42] rounded-xl">
          <div className="flex items-center gap-1.5 text-[11px] font-bold text-[#cdd6f4] uppercase tracking-wider">
            <Users size={12} className="text-[#cba6f7]" />
            <span>Active Fleet</span>
            <span className="text-[10px] font-mono px-1.5 py-0.2 rounded-md bg-[#cba6f7]/15 text-[#cba6f7] border border-[#cba6f7]/30">
              {activeAgents.length}
            </span>
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
      <div className="flex-1 overflow-y-auto px-3 py-3 custom-scrollbar">
        <div className="flex items-center justify-between px-2.5 py-1.5 mb-3 bg-[#141420] border border-[#2d2e42] rounded-xl">
          <div className="flex items-center gap-1.5 text-[11px] font-bold text-[#cdd6f4] uppercase tracking-wider">
            <MessageSquare size={12} className="text-[#cba6f7]" />
            <span>Recent Sessions</span>
          </div>
          <span className="text-[10px] font-mono px-1.5 py-0.2 rounded-md bg-[#222336] text-[#a6adc8] border border-[#383a54]">
            {sessions.length}
          </span>
        </div>

        {sessions.length === 0 ? (
          <div className="text-[11px] text-[#6c7086] text-center py-6 italic">No past sessions</div>
        ) : (
          Object.entries(groupSessionsByDate(sessions)).map(([dateLabel, groupList]) => (
            <div key={dateLabel} className="space-y-1.5 mb-3.5 last:mb-0">
              <div className="text-[10px] font-bold uppercase tracking-wider text-[#6c7086] px-2 py-0.5 flex items-center gap-2">
                <span>{dateLabel}</span>
                <div className="flex-1 h-px bg-[#2d2e42]/60" />
              </div>
              {groupList.map(s => {
                const isActive = s.thread_id === currentThread;
                const dateObj = new Date(s.updated_at || s.created_at || Date.now());
                const isEditing = editingId === s.thread_id;
                const isDeleting = deletingId === s.thread_id;

                return (
                  <div 
                    key={s.thread_id} 
                    className={`group relative w-full text-left px-3 py-2 rounded-xl cursor-pointer transition-all border ${
                      isActive 
                        ? 'bg-[#222336] border-[#cba6f7]/60 text-[#cdd6f4] shadow-md shadow-black/40 ring-1 ring-[#cba6f7]/30' 
                        : 'bg-[#1a1b2a] border-[#2d2e42] text-[#a6adc8] hover:bg-[#222336] hover:text-[#cdd6f4] hover:border-[#383a54]'
                    }`}
                    onClick={() => {
                      if (!isEditing && !isDeleting) loadSession(s.thread_id);
                    }}
                  >
                    {isEditing ? (
                      <div className="flex items-center gap-1.5 w-full" onClick={e => e.stopPropagation()}>
                        <input 
                          type="text"
                          value={editTitle}
                          onChange={e => setEditTitle(e.target.value)}
                          onKeyDown={e => {
                            if (e.key === 'Enter') handleSaveRename(s.thread_id);
                            if (e.key === 'Escape') setEditingId(null);
                          }}
                          autoFocus
                          className="flex-1 bg-[#141420] border border-[#cba6f7]/50 rounded-lg px-2 py-0.5 text-xs text-[#cdd6f4] outline-none focus:ring-1 focus:ring-[#cba6f7]"
                        />
                        <button 
                          onClick={() => handleSaveRename(s.thread_id)} 
                          className="p-1 text-[#a6e3a1] hover:bg-[#a6e3a1]/20 rounded transition-colors"
                          title="Save title"
                        >
                          <Check size={13} strokeWidth={2.5} />
                        </button>
                        <button 
                          onClick={() => setEditingId(null)} 
                          className="p-1 text-[#a6adc8] hover:bg-[#383a54] rounded transition-colors"
                          title="Cancel"
                        >
                          <X size={13} />
                        </button>
                      </div>
                    ) : isDeleting ? (
                      <div className="flex items-center justify-between w-full py-0.5" onClick={e => e.stopPropagation()}>
                        <span className="text-[11px] text-[#f38ba8] font-medium">Delete session?</span>
                        <div className="flex items-center gap-1">
                          <button 
                            onClick={() => handleConfirmDelete(s.thread_id)}
                            className="px-2 py-0.5 text-[10px] font-bold bg-[#f38ba8] text-[#11111b] rounded hover:bg-[#eba0ac] transition-colors cursor-pointer"
                          >
                            Delete
                          </button>
                          <button 
                            onClick={() => setDeletingId(null)}
                            className="px-2 py-0.5 text-[10px] text-[#a6adc8] hover:text-[#cdd6f4] rounded hover:bg-[#383a54] transition-colors cursor-pointer"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <div className="flex items-center justify-between gap-1">
                          <span className="font-medium text-sm text-[#cdd6f4] truncate flex-1">{s.title || "New Orchestration"}</span>
                          <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-0.5 shrink-0">
                            <button 
                              onClick={(e) => {
                                e.stopPropagation();
                                setEditingId(s.thread_id);
                                setEditTitle(s.title || "New Orchestration");
                              }}
                              className="p-1 text-[#a6adc8] hover:text-[#cba6f7] hover:bg-[#2d2e42] rounded transition-colors"
                              title="Rename session"
                            >
                              <Pencil size={12} />
                            </button>
                            <button 
                              onClick={(e) => {
                                e.stopPropagation();
                                setDeletingId(s.thread_id);
                              }}
                              className="p-1 text-[#a6adc8] hover:text-[#f38ba8] hover:bg-[#f38ba8]/15 rounded transition-colors"
                              title="Delete session"
                            >
                              <Trash2 size={12} />
                            </button>
                          </div>
                        </div>
                        <div className="text-xs text-[#a6adc8] opacity-50 mt-1 flex items-center justify-between">
                          <span>{dateObj.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                        </div>
                      </>
                    )}
                  </div>
                );
              })}
            </div>
          ))
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
