import React, { useState, useEffect, useCallback } from 'react';
import { 
  Folder, 
  FolderOpen, 
  FileCode, 
  FileText, 
  File, 
  RotateCw, 
  X, 
  Search, 
  Eye, 
  Copy, 
  Check, 
  ChevronRight, 
  ChevronDown,
  ChevronsDownUp
} from 'lucide-react';

const API_BASE = 'http://localhost:8000/api';

// Helper to determine file icon and category
function getFileIcon(filename) {
  const ext = filename.split('.').pop()?.toLowerCase();
  
  const codeExts = [
    'js', 'jsx', 'ts', 'tsx', 'py', 'json', 'css', 'scss', 'html', 
    'go', 'rs', 'c', 'cpp', 'h', 'java', 'sql', 'sh', 'bash', 'ps1', 'bat'
  ];
  const docExts = ['md', 'txt', 'pdf', 'doc', 'docx', 'rtf', 'log', 'env', 'yaml', 'yml', 'toml', 'ini'];

  if (codeExts.includes(ext)) {
    return <FileCode size={14} className="text-cyan-400 shrink-0" />;
  }
  if (docExts.includes(ext)) {
    return <FileText size={14} className="text-amber-400 shrink-0" />;
  }
  return <File size={14} className="text-zinc-400 shrink-0" />;
}

