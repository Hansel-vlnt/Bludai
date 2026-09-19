import React, { useState, useEffect } from 'react';
import { 
  X, Users, Plus, Edit2, Trash2, Copy, RotateCcw, 
  Bot, Code, Terminal, ShieldCheck, Search, Wrench, 
  Cpu, Check, AlertCircle, Sparkles, Sliders, MoreVertical
} from 'lucide-react';
import ModelSelector from './ModelSelector';
import { Switch } from '@/components/base/switch/switch';
import { Badge } from '@/components/base/badges/badge';
import { Dropdown, DropdownTrigger, DropdownPopover, DropdownItem, DropdownDivider } from '@/components/base/dropdown/dropdown';
const API_BASE = 'http://localhost:8000/api';

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
      <div className="w-full max-w-6xl max-h-[95vh] bg-[#09090b] border border-gray-800/80 rounded-2xl shadow-2xl flex flex-col overflow-hidden ring-1 ring-white/5">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-800/60 bg-[#0c0c0e]">
          <div className="flex flex-col gap-1">
            <h3 className="text-lg font-semibold text-gray-100 flex items-center gap-2">
              <span className="text-cyan-400 font-mono font-bold">&gt;_</span> 
              Multi-Agent Workplace Roster
            </h3>
            <span className="text-[13px] text-gray-400 font-medium">
              {activeCount} Active Specialists <span className="text-gray-600 px-1">•</span> Dynamic Supervisor Orchestration &amp; Tool Whitelisting
            </span>
          </div>
          <button 
            className="p-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition-colors" 
            onClick={onClose}
          >
            <X size={20} />
          </button>
        </div>

        {statusMessage && (
          <div className="flex items-center gap-2 px-6 py-3 bg-emerald-950/30 border-y border-emerald-900/50 text-emerald-400 text-sm font-medium">
            <Check size={16} /> {statusMessage}
          </div>
        )}

        <div className="flex-1 overflow-y-auto overflow-x-hidden custom-scrollbar bg-[#050505]">
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
            <div className="p-6">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6 pb-4 border-b border-gray-800/60">
                <div className="flex flex-col gap-1">
                  <div className="flex items-center gap-2">
                    <Badge variant="blue">
                      {activeCount} / {agents.length} Enabled
                    </Badge>
                  </div>
                  <p className="text-[13px] text-gray-400">Supervisor dynamically delegates tasks to active specialists below.</p>
                </div>
                <div className="flex items-center gap-2">
                  <button className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium text-gray-400 bg-gray-900 border border-gray-800 rounded hover:bg-gray-800 hover:text-white transition-colors" onClick={handleResetDefaults} title="Reset to default agents">
                    <RotateCcw size={14} /> Reset Defaults
                  </button>
                  <button className="flex items-center gap-2 px-3 py-1.5 text-xs font-semibold text-black bg-cyan-400 border border-cyan-400 rounded hover:bg-cyan-300 shadow-[0_0_10px_rgba(0,229,255,0.2)] transition-all" onClick={startCreateNew}>
                    <Plus size={14} strokeWidth={2.5} /> New Specialist
                  </button>
                </div>
              </div>

              {isLoading ? (
                <div className="py-20 text-center text-gray-500 animate-pulse flex flex-col items-center gap-3">
                  <div className="w-8 h-8 border-2 border-t-cyan-500 border-gray-800 rounded-full animate-spin"></div>
                  Loading workplace roster...
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {agents.map(agent => {
                    const IconComp = ICON_MAP[agent.icon] || Bot;
                    return (
                      <div 
                        key={agent.id} 
                        className={`relative flex flex-col bg-[#0a0a0a] border border-gray-800 rounded-xl overflow-hidden transition-all duration-300 hover:border-gray-600 ${!agent.enabled ? 'opacity-60 grayscale-[50%]' : 'shadow-lg'}`}
                      >
                        {/* Top Accent Line */}
                        <div className="absolute top-0 left-0 right-0 h-1" style={{ background: agent.color || '#00E5FF' }}></div>
                        
                        <div className="p-4 flex-1 flex flex-col">
                          <div className="flex justify-between items-start mb-3">
                            <div className="flex items-center gap-3">
                              <div 
                                className="flex items-center justify-center w-10 h-10 rounded-lg shrink-0" 
                                style={{ 
                                  background: `${agent.color || '#00E5FF'}15`, 
                                  color: agent.color || '#00E5FF',
                                  border: `1px solid ${agent.color || '#00E5FF'}30`
                                }}
                              >
                                <IconComp size={20} />
                              </div>
                              <div className="flex flex-col">
                                <span className="text-[15px] font-bold text-gray-100">{agent.name}</span>
                                <span className="text-[12px] text-gray-400 font-medium">{agent.title || 'Specialist'}</span>
                              </div>
                            </div>
                            
                            <Switch 
                              isSelected={agent.enabled} 
                              onChange={() => handleToggleEnabled(agent)} 
                              aria-label={agent.enabled ? 'Enabled in workplace' : 'Disabled'}
                            />
                          </div>

                          <p className="text-[13px] text-gray-400 mb-4 line-clamp-2 min-h-[40px]">
                            {agent.description || "Handles delegated subtasks from the Supervisor."}
                          </p>

                          <div className="flex items-center justify-between mb-4 bg-black/40 rounded px-3 py-2 border border-gray-800/60">
                            <span className="text-[11px] font-semibold text-gray-500 uppercase tracking-wide">Model</span>
                            <div className="scale-90 origin-right">
                              <ModelSelector
                                selectedModel={agent.model}
                                setSelectedModel={(val) => handleQuickModelChange(agent, val)}
                                availableModels={models}
                                label="Model"
                                allowDefault={true}
                                defaultLabel="Default (Workspace Model)"
                              />
                            </div>
                          </div>

                          <div className="flex flex-col gap-1.5 mt-auto">
                            <span className="text-[11px] font-semibold text-gray-500 uppercase tracking-wide">Tools ({agent.tools ? agent.tools.length : 0})</span>
                            <div className="flex flex-wrap gap-1.5">
                              {agent.tools && agent.tools.length > 0 ? (
                                agent.tools.map(t => (
                                  <span key={t} className="text-[10px] font-mono px-2 py-0.5 rounded border border-gray-700 bg-gray-800/50 text-gray-300">{t}</span>
                                ))
                              ) : (
                                <span className="text-[11px] italic text-gray-600">No tools (Analysis only)</span>
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="flex border-t border-gray-800/60 bg-black/20">
                          <button 
                            className="flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs font-medium text-gray-400 hover:text-white hover:bg-gray-800/50 transition-colors" 
                            onClick={() => setEditingAgent({ ...agent, isNew: false })}
                          >
                            <Edit2 size={13} /> Edit
                          </button>
                          
                          <Dropdown>
                            <DropdownTrigger className="flex items-center justify-center px-4 border-l border-gray-800/60 text-gray-400 hover:text-white hover:bg-gray-800/50 transition-colors outline-none">
                              <MoreVertical size={14} />
                            </DropdownTrigger>
                            <DropdownPopover aria-label="Agent Actions" placement="bottom end" className="w-40 bg-[#0c0c0e] border border-gray-700">
                              <DropdownItem onSelect={() => startDuplicate(agent)} className="flex items-center gap-2 text-gray-300">
                                <Copy size={13} /> Clone Specialist
                              </DropdownItem>
                              {!agent.is_system && (
                                <>
                                  <DropdownDivider />
                                  <DropdownItem onSelect={() => handleDelete(agent.id)} className="flex items-center gap-2 text-red-400">
                                    <Trash2 size={13} /> Delete Specialist
                                  </DropdownItem>
                                </>
                              )}
                            </DropdownPopover>
                          </Dropdown>
                        </div>
                      </div>
                    );
                  })}
                </div>
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
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 pb-4 border-b border-gray-800/60">
        <h4 className="text-lg font-bold text-gray-100 flex items-center gap-2">
          {formData.isNew ? (
            <><Plus size={18} className="text-cyan-400" /> Create New Specialist</>
          ) : (
            <><Edit2 size={18} className="text-cyan-400" /> Edit Specialist: <span className="text-cyan-400">{formData.name}</span></>
          )}
        </h4>
        
        <div className="flex items-center flex-wrap gap-2">
          <span className="text-[11px] font-semibold text-gray-500 uppercase tracking-wide mr-2">Presets:</span>
          {PRESET_TEMPLATES.map(tmpl => (
            <button 
              key={tmpl.name} 
              type="button" 
              className="px-2.5 py-1 text-xs font-medium text-cyan-400 border border-cyan-900 bg-cyan-950/20 hover:bg-cyan-900/40 rounded transition-colors"
              onClick={() => onApplyTemplate(tmpl)}
            >
              + {tmpl.name}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        <div className="flex flex-col gap-1.5">
          <label className="text-[13px] font-semibold text-gray-300 uppercase tracking-wider">Agent Name (Identifier)</label>
          <input 
            type="text" 
            className="w-full bg-[#050505] border border-gray-700 text-gray-100 px-3 py-2 rounded-lg outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500/50 transition-all font-mono text-sm"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            placeholder="e.g. CodeReviewer"
            required
          />
          <span className="text-[11px] text-gray-500">Used in LangGraph routing nodes and thinking tags.</span>
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-[13px] font-semibold text-gray-300 uppercase tracking-wider">Specialist Role Title</label>
          <input 
            type="text" 
            className="w-full bg-[#050505] border border-gray-700 text-gray-100 px-3 py-2 rounded-lg outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500/50 transition-all text-sm"
            value={formData.title}
            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            placeholder="e.g. Security & Vulnerability Auditor"
          />
        </div>
      </div>

      <div className="flex flex-col gap-1.5 mb-6">
        <label className="text-[13px] font-semibold text-gray-300 uppercase tracking-wider">Supervisor Delegation Directive (Description)</label>
        <input 
          type="text" 
          className="w-full bg-[#050505] border border-gray-700 text-gray-100 px-3 py-2 rounded-lg outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500/50 transition-all text-sm"
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          placeholder="e.g. You are a senior security researcher. You review code for..."
        />
        <span className="text-[11px] text-gray-500">This is injected into the Supervisor's prompt so it knows when to call this specialist.</span>
      </div>

      <div className="flex flex-col gap-1.5 mb-6">
        <label className="text-[13px] font-semibold text-gray-300 uppercase tracking-wider flex items-center justify-between">
          <span>System Prompt (Instructions)</span>
        </label>
        <textarea 
          className="w-full bg-[#050505] border border-gray-700 text-gray-100 px-3 py-3 rounded-lg outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500/50 transition-all font-mono text-sm min-h-[150px] resize-y custom-scrollbar"
          value={formData.system_prompt}
          onChange={(e) => setFormData({ ...formData, system_prompt: e.target.value })}
          placeholder="You are an expert... Never guess... Always use tools..."
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        <div className="flex flex-col gap-1.5">
          <label className="text-[13px] font-semibold text-gray-300 uppercase tracking-wider">Dedicated Model</label>
          <div className="bg-[#050505] border border-gray-700 rounded-lg px-3 py-2 h-[38px] flex items-center">
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
          <label className="text-[13px] font-semibold text-gray-300 uppercase tracking-wider flex justify-between">
            <span>Temperature</span>
            <span className="text-cyan-400 font-mono">{formData.temperature}</span>
          </label>
          <input 
            type="range" 
            min={0.0} 
            max={1.0} 
            step={0.05}
            value={formData.temperature}
            onChange={(e) => setFormData({ ...formData, temperature: parseFloat(e.target.value) })}
            className="w-full h-2 bg-gray-800 rounded-lg appearance-none cursor-pointer accent-cyan-500"
          />
        </div>
      </div>

      <div className="col-span-2">
        <label className="text-[13px] font-semibold text-gray-300 uppercase tracking-wider mb-2 block">Permitted Capability Tools</label>
        <p className="text-[13px] text-gray-400 mb-4">
          Check which tools this specialist is allowed to run. Unchecked tools will be strictly prevented by the Supervisor.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {availableTools.map(t => {
            const isChecked = (formData.tools || []).includes(t.id);
            return (
              <label 
                key={t.id} 
                className="relative flex items-start p-4 cursor-pointer rounded-xl border border-gray-800 bg-[#0a0a0a] transition-all duration-200 hover:bg-[#111] hover:border-gray-700 has-[:checked]:border-cyan-500/50 has-[:checked]:bg-cyan-950/20 has-[:checked]:shadow-[0_0_15px_rgba(0,229,255,0.05)]"
              >
                <div className="flex items-center h-5 mt-1">
                  <input 
                    type="checkbox" 
                    className="peer sr-only"
                    checked={isChecked} 
                    onChange={() => toggleTool(t.id)} 
                  />
                  <div className="w-5 h-5 rounded border border-gray-600 bg-transparent flex items-center justify-center peer-checked:bg-cyan-500 peer-checked:border-cyan-500 transition-colors">
                    <Check size={14} className="text-black opacity-0 peer-checked:opacity-100 transition-opacity" strokeWidth={3} />
                  </div>
                </div>
                <div className="ml-3 flex-1">
                  <div className="flex justify-between items-start">
                    <span className="text-[14px] font-semibold text-gray-200 peer-checked:text-cyan-400">{t.name}</span>
                    <span className={`text-[9px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider border ${
                      t.risk === 'high' ? 'border-red-900/50 text-red-400 bg-red-950/30' : 
                      t.risk === 'medium' ? 'border-amber-900/50 text-amber-400 bg-amber-950/30' : 
                      'border-emerald-900/50 text-emerald-400 bg-emerald-950/30'
                    }`}>
                      {t.category}
                    </span>
                  </div>
                  <p className="text-[12px] text-gray-500 mt-1 leading-relaxed">{t.description}</p>
                </div>
              </label>
            );
          })}
        </div>
      </div>

      <div className="col-span-2 pt-6 mt-4 border-t border-gray-800/60 flex items-center justify-end gap-3">
        <button 
          type="button" 
          className="px-4 py-2 text-sm font-medium text-gray-400 hover:text-white transition-colors"
          onClick={onCancel}
        >
          Cancel
        </button>
        <button 
          type="submit" 
          className="flex items-center gap-2 px-5 py-2 text-sm font-semibold text-black bg-cyan-400 hover:bg-cyan-300 rounded-lg shadow-[0_0_15px_rgba(0,229,255,0.3)] transition-all active:scale-[0.98]"
        >
          <Check size={16} strokeWidth={2.5} />
          Save Specialist
        </button>
      </div>
    </form>
  );
}

export default AgentWorkplaceModal;
