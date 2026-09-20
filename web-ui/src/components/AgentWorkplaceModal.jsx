import React, { useState, useEffect } from 'react';
import { 
  X, Users, Plus, Edit2, Trash2, Copy, RotateCcw, 
  Bot, Code, Terminal, ShieldCheck, Search, Wrench, 
  Cpu, Check, AlertCircle, Sparkles, Sliders, MoreVertical
} from 'lucide-react';
import { Switch as AriaSwitch } from 'react-aria-components';
import ModelSelector from './ModelSelector';
import { Badge } from '@/components/base/badges/badge';
import { Dropdown, DropdownTrigger, DropdownPopover, DropdownItem, DropdownDivider } from '@/components/base/dropdown/dropdown';
import { Input } from '@/components/base/input/input';
import { Textarea } from '@/components/base/textarea/textarea';
import AgentWorkplaceGraph from './AgentWorkplaceGraph';
const API_BASE = 'http://localhost:8000/api';

function Toggle({ isChecked, onChange, label }) {
  return (
    <AriaSwitch
      isSelected={isChecked}
      onChange={onChange}
      aria-label={label}
      className="group inline-flex items-center cursor-pointer select-none focus:outline-none"
    >
      {({ isSelected, isFocusVisible }) => (
        <span
          className={`relative inline-flex h-6 w-11 shrink-0 rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out ${
            isFocusVisible ? 'ring-2 ring-[#cba6f7] ring-offset-2 ring-offset-[#161622]' : ''
          } ${isSelected ? 'bg-[#a6e3a1]' : 'bg-[#313244]'}`}
        >
          <span
            className={`pointer-events-none inline-block h-5 w-5 transform rounded-full shadow-md transition duration-200 ease-in-out ${
              isSelected ? 'translate-x-5 bg-[#11111b]' : 'translate-x-0 bg-[#a6adc8]'
            }`}
          />
        </span>
      )}
    </AriaSwitch>
  );
}

const ICON_MAP = {
  Code: Code,
  Terminal: Terminal,
  ShieldCheck: ShieldCheck,
  Search: Search,
  Wrench: Wrench,
  Bot: Bot,
  Cpu: Cpu,
  Sparkles: Sparkles
};

const PRESET_TEMPLATES = [
  {
    name: "CodeReviewer",
    title: "Security & Quality Auditor",
    description: "Inspects codebase files for security vulnerabilities, logic errors, and architectural best practices without altering files.",
    system_prompt: `You are the Code Reviewer specialist. Your job is to audit code quality, verify logic, and check for security flaws.
Guidelines:
1. Use \`read_file\` and \`semantic_code_search\` to inspect target files.
2. Identify security vulnerabilities (OWASP, injections, leaks) or syntax traps.
3. Provide concrete code diffs and recommendations with line numbers.
4. Do not modify files directly; return your findings to the Supervisor.`,
    tools: ["read_file", "semantic_code_search"],
    icon: "ShieldCheck",
    color: "#f59e0b",
    temperature: 0.1
  },
  {
    name: "DevOpsEngineer",
    title: "CI/CD & Terminal Automation Engineer",
    description: "Runs builds, executes unit and integration tests, inspects runtime environments, and compiles projects.",
    system_prompt: `You are the DevOps specialist. Your job is to run tests, inspect build outputs, and execute shell commands safely.
Guidelines:
1. Run terminal commands explicitly requested by the Supervisor.
2. Report exit codes, stdout, and stderr accurately.
3. Diagnose build/test failures and suggest concrete fixes.`,
    tools: ["run_terminal_command"],
    icon: "Terminal",
    color: "#10b981",
    temperature: 0.1
  },
  {
    name: "DocumentationWriter",
    title: "Technical Documentation Specialist",
    description: "Reads implementations and writes clean markdown documentation, API references, and architecture guides.",
    system_prompt: `You are the Documentation specialist. Your job is to inspect project files and write crystal-clear markdown documentation.
Guidelines:
1. Use \`read_file\` and \`semantic_code_search\` to understand code structure.
2. Use \`create_file\` or \`replace_content\` to generate or update README.md, API docs, and guides.
3. Use clean markdown with code snippets and tables.`,
    tools: ["create_file", "read_file", "replace_content", "semantic_code_search"],
    icon: "Code",
    color: "#00E5FF",
    temperature: 0.3
  }
];

