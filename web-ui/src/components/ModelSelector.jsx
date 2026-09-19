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
  defaultLabel = "Default (Workspace Model)"
}) => {
  const [showModelMenu, setShowModelMenu] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
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
    <div className="relative" ref={dropdownRef}>
      <button 
        type="button"
        className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium text-gray-300 bg-[#0a0a0a] border border-gray-800 rounded-lg hover:bg-gray-800 hover:border-gray-700 transition-colors cursor-pointer" 
        onClick={() => setShowModelMenu(!showModelMenu)}
        title={`Active Model: ${safeSelected}`}
      >
        <Cpu size={14} className="text-gray-500" />
        {label ? <span className="text-gray-500">{label}:</span> : null}
        <strong className="font-semibold text-gray-200">{displayName}</strong>
      </button>
      
      {showModelMenu && (
        <div className="absolute top-full left-0 mt-2 w-80 bg-[#09090b] border border-gray-800 rounded-xl shadow-2xl z-50 overflow-hidden ring-1 ring-white/5">
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-800/60 text-xs font-semibold text-gray-400 uppercase tracking-wider">
            <span>9Router Models ({availableModels.length})</span>
            {onRefresh && (
              <button 
                type="button"
                className="p-1 text-gray-500 hover:text-cyan-400 transition-colors"
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
          
          <div className="px-3 py-2 border-b border-gray-800/60">
            <div className="relative flex items-center">
              <Search size={12} className="absolute left-2.5 text-gray-600" />
              <input 
                type="text" 
                className="w-full bg-[#050505] border border-gray-700 text-gray-200 text-xs px-3 py-1.5 pl-7 rounded-lg outline-none focus:border-cyan-500/50 transition-colors" 
                placeholder="Search models..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                autoFocus
              />
            </div>
          </div>

          <div className="max-h-[300px] overflow-y-auto">
            {allowDefault && (
              <div 
                className={`flex items-center justify-between px-4 py-2.5 cursor-pointer transition-colors hover:bg-gray-800/50 ${!safeSelected ? 'bg-cyan-950/20' : ''}`}
                onClick={() => { 
                  setSelectedModel(''); 
                  setShowModelMenu(false); 
                  setSearchQuery('');
                }}
              >
                <div className="flex flex-col gap-0.5">
                  <span className={`text-sm ${!safeSelected ? 'font-semibold text-cyan-400' : 'text-gray-300'}`}>
                    {defaultLabel}
                  </span>
                  <span className="text-[10px] text-gray-600">System</span>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  {!safeSelected && <Check size={14} className="text-cyan-400" />}
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
                    className={`flex items-center justify-between px-4 py-2.5 cursor-pointer transition-colors hover:bg-gray-800/50 ${isSelected ? 'bg-cyan-950/20' : ''}`}
                    onClick={() => { 
                      setSelectedModel(m.id); 
                      setShowModelMenu(false); 
                      setSearchQuery('');
                    }}
                    title={m.id}
                  >
                    <div className="flex flex-col gap-0.5 overflow-hidden">
                      <span className={`text-sm truncate ${isSelected ? 'font-semibold text-cyan-400' : 'text-gray-300'}`}>
                        {m.name || m.id.split('/').pop()}
                      </span>
                      <span className="text-[10px] text-gray-600">{prov}</span>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <span className="text-[9px] px-1.5 py-0.5 rounded bg-gray-800 text-gray-400 font-medium uppercase">{m.tag || 'Fast'}</span>
                      {isSelected && <Check size={14} className="text-cyan-400" />}
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="px-4 py-6 text-center text-xs text-gray-600">
                {availableModels.length === 0 ? 'No models loaded from 9Router' : 'No matching models'}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default ModelSelector;
