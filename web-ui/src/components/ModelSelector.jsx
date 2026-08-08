import React, { useState } from 'react';

const ModelSelector = ({ selectedModel, setSelectedModel, availableModels }) => {
  const [showModelMenu, setShowModelMenu] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const filteredModels = availableModels.filter(m => 
    m.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    m.id.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="model-dropdown-container">
      <button 
        className="model-dropdown-btn" 
        onClick={() => setShowModelMenu(!showModelMenu)}
      >
        <span style={{opacity: 0.7}}>Model:</span> {selectedModel.split('/').pop()}
      </button>
      
      {showModelMenu && (
        <div className="model-dropdown-menu">
          <div className="model-dropdown-header">Select Model (From 9Router)</div>
          
          <div className="model-search-container">
            <input 
              type="text" 
              className="model-search-input" 
              placeholder="Search models..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              autoFocus
            />
          </div>

          <div className="model-list-container">
            {filteredModels.length > 0 ? (
              filteredModels.map(m => (
                <div 
                  key={m.id} 
                  className={`model-dropdown-item ${selectedModel === m.id ? 'selected' : ''}`}
                  onClick={() => { 
                    setSelectedModel(m.id); 
                    setShowModelMenu(false); 
                    setSearchQuery('');
                  }}
                >
                  <span>{m.name}</span>
                  <span className="model-tag">{m.tag}</span>
                </div>
              ))
            ) : (
              <div className="model-dropdown-empty">No models found</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default ModelSelector;
