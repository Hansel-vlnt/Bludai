import React, { useState, useEffect } from 'react';
import { 
  X, Save, Bot, Wifi, Sliders, Palette, Eye, EyeOff, 
  Activity, CheckCircle2, AlertTriangle, Shield, Cpu
} from 'lucide-react';
import { Switch } from '@/components/base/switch/switch';
import { Input } from '@/components/base/input/input';
import { Textarea } from '@/components/base/textarea/textarea';
import { Select, SelectItem } from '@/components/base/select/select';

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
  const [modelsList, setModelsList] = useState([]);
  const [roleAssignments, setRoleAssignments] = useState({});

  const fetchModelsAndRoles = async () => {
    try {
      const [modelsRes, rolesRes] = await Promise.all([
        fetch(`${API_BASE}/models`),
        fetch(`${API_BASE}/roles`)
      ]);
      const modelsData = await modelsRes.json();
      if (modelsData && modelsData.data) {
        setModelsList(modelsData.data);
      }
      const rolesData = await rolesRes.json();
      if (rolesData) {
        setRoleAssignments(rolesData);
      }
    } catch (err) {
      console.error("Failed to fetch models/roles in settings", err);
    }
  };

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

    fetchModelsAndRoles();
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
      if (data.status === 'success') {
        fetchModelsAndRoles();
      }
    } catch {
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
      
      // Save role assignments if any exist
      for (const [role, modelName] of Object.entries(roleAssignments)) {
        try {
          await fetch(`${API_BASE}/roles`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ role, model_name: modelName })
          });
        } catch (e) {
          console.error(`Failed to update role ${role}`, e);
        }
      }

      if (res.ok) {
        setSaveStatus('Settings committed successfully!');
        if (onSettingsUpdated) {
          onSettingsUpdated(payload);
        }
        setTimeout(() => onClose(), 1200);
      } else {
        setSaveStatus('Failed to commit settings.');
      }
    } catch {
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
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4 sm:p-6 animate-in fade-in duration-200">
      <div className="w-full max-w-5xl h-[85vh] bg-[#14161d] border border-white/[0.08] rounded-2xl shadow-2xl shadow-black/80 flex flex-col overflow-hidden">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/[0.08] bg-[#14161d]">
          <div className="flex flex-col gap-0.5">
            <h3 className="text-base font-semibold text-zinc-100 flex items-center gap-2">
              <span className="text-zinc-400 font-mono text-xs">&gt;_</span> 
              System &amp; Agent Configuration
            </h3>
            <span className="text-xs text-zinc-400">
              Antigravity-grade agent platform parameters
            </span>
          </div>
          <button 
            className="p-1.5 text-zinc-400 hover:text-zinc-200 hover:bg-white/5 rounded-lg transition-colors cursor-pointer" 
            onClick={onClose}
          >
            <X size={18} />
          </button>
        </div>

        {/* Modal Content with Tabs */}
        <div className="flex flex-row overflow-hidden flex-1">
          {/* Navigation Sidebar */}
          <div className="w-48 bg-[#14161d] border-r border-white/[0.08] flex flex-col shrink-0 select-none">
            <button 
              className={`w-full text-left px-4 py-3 text-xs flex items-center gap-2.5 transition-colors cursor-pointer ${activeTab === 'agent' ? 'text-zinc-100 bg-white/[0.06] border-l-2 border-zinc-200 font-medium' : 'text-zinc-400 hover:text-zinc-200 hover:bg-white/[0.02]'}`}
              onClick={() => setActiveTab('agent')}
            >
              <Bot size={15} /> Agent &amp; Rules
            </button>
            <button 
              className={`w-full text-left px-4 py-3 text-xs flex items-center gap-2.5 transition-colors cursor-pointer ${activeTab === 'connectivity' ? 'text-zinc-100 bg-white/[0.06] border-l-2 border-zinc-200 font-medium' : 'text-zinc-400 hover:text-zinc-200 hover:bg-white/[0.02]'}`}
              onClick={() => setActiveTab('connectivity')}
            >
              <Wifi size={15} /> Connectivity
            </button>
            <button 
              className={`w-full text-left px-4 py-3 text-xs flex items-center gap-2.5 transition-colors cursor-pointer ${activeTab === 'generation' ? 'text-zinc-100 bg-white/[0.06] border-l-2 border-zinc-200 font-medium' : 'text-zinc-400 hover:text-zinc-200 hover:bg-white/[0.02]'}`}
              onClick={() => setActiveTab('generation')}
            >
              <Sliders size={15} /> Defaults &amp; Gen
            </button>
            <button 
              className={`w-full text-left px-4 py-3 text-xs flex items-center gap-2.5 transition-colors cursor-pointer ${activeTab === 'theme' ? 'text-zinc-100 bg-white/[0.06] border-l-2 border-zinc-200 font-medium' : 'text-zinc-400 hover:text-zinc-200 hover:bg-white/[0.02]'}`}
              onClick={() => setActiveTab('theme')}
            >
              <Palette size={15} /> Terminal Theme
            </button>
          </div>

          {/* Tab Panes */}
          <div className="flex-1 overflow-y-auto p-6 bg-[#0d0e12]">
            {/* TAB 1: AGENT & RULES */}
            {activeTab === 'agent' && (
              <div className="space-y-6">
                <div>
                  <h4 className="text-base font-bold text-gray-100 mb-1">Agent System Rules &amp; Autonomy</h4>
                  <p className="text-sm text-gray-400">Define global behavior, persona instructions, and safety execution limits.</p>
                </div>

                  <Textarea
                    label="System Instructions / Custom Persona Rules"
                    hint="Injected directly into Supervisor orchestrator and basic agent prompts."
                    rows={6}
                    value={systemInstructions}
                    onChange={setSystemInstructions}
                    placeholder="E.g., Always use TypeScript, follow functional programming patterns..."
                    fieldClassName="font-mono text-sm"
                  />

                <div className="flex items-center gap-6">
                  <div className="space-y-2 flex-1">
                    <label className="text-xs font-medium text-zinc-300 uppercase tracking-wider flex items-center justify-between">Execution Safety Mode</label>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        className={`px-3.5 py-1.5 text-xs font-medium border rounded-lg flex items-center gap-2 transition-colors cursor-pointer ${executionMode === 'auto' ? 'border-white/20 bg-white/10 text-zinc-100 shadow-sm' : 'border-white/[0.08] bg-[#14161d] text-zinc-400 hover:text-zinc-200 hover:bg-white/[0.04]'}`}
                        onClick={() => setExecutionMode('auto')}
                      >
                        <Cpu size={14} /> Autonomous (Full Auto)
                      </button>
                      <button
                        type="button"
                        className={`px-3.5 py-1.5 text-xs font-medium border rounded-lg flex items-center gap-2 transition-colors cursor-pointer ${executionMode === 'supervised' ? 'border-white/20 bg-white/10 text-zinc-100 shadow-sm' : 'border-white/[0.08] bg-[#14161d] text-zinc-400 hover:text-zinc-200 hover:bg-white/[0.04]'}`}
                        onClick={() => setExecutionMode('supervised')}
                      >
                        <Shield size={14} /> Supervised (Safe)
                      </button>
                    </div>
                  </div>

                  <div className="space-y-2 w-[150px]">
                    <label className="text-xs font-medium text-zinc-300 uppercase tracking-wider flex items-center justify-between">Max Steps / Loop</label>
                    <input
                      type="number"
                      min={5}
                      max={100}
                      value={maxSteps}
                      onChange={(e) => setMaxSteps(e.target.value)}
                      className="w-full bg-[#14161d] border border-white/[0.08] text-zinc-200 px-3 py-1.5 rounded-lg outline-none focus:border-white/30 transition-all text-xs font-mono"
                    />
                  </div>
                </div>

                <div className="space-y-2 mt-5 pt-4 border-t border-white/[0.08]">
                  <label className="text-xs font-medium text-zinc-300 uppercase tracking-wider flex items-center justify-between">
                    <span>Multi-Agent Role Model Specialization</span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/5 text-zinc-300 border border-white/[0.08] uppercase font-mono tracking-wider">Active Models</span>
                  </label>
                  <p className="text-xs text-zinc-400 mt-1 mb-3">
                    Optionally assign specialized 9Router models to individual multi-agent nodes.
                  </p>
                  <div className="grid grid-cols-[repeat(auto-fit,minmax(200px,1fr))] gap-3">
                    {(Object.keys(roleAssignments).length > 0 ? Object.keys(roleAssignments) : ['Supervisor', 'Developer', 'Executor']).map(role => (
                      <div key={role} className="bg-[#14161d] p-3 rounded-xl border border-white/[0.08]">
                        <div className="text-xs font-semibold text-zinc-200 mb-2">
                          {role} Node
                        </div>
                        <Select
                          selectedKey={roleAssignments[role] || defaultModel}
                          onSelectionChange={(key) => setRoleAssignments(prev => ({ ...prev, [role]: key }))}
                          aria-label={`${role} Model`}
                          className="w-full"
                          renderValue={(items) => items[0]?.textValue}
                        >
                          <SelectItem id={defaultModel} textValue={`Default (${defaultModel.split('/').pop()})`}>
                            Default ({defaultModel.split('/').pop()})
                          </SelectItem>
                          {modelsList.map(m => (
                            <SelectItem key={m.id} id={m.id} textValue={`${m.name || m.id.split('/').pop()} (${m.tag || 'Fast'})`}>
                              {m.name || m.id.split('/').pop()} <span className="text-zinc-500 ml-2">({m.tag || 'Fast'})</span>
                            </SelectItem>
                          ))}
                        </Select>
                      </div>
                    ))}
                  </div>
                  <p className="text-[11px] text-zinc-500 mt-2.5">
                    💡 Want to add new custom agents, modify personas, or whitelist specific tools? Open <strong>⚡ Fleet Workplace</strong> from the sidebar.
                  </p>
                </div>
              </div>
            )}

            {/* TAB 2: CONNECTIVITY */}
            {activeTab === 'connectivity' && (
              <div className="space-y-6">
                <div>
                  <h4 className="text-sm font-semibold text-zinc-100 mb-1">Provider &amp; Router Connectivity</h4>
                  <p className="text-xs text-zinc-400">Configure OpenAI-compatible API proxies (9Router, OpenRouter, Ollama, LM Studio).</p>
                </div>

                <Input
                  label="API Base URL (Optional)"
                  hint="Custom endpoint for OpenAI-compatible services (e.g. LM Studio, Ollama, vLLM)."
                  placeholder="https://api.openai.com/v1"
                  value={baseUrl}
                  onChange={setBaseUrl}
                  fieldClassName="text-xs bg-[#14161d] border border-white/[0.08] text-zinc-200 focus-within:border-white/30"
                />

                <div className="space-y-2">
                  <label className="text-xs font-medium text-zinc-300 uppercase tracking-wider flex items-center justify-between">API Key / Token</label>
                  <div className="relative flex items-center">
                    <input
                      type={showKey ? "text" : "password"}
                      value={apiKey}
                      onChange={(e) => setApiKey(e.target.value)}
                      placeholder="sk-..."
                      className="w-full bg-[#14161d] border border-white/[0.08] text-zinc-200 px-3 py-2 rounded-lg outline-none focus:border-white/30 transition-all text-xs font-mono"
                    />
                    <button
                      type="button"
                      className="absolute right-2 p-1.5 text-zinc-400 hover:text-zinc-200 transition-colors cursor-pointer"
                      onClick={() => setShowKey(!showKey)}
                      title={showKey ? "Hide key" : "Show key"}
                    >
                      {showKey ? <EyeOff size={15} /> : <Eye size={15} />}
                    </button>
                  </div>
                  <p className="text-[11px] text-zinc-500 mt-1">Saved strictly to backend/.env (Never committed to settings JSON or Git).</p>
                </div>

                {/* Connection Ping Box */}
                <div className="mt-4 pt-4 border-t border-white/[0.08] flex items-center gap-3">
                  <button
                    type="button"
                    className="flex items-center gap-2 px-3.5 py-1.5 text-xs font-medium border border-white/[0.08] bg-white/[0.04] text-zinc-300 rounded-lg hover:bg-white/[0.08] hover:text-zinc-100 transition-colors cursor-pointer"
                    onClick={handleTestConnection}
                    disabled={testingConnection}
                  >
                    <Activity size={13} className={testingConnection ? "animate-spin" : ""} />
                    {testingConnection ? 'Probing router...' : 'Test Connection'}
                  </button>

                  {testResult && (
                    <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium ${testResult.status === 'success' ? 'text-emerald-400 bg-emerald-500/10 border border-emerald-500/20' : 'text-rose-400 bg-rose-500/10 border border-rose-500/20'}`}>
                      {testResult.status === 'success' ? (
                        <>
                          <CheckCircle2 size={13} />
                          <span>Latency: {testResult.latency_ms}ms | Models: {testResult.models_found}</span>
                        </>
                      ) : (
                        <>
                          <AlertTriangle size={13} />
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
              <div className="space-y-6">
                <div>
                  <h4 className="text-sm font-semibold text-zinc-100 mb-1">Model &amp; Generation Defaults</h4>
                  <p className="text-xs text-zinc-400">Fine-tune fallback model IDs, output lengths, and creativity parameters.</p>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between items-center mb-2">
                    <label className="text-xs font-medium text-zinc-300 uppercase tracking-wider flex items-center m-0">Default Model Identifier</label>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/5 text-zinc-300 border border-white/[0.08] uppercase font-mono tracking-wider">
                      {modelsList.length > 0 ? `${modelsList.length} Models from 9Router` : '9Router offline'}
                    </span>
                  </div>

                  {modelsList.length > 0 ? (
                    <Select
                      selectedKey={defaultModel}
                      onSelectionChange={(key) => setDefaultModel(key)}
                      aria-label="Workspace Default Model"
                      className="w-full"
                      renderValue={(items) => items[0]?.textValue}
                    >
                      {modelsList.map(m => (
                        <SelectItem key={m.id} id={m.id} textValue={`${m.name || m.id.split('/').pop()} (${m.provider})`}>
                          {m.name || m.id.split('/').pop()} <span className="text-zinc-500 ml-2">({m.provider})</span>
                        </SelectItem>
                      ))}
                    </Select>
                  ) : (
                    <Input
                      value={defaultModel}
                      onChange={setDefaultModel}
                      placeholder="e.g. gpt-4o"
                    />
                  )}
                  <p className="text-[11px] text-zinc-500 mt-1">Active fallback model used when starting new sessions or when no role model is mapped.</p>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-medium text-zinc-300 uppercase tracking-wider flex items-center justify-between">
                    <span>Default Generation Temperature: <strong className="font-mono text-zinc-200">{parseFloat(defaultTemperature).toFixed(2)}</strong></span>
                  </label>
                  <input
                    type="range"
                    min="0.0"
                    max="1.5"
                    step="0.05"
                    value={defaultTemperature}
                    onChange={(e) => setDefaultTemperature(e.target.value)}
                    className="w-full h-1.5 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-zinc-200"
                  />
                  <div className="flex justify-between text-[11px] text-zinc-500 mt-1">
                    <span>0.0 (Deterministic / Code)</span>
                    <span>0.7 (Balanced)</span>
                    <span>1.5 (Creative)</span>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-medium text-zinc-300 uppercase tracking-wider flex items-center justify-between">Max Completion Tokens</label>
                  <Select 
                    selectedKey={String(maxTokens)} 
                    onSelectionChange={(key) => setMaxTokens(Number(key))}
                    aria-label="Max Completion Tokens"
                    className="w-full"
                    renderValue={(items) => items[0]?.textValue}
                  >
                    <SelectItem id="2048" textValue="2,048 Tokens (Compact)">2,048 Tokens (Compact)</SelectItem>
                    <SelectItem id="4096" textValue="4,096 Tokens (Standard)">4,096 Tokens (Standard)</SelectItem>
                    <SelectItem id="8192" textValue="8,192 Tokens (Extended Context)">8,192 Tokens (Extended Context)</SelectItem>
                    <SelectItem id="16384" textValue="16,384 Tokens (Deep Reasoning)">16,384 Tokens (Deep Reasoning)</SelectItem>
                  </Select>
                </div>
              </div>
            )}

            {/* TAB 4: THEME & INTERFACE */}
            {activeTab === 'theme' && (
              <div className="space-y-6">
                <div>
                  <h4 className="text-sm font-semibold text-zinc-100 mb-1">Terminal Aesthetic &amp; UX</h4>
                  <p className="text-xs text-zinc-400">Customize cyber-terminal accent lighting and reasoning display toggles.</p>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-medium text-zinc-300 uppercase tracking-wider flex items-center justify-between">Terminal Color Theme</label>
                  <div className="grid grid-cols-2 gap-3">
                    {THEME_PRESETS.map((t) => (
                      <div
                        key={t.id}
                        className={`p-3 rounded-xl border cursor-pointer transition-all flex items-center gap-3 ${themeAccent === t.id ? 'border-white/30 bg-white/[0.08] shadow-sm' : 'border-white/[0.08] bg-[#14161d] hover:border-white/20'}`}
                        onClick={() => handleThemeChange(t.id)}
                      >
                        <div className="w-6 h-6 rounded-full shrink-0 ring-2 ring-white/10" style={{ backgroundColor: t.hex }} />
                        <div className="flex flex-col">
                          <span className="text-xs font-semibold text-zinc-200">{t.name}</span>
                          <span className="text-[11px] text-zinc-500">{t.desc}</span>
                        </div>
                        {themeAccent === t.id && <span className="text-zinc-200 ml-auto font-bold">&bull;</span>}
                      </div>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-medium text-zinc-300 uppercase tracking-wider flex items-center justify-between">Reasoning &amp; Chain-of-Thought</label>
                  <div className="flex items-center gap-3">
                    <Switch
                      isSelected={showThinking}
                      onChange={setShowThinking}
                    />
                    <span className="text-xs text-zinc-300">Display live &lt;thinking&gt; steps in conversation bubbles</span>
                  </div>
                  <p className="text-[11px] text-zinc-500 mt-1">Allows inspecting multi-agent thought streams and step-by-step logic.</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Modal Status Banner */}
        {saveStatus && (
          <div className={`flex items-center px-6 py-3 text-xs font-medium border-y ${saveStatus.includes('success') ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20' : 'text-rose-400 bg-rose-500/10 border-rose-500/20'}`}>
            {saveStatus}
          </div>
        )}

        {/* Modal Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-white/[0.08] bg-[#14161d]">
          <button className="px-4 py-2 text-xs font-medium text-zinc-400 hover:text-zinc-200 transition-colors cursor-pointer" onClick={onClose}>Discard</button>
          <button className="flex items-center gap-2 px-5 py-2 text-xs font-semibold text-zinc-900 bg-zinc-200 hover:bg-white rounded-lg shadow-sm transition-all cursor-pointer" onClick={handleSave} disabled={isSaving}>
            <Save size={14} /> {isSaving ? 'Committing...' : 'Save & Apply'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default SettingsModal;