function AgentWorkplaceModal({ onClose, models = [] }) {
  const [agents, setAgents] = useState([]);
  const [availableTools, setAvailableTools] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [editingAgent, setEditingAgent] = useState(null); // null = roster view, object = editing/creating
  const [statusMessage, setStatusMessage] = useState('');

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [agentsRes, toolsRes] = await Promise.all([
        fetch(`${API_BASE}/agents`),
        fetch(`${API_BASE}/tools`)
      ]);
      const agentsJson = await agentsRes.json();
      const toolsJson = await toolsRes.json();
      if (agentsJson && agentsJson.data) setAgents(agentsJson.data);
      if (toolsJson && toolsJson.data) setAvailableTools(toolsJson.data);
    } catch (err) {
      console.error("Failed to load workplace data", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleToggleEnabled = async (agent) => {
    try {
      const updated = { ...agent, enabled: !agent.enabled };
      await fetch(`${API_BASE}/agents/${agent.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled: updated.enabled })
      });
      setAgents(prev => prev.map(a => a.id === agent.id ? updated : a));
    } catch (err) {
      console.error("Toggle agent failed", err);
    }
  };

  const handleQuickModelChange = async (agent, modelId) => {
    try {
      await fetch(`${API_BASE}/agents/${agent.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ model: modelId })
      });
      setAgents(prev => prev.map(a => a.id === agent.id ? { ...a, model: modelId } : a));
    } catch (err) {
      console.error("Model update failed", err);
    }
  };

  const handleDelete = async (agentId) => {
    if (!window.confirm("Are you sure you want to remove this specialist from the workplace?")) return;
    try {
      await fetch(`${API_BASE}/agents/${agentId}`, { method: 'DELETE' });
      setAgents(prev => prev.filter(a => a.id !== agentId));
      setStatusMessage('Agent removed from workplace.');
      setTimeout(() => setStatusMessage(''), 2000);
    } catch (err) {
      console.error("Delete agent failed", err);
    }
  };

  const handleResetDefaults = async () => {
    if (!window.confirm("Reset all workplace agents to factory defaults? Custom agents will be overwritten.")) return;
    try {
      const res = await fetch(`${API_BASE}/agents/reset`, { method: 'POST' });
      const data = await res.json();
      if (data && data.data) {
        setAgents(data.data);
        setStatusMessage('Workplace restored to defaults.');
        setTimeout(() => setStatusMessage(''), 2000);
      }
    } catch (err) {
      console.error("Reset failed", err);
    }
  };

  const handleSaveEditor = async (formData) => {
    try {
      if (formData.isNew) {
        const res = await fetch(`${API_BASE}/agents`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(formData)
        });
        const json = await res.json();
        if (json.data) {
          setAgents(prev => [...prev, json.data]);
        }
      } else {
        const res = await fetch(`${API_BASE}/agents/${formData.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(formData)
        });
        const json = await res.json();
        if (json.data) {
          setAgents(prev => prev.map(a => a.id === formData.id ? json.data : a));
        }
      }
      setEditingAgent(null);
      setStatusMessage('Specialist saved successfully.');
      setTimeout(() => setStatusMessage(''), 2000);
    } catch (err) {
      console.error("Save failed", err);
      alert("Error saving agent configuration.");
    }
  };

  const startCreateNew = () => {
    setEditingAgent({
      isNew: true,
      name: '',
      title: '',
      description: '',
      system_prompt: '',
      model: '',
      temperature: 0.2,
      tools: ['read_file', 'semantic_code_search'],
      enabled: true,
      icon: 'Bot',
      color: '#00E5FF'
    });
  };

  const startDuplicate = (agent) => {
    setEditingAgent({
      isNew: true,
      name: `${agent.name}Copy`,
      title: `${agent.title} (Copy)`,
      description: agent.description,
      system_prompt: agent.system_prompt,
      model: agent.model,
      temperature: agent.temperature,
      tools: [...(agent.tools || [])],
      enabled: true,
      icon: agent.icon || 'Bot',
      color: agent.color || '#00E5FF'
    });
  };

  const applyTemplate = (tmpl) => {
    setEditingAgent(prev => ({
      ...prev,
      name: tmpl.name,
      title: tmpl.title,
      description: tmpl.description,
      system_prompt: tmpl.system_prompt,
      tools: [...tmpl.tools],
      icon: tmpl.icon,
      color: tmpl.color,
      temperature: tmpl.temperature
    }));
  };

  const activeCount = agents.filter(a => a.enabled).length;

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 sm:p-6 animate-in fade-in duration-200">
      <div className="w-full max-w-6xl max-h-[95vh] bg-[#161622] border border-[#2d2e42] rounded-3xl shadow-2xl shadow-black/80 flex flex-col overflow-hidden ring-1 ring-white/10">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-7 py-4.5 border-b border-[#2d2e42] bg-[#11111a] rounded-t-3xl">
          <div className="flex flex-col gap-1">
            <h3 className="text-lg font-semibold text-[#cdd6f4] flex items-center gap-2">
              <span className="text-[#cba6f7] font-mono font-bold">&gt;_</span> 
              Multi-Agent Workplace Roster
            </h3>
            <span className="text-[13px] text-[#a6adc8] font-medium">
              {activeCount} Active Specialists <span className="text-[#585b70] px-1">•</span> Dynamic Supervisor Orchestration &amp; Tool Whitelisting
            </span>
          </div>
          <button 
            className="p-2 text-[#a6adc8] hover:text-[#cdd6f4] hover:bg-[#313244] rounded-lg transition-colors" 
            onClick={onClose}
          >
            <X size={20} />
          </button>
        </div>

        {statusMessage && (
          <div className="flex items-center gap-2 px-6 py-3 bg-[#a6e3a1]/15 border-y border-[#a6e3a1]/30 text-[#a6e3a1] text-sm font-medium">
            <Check size={16} /> {statusMessage}
          </div>
        )}

        <div className="flex-1 overflow-y-auto overflow-x-hidden custom-scrollbar bg-[#161622]">
          {editingAgent ? (
            /* ================= EDIT / CREATE DRAWER ================= */
            <AgentEditorForm 
              initialData={editingAgent} 
              availableTools={availableTools}
              models={models}
              onSave={handleSaveEditor}
              onCancel={() => setEditingAgent(null)}
              onApplyTemplate={applyTemplate}
            />
          ) : (
            /* ================= ROSTER OVERVIEW GRID ================= */
            <div className="p-7 pr-8 sm:pr-9">
              <div className="flex flex-col sm:flex-row flex-wrap items-start sm:items-center justify-between gap-4 mb-7 pb-5 border-b border-[#2d2e42]">
                <div className="flex flex-col gap-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="px-3 py-1 text-xs font-semibold rounded-full bg-[#a6e3a1]/15 text-[#a6e3a1] border border-[#a6e3a1]/30">
                      {activeCount} / {agents.length} Enabled
                    </span>
                  </div>
                  <p className="text-[13px] text-[#a6adc8] mt-1">Supervisor dynamically delegates tasks to active specialists below.</p>
                </div>
                <div className="flex items-center gap-2.5 flex-wrap">
                  <button className="flex items-center gap-2 px-3.5 py-2 text-xs font-medium text-[#a6adc8] bg-[#222336] border border-[#35374e] rounded-xl hover:bg-[#2d2e42] hover:text-[#cdd6f4] transition-colors" onClick={handleResetDefaults} title="Reset to default agents">
                    <RotateCcw size={14} /> Reset Defaults
                  </button>
                  <button className="flex items-center gap-2 px-3.5 py-2 text-xs font-semibold text-[#11111b] bg-[#cba6f7] border border-[#cba6f7] rounded-xl hover:bg-[#b4befe] shadow-[0_0_15px_rgba(203,166,247,0.25)] transition-all" onClick={startCreateNew}>
                    <Plus size={14} strokeWidth={2.5} /> New Specialist
                  </button>
                </div>
              </div>

              {isLoading ? (
                <div className="py-20 text-center text-[#a6adc8] animate-pulse flex flex-col items-center gap-3">
                  <div className="w-8 h-8 border-2 border-t-[#cba6f7] border-[#313244] rounded-full animate-spin"></div>
                  Loading workplace roster...
                </div>
              ) : (
                <AgentWorkplaceGraph
                  agents={agents}
                  models={models}
                  handleToggleEnabled={handleToggleEnabled}
                  handleQuickModelChange={handleQuickModelChange}
                  handleEditAgent={setEditingAgent}
                  handleDeleteAgent={(agent) => handleDelete(agent.id)}
                  handleDuplicateAgent={startDuplicate}
                />

              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function AgentEditorForm({ initialData, availableTools, models, onSave, onCancel, onApplyTemplate }) {
  const [formData, setFormData] = useState({ ...initialData });

  const toggleTool = (toolId) => {
    setFormData(prev => {
      const current = prev.tools || [];
      if (current.includes(toolId)) {
        return { ...prev, tools: current.filter(t => t !== toolId) };
      } else {
        return { ...prev, tools: [...current, toolId] };
      }
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      alert("Agent name is required.");
      return;
    }
    onSave(formData);
  };

  return (
    <form className="flex flex-col p-6 h-full" onSubmit={handleSubmit}>
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 pb-4 border-b border-[#313244]">
        <h4 className="text-lg font-bold text-[#cdd6f4] flex items-center gap-2">
          {formData.isNew ? (
            <><Plus size={18} className="text-[#cba6f7]" /> Create New Specialist</>
          ) : (
            <><Edit2 size={18} className="text-[#cba6f7]" /> Edit Specialist: <span className="text-[#cba6f7]">{formData.name}</span></>
          )}
        </h4>
        
        <div className="flex items-center flex-wrap gap-2">
          <span className="text-[11px] font-semibold text-[#a6adc8] uppercase tracking-wide mr-2">Presets:</span>
          {PRESET_TEMPLATES.map(tmpl => (
            <button 
              key={tmpl.name} 
              type="button" 
              className="px-2.5 py-1 text-xs font-medium text-[#cba6f7] border border-[#cba6f7]/30 bg-[#cba6f7]/10 hover:bg-[#cba6f7]/20 rounded transition-colors"
              onClick={() => onApplyTemplate(tmpl)}
            >
              + {tmpl.name}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        <Input 
          label="Agent Name (Identifier)"
          hint="Used in LangGraph routing nodes and thinking tags."
          value={formData.name} 
          onChange={(val) => setFormData({ ...formData, name: val })} 
          placeholder="e.g. CodeReviewer" 
          fieldClassName="font-mono text-sm"
          isRequired
        />

        <Input 
          label="Specialist Role Title"
          hint="Display name shown in the UI."
          value={formData.title} 
          onChange={(val) => setFormData({ ...formData, title: val })} 
          placeholder="e.g. Security & Vulnerability Auditor"
        />
      </div>

      <div className="mb-6">
        <Input 
          label="Supervisor Delegation Directive (Description)"
          hint="This is injected into the Supervisor's prompt so it knows when to call this specialist."
          value={formData.description} 
          onChange={(val) => setFormData({ ...formData, description: val })} 
          placeholder="e.g. You are a senior security researcher. You review code for..."
        />
      </div>

      <div className="mb-6">
        <Textarea 
          label="System Prompt (Instructions)"
          value={formData.system_prompt}
          onChange={(val) => setFormData({ ...formData, system_prompt: val })}
          placeholder="You are an expert... Never guess... Always use tools..."
          rows={6}
          fieldClassName="font-mono text-sm"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        <div className="flex flex-col gap-1.5">
          <label className="text-[13px] font-semibold text-[#cdd6f4] uppercase tracking-wider">Dedicated Model</label>
          <div className="bg-[#11111b] border border-[#313244] rounded-lg px-3 py-2 h-[38px] flex items-center">
            <ModelSelector
              selectedModel={formData.model}
              setSelectedModel={(val) => setFormData({ ...formData, model: val })}
              availableModels={models}
              label="Model"
              allowDefault={true}
              defaultLabel="Default (Follow Workspace Model)"
            />
          </div>
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-[13px] font-semibold text-[#cdd6f4] uppercase tracking-wider flex justify-between">
            <span>Temperature</span>
            <span className="text-[#cba6f7] font-mono">{formData.temperature}</span>
          </label>
          <input 
            type="range" 
            min={0.0} 
            max={1.0} 
            step={0.05}
            value={formData.temperature}
            onChange={(e) => setFormData({ ...formData, temperature: parseFloat(e.target.value) })}
            className="w-full h-2 bg-[#313244] rounded-lg appearance-none cursor-pointer accent-[#cba6f7]"
          />
        </div>
      </div>

      <div className="col-span-2">
        <label className="text-[13px] font-semibold text-[#cdd6f4] uppercase tracking-wider mb-2 block">Permitted Capability Tools</label>
        <p className="text-[13px] text-[#a6adc8] mb-4">
          Check which tools this specialist is allowed to run. Unchecked tools will be strictly prevented by the Supervisor.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {availableTools.map(t => {
            const isChecked = (formData.tools || []).includes(t.id);
            return (
              <div
                key={t.id}
                onClick={() => toggleTool(t.id)}
                className={`flex items-start justify-between p-4 w-full cursor-pointer rounded-xl border transition-all duration-200 ${
                  isChecked 
                    ? 'border-[#a6e3a1]/60 bg-[#a6e3a1]/10 shadow-[0_0_15px_rgba(166,227,161,0.08)]' 
                    : 'border-[#313244] bg-[#222336] hover:bg-[#282a40] hover:border-[#45475a]'
                }`}
              >
                <div className="flex-1 text-left w-full pr-3">
                  <div className="flex justify-between items-start mb-1">
                    <span className={`text-[14px] font-semibold ${isChecked ? 'text-[#a6e3a1]' : 'text-[#cdd6f4]'}`}>{t.name}</span>
                    <span className={`text-[9px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider border ${
                      t.risk === 'high' ? 'border-[#f38ba8]/50 text-[#f38ba8] bg-[#f38ba8]/15' : 
                      t.risk === 'medium' ? 'border-[#f9e2af]/50 text-[#f9e2af] bg-[#f9e2af]/15' : 
                      'border-[#a6e3a1]/50 text-[#a6e3a1] bg-[#a6e3a1]/15'
                    }`}>
                      {t.category}
                    </span>
                  </div>
                  <p className="text-[12px] text-[#a6adc8] leading-relaxed">{t.description}</p>
                </div>
                <Toggle
                  isChecked={isChecked}
                  onChange={() => toggleTool(t.id)}
                  label={`Toggle ${t.name}`}
                />
              </div>
            );
          })}
        </div>
      </div>

      <div className="col-span-2 pt-6 mt-4 border-t border-[#313244] flex items-center justify-end gap-3">
        <button 
          type="button" 
          className="px-4 py-2 text-sm font-medium text-[#a6adc8] hover:text-[#cdd6f4] transition-colors"
          onClick={onCancel}
        >
          Cancel
        </button>
        <button 
          type="submit" 
          className="flex items-center gap-2 px-5 py-2 text-sm font-semibold text-[#11111b] bg-[#a6e3a1] hover:bg-[#94e2d5] rounded-lg shadow-[0_0_15px_rgba(166,227,161,0.3)] transition-all active:scale-[0.98]"
        >
          <Check size={16} strokeWidth={2.5} />
          Save Specialist
        </button>
      </div>
    </form>
  );
}

export default AgentWorkplaceModal;
