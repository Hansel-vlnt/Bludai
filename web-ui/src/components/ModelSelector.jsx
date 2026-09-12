import React, { useState, useEffect, useRef } from 'react';
import { Cpu, RotateCw, Check, Search } from 'lucide-react';

const ModelSelector = ({ 
  selectedModel, 
  setSelectedModel, 
  availableModels = [], 
  label = "Model",
  onRefresh,
  isRefreshing = false 
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

  const safeSelected = selectedModel || (availableModels.length > 0 ? availableModels[0].id : 'None');
  const displayName = safeSelected.split('/').pop();

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
    <div className="model-dropdown-container" ref={dropdownRef}>
      <button 
        type="button"
        className="model-dropdown-btn" 
        onClick={() => setShowModelMenu(!showModelMenu)}
        title={`Active Model: ${safeSelected}`}
      >
        <Cpu size={14} style={{ opacity: 0.8 }} />
        <span style={{ opacity: 0.65 }}>{label}:</span> 
        <strong style={{ fontWeight: 600 }}>{displayName}</strong>
      </button>
      
      {showModelMenu && (
        <div className="model-dropdown-menu">
          <div className="model-dropdown-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span>9Router Models ({availableModels.length})</span>
            {onRefresh && (
              <button 
                type="button"
                className="model-refresh-btn"
                onClick={(e) => {
                  e.stopPropagation();
                  onRefresh();
                }}
                disabled={isRefreshing}
                title="Refresh models from 9Router"
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: 'var(--text-secondary)',
                  cursor: 'pointer',
                  padding: '2px 4px',
                  display: 'flex',
                  alignItems: 'center'
                }}
              >
                <RotateCw size={12} className={isRefreshing ? "spinning" : ""} />
              </button>
            )}
          </div>
          
          <div className="model-search-container">
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
              <Search size={12} style={{ position: 'absolute', left: 8, opacity: 0.5 }} />
              <input 
                type="text" 
                className="model-search-input" 
                placeholder="Search models..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{ paddingLeft: 26 }}
                autoFocus
              />
            </div>
          </div>

          <div className="model-list-container">
            {filteredModels.length > 0 ? (
              filteredModels.map(m => {
                const isSelected = safeSelected === m.id;
                const prov = getProvider(m.id);
                return (
                  <div 
                    key={m.id} 
                    className={`model-dropdown-item ${isSelected ? 'selected' : ''}`}
                    onClick={() => { 
                      setSelectedModel(m.id); 
                      setShowModelMenu(false); 
                      setSearchQuery('');
                    }}
                    title={m.id}
                  >
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 2, overflow: 'hidden' }}>
                      <span style={{ 
                        fontWeight: isSelected ? 600 : 400, 
                        whiteSpace: 'nowrap', 
                        overflow: 'hidden', 
                        textOverflow: 'ellipsis',
                        color: isSelected ? 'var(--accent-color)' : 'inherit'
                      }}>
                        {m.name || m.id.split('/').pop()}
                      </span>
                      <span style={{ fontSize: '0.68rem', opacity: 0.5 }}>{prov}</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
                      <span className="model-tag">{m.tag || 'Fast'}</span>
                      {isSelected && <Check size={14} color="var(--accent-color)" />}
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="model-dropdown-empty">
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
