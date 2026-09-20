import React, { useMemo, useCallback } from 'react';
import { ReactFlow, Background, Controls, Handle, Position, MarkerType } from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { Bot, Code, Terminal, ShieldCheck, Search, Wrench, Cpu, Sliders, MoreVertical, Edit2, Trash2, Copy } from 'lucide-react';
import { Dropdown, DropdownTrigger, DropdownPopover, DropdownItem, DropdownDivider } from '@/components/base/dropdown/dropdown';
import ModelSelector from './ModelSelector';
import { Switch as AriaSwitch } from 'react-aria-components';

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
          } ${isSelected ? 'bg-[#cba6f7]' : 'bg-[#313244]'}`}
        >
          <span
            className={`pointer-events-none inline-block h-5 w-5 transform rounded-full shadow-md transition duration-200 ease-in-out ${
              isSelected ? 'translate-x-5 bg-[#141420]' : 'translate-x-0 bg-[#cdd6f4]'
            }`}
          />
        </span>
      )}
    </AriaSwitch>
  );
}

const ICON_MAP = {
  'Code': Code,
  'Terminal': Terminal,
  'ShieldCheck': ShieldCheck,
  'Search': Search,
  'Bot': Bot
};

const SupervisorNode = ({ data }) => {
  return (
    <div className="bg-[#222336] border border-[#cba6f7] rounded-2xl p-5 min-w-[220px] shadow-lg shadow-black/40 text-center relative">
      <div className="flex flex-col items-center gap-2">
        <div className="w-10 h-10 rounded-full bg-[#141420] border-2 border-[#cba6f7] flex items-center justify-center text-[#cba6f7]">
          <Bot size={20} />
        </div>
        <div className="font-bold text-[#cdd6f4] text-lg">Supervisor</div>
        <div className="text-xs text-[#a6adc8]">Orchestrator</div>
      </div>
      <Handle type="source" position={Position.Bottom} className="w-3 h-3 bg-[#cba6f7] border-2 border-[#161622] rounded-full" />
    </div>
  );
};

const SpecialistNode = ({ data }) => {
  const { agent, models, handleToggleEnabled, handleQuickModelChange, handleEditAgent, handleDeleteAgent, handleDuplicateAgent } = data;
  const IconComp = ICON_MAP[agent.icon] || Bot;
  
  return (
    <div className={`relative flex flex-col bg-[#222336] border ${agent.enabled ? 'border-[#383a54]' : 'border-[#2d2e42] opacity-80'} rounded-2xl overflow-hidden shadow-lg shadow-black/40 min-w-[320px] max-w-[320px]`}>
      <Handle type="target" position={Position.Top} className="w-3 h-3 bg-[#cba6f7] border-2 border-[#161622] rounded-full" />
      
      <div className="p-5 flex-1 flex flex-col">
        <div className="flex justify-between items-start mb-4">
          <div className="flex items-center gap-3 min-w-0 flex-1 mr-2">
            {/* Avatar ring: strictly on neutral surface with specialist color border */}
            <div 
              className="flex items-center justify-center w-10 h-10 rounded-xl shrink-0 bg-[#141420]" 
              style={{ 
                border: `1.5px solid ${agent.color || '#cba6f7'}`,
                color: agent.color || '#cba6f7',
              }}
            >
              <IconComp size={18} />
            </div>
            <div className="flex flex-col min-w-0 flex-1">
              <div className="flex items-center gap-2">
                {/* Status dot: paired with text label */}
                <span 
                  className="w-2.5 h-2.5 rounded-full shrink-0" 
                  style={{ 
                    backgroundColor: agent.enabled ? (agent.color || '#cba6f7') : '#585b70',
                    boxShadow: agent.enabled ? `0 0 6px ${agent.color || '#cba6f7'}80` : 'none'
                  }}
                />
                <span className="text-[14px] font-bold text-[#cdd6f4] tracking-tight truncate">{agent.name}</span>
                <span className={`text-[9px] font-semibold uppercase px-1.5 py-0.5 rounded-full border shrink-0 ${
                  agent.enabled 
                    ? 'bg-[#a6e3a1]/15 text-[#a6e3a1] border-[#a6e3a1]/30' 
                    : 'bg-[#585b70]/20 text-[#6c7086] border-[#585b70]/30'
                }`}>
                  {agent.enabled ? 'Active' : 'Standby'}
                </span>
              </div>
              
              {/* Telemetry pill: specialist color strictly paired with role label, truncating cleanly */}
              <div className="mt-1">
                <span 
                  className="inline-block max-w-[170px] truncate text-[10px] font-semibold uppercase px-2 py-0.5 rounded-md border align-middle"
                  style={{ 
                    borderColor: `${agent.color || '#cba6f7'}40`, 
                    color: agent.color || '#cba6f7', 
                    backgroundColor: `${agent.color || '#cba6f7'}15` 
                  }}
                  title={agent.title || 'Specialist'}
                >
                  {agent.title || 'Specialist'}
                </span>
              </div>
            </div>
          </div>
          
          {/* Interactive Toggle: single #cba6f7 accent */}
          <Toggle 
            isChecked={agent.enabled} 
            onChange={() => handleToggleEnabled(agent)} 
            label={agent.enabled ? `Disable ${agent.name}` : `Enable ${agent.name}`}
          />
        </div>

        <div className="flex items-center justify-between mb-3 bg-[#141420] rounded-xl px-3 py-2 border border-[#2d2e42]">
          <div className="flex items-center gap-1.5">
            <Cpu size={12} className="text-[#a6adc8]" />
            <span className="text-[10px] font-semibold text-[#a6adc8] uppercase tracking-wider">Model</span>
          </div>
          <div className="scale-[0.85] origin-right w-[140px]">
            <ModelSelector
              selectedModel={agent.model}
              setSelectedModel={(val) => handleQuickModelChange(agent, val)}
              availableModels={models}
              label=""
              allowDefault={true}
              defaultLabel="Default Model"
            />
          </div>
        </div>

        <div className="flex items-center justify-between mt-auto">
          <div className="flex items-center gap-1.5">
            <Wrench size={12} className="text-[#a6adc8]" />
            <span className="text-[10px] font-semibold text-[#a6adc8] uppercase tracking-wider">
              Tools ({agent.tools ? agent.tools.length : 0})
            </span>
          </div>
          
          <Dropdown>
            <DropdownTrigger className="p-1.5 text-[#a6adc8] hover:text-[#cba6f7] hover:bg-[#313244] rounded-lg transition-colors focus-visible:ring-2 focus-visible:ring-[#cba6f7] outline-none">
              <Sliders size={14} />
            </DropdownTrigger>
            <DropdownPopover className="w-40 bg-[#222336] border border-[#383a54] shadow-xl shadow-black/60 rounded-xl">
              <DropdownItem onAction={() => handleEditAgent(agent)}>
                <Edit2 size={14} className="text-[#cba6f7]" /> Edit config
              </DropdownItem>
              <DropdownItem onAction={() => handleDuplicateAgent(agent)}>
                <Copy size={14} className="text-[#cdd6f4]" /> Duplicate
              </DropdownItem>
              {agent.is_custom && (
                <>
                  <DropdownDivider />
                  <DropdownItem onAction={() => handleDeleteAgent(agent)}>
                    <Trash2 size={14} className="text-[#f38ba8]" /> Delete
                  </DropdownItem>
                </>
              )}
            </DropdownPopover>
          </Dropdown>
        </div>
      </div>
    </div>
  );
};

