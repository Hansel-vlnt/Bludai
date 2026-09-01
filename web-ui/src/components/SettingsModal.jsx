import React, { useState, useEffect } from 'react';
import { X, Save } from 'lucide-react';

const API_BASE = 'http://localhost:8000/api';

const SettingsModal = ({ onClose }) => {
  const [apiKey, setApiKey] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState('');

  useEffect(() => {
    fetch(`${API_BASE}/settings`)
      .then(res => res.json())
      .then(data => {
        if (data.nine_router_api_key) {
          setApiKey(data.nine_router_api_key);
        }
      })
      .catch(err => console.error("Failed to fetch settings", err));
  }, []);

  const handleSave = async () => {
    setIsSaving(true);
    setSaveStatus('');
    try {
      const res = await fetch(`${API_BASE}/settings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nine_router_api_key: apiKey })
      });
      if (res.ok) {
        setSaveStatus('Settings saved successfully!');
        setTimeout(() => onClose(), 1500);
      } else {
        setSaveStatus('Failed to save settings.');
      }
    } catch (err) {
      setSaveStatus('Error saving settings.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="settings-overlay">
      <div className="settings-modal">
        <div className="settings-header">
          <h3><span style={{ color: '#00E5FF' }}>&gt;_</span> System Config</h3>
          <button className="close-btn" onClick={onClose}><X size={20} /></button>
        </div>
        
        <div className="settings-body">
          <div className="setting-group">
            <label>9Router API Key</label>
            <input 
              type="password" 
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="sk-..."
              className="terminal-input"
            />
            <p className="setting-help">Saved to backend .env file.</p>
          </div>
          
          {saveStatus && (
            <div className={`settings-status ${saveStatus.includes('success') ? 'success' : 'error'}`}>
              {saveStatus}
            </div>
          )}
        </div>
        
        <div className="settings-footer">
          <button className="cancel-btn" onClick={onClose}>Abort</button>
          <button className="save-btn" onClick={handleSave} disabled={isSaving}>
            <Save size={16} /> {isSaving ? 'Executing...' : 'Commit'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default SettingsModal;
