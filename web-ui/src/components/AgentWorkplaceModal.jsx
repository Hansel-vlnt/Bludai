import React, { useState, useEffect } from 'react';
import { 
  X, Plus, Edit2, RotateCcw, 
  Check
} from 'lucide-react';
import { Switch as AriaSwitch } from 'react-aria-components';
import ModelSelector from './ModelSelector';
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
          className={`relative inline-flex h-4 w-8 shrink-0 rounded-full border border-white/[0.08] transition-colors duration-150 ease-in-out ${
            isFocusVisible ? 'ring-2 ring-zinc-400 ring-offset-1 ring-offset-[#14161d]' : ''
          } ${isSelected ? 'bg-zinc-200' : 'bg-zinc-800'}`}
        >
          <span
            className={`pointer-events-none inline-block h-3 w-3 transform rounded-full transition duration-150 ease-in-out ${
              isSelected ? 'translate-x-4 bg-[#0d0e12]' : 'translate-x-0.5 bg-zinc-400'
            } mt-[1px]`}
          />
        </span>
      )}
    </AriaSwitch>
  );
}

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

const DEFAULT_AVAILABLE_TOOLS = [
  { id: 'create_file', name: 'create_file', category: 'filesystem', description: 'Create and write content to files' },
  { id: 'read_file', name: 'read_file', category: 'filesystem', description: 'Read file contents from workspace' },
  { id: 'replace_content', name: 'replace_content', category: 'filesystem', description: 'Targeted string replacements' },
  { id: 'list_directory', name: 'list_directory', category: 'filesystem', description: 'List files and subdirectories' },
  { id: 'run_terminal_command', name: 'run_terminal_command', category: 'terminal', description: 'Execute shell commands safely' },
  { id: 'web_search', name: 'web_search', category: 'network', description: 'Search the web for up-to-date documentation' },
  { id: 'semantic_code_search', name: 'semantic_code_search', category: 'code', description: 'Semantic code search over the codebase' }
];

