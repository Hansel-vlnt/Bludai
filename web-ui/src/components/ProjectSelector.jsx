import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { 
  FolderGit2, 
  FolderOpen, 
  GitBranch, 
  ChevronDown, 
  Copy, 
  Check, 
  RotateCw, 
  X, 
  Folder, 
  Sparkles, 
  Clock,
  Edit3,
  FileText
} from 'lucide-react';
import { useDismissOnOutsidePress } from '../utils/use-dismiss-on-outside-press';

const API_BASE = 'http://localhost:8000/api';

export default function ProjectSelector({ 
  currentWorkspace, 
  onWorkspaceChange,
  isOpen: propIsOpen,
  setIsOpen: propSetIsOpen,
  externalTriggerRef
}) {
  const [internalIsOpen, setInternalIsOpen] = useState(false);
  const isOpen = propIsOpen !== undefined ? propIsOpen : internalIsOpen;
  const setIsOpen = propSetIsOpen || setInternalIsOpen;

  const [recentProjects, setRecentProjects] = useState([]);
  const [isLoadingRecent, setIsLoadingRecent] = useState(false);
  const [isBrowsingNative, setIsBrowsingNative] = useState(false);
  const [isIndexing, setIsIndexing] = useState(false);
  const [indexStatus, setIndexStatus] = useState(null);
  const [copied, setCopied] = useState(false);
  
  // Manual path switcher state
  const [showManualInput, setShowManualInput] = useState(false);
  const [manualPath, setManualPath] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(false);
  const [manualError, setManualError] = useState('');

  const triggerRef = useRef(null);
  const dropdownRef = useRef(null);

  // Dismiss on outside press helper with memoized refs
  const refsToIgnore = useMemo(() => {
    const list = [triggerRef, dropdownRef];
    if (externalTriggerRef) list.push(externalTriggerRef);
    return list;
  }, [externalTriggerRef]);

  const handleDismiss = useCallback(() => {
    setIsOpen(false);
    setShowManualInput(false);
    setManualError('');
  }, [setIsOpen]);

  useDismissOnOutsidePress(isOpen, handleDismiss, refsToIgnore);

  const fetchRecent = useCallback(async () => {
    setIsLoadingRecent(true);
    try {
      const res = await fetch(`${API_BASE}/workspace/recent`);
      if (res.ok) {
        const data = await res.json();
        setRecentProjects(Array.isArray(data) ? data : []);
      }
    } catch (err) {
      console.error('Failed to load recent workspaces', err);
    } finally {
      setIsLoadingRecent(false);
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      fetchRecent();
      setManualPath(currentWorkspace?.path || '');
      setIndexStatus(null);
      setManualError('');
    }
  }, [isOpen, fetchRecent, currentWorkspace]);

  const handleCopyPath = (e) => {
    e.stopPropagation();
    if (!currentWorkspace?.path) return;
    navigator.clipboard.writeText(currentWorkspace.path);
    setCopied(true);
    setTimeout(() => setCopied(false), 1600);
  };

  const handleBrowseNative = async () => {
    setIsBrowsingNative(true);
    try {
      const res = await fetch(`${API_BASE}/workspace/browse-native`, {
        method: 'POST'
      });
      if (res.ok) {
        const data = await res.json();
        if (data && data.path && !data.cancelled) {
          onWorkspaceChange?.(data);
          setIsOpen(false);
        }
      }
    } catch (err) {
      console.error('Native folder browse failed', err);
    } finally {
      setIsBrowsingNative(false);
    }
  };

  const handleSelectWorkspace = async (path) => {
    try {
      const res = await fetch(`${API_BASE}/workspace`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path })
      });
      if (res.ok) {
        const data = await res.json();
        onWorkspaceChange?.(data);
        setIsOpen(false);
        setShowManualInput(false);
      } else {
        const err = await res.json();
        setManualError(err.detail || 'Failed to switch workspace');
      }
    } catch {
      setManualError('Network error connecting to workspace API');
    }
  };

  const handleDeleteRecent = async (e, path) => {
    e.stopPropagation();
    try {
      const res = await fetch(`${API_BASE}/workspace/recent?path=${encodeURIComponent(path)}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        const updated = await res.json();
        setRecentProjects(Array.isArray(updated) ? updated : []);
      }
    } catch (err) {
      console.error('Failed to delete recent workspace', err);
    }
  };

  const handleReIndex = async () => {
    setIsIndexing(true);
    setIndexStatus('Indexing codebase...');
    try {
      const res = await fetch(`${API_BASE}/vector/index`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ root_dir: currentWorkspace?.path })
      });
      if (res.ok) {
        const data = await res.json();
        const count = data.chunks !== undefined ? `${data.files || 0} files, ${data.chunks} chunks` : (data.indexed_chunks || data.status || 'Done');
        setIndexStatus(`Indexed (${count})`);
      } else {
        setIndexStatus('Indexing failed');
      }
    } catch {
      setIndexStatus('Index error');
    } finally {
      setIsIndexing(false);
      setTimeout(() => setIndexStatus(null), 3000);
    }
  };

  // Autocomplete fetch for directory input
  const fetchSuggestions = async (val) => {
    setIsLoadingSuggestions(true);
    try {
      const res = await fetch(`${API_BASE}/workspace/browse-dirs?path=${encodeURIComponent(val)}`);
      if (res.ok) {
        const data = await res.json();
        setSuggestions(Array.isArray(data) ? data.slice(0, 8) : []);
      }
    } catch (err) {
      console.error('Error fetching directory suggestions', err);
    } finally {
      setIsLoadingSuggestions(false);
    }
  };

  const handleManualPathInput = (e) => {
    const val = e.target.value;
    setManualPath(val);
    setManualError('');
    if (val.length > 1) {
      fetchSuggestions(val);
    } else {
      setSuggestions([]);
    }
  };

  const isClean = currentWorkspace?.git_is_clean !== false;

  return (
    <div className="relative inline-block text-left">
      {/* Top Bar Pill (Trigger) */}
      <button
        ref={triggerRef}
        onClick={() => setIsOpen(!isOpen)}
        className={`group flex items-center gap-2 px-2.5 py-1.5 rounded-lg border text-xs transition-all cursor-pointer select-none shrink-0 ${
          isOpen
            ? 'bg-white/[0.08] border-white/20 text-zinc-100 shadow-sm'
            : 'bg-white/[0.03] border-white/[0.08] text-zinc-300 hover:bg-white/[0.06] hover:text-zinc-100 hover:border-white/15'
        }`}
        title={`Active Workspace: ${currentWorkspace?.path || 'None'}`}
      >
        <FolderGit2 size={14} className="text-cyan-400 shrink-0 group-hover:scale-105 transition-transform" />
        
        {/* Project Name (bold text, truncate at 180px) */}
        <span className="font-semibold text-zinc-100 truncate max-w-[180px] shrink-0">
          {currentWorkspace?.name || 'Open Project'}
        </span>

        {/* Git Branch Badge */}
        {currentWorkspace?.git_branch && (
          <span 
            className={`flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-mono border shrink-0 ${
              isClean 
                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' 
                : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
            }`}
            title={`Git Branch: ${currentWorkspace.git_branch} (${isClean ? 'clean' : 'modified'})`}
          >
            <GitBranch size={10} className="shrink-0" />
            <span className="truncate max-w-[70px]">{currentWorkspace.git_branch}</span>
          </span>
        )}

        {/* Rules Badge if rules_count > 0 */}
        {(currentWorkspace?.rules_count > 0) && (
          <span 
            className="flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-amber-500/10 text-amber-300 border border-amber-500/20 shrink-0 cursor-help"
            title={`Project Rules:\n${(currentWorkspace.rules_summary || []).join('\n')}`}
          >
            <Sparkles size={10} className="text-amber-400 shrink-0" />
            <span>{currentWorkspace.rules_count} {currentWorkspace.rules_count === 1 ? 'Rule' : 'Rules'}</span>
          </span>
        )}

        {/* Chevron icon, rotating 180deg when open */}
        <ChevronDown 
          size={13} 
          className={`text-zinc-500 transition-transform duration-200 shrink-0 ${isOpen ? 'rotate-180 text-zinc-300' : 'group-hover:text-zinc-300'}`} 
        />
      </button>

      {/* Glassmorphic Dropdown Menu */}
      {isOpen && (
        <div
          ref={dropdownRef}
          className="absolute left-0 mt-2 w-[380px] max-w-[90vw] bg-[#14161d]/95 backdrop-blur-xl border border-white/[0.1] rounded-xl shadow-2xl z-50 overflow-hidden text-zinc-200 animate-in fade-in slide-in-from-top-2 duration-150"
        >
          {/* Header: Full absolute path in mono font with Copy Path and quick stats */}
          <div className="p-3 bg-white/[0.02] border-b border-white/[0.08]">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-400">Current Workspace</span>
              <div className="flex items-center gap-2 text-[10px] text-zinc-400">
                {currentWorkspace?.git_branch && (
                  <span className={`flex items-center gap-1 ${isClean ? 'text-emerald-400' : 'text-amber-400'}`}>
                    <GitBranch size={10} /> {currentWorkspace.git_branch}
                  </span>
                )}
                {currentWorkspace?.files_count !== undefined && (
                  <span className="text-zinc-300 flex items-center gap-1 font-mono">
                    <FileText size={10} className="text-cyan-400" /> {currentWorkspace.files_count} files
                  </span>
                )}
                {currentWorkspace?.rules_count !== undefined && (
                  <span className="text-amber-300 flex items-center gap-1">
                    <Sparkles size={10} /> {currentWorkspace.rules_count} rules
                  </span>
                )}
              </div>
            </div>

            <div className="flex items-center gap-1.5 bg-[#0d0e12] border border-white/[0.08] rounded-lg px-2.5 py-1.5 group">
              <span 
                className="font-mono text-xs text-zinc-300 truncate flex-1 select-all" 
                title={currentWorkspace?.path}
              >
                {currentWorkspace?.path || 'No folder selected'}
              </span>
              <button
                onClick={handleCopyPath}
                className="p-1 rounded text-zinc-400 hover:text-zinc-100 hover:bg-white/10 transition-colors shrink-0 cursor-pointer"
                title="Copy Full Path"
              >
                {copied ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
              </button>
            </div>
          </div>

          {/* Actions List */}
          <div className="p-2 space-y-1 border-b border-white/[0.08]">
            {/* Action 1: Open Project Folder... */}
            <button
              onClick={handleBrowseNative}
              disabled={isBrowsingNative}
              className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium text-zinc-200 hover:bg-white/[0.06] hover:text-white transition-all cursor-pointer disabled:opacity-50"
            >
              {isBrowsingNative ? (
                <RotateCw size={14} className="animate-spin text-cyan-400 shrink-0" />
              ) : (
                <FolderOpen size={14} className="text-cyan-400 shrink-0" />
              )}
              <span className="flex-1 text-left">
                {isBrowsingNative ? 'Opening Folder Dialog...' : 'Open Project Folder...'}
              </span>
              <span className="text-[10px] text-zinc-500 font-mono">Native Dialog</span>
            </button>

            {/* Action 2: Change Path Manually... */}
            <button
              onClick={() => {
                setShowManualInput(!showManualInput);
                setManualError('');
                if (!showManualInput) {
                  setManualPath(currentWorkspace?.path || '');
                }
              }}
              className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium text-zinc-200 hover:bg-white/[0.06] hover:text-white transition-all cursor-pointer"
            >
              <Edit3 size={14} className="text-amber-400 shrink-0" />
              <span className="flex-1 text-left">Change Path Manually...</span>
              <span className="text-[10px] text-zinc-500 font-mono">Type Path</span>
            </button>

            {/* Inline Manual Path Input */}
            {showManualInput && (
              <div className="p-2 bg-[#0d0e12]/80 border border-white/[0.08] rounded-lg mt-1 space-y-2">
                <div className="flex items-center gap-1.5">
                  <input
                    type="text"
                    value={manualPath}
                    onChange={handleManualPathInput}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleSelectWorkspace(manualPath);
                      if (e.key === 'Escape') setShowManualInput(false);
                    }}
                    placeholder="Enter directory path (e.g. C:/Projects/my-app)..."
                    className="flex-1 bg-black/40 border border-white/10 rounded-md px-2.5 py-1 text-xs font-mono text-zinc-200 outline-none focus:border-cyan-500/50"
                    autoFocus
                  />
                  <button
                    onClick={() => handleSelectWorkspace(manualPath)}
                    className="px-2.5 py-1 bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 rounded-md text-xs font-medium hover:bg-cyan-500/30 transition-colors cursor-pointer flex items-center gap-1"
                  >
                    {isLoadingSuggestions && <RotateCw size={10} className="animate-spin" />}
                    <span>Switch</span>
                  </button>
                </div>

                {manualError && (
                  <div className="text-[11px] text-rose-400 px-1">{manualError}</div>
                )}

                {/* Directory Autocomplete Suggestions */}
                {suggestions.length > 0 && (
                  <div className="max-h-36 overflow-y-auto custom-scrollbar border border-white/5 rounded-md bg-black/30 divide-y divide-white/5">
                    {suggestions.map((dir) => (
                      <button
                        key={dir.path}
                        onClick={() => {
                          setManualPath(dir.path);
                          handleSelectWorkspace(dir.path);
                        }}
                        className="w-full text-left px-2.5 py-1.5 text-[11px] font-mono text-zinc-300 hover:bg-white/[0.08] hover:text-white flex items-center gap-1.5 transition-colors cursor-pointer"
                      >
                        <Folder size={11} className="text-zinc-500 shrink-0" />
                        <span className="truncate">{dir.path}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Action 3: Re-Index Codebase */}
            <button
              onClick={handleReIndex}
              disabled={isIndexing || !currentWorkspace?.path}
              className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium text-zinc-200 hover:bg-white/[0.06] hover:text-white transition-all cursor-pointer disabled:opacity-50"
            >
              <RotateCw size={14} className={`text-indigo-400 shrink-0 ${isIndexing ? 'animate-spin' : ''}`} />
              <span className="flex-1 text-left">
                {isIndexing ? 'Indexing Codebase...' : 'Re-Index Codebase'}
              </span>
              {indexStatus ? (
                <span className="text-[10px] text-emerald-400 font-mono">{indexStatus}</span>
              ) : (
                <span className="text-[10px] text-zinc-500 font-mono">Vector DB</span>
              )}
            </button>
          </div>

          {/* Divider: Recent Projects */}
          <div className="px-3 py-2 bg-white/[0.02] flex items-center justify-between border-b border-white/[0.06]">
            <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-400 flex items-center gap-1.5">
              <Clock size={11} className="text-zinc-500" />
              Recent Projects
            </span>
            <span className="text-[10px] font-mono text-zinc-500">
              {recentProjects.length}
            </span>
          </div>

          {/* Recent Projects List */}
          <div className="max-h-56 overflow-y-auto p-1.5 space-y-1 custom-scrollbar">
            {isLoadingRecent ? (
              <div className="p-4 text-center text-xs text-zinc-500 flex items-center justify-center gap-2">
                <RotateCw size={12} className="animate-spin" />
                <span>Loading recent...</span>
              </div>
            ) : recentProjects.length === 0 ? (
              <div className="p-4 text-center text-xs text-zinc-500 italic">
                No recent workspaces found
              </div>
            ) : (
              recentProjects.map((item) => {
                const isActive = item.path === currentWorkspace?.path;
                return (
                  <div
                    key={item.path}
                    onClick={() => handleSelectWorkspace(item.path)}
                    className={`group w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs transition-all cursor-pointer border ${
                      isActive
                        ? 'bg-white/[0.08] border-white/20 text-zinc-100'
                        : 'bg-transparent border-transparent text-zinc-300 hover:bg-white/[0.04] hover:text-white'
                    }`}
                  >
                    <div className="flex items-center gap-2 min-w-0 flex-1 mr-2">
                      <FolderGit2 size={13} className={isActive ? 'text-cyan-400 shrink-0' : 'text-zinc-500 shrink-0 group-hover:text-zinc-300'} />
                      <div className="flex flex-col min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="font-medium truncate">{item.name}</span>
                          {item.git_branch && (
                            <span className="text-[9px] font-mono px-1 py-0.2 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                              {item.git_branch}
                            </span>
                          )}
                        </div>
                        <span className="text-[10px] font-mono text-zinc-500 truncate" title={item.path}>
                          {item.path}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-[10px] font-mono text-zinc-500">
                        {item.relative_time || 'recent'}
                      </span>
                      <button
                        onClick={(e) => handleDeleteRecent(e, item.path)}
                        className="opacity-0 group-hover:opacity-100 p-1 rounded text-zinc-500 hover:text-rose-400 hover:bg-rose-500/10 transition-all cursor-pointer"
                        title="Remove from recents"
                      >
                        <X size={12} />
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
