import React, { useMemo } from 'react';
import { ReactFlow, Background, Controls, Handle, Position, MarkerType } from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { Bot, Code, Terminal, ShieldCheck, Search, Wrench, Settings } from 'lucide-react';
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
          className={`relative inline-flex h-4 w-8 shrink-0 rounded-full border border-white/10 transition-colors duration-150 ease-in-out ${
            isFocusVisible ? 'ring-2 ring-zinc-400 ring-offset-1 ring-offset-[#18181b]' : ''
          } ${isSelected ? 'bg-[#cba6f7]' : 'bg-zinc-800'}`}
        >
          <span
            className={`pointer-events-none inline-block h-3 w-3 transform rounded-full transition duration-150 ease-in-out ${
              isSelected ? 'translate-x-4 bg-[#11111b]' : 'translate-x-0.5 bg-zinc-400'
            } mt-[1px]`}
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

const SupervisorNode = () => {
  return (
    <div className="bg-[#18181b] border border-white/10 rounded-xl p-3 min-w-[190px] shadow-lg shadow-black/40 text-center relative select-none">
      <div className="flex flex-col items-center gap-1.5">
        <div className="w-8 h-8 rounded-lg bg-zinc-900 border border-white/10 flex items-center justify-center text-zinc-200">
          <Bot size={16} />
        </div>
        <div className="font-semibold text-zinc-100 text-xs tracking-tight">Supervisor</div>
        <div className="text-[10px] text-neutral-400">Dynamic Orchestrator</div>
      </div>
      <Handle 
        type="source" 
        position={Position.Bottom} 
        className="!w-2 !h-2 !bg-zinc-500 !border !border-[#18181b] !-bottom-1" 
      />
    </div>
  );
};

const SpecialistNode = ({ data }) => {
  const { agent, handleToggleEnabled, handleEditAgent } = data;
  const IconComp = ICON_MAP[agent.icon] || Bot;
  
  return (
    <div 
      className={`group relative flex flex-col bg-[#18181b] border ${
        agent.enabled ? 'border-white/10' : 'border-white/5 opacity-60'
      } rounded-xl p-3 min-w-[260px] max-w-[280px] shadow-lg shadow-black/40 transition-all select-none`}
    >
      <Handle 
        type="target" 
        position={Position.Top} 
        className="!w-2 !h-2 !bg-zinc-500 !border !border-[#18181b] !-top-1" 
      />
      
      {/* Node Header: Avatar + Name + Toggle */}
      <div className="flex items-center justify-between gap-2.5 mb-2">
        <div className="flex items-center gap-2.5 min-w-0 flex-1">
          <div 
            className="flex items-center justify-center w-8 h-8 rounded-lg shrink-0 bg-zinc-900 border"
            style={{ 
              borderColor: agent.color ? `${agent.color}40` : 'rgba(255,255,255,0.1)',
              color: agent.color || '#e4e4e7',
            }}
          >
            <IconComp size={15} />
          </div>
          
          <div className="flex flex-col min-w-0 flex-1">
            <span className="text-xs font-semibold text-zinc-100 truncate tracking-tight">
              {agent.name}
            </span>
            <span className="text-[11px] text-neutral-400 truncate leading-tight">
              {agent.title || 'Specialist'}
            </span>
          </div>
        </div>

        <div onClick={(e) => e.stopPropagation()} className="shrink-0 flex items-center">
          <Toggle 
            isChecked={agent.enabled} 
            onChange={() => handleToggleEnabled(agent)} 
            label={agent.enabled ? `Disable ${agent.name}` : `Enable ${agent.name}`}
          />
        </div>
      </div>

      {/* Node Footer: Status + Tool Count + Configure */}
      <div className="flex items-center justify-between pt-2 border-t border-white/5 text-[11px]">
        <div className="flex items-center gap-1.5">
          <span 
            className="w-1.5 h-1.5 rounded-full shrink-0" 
            style={{ backgroundColor: agent.enabled ? '#22c55e' : '#71717a' }}
          />
          <span className="text-neutral-400 text-[10px]">
            {agent.enabled ? 'Active' : 'Standby'}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-[10px] text-neutral-400">
            {agent.tools ? `${agent.tools.length} tools` : '0 tools'}
          </span>
          <button 
            type="button"
            onClick={() => handleEditAgent(agent)}
            className="flex items-center gap-1 text-[10px] text-zinc-400 hover:text-zinc-200 p-1 hover:bg-white/5 rounded transition-colors"
            title="Configure specialist"
          >
            <Settings size={11} />
            <span>Config</span>
          </button>
        </div>
      </div>
    </div>
  );
};

const nodeTypes = {
  supervisor: SupervisorNode,
  specialist: SpecialistNode
};

export default function AgentWorkplaceGraph({ 
  agents, 
  handleToggleEnabled, 
  handleEditAgent 
}) {
  const nodes = useMemo(() => {
    const defaultNodes = [
      {
        id: 'supervisor',
        type: 'supervisor',
        position: { x: (agents.length * 310) / 2 - 95, y: 40 },
        data: { label: 'Supervisor' }
      }
    ];

    const specialistNodes = agents.map((agent, index) => ({
      id: agent.id || agent.name,
      type: 'specialist',
      position: { x: index * 310, y: 190 },
      data: { 
        agent, 
        handleToggleEnabled, 
        handleEditAgent
      }
    }));

    return [...defaultNodes, ...specialistNodes];
  }, [agents, handleToggleEnabled, handleEditAgent]);

  const edges = useMemo(() => {
    return agents.map((agent) => ({
      id: `e-supervisor-${agent.id || agent.name}`,
      source: 'supervisor',
      target: agent.id || agent.name,
      animated: agent.enabled,
      label: agent.enabled ? 'delegates / tool results' : 'inactive',
      style: { stroke: agent.enabled ? '#52525b' : '#27272a', strokeWidth: 1.5 },
      labelStyle: { fill: '#a1a1aa', fontSize: 10, fontWeight: 500 },
      labelBgStyle: { fill: '#18181b', stroke: 'rgba(255,255,255,0.08)', strokeWidth: 1, rx: 4, ry: 4 },
      markerEnd: {
        type: MarkerType.ArrowClosed,
        color: agent.enabled ? '#71717a' : '#3f3f46',
      }
    }));
  }, [agents]);

  return (
    <div className="w-full h-[520px] rounded-xl overflow-hidden border border-white/5 bg-[#141420]">
      <ReactFlow 
        key={agents.map(a => a.id || a.name).join('-') || 'empty'}
        nodes={nodes} 
        edges={edges} 
        nodeTypes={nodeTypes}
        fitView
        fitViewOptions={{ padding: 0.25 }}
        minZoom={0.3}
        maxZoom={1.2}
      >
        <Background color="#27272a" gap={20} size={1} />
        <Controls className="bg-[#18181b] border-white/10 fill-zinc-300 [&>button]:bg-[#18181b] [&>button]:border-white/10 [&>button]:fill-zinc-300" />
      </ReactFlow>
    </div>
  );
}