const nodeTypes = {
  supervisor: SupervisorNode,
  specialist: SpecialistNode
};

export default function AgentWorkplaceGraph({ agents, models, handleToggleEnabled, handleQuickModelChange, handleEditAgent, handleDeleteAgent, handleDuplicateAgent }) {
  const nodes = useMemo(() => {
    const defaultNodes = [
      {
        id: 'supervisor',
        type: 'supervisor',
        position: { x: (agents.length * 350) / 2 - 100, y: 50 },
        data: { label: 'Supervisor' }
      }
    ];

    const specialistNodes = agents.map((agent, index) => ({
      id: agent.id || agent.name,
      type: 'specialist',
      position: { x: index * 350, y: 250 },
      data: { 
        agent, 
        models, 
        handleToggleEnabled, 
        handleQuickModelChange, 
        handleEditAgent, 
        handleDeleteAgent, 
        handleDuplicateAgent 
      }
    }));

    return [...defaultNodes, ...specialistNodes];
  }, [agents, models, handleToggleEnabled, handleQuickModelChange, handleEditAgent, handleDeleteAgent, handleDuplicateAgent]);

  const edges = useMemo(() => {
    return agents.map((agent) => ({
      id: `e-supervisor-${agent.id || agent.name}`,
      source: 'supervisor',
      target: agent.id || agent.name,
      animated: agent.enabled,
      label: agent.enabled ? 'delegates / tool results' : 'inactive',
      style: { stroke: agent.enabled ? '#cba6f7' : '#45475a', strokeWidth: 2 },
      labelStyle: { fill: agent.enabled ? '#a6adc8' : '#45475a', fontSize: 10, fontWeight: 600 },
      labelBgStyle: { fill: '#1e1e2e', stroke: '#313244', strokeWidth: 1, rx: 4, ry: 4 },
      markerEnd: {
        type: MarkerType.ArrowClosed,
        color: agent.enabled ? '#cba6f7' : '#45475a',
      }
    }));
  }, [agents]);

  return (
    <div style={{ width: '100%', height: '550px' }} className="rounded-2xl overflow-hidden border border-[#2d2e42] bg-[#11111b] mt-4">
      <ReactFlow 
        nodes={nodes} 
        edges={edges} 
        nodeTypes={nodeTypes}
        fitView
        fitViewOptions={{ padding: 0.2 }}
        minZoom={0.5}
        maxZoom={1.5}
      >
        <Background color="#313244" gap={16} size={1} />
        <Controls className="bg-[#1e1e2e] border-[#313244] fill-[#cdd6f4]" />
      </ReactFlow>
    </div>
  );
}
