import React, { useState, useEffect } from 'react';
import { 
  X, Save, Bot, Wifi, Sliders, Palette, Eye, EyeOff, 
  Activity, CheckCircle2, AlertTriangle, Shield, Cpu
} from 'lucide-react';

const API_BASE = 'http://localhost:8000/api';

const THEME_PRESETS = [
  { id: 'cyan', name: 'Terminal Cyan', hex: '#00E5FF', desc: 'Cyberpunk default' },
  { id: 'green', name: 'Matrix Green', hex: '#00FF66', desc: 'Classic phosphor CRT' },
  { id: 'amber', name: 'Amber Gold', hex: '#FFB300', desc: 'Vintage terminal amber' },
  { id: 'purple', name: 'Neon Synth', hex: '#BD00FF', desc: 'Synthwave purple' }
];

const SettingsModal = ({ onClose, onSettingsUpdated }) => {
  const [activeTab, setActiveTab] = useState('agent');
  const [apiKey, setApiKey] = useState('');
  const [showKey, setShowKey] = useState(false);
  const [baseUrl, setBaseUrl] = useState('http://localhost:20128/v1');
  const [defaultModel, setDefaultModel] = useState('meta-llama/llama-3-8b-instruct:free');
  const [defaultTemperature, setDefaultTemperature] = useState(0.5);
  const [maxTokens, setMaxTokens] = useState(4096);
  const [systemInstructions, setSystemInstructions] = useState('');
  const [executionMode, setExecutionMode] = useState('auto');
  const [maxSteps, setMaxSteps] = useState(25);
  const [showThinking, setShowThinking] = useState(true);
  const [themeAccent, setThemeAccent] = useState('cyan');

  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState('');
  const [testingConnection, setTestingConnection] = useState(false);
  const [testResult, setTestResult] = useState(null);

  useEffect(() => {
    fetch(`${API_BASE}/settings`)
      .then(res => res.json())
      .then(data => {
        if (data.nine_router_api_key !== undefined) setApiKey(data.nine_router_api_key);
        if (data.nine_router_base_url) setBaseUrl(data.nine_router_base_url);
        if (data.default_model) setDefaultModel(data.default_model);
        if (data.default_temperature !== undefined) setDefaultTemperature(data.default_temperature);
        if (data.max_tokens !== undefined) setMaxTokens(data.max_tokens);
        if (data.system_instructions !== undefined) setSystemInstructions(data.system_instructions);
        if (data.execution_mode) setExecutionMode(data.execution_mode);
        if (data.max_steps !== undefined) setMaxSteps(data.max_steps);
        if (data.show_thinking !== undefined) setShowThinking(data.show_thinking);
        if (data.theme_accent) setThemeAccent(data.theme_accent);
      })
      .catch(err => console.error("Failed to fetch settings", err));
  }, []);

  const handleTestConnection = async () => {
    setTestingConnection(true);
    setTestResult(null);
    try {
      const res = await fetch(`${API_BASE}/settings/test`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ base_url: baseUrl, api_key: apiKey })
      });
      const data = await res.json();
      setTestResult(data);
    } catch (err) {
      setTestResult({ status: 'error', message: 'Backend unreachable or request timed out.' });
    } finally {
      setTestingConnection(false);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    setSaveStatus('');
    try {
      const payload = {
        nine_router_api_key: apiKey,
        nine_router_base_url: baseUrl,
        default_model: defaultModel,
        default_temperature: parseFloat(defaultTemperature),
        max_tokens: parseInt(maxTokens, 10),
        system_instructions: systemInstructions,
        execution_mode: executionMode,
        max_steps: parseInt(maxSteps, 10),
        show_thinking: showThinking,
        theme_accent: themeAccent
      };

      const res = await fetch(`${API_BASE}/settings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      
      if (res.ok) {
        setSaveStatus('Settings committed successfully!');
        if (onSettingsUpdated) {
          onSettingsUpdated(payload);
        }
        setTimeout(() => onClose(), 1200);
      } else {
        setSaveStatus('Failed to commit settings.');
      }
    } catch (err) {
      setSaveStatus('Error connecting to backend.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleThemeChange = (newTheme) => {
    setThemeAccent(newTheme);
    document.documentElement.setAttribute('data-theme', newTheme);
  };

  return (
    <div className="settings-overlay">
      <div className="settings-modal modern-settings-modal">
        {/* Modal Header */}
        <div className="settings-header">
          <div className="modal-title-box">
            <h3><span className="terminal-prompt">&gt;_</span> System &amp; Agent Configuration</h3>
            <span className="modal-subtitle">Antigravity-grade agent platform parameters</span>
          </div>
          <button className="close-btn" onClick={onClose}><X size={20} /></button>
        </div>

        {/* Modal Content with Tabs */}
        <div className="settings-container-grid">
          {/* Navigation Sidebar */}
          <div className="settings-nav">
            <button 
              className={`nav-tab-btn ${activeTab === 'agent' ? 'active' : ''}`}
              onClick={() => setActiveTab('agent')}
            >
              <Bot size={16} /> Agent &amp; Rules
            </button>
            <button 
              className={`nav-tab-btn ${activeTab === 'connectivity' ? 'active' : ''}`}
              onClick={() => setActiveTab('connectivity')}
            >
              <Wifi size={16} /> Connectivity
            </button>
            <button 
              className={`nav-tab-btn ${activeTab === 'generation' ? 'active' : ''}`}
              onClick={() => setActiveTab('generation')}
            >
              <Sliders size={16} /> Defaults &amp; Gen
            </button>
            <button 
              className={`nav-tab-btn ${activeTab === 'theme' ? 'active' : ''}`}
              onClick={() => setActiveTab('theme')}
            >
              <Palette size={16} /> Terminal Theme
            </button>
          </div>

          {/* Tab Panes */}
          <div className="settings-tab-content">
            {/* TAB 1: AGENT & RULES */}
            {activeTab === 'agent' && (
              <div className="tab-pane">
                <div className="pane-header">
                  <h4>Agent System Rules &amp; Autonomy</h4>
                  <p>Define global behavior, persona instructions, and safety execution limits.</p>
                </div>

                <div className="setting-group">
                  <label className="setting-label">
                    <span>System Instructions / Custom Persona Rules</span>
                    <span className="badge">Active in All Modes</span>
                  </label>
                  <textarea
                    rows={6}
                    value={systemInstructions}
                    onChange={(e) => setSystemInstructions(e.target.value)}
                    placeholder="E.g., Always use TypeScript, follow functional programming patterns, format responses concisely in markdown..."
                    className="terminal-textarea"
                  />
                  <p className="setting-help">Injected directly into Supervisor orchestrator and basic agent prompts.</p>
                </div>

                <div className="setting-row">
                  <div className="setting-group flex-1">
                    <label className="setting-label">Execution Safety Mode</label>
                    <div className="radio-pill-group">
                      <button
                        type="button"
                        className={`pill-btn ${executionMode === 'auto' ? 'active' : ''}`}
                        onClick={() => setExecutionMode('auto')}
                      >
                        <Cpu size={14} /> Autonomous (Full Auto)
                      </button>
                      <button
                        type="button"
                        className={`pill-btn ${executionMode === 'supervised' ? 'active' : ''}`}
                        onClick={() => setExecutionMode('supervised')}
                      >
                        <Shield size={14} /> Supervised (Safe)
                      </button>
                    </div>
                  </div>

                  <div className="setting-group" style={{ width: '150px' }}>
                    <label className="setting-label">Max Steps / Loop</label>
                    <input
                      type="number"
                      min={5}
                      max={100}
                      value={maxSteps}
                      onChange={(e) => setMaxSteps(e.target.value)}
                      className="terminal-input"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* TAB 2: CONNECTIVITY */}
            {activeTab === 'connectivity' && (
              <div className="tab-pane">
                <div className="pane-header">
                  <h4>Provider &amp; Router Connectivity</h4>
                  <p>Configure OpenAI-compatible API proxies (9Router, OpenRouter, Ollama, LM Studio).</p>
                </div>

                <div className="setting-group">
                  <label className="setting-label">API Base URL</label>
                  <input
                    type="text"
                    value={baseUrl}
                    onChange={(e) => setBaseUrl(e.target.value)}
                    placeholder="http://localhost:20128/v1"
                    className="terminal-input"
                  />
                  <p className="setting-help">Endpoint conforming to the OpenAI Chat Completions API specification.</p>
                </div>

                <div className="setting-group">
                  <label className="setting-label">API Key / Token</label>
                  <div className="input-with-icon">
                    <input
                      type={showKey ? "text" : "password"}
                      value={apiKey}
                      onChange={(e) => setApiKey(e.target.value)}
                      placeholder="sk-..."
                      className="terminal-input"
                    />
                    <button
                      type="button"
                      className="icon-addon-btn"
                      onClick={() => setShowKey(!showKey)}
                      title={showKey ? "Hide key" : "Show key"}
                    >
                      {showKey ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                  <p className="setting-help">Encrypted into local backend environment and synchronized to .env.</p>
                </div>

                {/* Connection Ping Box */}
                <div className="ping-test-box">
                  <button
                    type="button"
                    className="test-btn"
                    onClick={handleTestConnection}
                    disabled={testingConnection}
                  >
                    <Activity size={14} className={testingConnection ? "spinning" : ""} />
                    {testingConnection ? 'Probing router...' : 'Test Connection'}
                  </button>

                  {testResult && (
                    <div className={`ping-result-badge ${testResult.status}`}>
                      {testResult.status === 'success' ? (
                        <>
                          <CheckCircle2 size={14} />
                          <span>Latency: {testResult.latency_ms}ms | Models: {testResult.models_found}</span>
                        </>
                      ) : (
                        <>
                          <AlertTriangle size={14} />
                          <span>{testResult.message}</span>
                        </>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* TAB 3: GENERATION DEFAULTS */}
            {activeTab === 'generation' && (
              <div className="tab-pane">
                <div className="pane-header">
                  <h4>Model &amp; Generation Defaults</h4>
                  <p>Fine-tune fallback model IDs, output lengths, and creativity parameters.</p>
                </div>

                <div className="setting-group">
                  <label className="setting-label">Default Model Identifier</label>
                  <input
                    type="text"
                    value={defaultModel}
                    onChange={(e) => setDefaultModel(e.target.value)}
                    placeholder="meta-llama/llama-3-8b-instruct:free"
                    className="terminal-input"
                  />
                  <p className="setting-help">Fallback model used when starting new sessions or when no role model is mapped.</p>
                </div>

                <div className="setting-group">
                  <label className="setting-label">
                    <span>Default Generation Temperature: <strong>{parseFloat(defaultTemperature).toFixed(2)}</strong></span>
                  </label>
                  <input
                    type="range"
                    min="0.0"
                    max="1.5"
                    step="0.05"
                    value={defaultTemperature}
                    onChange={(e) => setDefaultTemperature(e.target.value)}
                    className="full-width-slider"
                  />
                  <div className="slider-scale">
                    <span>0.0 (Deterministic / Code)</span>
                    <span>0.7 (Balanced)</span>
                    <span>1.5 (Creative)</span>
                  </div>
                </div>

                <div className="setting-group">
                  <label className="setting-label">Max Completion Tokens</label>
                  <select 
                    value={maxTokens} 
                    onChange={(e) => setMaxTokens(e.target.value)}
                    className="terminal-select"
                  >
                    <option value={2048}>2,048 Tokens (Compact)</option>
                    <option value={4096}>4,096 Tokens (Standard)</option>
                    <option value={8192}>8,192 Tokens (Extended Context)</option>
                    <option value={16384}>16,384 Tokens (Deep Reasoning)</option>
                  </select>
                </div>
              </div>
            )}

            {/* TAB 4: THEME & INTERFACE */}
            {activeTab === 'theme' && (
              <div className="tab-pane">
                <div className="pane-header">
                  <h4>Terminal Aesthetic &amp; UX</h4>
                  <p>Customize cyber-terminal accent lighting and reasoning display toggles.</p>
                </div>

                <div className="setting-group">
                  <label className="setting-label">Terminal Color Theme</label>
                  <div className="theme-swatch-grid">
                    {THEME_PRESETS.map((t) => (
                      <div
                        key={t.id}
                        className={`theme-card ${themeAccent === t.id ? 'selected' : ''}`}
                        onClick={() => handleThemeChange(t.id)}
                      >
                        <div className="theme-color-dot" style={{ backgroundColor: t.hex }} />
                        <div className="theme-card-info">
                          <span className="theme-name">{t.name}</span>
                          <span className="theme-desc">{t.desc}</span>
                        </div>
                        {themeAccent === t.id && <span className="theme-check">&bull;</span>}
                      </div>
                    ))}
                  </div>
                </div>

                <div className="setting-group">
                  <label className="setting-label">Reasoning &amp; Chain-of-Thought</label>
                  <label className="checkbox-container">
                    <input
                      type="checkbox"
                      checked={showThinking}
                      onChange={(e) => setShowThinking(e.target.checked)}
                    />
                    <span className="checkbox-text">Display live &lt;thinking&gt; steps in conversation bubbles</span>
                  </label>
                  <p className="setting-help">Allows inspecting multi-agent thought streams and step-by-step logic.</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Modal Status Banner */}
        {saveStatus && (
          <div className={`settings-status ${saveStatus.includes('success') ? 'success' : 'error'}`}>
            {saveStatus}
          </div>
        )}

        {/* Modal Footer */}
        <div className="settings-footer">
          <button className="cancel-btn" onClick={onClose}>Discard</button>
          <button className="save-btn" onClick={handleSave} disabled={isSaving}>
            <Save size={16} /> {isSaving ? 'Committing...' : 'Save &amp; Apply'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default SettingsModal;