function AgentWorkplaceModal({ onClose, models = [], initialAgent = null }) {
  const [agents, setAgents] = useState([]);
  const [availableTools, setAvailableTools] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [editingAgent, setEditingAgent] = useState(initialAgent);
  const [statusMessage, setStatusMessage] = useState('');

  useEffect(() => {
    if (initialAgent) {
      setEditingAgent(initialAgent);
    }
  }, [initialAgent]);

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
      if (initialAgent) {
        onClose();
      } else {
        setEditingAgent(null);
        setStatusMessage('Specialist saved successfully.');
        setTimeout(() => setStatusMessage(''), 2000);
      }
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

  // If editing an agent, display as a dedicated right-side Inspector Drawer
  if (editingAgent) {
    const handleCloseDrawer = () => {
      if (initialAgent) {
        onClose();
      } else {
        setEditingAgent(null);
      }
    };

    return (
      <div 
        className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex justify-end animate-in fade-in duration-150"
        onClick={handleCloseDrawer}
      >
        <div 
          className="w-full max-w-2xl h-full bg-[#14161d] border-l border-white/[0.08] shadow-2xl shadow-black/80 flex flex-col overflow-hidden animate-in slide-in-from-right duration-200"
          onClick={(e) => e.stopPropagation()}
        >
          <AgentEditorForm 
            initialData={editingAgent} 
            availableTools={availableTools.length > 0 ? availableTools : DEFAULT_AVAILABLE_TOOLS}
            models={models}
            onSave={handleSaveEditor}
            onCancel={handleCloseDrawer}
            onApplyTemplate={applyTemplate}
          />
        </div>
      </div>
    );
  }

  // Otherwise, render full workplace roster modal
  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4 sm:p-6 animate-in fade-in duration-150">
      <div className="w-full max-w-5xl h-[88vh] max-h-[850px] bg-[#14161d] border border-white/[0.08] rounded-2xl shadow-2xl shadow-black/80 flex flex-col overflow-hidden">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-3.5 border-b border-white/[0.08] bg-[#14161d] shrink-0">
          <div className="flex flex-col gap-0.5">
            <h3 className="text-sm font-semibold text-zinc-100 flex items-center gap-2">
              <span className="text-zinc-400 font-mono text-xs">&gt;_</span> 
              Multi-Agent Workplace Roster
            </h3>
            <span className="text-[11px] text-zinc-400">
              {activeCount} Active Specialists <span className="text-zinc-600 px-1">•</span> Dynamic Supervisor Orchestration &amp; Tool Whitelisting
            </span>
          </div>
          <button 
            className="p-1.5 text-zinc-400 hover:text-zinc-200 hover:bg-white/5 rounded-lg transition-colors cursor-pointer" 
            onClick={onClose}
          >
            <X size={16} />
          </button>
        </div>

        {statusMessage && (
          <div className="flex items-center gap-2 px-6 py-2.5 bg-emerald-500/10 border-b border-emerald-500/20 text-emerald-400 text-xs font-medium">
            <Check size={14} /> {statusMessage}
          </div>
        )}

        {/* ROSTER OVERVIEW GRID */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden custom-scrollbar bg-[#0d0e12] p-6">
          <div className="flex flex-col sm:flex-row flex-wrap items-start sm:items-center justify-between gap-4 mb-5 pb-4 border-b border-white/[0.08]">
            <div className="flex flex-col gap-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-2 px-2.5 py-1 text-xs font-medium rounded-full bg-white/5 text-zinc-300 border border-white/[0.08]">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                  {activeCount} / {agents.length} Enabled
                </span>
              </div>
              <p className="text-xs text-zinc-400 mt-0.5">Click any specialist node or config button to open inspector settings.</p>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <button 
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-zinc-300 bg-white/5 border border-white/[0.08] rounded-lg hover:bg-white/10 hover:text-zinc-100 transition-colors cursor-pointer" 
                onClick={handleResetDefaults} 
                title="Reset to default agents"
              >
                <RotateCcw size={13} /> Reset Defaults
              </button>
              <button 
                className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-zinc-900 bg-zinc-200 hover:bg-white rounded-lg shadow-sm transition-all cursor-pointer" 
                onClick={startCreateNew}
              >
                <Plus size={14} strokeWidth={2} /> New Specialist
              </button>
            </div>
          </div>

          {isLoading ? (
            <div className="py-20 text-center text-zinc-400 animate-pulse flex flex-col items-center gap-3">
              <div className="w-6 h-6 border-2 border-t-zinc-200 border-white/10 rounded-full animate-spin"></div>
              Loading workplace roster...
            </div>
          ) : (
            <AgentWorkplaceGraph
              agents={agents}
              handleToggleEnabled={handleToggleEnabled}
              handleEditAgent={setEditingAgent}
              onSelectAgent={setEditingAgent}
            />
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

  const allTools = [...availableTools];
  (formData.tools || []).forEach(toolId => {
    if (!allTools.some(t => t.id === toolId)) {
      allTools.push({
        id: toolId,
        name: toolId,
        category: 'custom',
        description: 'Specialist capability tool'
      });
    }
  });

  return (
    <form className="flex-1 flex flex-col min-h-0 overflow-hidden" onSubmit={handleSubmit}>
      {/* Dedicated Inspector Drawer Top Bar */}
      <div className="h-[52px] px-6 flex items-center justify-between border-b border-white/[0.08] bg-[#14161d] shrink-0">
        <div className="flex items-center gap-2">
          {formData.isNew ? <Plus size={16} className="text-zinc-400" /> : <Edit2 size={16} className="text-zinc-400" />}
          <div className="flex flex-col">
            <span className="text-xs font-semibold text-zinc-100 tracking-tight">
              {formData.isNew ? 'Create New Specialist' : `Specialist Inspector: ${formData.name}`}
            </span>
            <span className="text-[10px] text-zinc-400">
              {formData.isNew ? 'Configure specialist parameters' : (formData.title || 'Role Configuration')}
            </span>
          </div>
        </div>
        <button
          type="button"
          onClick={onCancel}
          className="p-1.5 text-zinc-400 hover:text-zinc-200 hover:bg-white/5 rounded-lg transition-colors cursor-pointer"
          title="Close Inspector"
          aria-label="Close"
        >
          <X size={16} />
        </button>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden p-6 custom-scrollbar bg-[#0d0e12]">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-5 pb-3.5 border-b border-white/[0.08]">
          <span className="text-xs font-medium text-zinc-300">
            {formData.isNew ? 'Define agent persona & directives' : `Editing parameters for ${formData.name}`}
          </span>
          
          <div className="flex items-center flex-wrap gap-1.5">
            <span className="text-[11px] font-medium text-zinc-400 uppercase tracking-wide mr-1.5">Presets:</span>
            {PRESET_TEMPLATES.map(tmpl => (
              <button 
                key={tmpl.name} 
                type="button" 
                className="px-2.5 py-1 text-xs font-medium text-zinc-300 border border-white/[0.08] bg-white/[0.04] hover:bg-white/[0.08] rounded-md transition-colors cursor-pointer"
                onClick={() => onApplyTemplate(tmpl)}
              >
                + {tmpl.name}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-5">
          <Input 
            label="Agent Name (Identifier)"
            hint="Used in routing and reasoning tags."
            value={formData.name} 
            onChange={(val) => setFormData({ ...formData, name: val })} 
            placeholder="e.g. CodeReviewer" 
            fieldClassName="font-mono text-xs bg-[#14161d] border border-white/[0.08] rounded-lg px-3 py-1.5 text-zinc-200 focus-within:border-white/30"
            isRequired
          />

          <Input 
            label="Specialist Role Title"
            hint="Display title shown in the UI."
            value={formData.title} 
            onChange={(val) => setFormData({ ...formData, title: val })} 
            placeholder="e.g. Security & Vulnerability Auditor" 
            fieldClassName="text-xs bg-[#14161d] border border-white/[0.08] rounded-lg px-3 py-1.5 text-zinc-200 focus-within:border-white/30"
          />
        </div>

        <div className="mb-5">
          <Input 
            label="Supervisor Delegation Directive (Description)"
            hint="Injected into Supervisor's prompt so it knows when to delegate to this node."
            value={formData.description} 
            onChange={(val) => setFormData({ ...formData, description: val })} 
            placeholder="e.g. Senior security auditor. Reviews code for logic bugs and vulnerabilities..."
            fieldClassName="text-xs bg-[#14161d] border border-white/[0.08] rounded-lg px-3 py-1.5 text-zinc-200 focus-within:border-white/30"
          />
        </div>

        <div className="mb-5">
          <Textarea 
            label="System Prompt (Instructions)"
            value={formData.system_prompt}
            onChange={(val) => setFormData({ ...formData, system_prompt: val })}
            placeholder="You are an expert... Never guess... Always use tools..."
            rows={5}
            fieldClassName="font-mono text-xs bg-[#14161d] border border-white/[0.08] rounded-lg p-3 text-zinc-200 focus-within:border-white/30"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-5">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-zinc-300 uppercase tracking-wider">Dedicated Model</label>
            <ModelSelector
              selectedModel={formData.model}
              setSelectedModel={(val) => setFormData({ ...formData, model: val })}
              availableModels={models}
              label="Model"
              allowDefault={true}
              defaultLabel="Default (Follow Workspace Model)"
              isFullWidth={true}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-zinc-300 uppercase tracking-wider flex justify-between">
              <span>Temperature</span>
              <span className="text-zinc-200 font-mono">{formData.temperature}</span>
            </label>
            <input 
              type="range" 
              min={0.0} 
              max={1.0} 
              step={0.05}
              value={formData.temperature}
              onChange={(e) => setFormData({ ...formData, temperature: parseFloat(e.target.value) })}
              className="w-full h-1.5 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-zinc-200"
            />
          </div>
        </div>

        <div className="col-span-2">
          <label className="text-xs font-medium text-zinc-300 uppercase tracking-wider mb-1 block">Permitted Capability Tools</label>
          <p className="text-xs text-zinc-400 mb-3.5">
            Whitelisted tools permitted for this specialist.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {allTools.map(t => {
              const isChecked = (formData.tools || []).includes(t.id);
              return (
                <div
                  key={t.id}
                  onClick={() => toggleTool(t.id)}
                  className={`flex items-start justify-between p-3.5 w-full cursor-pointer rounded-xl border transition-all duration-150 ${
                    isChecked 
                      ? 'border-white/20 bg-white/[0.05] shadow-sm' 
                      : 'border-white/[0.05] bg-transparent hover:bg-white/[0.02]'
                  }`}
                >
                  <div className="flex-1 text-left w-full pr-2.5">
                    <div className="flex justify-between items-start mb-1">
                      <span className="text-xs font-medium text-zinc-200">{t.name}</span>
                      <span className="text-[9px] px-2 py-0.5 rounded font-mono uppercase tracking-wider border border-white/[0.08] text-zinc-400 bg-white/5">
                        {t.category}
                      </span>
                    </div>
                    <p className="text-[11px] text-zinc-400 leading-relaxed">{t.description}</p>
                  </div>
                  <div className="shrink-0 pt-0.5">
                    <Toggle
                      isChecked={isChecked}
                      onChange={() => toggleTool(t.id)}
                      label={`Toggle ${t.name}`}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div className="px-6 py-3.5 border-t border-white/[0.08] bg-[#14161d] flex items-center justify-end gap-2.5 shrink-0">
        <button 
          type="button" 
          className="px-3.5 py-1.5 text-xs font-medium text-zinc-400 hover:text-zinc-200 transition-colors cursor-pointer"
          onClick={onCancel}
        >
          Cancel
        </button>
        <button 
          type="submit" 
          className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-zinc-900 bg-zinc-200 hover:bg-white rounded-lg shadow-sm transition-all cursor-pointer active:scale-[0.98]"
        >
          <Check size={14} strokeWidth={2} />
          Save Specialist
        </button>
      </div>
    </form>
  );
}

export default AgentWorkplaceModal;
