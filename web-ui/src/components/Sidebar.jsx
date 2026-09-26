import React, { useState, useEffect, useMemo } from 'react';
import { Cpu, Plus, Power, Settings, Users, MessageSquare, Bot, Code, Terminal, ShieldCheck, Search, Pencil, Trash2, Check, X, Folder, FolderGit2 } from 'lucide-react';

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
  onSelectAgent,
  agents: propAgents,
  refreshSessions,
  currentWorkspace,
  onWorkspaceChange
}) => {
  const [agents, setAgents] = useState(propAgents || []);
  const [editingId, setEditingId] = useState(null);
  const [editTitle, setEditTitle] = useState('');
  const [deletingId, setDeletingId] = useState(null);
  const [sessionScope, setSessionScope] = useState('current');
  const [pendingSessionSwitch, setPendingSessionSwitch] = useState(null);
  const normalizePath = (p) => (p || '').replace(/\\/g, '/').toLowerCase().replace(/\/+$/, '');

  const filteredSessions = useMemo(() => {
    if (sessionScope === 'all') return sessions;
    if (!currentWorkspace?.path) return sessions;
    const currentNorm = normalizePath(currentWorkspace.path);
    return sessions.filter(s => normalizePath(s.project_path) === currentNorm);
  }, [sessions, sessionScope, currentWorkspace?.path]);

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

  const formatRelativeTime = (rawDate) => {
    if (!rawDate) return '';
    const date = new Date(rawDate);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return 'just now';
    if (diffMins < 60) return `${diffMins}m`;
    if (diffHours < 24) return `${diffHours}h`;
    if (diffDays < 7) return `${diffDays}d`;
    return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
  };

  return (
    <div className="w-[300px] h-full border-r border-white/[0.08] flex flex-col bg-[#14161d] shrink-0 select-none z-10">
      {/* Brand Header */}
      <div className="h-[52px] px-4 flex items-center justify-between border-b border-white/[0.08] bg-[#14161d] shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="flex items-center justify-center w-7 h-7 rounded-lg bg-[#0d0e12] border border-white/[0.08] text-zinc-200">
            <Cpu size={15} />
          </div>
          <div className="flex flex-col">
            <span className="text-xs font-semibold text-zinc-100 tracking-tight">Bludai AI</span>
            <span className="text-[10px] font-mono text-zinc-400 leading-none">Multi-Agent OS</span>
          </div>
        </div>
        <span className="px-1.5 py-0.5 rounded text-[10px] font-mono text-zinc-400 bg-white/5 border border-white/[0.08]">
          v2.0
        </span>
      </div>
      
      {/* Action / New Chat Button */}
      <div className="p-3">
        <button 
          className="w-full flex items-center justify-center gap-2 px-3 py-2 text-xs font-medium text-zinc-200 bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] hover:border-white/20 rounded-lg transition-all cursor-pointer"
          onClick={handleNewChat}
        >
          <Plus size={14} strokeWidth={2} className="text-zinc-300" /> New Orchestration
        </button>
      </div>

      {/* 1. Multi-Agent Fleet Roster */}
      <div className="px-3 pb-3 border-b border-white/[0.08]">
        <div className="flex items-center justify-between px-2.5 py-1.5 mb-2 bg-[#0d0e12]/50 border border-white/[0.08] rounded-lg">
          <div className="flex items-center gap-1.5 text-[11px] font-medium text-zinc-300 uppercase tracking-wider">
            <Users size={12} className="text-zinc-400" />
            <span>Active Fleet</span>
            <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-white/5 text-zinc-400 border border-white/[0.08]">
              {activeAgents.length}
            </span>
          </div>
          <button 
            onClick={() => setShowWorkplace(true)}
            className="text-[11px] text-zinc-400 hover:text-zinc-200 flex items-center gap-1 cursor-pointer font-medium transition-colors"
          >
            Manage
          </button>
        </div>

        <div className="space-y-1 max-h-48 overflow-y-auto custom-scrollbar pr-1">
          {agents.length === 0 ? (
            <div className="text-[11px] text-zinc-500 text-center py-2 italic">Loading fleet...</div>
          ) : (
            agents.map(a => {
              const _IconComp = ICON_MAP[a.icon] || Bot;
              return (
                <div 
                  key={a.id}
                  onClick={() => onSelectAgent ? onSelectAgent(a) : setShowWorkplace(true)}
                  title={`Configure ${a.name}`}
                  className={`flex items-center justify-between px-2.5 py-1.5 rounded-lg border transition-all cursor-pointer ${
                    a.enabled 
                      ? 'bg-white/[0.02] border-white/[0.08] hover:border-white/20' 
                      : 'bg-transparent border-transparent opacity-40 hover:opacity-80'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span 
                      className="w-1.5 h-1.5 rounded-full shrink-0" 
                      style={{ 
                        backgroundColor: a.enabled ? (a.color || '#a1a1aa') : '#52525b'
                      }}
                    />
                    <div className="flex flex-col min-w-0">
                      <span className="text-xs font-medium text-zinc-200 truncate">{a.name}</span>
                      <span className="text-[11px] text-zinc-400 truncate">{a.title || 'Specialist'}</span>
                    </div>
                  </div>
                  <span className={`text-[9px] font-mono uppercase px-1.5 py-0.5 rounded border shrink-0 ${
                    a.enabled 
                      ? 'bg-white/5 text-zinc-300 border-white/[0.08]' 
                      : 'bg-transparent text-zinc-500 border-white/[0.05]'
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
        {/* Segmented Scope Control: Current Project vs All */}
        <div className="flex items-center p-0.5 bg-[#0d0e12] border border-white/[0.08] rounded-lg mb-2.5">
          <button
            onClick={() => setSessionScope('current')}
            className={`flex-1 py-1 text-[11px] font-medium rounded-md transition-all cursor-pointer text-center truncate px-1 ${
              sessionScope === 'current'
                ? 'bg-[#1a1c26] text-zinc-100 shadow-sm border border-white/[0.08]'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
            title={currentWorkspace?.name ? `Sessions for ${currentWorkspace.name}` : 'Sessions for current workspace'}
          >
            Current Project ({filteredSessions.length})
          </button>
          <button
            onClick={() => setSessionScope('all')}
            className={`flex-1 py-1 text-[11px] font-medium rounded-md transition-all cursor-pointer text-center truncate px-1 ${
              sessionScope === 'all'
                ? 'bg-[#1a1c26] text-zinc-100 shadow-sm border border-white/[0.08]'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            All ({sessions.length})
          </button>
        </div>

        <div className="flex items-center justify-between px-2.5 py-1.5 mb-2.5 bg-[#0d0e12]/50 border border-white/[0.08] rounded-lg">
          <div className="flex items-center gap-1.5 text-[11px] font-medium text-zinc-300 uppercase tracking-wider">
            <MessageSquare size={12} className="text-zinc-400" />
            <span>Recent Sessions</span>
          </div>
          <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-white/5 text-zinc-400 border border-white/[0.08]">
            {filteredSessions.length}
          </span>
        </div>

        {filteredSessions.length === 0 ? (
          <div className="text-[11px] text-zinc-500 text-center py-6 italic">
            {sessionScope === 'current' ? 'No sessions for current project' : 'No past sessions'}
          </div>
        ) : (
          Object.entries(groupSessionsByDate(filteredSessions)).map(([dateLabel, groupList]) => (
            <div key={dateLabel} className="space-y-1 mb-3.5 last:mb-0">
              <div className="text-[10px] font-medium uppercase tracking-wider text-zinc-500 px-2 py-0.5 flex items-center gap-2">
                <span>{dateLabel}</span>
                <div className="flex-1 h-px bg-white/[0.08]" />
              </div>
              {groupList.map(s => {
                const isActive = s.thread_id === currentThread;
                const isEditing = editingId === s.thread_id;
                const isDeleting = deletingId === s.thread_id;

                return (
                  <div 
                    key={s.thread_id} 
                    className={`group relative w-full text-left px-2.5 py-2 rounded-lg cursor-pointer transition-all border ${
                      isActive 
                        ? 'bg-white/[0.08] border-white/20 text-zinc-100 shadow-sm' 
                        : 'bg-transparent border-transparent text-zinc-400 hover:bg-white/[0.04] hover:text-zinc-200'
                    }`}
                    onClick={() => {
                      if (!isEditing && !isDeleting) {
                        const sessionNorm = normalizePath(s.project_path);
                        const currentNorm = normalizePath(currentWorkspace?.path);
                        if (s.project_path && currentWorkspace?.path && sessionNorm !== currentNorm) {
                          setPendingSessionSwitch(s);
                        } else {
                          loadSession(s.thread_id, false);
                        }
                      }
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
                          className="flex-1 bg-[#0d0e12] border border-white/20 rounded-md px-2 py-0.5 text-xs text-zinc-200 outline-none focus:border-white/40"
                        />
                        <button 
                          onClick={() => handleSaveRename(s.thread_id)} 
                          className="p-1 text-emerald-400 hover:bg-emerald-500/20 rounded transition-colors"
                          title="Save title"
                        >
                          <Check size={13} strokeWidth={2.5} />
                        </button>
                        <button 
                          onClick={() => setEditingId(null)} 
                          className="p-1 text-zinc-400 hover:bg-white/10 rounded transition-colors"
                          title="Cancel"
                        >
                          <X size={13} />
                        </button>
                      </div>
                    ) : isDeleting ? (
                      <div className="flex items-center justify-between w-full py-0.5" onClick={e => e.stopPropagation()}>
                        <span className="text-[11px] text-rose-400 font-medium">Delete session?</span>
                        <div className="flex items-center gap-1">
                          <button 
                            onClick={() => handleConfirmDelete(s.thread_id)}
                            className="px-2 py-0.5 text-[10px] font-medium bg-rose-500 text-white rounded hover:bg-rose-600 transition-colors cursor-pointer"
                          >
                            Delete
                          </button>
                          <button 
                            onClick={() => setDeletingId(null)} 
                            className="px-2 py-0.5 text-[10px] text-zinc-400 hover:text-zinc-200 rounded hover:bg-white/10 transition-colors cursor-pointer"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <div className="flex items-center justify-between gap-1">
                          <span className="font-normal text-xs text-zinc-200 truncate flex-1">{s.title || "New Orchestration"}</span>
                          <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-0.5 shrink-0">
                            <button 
                              onClick={(e) => {
                                e.stopPropagation();
                                setEditingId(s.thread_id);
                                setEditTitle(s.title || "New Orchestration");
                              }}
                              className="p-1 text-zinc-400 hover:text-zinc-200 hover:bg-white/10 rounded transition-colors"
                              title="Rename session"
                            >
                              <Pencil size={12} />
                            </button>
                            <button 
                              onClick={(e) => {
                                e.stopPropagation();
                                setDeletingId(s.thread_id);
                              }}
                              className="p-1 text-zinc-400 hover:text-rose-400 hover:bg-rose-500/10 rounded transition-colors"
                              title="Delete session"
                            >
                              <Trash2 size={12} />
                            </button>
                          </div>
                        </div>
                        <div className="text-[10px] text-zinc-400 opacity-60 mt-0.5 flex items-center justify-between">
                          <span>{formatRelativeTime(s.updated_at || s.created_at)}</span>
                          {sessionScope === 'all' && s.project_path && (
                            <span 
                              className="text-[9px] font-mono text-zinc-500 truncate max-w-[90px] flex items-center gap-1"
                              title={s.project_path}
                            >
                              <Folder size={9} className="shrink-0 text-zinc-600" />
                              {s.project_path.split(/[/\\]/).filter(Boolean).pop()}
                            </span>
                          )}
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
      <div className="border-t border-white/[0.08] bg-[#14161d] p-3 space-y-2">
        <button 
          onClick={() => setShowWorkplace(true)}
          className="w-full flex items-center justify-center gap-2 px-3 py-2 text-xs font-medium text-zinc-300 bg-white/[0.04] border border-white/[0.08] rounded-lg hover:bg-white/[0.08] hover:border-white/20 transition-all cursor-pointer"
        >
          <span>Fleet Workplace Roster</span>
        </button>
        <div className="grid grid-cols-2 gap-2">
          <button 
            onClick={() => setShowSettings(true)}
            className="flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-medium text-zinc-400 bg-white/[0.04] border border-white/[0.08] rounded-lg hover:bg-white/[0.08] hover:text-zinc-200 transition-all cursor-pointer"
          >
            <Settings size={13} /> Settings
          </button>
          <button 
            onClick={handleExit}
            className="flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-medium text-zinc-400 bg-white/[0.04] border border-white/[0.08] rounded-lg hover:bg-rose-500/10 hover:text-rose-400 hover:border-rose-500/20 transition-all cursor-pointer"
          >
            <Power size={13} /> Exit
          </button>
        </div>
      </div>

      {/* Interactive Switch Workspace Prompt Modal */}
      {pendingSessionSwitch && (
        <div 
          className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-150"
          onClick={() => setPendingSessionSwitch(null)}
        >
          <div 
            className="w-full max-w-sm bg-[#14161d] border border-white/10 rounded-xl p-4 shadow-2xl space-y-3"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-2 text-amber-400 text-sm font-semibold">
              <FolderGit2 size={16} />
              <span>Switch Active Workspace?</span>
            </div>
            <p className="text-xs text-zinc-300 leading-relaxed">
              This session was created in a different project folder:
              <span className="block font-mono text-[11px] text-zinc-200 bg-black/40 px-2 py-1.5 rounded mt-1.5 border border-white/5 truncate">
                {pendingSessionSwitch.project_path}
              </span>
            </p>
            <div className="flex flex-col gap-2 pt-1">
              <button
                onClick={async () => {
                  const targetSession = pendingSessionSwitch;
                  setPendingSessionSwitch(null);
                  if (onWorkspaceChange && targetSession.project_path) {
                    await onWorkspaceChange({ path: targetSession.project_path });
                  }
                  loadSession(targetSession.thread_id, false);
                }}
                className="w-full py-2 px-3 bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 rounded-lg text-xs font-medium hover:bg-cyan-500/30 transition-colors cursor-pointer"
              >
                Switch Project & Open Session
              </button>
              <button
                onClick={() => {
                  const targetSession = pendingSessionSwitch;
                  setPendingSessionSwitch(null);
                  loadSession(targetSession.thread_id, false);
                }}
                className="w-full py-1.5 px-3 bg-white/[0.04] text-zinc-300 border border-white/[0.08] rounded-lg text-xs hover:bg-white/[0.08] transition-colors cursor-pointer"
              >
                Open in Current Project
              </button>
              <button
                onClick={() => setPendingSessionSwitch(null)}
                className="w-full py-1 text-zinc-500 text-xs hover:text-zinc-300 transition-colors cursor-pointer"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Sidebar;
