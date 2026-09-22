import React, { useState, useEffect, useRef } from 'react';
import { Cpu, RotateCw, Check, Search } from 'lucide-react';

const ModelSelector = ({ 
  selectedModel, 
  setSelectedModel, 
  availableModels = [], 
  label = "Model",
  onRefresh,
  isRefreshing = false,
  allowDefault = false,
  defaultLabel = "Default (Workspace Model)",
  dropUp = false,
  isFullWidth = false,
  className = ""
}) => {
  const [showModelMenu, setShowModelMenu] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [menuPlacement, setMenuPlacement] = useState(dropUp ? 'top' : 'bottom');
  const dropdownRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setShowModelMenu(false);
      }
    };
    if (showModelMenu) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showModelMenu]);

  useEffect(() => {
    if (showModelMenu && dropdownRef.current) {
      if (dropUp) {
        setMenuPlacement('top');
        return;
      }
      const rect = dropdownRef.current.getBoundingClientRect();
      const spaceBelow = window.innerHeight - rect.bottom;
      const spaceAbove = rect.top;
      // If space below is less than 380px and space above is larger, drop upwards
      if (spaceBelow < 380 && spaceAbove > spaceBelow) {
        setMenuPlacement('top');
      } else {
        setMenuPlacement('bottom');
      }
    }
  }, [showModelMenu, dropUp]);

  let safeSelected = selectedModel;
  if (!safeSelected && !allowDefault) {
    safeSelected = availableModels.length > 0 ? availableModels[0].id : 'None';
  }
  
  const displayName = !safeSelected ? defaultLabel : safeSelected.split('/').pop();

  const filteredModels = (availableModels || []).filter(m => {
    const name = m.name || m.id.split('/').pop();
    return name.toLowerCase().includes(searchQuery.toLowerCase()) || 
           m.id.toLowerCase().includes(searchQuery.toLowerCase());
  });

  const getProvider = (id) => {
    if (id.includes('claude')) return 'Anthropic';
    if (id.includes('gemini')) return 'Gemini';
    if (id.includes('nemotron')) return 'Nvidia';
    if (id.includes('gemma')) return 'Gemma';
    if (id.startsWith('openrouter')) return 'OpenRouter';
    if (id.startsWith('ag/')) return '9Router';
    return 'LLM';
  };

  return (
    <div className={`relative ${isFullWidth ? 'w-full' : 'inline-block'} ${className}`} ref={dropdownRef}>
      <button 
        type="button"
        className={`flex items-center gap-2 px-3 py-1.5 text-xs font-medium text-zinc-300 bg-[#18181b] border border-white/10 rounded-lg hover:bg-white/5 hover:border-white/20 transition-colors cursor-pointer select-none ${isFullWidth ? 'w-full justify-between h-[38px]' : ''}`} 
        onClick={() => setShowModelMenu(!showModelMenu)}
        title={`Active Model: ${safeSelected}`}
      >
        <div className="flex items-center gap-2 min-w-0">
          <Cpu size={14} className="text-zinc-400 shrink-0" />
          {label ? <span className="text-neutral-400 shrink-0">{label}:</span> : null}
          <strong className="font-semibold text-zinc-100 font-mono text-[11px] truncate">{displayName}</strong>
        </div>
      </button>
      
      {showModelMenu && (
        <div 
          className={`absolute ${menuPlacement === 'top' ? 'bottom-full mb-2' : 'top-full mt-2'} left-0 w-80 sm:w-96 bg-[#18181b] border border-white/10 rounded-xl shadow-2xl shadow-black/80 z-50 overflow-hidden ring-1 ring-white/5 flex flex-col animate-in fade-in zoom-in-95 duration-100`}
          style={{ maxHeight: 'min(440px, calc(100vh - 140px))' }}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-2.5 bg-[#141420] border-b border-white/5 text-[11px] font-semibold text-neutral-400 uppercase tracking-wider shrink-0">
            <span className="flex items-center gap-2">
              <span>9Router Models</span>
              <span className="px-1.5 py-0.5 rounded bg-white/5 text-zinc-300 border border-white/10 text-[10px] font-mono">
                {availableModels.length}
              </span>
            </span>
            {onRefresh && (
              <button 
                type="button"
                className="p-1 text-zinc-400 hover:text-zinc-200 hover:bg-white/5 rounded transition-colors"
                onClick={(e) => {
                  e.stopPropagation();
                  onRefresh();
                }}
                disabled={isRefreshing}
                title="Refresh models from 9Router"
              >
                <RotateCw size={12} className={isRefreshing ? "animate-spin" : ""} />
              </button>
            )}
          </div>
          
          {/* Search bar */}
          <div className="p-2.5 bg-[#141420] border-b border-white/5 shrink-0">
            <div className="relative flex items-center">
              <Search size={13} className="absolute left-2.5 text-zinc-500 pointer-events-none" />
              <input 
                type="text" 
                className="w-full bg-[#18181b] border border-white/10 text-zinc-200 text-xs px-3 py-1.5 pl-8 rounded-lg outline-none focus:border-[#cba6f7]/60 placeholder:text-zinc-500 font-sans transition-colors" 
                placeholder="Search models..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                autoFocus
              />
            </div>
          </div>

          {/* Scrollable models list */}
          <div 
            className="overflow-y-auto custom-scrollbar divide-y divide-white/5 flex-1 min-h-0" 
            style={{ maxHeight: '280px' }}
          >
            {allowDefault && (
              <div 
                className={`flex items-center justify-between px-3.5 py-2.5 cursor-pointer transition-colors hover:bg-white/5 ${!safeSelected ? 'bg-[#cba6f7]/15 border-l-2 border-[#cba6f7]' : ''}`}
                onClick={() => { 
                  setSelectedModel(''); 
                  setShowModelMenu(false); 
                  setSearchQuery('');
                }}
              >
                <div className="flex flex-col gap-0.5">
                  <span className={`text-xs ${!safeSelected ? 'font-semibold text-zinc-100' : 'text-zinc-300'}`}>
                    {defaultLabel}
                  </span>
                  <span className="text-[10px] text-neutral-400 font-mono">System</span>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  {!safeSelected && <Check size={14} className="text-[#cba6f7]" />}
                </div>
              </div>
            )}
            {filteredModels.length > 0 ? (
              filteredModels.map(m => {
                const isSelected = safeSelected === m.id;
                const prov = getProvider(m.id);
                return (
                  <div 
                    key={m.id} 
                    className={`flex items-center justify-between px-3.5 py-2.5 cursor-pointer transition-colors hover:bg-white/5 ${isSelected ? 'bg-[#cba6f7]/15 border-l-2 border-[#cba6f7]' : ''}`}
                    onClick={() => { 
                      setSelectedModel(m.id); 
                      setShowModelMenu(false); 
                      setSearchQuery('');
                    }}
                    title={m.id}
                  >
                    <div className="flex flex-col gap-0.5 overflow-hidden pr-2">
                      <span className={`text-xs truncate ${isSelected ? 'font-semibold text-zinc-100' : 'text-zinc-300'}`}>
                        {m.name || m.id.split('/').pop()}
                      </span>
                      <span className="text-[10px] text-neutral-400 font-mono">{prov}</span>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <span className="text-[9px] px-1.5 py-0.5 rounded bg-white/5 text-zinc-400 font-mono border border-white/10 uppercase">
                        {m.tag || 'Fast'}
                      </span>
                      {isSelected && <Check size={14} className="text-[#cba6f7]" />}
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="px-4 py-8 text-center text-xs text-neutral-400">
                {availableModels.length === 0 ? 'No models loaded from 9Router' : 'No matching models found'}
              </div>
            )}
          </div>

          {/* Footer hint */}
          <div className="px-3.5 py-1.5 bg-[#141420] border-t border-white/5 text-[10px] text-neutral-400 flex items-center justify-between shrink-0">
            <span>Scroll or type to filter</span>
            <span className="font-mono text-zinc-400">{filteredModels.length} available</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default ModelSelector;
