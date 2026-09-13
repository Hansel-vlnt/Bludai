import React, { useState, useEffect } from 'react';
import { 
  X, Users, Plus, Edit2, Trash2, Copy, RotateCcw, 
  Bot, Code, Terminal, ShieldCheck, Search, Wrench, 
  Cpu, Check, AlertCircle, Sparkles, Sliders
} from 'lucide-react';

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
    <div className="settings-overlay">
      <div className="settings-modal modern-settings-modal workplace-modal">
        {/* Modal Header */}
        <div className="settings-header">
          <div className="modal-title-box">
            <h3><span className="terminal-prompt">&gt;_</span> Multi-Agent Workplace Roster</h3>
            <span className="modal-subtitle">
              {activeCount} Active Specialists · Dynamic Supervisor Orchestration &amp; Tool Whitelisting
            </span>
          </div>
          <button className="close-btn" onClick={onClose}><X size={20} /></button>
        </div>

        {statusMessage && (
          <div style={{
            background: 'rgba(16, 185, 129, 0.15)',
            border: '1px solid rgba(16, 185, 129, 0.4)',
            color: '#10b981',
            padding: '8px 16px',
            fontSize: '0.85rem',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            <Check size={14} /> {statusMessage}
          </div>
        )}

        <div className="workplace-content-body">
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
            <div className="workplace-roster-view">
              <div className="workplace-toolbar">
                <div className="workplace-toolbar-left">
                  <span className="workplace-badge-count">{activeCount} / {agents.length} Enabled</span>
                  <p className="workplace-toolbar-hint">Supervisor dynamically delegates tasks to active specialists below.</p>
                </div>
                <div className="workplace-toolbar-right">
                  <button className="btn-secondary-sm" onClick={handleResetDefaults} title="Reset to default agents">
                    <RotateCcw size={14} /> Reset Defaults
                  </button>
                  <button className="btn-primary-sm" onClick={startCreateNew}>
                    <Plus size={14} /> New Specialist
                  </button>
                </div>
              </div>

              {isLoading ? (
                <div style={{ padding: '40px', textAlign: 'center', color: '#94a3b8' }}>
                  Loading workplace roster...
                </div>
              ) : (
                <div className="workplace-agent-grid">
                  {agents.map(agent => {
                    const IconComp = ICON_MAP[agent.icon] || Bot;
                    return (
                      <div 
                        key={agent.id} 
                        className={`workplace-agent-card ${agent.enabled ? 'enabled' : 'disabled'}`}
                        style={{ borderTopColor: agent.color || '#00E5FF' }}
                      >
                        <div className="agent-card-header">
                          <div className="agent-header-left">
                            <div 
                              className="agent-icon-badge" 
                              style={{ 
                                background: `${agent.color || '#00E5FF'}22`, 
                                color: agent.color || '#00E5FF',
                                border: `1px solid ${agent.color || '#00E5FF'}44`
                              }}
                            >
                              <IconComp size={16} />
                            </div>
                            <div className="agent-name-meta">
                              <span className="agent-name">{agent.name}</span>
                              <span className="agent-title">{agent.title || 'Specialist'}</span>
                            </div>
                          </div>
                          
                          <label className="switch-toggle" title={agent.enabled ? 'Enabled in workplace' : 'Disabled'}>
                            <input 
                              type="checkbox" 
                              checked={agent.enabled} 
                              onChange={() => handleToggleEnabled(agent)} 
                            />
                            <span className="slider-round" />
                          </label>
                        </div>

                        <p className="agent-description">
                          {agent.description || "Handles delegated subtasks from the Supervisor."}
                        </p>

                        <div className="agent-model-row">
                          <span className="agent-row-label">Model:</span>
                          <select 
                            value={agent.model || ''} 
                            onChange={(e) => handleQuickModelChange(agent, e.target.value)}
                            className="agent-model-select"
                          >
                            <option value="">Default (Workspace Model)</option>
                            {models.map(m => (
                              <option key={m.id} value={m.id}>
                                {m.name || m.id.split('/').pop()} ({m.tag || 'Fast'})
                              </option>
                            ))}
                          </select>
                        </div>

                        <div className="agent-tools-row">
                          <span className="agent-row-label">Tools ({agent.tools ? agent.tools.length : 0}):</span>
                          <div className="agent-tool-chips">
                            {agent.tools && agent.tools.length > 0 ? (
                              agent.tools.map(t => (
                                <span key={t} className="agent-tool-chip">{t}</span>
                              ))
                            ) : (
                              <span className="agent-tool-chip-none">No tools (Analysis only)</span>
                            )}
                          </div>
                        </div>

                        <div className="agent-card-actions">
                          <button 
                            className="card-action-btn" 
                            onClick={() => setEditingAgent({ ...agent, isNew: false })}
                            title="Edit specialist prompt & tools"
                          >
                            <Edit2 size={13} /> Edit
                          </button>
                          <button 
                            className="card-action-btn" 
                            onClick={() => startDuplicate(agent)}
                            title="Clone specialist"
                          >
                            <Copy size={13} /> Clone
                          </button>
                          {!agent.is_system && (
                            <button 
                              className="card-action-btn delete" 
                              onClick={() => handleDelete(agent.id)}
                              title="Delete custom specialist"
                            >
                              <Trash2 size={13} /> Delete
                            </button>
                          )}
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
    <form className="agent-editor-form" onSubmit={handleSubmit}>
      <div className="editor-header">
        <h4>{formData.isNew ? 'Create New Specialist' : `Edit Specialist: ${formData.name}`}</h4>
        <div className="template-picker">
          <span className="template-label">Preset Templates:</span>
          {PRESET_TEMPLATES.map(tmpl => (
            <button 
              key={tmpl.name} 
              type="button" 
              className="template-btn"
              onClick={() => onApplyTemplate(tmpl)}
            >
              + {tmpl.name}
            </button>
          ))}
        </div>
      </div>

      <div className="editor-grid">
        <div className="form-group">
          <label className="form-label">Agent Name (Identifier)</label>
          <input 
            type="text" 
            className="terminal-input"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            placeholder="e.g. CodeReviewer"
            required
          />
          <span className="form-hint">Used in LangGraph routing nodes and thinking tags.</span>
        </div>

        <div className="form-group">
          <label className="form-label">Specialist Role Title</label>
          <input 
            type="text" 
            className="terminal-input"
            value={formData.title}
            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            placeholder="e.g. Security & Vulnerability Auditor"
          />
        </div>
      </div>

      <div className="form-group">
        <label className="form-label">Supervisor Delegation Directive (Description)</label>
        <input 
          type="text" 
          className="terminal-input"
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          placeholder="When should the Supervisor delegate tasks to this specialist?"
        />
        <span className="form-hint">This description guides the Supervisor on when to delegate subtasks to this agent.</span>
      </div>

      <div className="form-group">
        <label className="form-label">System Instructions &amp; Persona Rules</label>
        <textarea 
          rows={6}
          className="terminal-textarea"
          value={formData.system_prompt}
          onChange={(e) => setFormData({ ...formData, system_prompt: e.target.value })}
          placeholder="Detailed instructions, coding guidelines, constraints, and format..."
        />
      </div>

      <div className="editor-grid">
        <div className="form-group">
          <label className="form-label">Dedicated Model</label>
          <select 
            className="terminal-select"
            value={formData.model || ''}
            onChange={(e) => setFormData({ ...formData, model: e.target.value })}
          >
            <option value="">Default (Follow Workspace Model)</option>
            {models.map(m => (
              <option key={m.id} value={m.id}>
                {m.name || m.id.split('/').pop()} ({m.tag || 'Fast'})
              </option>
            ))}
          </select>
        </div>

        <div className="form-group">
          <label className="form-label">Temperature: {formData.temperature}</label>
          <input 
            type="range" 
            min={0.0} 
            max={1.0} 
            step={0.05}
            value={formData.temperature}
            onChange={(e) => setFormData({ ...formData, temperature: parseFloat(e.target.value) })}
            className="temp-slider"
          />
        </div>
      </div>

      <div className="form-group">
        <label className="form-label">Permitted Capability Tools</label>
        <p className="form-hint" style={{ marginBottom: '10px' }}>
          Check which tools this specialist is allowed to run. Unchecked tools will be strictly prevented.
        </p>
        <div className="tools-checkbox-grid">
          {availableTools.map(t => {
            const isChecked = (formData.tools || []).includes(t.id);
            return (
              <div 
                key={t.id} 
                className={`tool-checkbox-card ${isChecked ? 'checked' : ''}`}
                onClick={() => toggleTool(t.id)}
              >
                <input 
                  type="checkbox" 
                  checked={isChecked} 
                  onChange={() => {}} 
                />
                <div className="tool-card-info">
                  <span className="tool-card-name">{t.name}</span>
                  <span className="tool-card-desc">{t.description}</span>
                </div>
                <span className={`tool-risk-tag ${t.risk}`}>{t.category}</span>
              </div>
            );
          })}
        </div>
      </div>

      <div className="editor-actions-row">
        <button type="button" className="btn-secondary" onClick={onCancel}>
          Cancel
        </button>
        <button type="submit" className="btn-primary">
          <Check size={16} /> Save Specialist
        </button>
      </div>
    </form>
  );
}

export default AgentWorkplaceModal;