function formatBytes(bytes) {
  if (!bytes || bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

export default function WorkspaceTreeDrawer({ 
  isOpen, 
  onClose, 
  currentWorkspace, 
  onInsertFile 
}) {
  const [rootNodes, setRootNodes] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [expandedFolders, setExpandedFolders] = useState(new Set());
  const [childrenCache, setChildrenCache] = useState({});
  const [loadingFolders, setLoadingFolders] = useState(new Set());
  const [searchQuery, setSearchQuery] = useState('');
  const [copiedPath, setCopiedPath] = useState(null);
  
  // File preview modal state
  const [previewFile, setPreviewFile] = useState(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [copiedPreview, setCopiedPreview] = useState(false);

  // Fetch root tree
  const fetchTree = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch(`${API_BASE}/workspace/tree`);
      if (res.ok) {
        const data = await res.json();
        setRootNodes(data.children || []);
        setChildrenCache({});
        setExpandedFolders(new Set());
      }
    } catch (err) {
      console.error('Failed to load workspace tree', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      fetchTree();
    }
  }, [isOpen, currentWorkspace?.path, fetchTree]);

  // Expand or collapse a folder, lazy-loading if needed
  const toggleFolder = async (node) => {
    const isExpanded = expandedFolders.has(node.path);
    const next = new Set(expandedFolders);

    if (isExpanded) {
      next.delete(node.path);
      setExpandedFolders(next);
      return;
    }

    next.add(node.path);
    setExpandedFolders(next);

    // If not cached, fetch children
    if (!childrenCache[node.path]) {
      setLoadingFolders(prev => new Set(prev).add(node.path));
      try {
        const res = await fetch(`${API_BASE}/workspace/tree?subpath=${encodeURIComponent(node.path)}`);
        if (res.ok) {
          const data = await res.json();
          setChildrenCache(prev => ({
            ...prev,
            [node.path]: data.children || []
          }));
        }
      } catch (err) {
        console.error(`Failed to fetch subtree for ${node.path}`, err);
      } finally {
        setLoadingFolders(prev => {
          const updated = new Set(prev);
          updated.delete(node.path);
          return updated;
        });
      }
    }
  };

  const handleCollapseAll = () => {
    setExpandedFolders(new Set());
  };

  const handleCopyFilePath = (e, path) => {
    e.stopPropagation();
    navigator.clipboard.writeText(path);
    setCopiedPath(path);
    setTimeout(() => setCopiedPath(null), 1500);
    if (onInsertFile) {
      onInsertFile(path);
    }
  };

  const handleOpenFilePreview = async (e, node) => {
    e.stopPropagation();
    setPreviewLoading(true);
    setPreviewFile({ path: node.path, name: node.name, size: node.size, content: 'Loading...' });
    try {
      const res = await fetch(`${API_BASE}/workspace/file?path=${encodeURIComponent(node.path)}`);
      if (res.ok) {
        const data = await res.json();
        setPreviewFile(data);
      } else {
        const err = await res.json();
        setPreviewFile({ path: node.path, name: node.name, size: node.size, content: `Error: ${err.detail || 'Could not read file'}` });
      }
    } catch {
      setPreviewFile({ path: node.path, name: node.name, size: node.size, content: 'Network error reading file content.' });
    } finally {
      setPreviewLoading(false);
    }
  };

  // Recursive tree node renderer
  const renderTreeNodes = (nodes, depth = 0) => {
    if (!nodes || nodes.length === 0) return null;

    return nodes.map((node) => {
      const isDirectory = node.type === 'directory';
      const children = childrenCache[node.path] || [];
      const query = searchQuery.toLowerCase().trim();

      const hasMatchingChild = (currChildren) => {
        return currChildren.some(c => 
          c.name.toLowerCase().includes(query) || 
          c.path.toLowerCase().includes(query) || 
          (c.type === 'directory' && hasMatchingChild(childrenCache[c.path] || []))
        );
      };

      const matchesName = Boolean(query) && (node.name.toLowerCase().includes(query) || node.path.toLowerCase().includes(query));
      const matchesChildren = Boolean(query) && isDirectory && hasMatchingChild(children);

      // Filter by search query if present
      if (query && !matchesName && !matchesChildren) {
        return null;
      }

      const isExpanded = expandedFolders.has(node.path) || (Boolean(query) && matchesChildren);
      const isFolderLoading = loadingFolders.has(node.path);

      return (
        <div key={node.path} className="flex flex-col select-none">
          <div
            onClick={() => {
              if (isDirectory) {
                toggleFolder(node);
              } else {
                handleCopyFilePath({ stopPropagation: () => {} }, node.path);
              }
            }}
            style={{ paddingLeft: `${depth * 14 + 10}px` }}
            className={`group flex items-center justify-between py-1.5 pr-2 rounded-md text-xs cursor-pointer transition-colors ${
              copiedPath === node.path
                ? 'bg-emerald-500/15 text-emerald-300'
                : 'text-zinc-300 hover:bg-white/[0.05] hover:text-white'
            }`}
            title={node.path}
          >
            <div className="flex items-center gap-1.5 min-w-0 flex-1 mr-1">
              {isDirectory ? (
                <>
                  <span className="text-zinc-500 shrink-0">
                    {isFolderLoading ? (
                      <RotateCw size={11} className="animate-spin text-zinc-400" />
                    ) : isExpanded ? (
                      <ChevronDown size={12} className="text-zinc-400" />
                    ) : (
                      <ChevronRight size={12} className="text-zinc-500" />
                    )}
                  </span>
                  {isExpanded ? (
                    <FolderOpen size={14} className="text-amber-400 shrink-0" />
                  ) : (
                    <Folder size={14} className="text-amber-300/80 shrink-0" />
                  )}
                </>
              ) : (
                <>
                  <span className="w-3 shrink-0" />
                  {getFileIcon(node.name)}
                </>
              )}
              <span className="truncate text-zinc-200 group-hover:text-white font-mono text-[12px]">
                {node.name}
              </span>
            </div>

            {/* Hover Actions */}
            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
              {!isDirectory && (
                <>
                  <button
                    onClick={(e) => handleOpenFilePreview(e, node)}
                    className="p-1 rounded text-zinc-400 hover:text-cyan-300 hover:bg-white/10 transition-colors cursor-pointer"
                    title="Inspect file content"
                  >
                    <Eye size={12} />
                  </button>
                  <button
                    onClick={(e) => handleCopyFilePath(e, node.path)}
                    className="p-1 rounded text-zinc-400 hover:text-emerald-300 hover:bg-white/10 transition-colors cursor-pointer"
                    title="Insert @path into chat or copy"
                  >
                    {copiedPath === node.path ? (
                      <Check size={12} className="text-emerald-400" />
                    ) : (
                      <Copy size={12} />
                    )}
                  </button>
                </>
              )}
            </div>
          </div>

          {/* Children nodes if expanded */}
          {isDirectory && isExpanded && (
            <div className="flex flex-col">
              {isFolderLoading && !childrenCache[node.path] ? (
                <div style={{ paddingLeft: `${(depth + 1) * 14 + 10}px` }} className="py-1 text-[11px] text-zinc-500 italic">
                  Loading folder...
                </div>
              ) : children.length === 0 ? (
                <div style={{ paddingLeft: `${(depth + 1) * 14 + 10}px` }} className="py-1 text-[11px] text-zinc-500 italic">
                  (Empty)
                </div>
              ) : (
                renderTreeNodes(children, depth + 1)
              )}
            </div>
          )}
        </div>
      );
    });
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Dockable Tree Drawer Container */}
      <div className="w-[260px] shrink-0 border-r border-white/[0.08] bg-[#10121a] flex flex-col h-full z-20 select-none overflow-hidden animate-in slide-in-from-left duration-200">
        {/* Drawer Header */}
        <div className="h-[52px] px-3 flex items-center justify-between border-b border-white/[0.08] bg-[#14161d] shrink-0">
          <div className="flex items-center gap-1.5 min-w-0">
            <Folder size={14} className="text-cyan-400 shrink-0" />
            <span className="text-xs font-semibold text-zinc-200 truncate">
              Explorer
            </span>
            {currentWorkspace?.name && (
              <span className="text-[10px] font-mono text-zinc-500 truncate max-w-[90px]">
                · {currentWorkspace.name}
              </span>
            )}
          </div>

          <div className="flex items-center gap-1 shrink-0">
            <button
              onClick={fetchTree}
              disabled={isLoading}
              className="p-1.5 rounded-md text-zinc-400 hover:text-zinc-200 hover:bg-white/[0.06] transition-colors cursor-pointer"
              title="Refresh tree"
            >
              <RotateCw size={12} className={isLoading ? 'animate-spin' : ''} />
            </button>
            <button
              onClick={handleCollapseAll}
              className="p-1.5 rounded-md text-zinc-400 hover:text-zinc-200 hover:bg-white/[0.06] transition-colors cursor-pointer"
              title="Collapse all folders"
            >
              <ChevronsDownUp size={12} />
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-md text-zinc-400 hover:text-zinc-200 hover:bg-white/[0.06] transition-colors cursor-pointer"
              title="Close Explorer"
            >
              <X size={13} />
            </button>
          </div>
        </div>

        {/* Quick Search Filter */}
        <div className="p-2 border-b border-white/[0.06] bg-[#0d0e12]/60">
          <div className="flex items-center gap-1.5 bg-[#14161d] border border-white/[0.08] rounded-lg px-2 py-1">
            <Search size={12} className="text-zinc-500 shrink-0" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Filter files by name..."
              className="w-full bg-transparent text-[11px] font-mono text-zinc-200 placeholder:text-zinc-500 outline-none"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="text-zinc-500 hover:text-zinc-300"
              >
                <X size={11} />
              </button>
            )}
          </div>
        </div>

        {/* Tree Content */}
        <div className="flex-1 overflow-y-auto p-1.5 custom-scrollbar">
          {isLoading ? (
            <div className="py-12 flex flex-col items-center justify-center gap-2 text-zinc-500 text-xs">
              <RotateCw size={16} className="animate-spin text-cyan-400" />
              <span>Scanning project tree...</span>
            </div>
          ) : rootNodes.length === 0 ? (
            <div className="py-12 text-center text-xs text-zinc-500 italic px-4">
              Workspace folder is empty or not accessible.
            </div>
          ) : (
            <div className="space-y-0.5">
              {renderTreeNodes(rootNodes)}
            </div>
          )}
        </div>

        {/* Bottom Drawer Footer */}
        <div className="px-3 py-1.5 border-t border-white/[0.08] bg-[#0d0e12] flex items-center justify-between text-[10px] font-mono text-zinc-500">
          <span>Click file to insert @path</span>
          {copiedPath && <span className="text-emerald-400 font-sans">Copied!</span>}
        </div>
      </div>

      {/* File Content Preview Modal */}
      {previewFile && (
        <div 
          className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-150"
          onClick={() => setPreviewFile(null)}
        >
          <div 
            className="w-full max-w-3xl max-h-[85vh] bg-[#14161d] border border-white/[0.12] rounded-xl shadow-2xl flex flex-col overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Preview Header */}
            <div className="px-4 py-3 border-b border-white/[0.08] flex items-center justify-between bg-white/[0.02]">
              <div className="flex items-center gap-2 min-w-0">
                {getFileIcon(previewFile.name)}
                <span className="font-semibold text-zinc-100 text-sm truncate font-mono">
                  {previewFile.name}
                </span>
                <span className="text-[11px] font-mono text-zinc-500 truncate max-w-[320px]">
                  ({previewFile.path})
                </span>
                {previewFile.size !== undefined && (
                  <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-white/5 text-zinc-400 border border-white/10 shrink-0">
                    {formatBytes(previewFile.size)}
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(previewFile.content || '');
                    setCopiedPreview(true);
                    setTimeout(() => setCopiedPreview(false), 1500);
                  }}
                  className="flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium bg-white/[0.06] border border-white/10 text-zinc-300 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                >
                  {copiedPreview ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
                  <span>{copiedPreview ? 'Copied' : 'Copy'}</span>
                </button>
                <button
                  onClick={() => setPreviewFile(null)}
                  className="p-1 rounded text-zinc-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                >
                  <X size={16} />
                </button>
              </div>
            </div>

            {/* Preview Body */}
            <div className="flex-1 overflow-auto p-4 custom-scrollbar bg-[#0d0e12]">
              {previewLoading ? (
                <div className="py-16 flex flex-col items-center justify-center gap-2 text-zinc-500 text-xs">
                  <RotateCw size={16} className="animate-spin text-cyan-400" />
                  <span>Loading file content...</span>
                </div>
              ) : (
                <pre className="font-mono text-xs text-zinc-300 whitespace-pre overflow-x-auto leading-relaxed select-text">
                  {previewFile.content}
                </pre>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
