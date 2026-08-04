import React, { useState } from 'react';

const ModelSelector = ({ selectedModel, setSelectedModel, availableModels }) => {
  const [showModelMenu, setShowModelMenu] = useState(false);

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
          {availableModels.map(m => (
            <div 
              key={m.id} 
              className={`model-dropdown-item ${selectedModel === m.id ? 'selected' : ''}`}
              onClick={() => { setSelectedModel(m.id); setShowModelMenu(false); }}
            >
              <span>{m.name}</span>
              <span className="model-tag">{m.tag}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default ModelSelector;
