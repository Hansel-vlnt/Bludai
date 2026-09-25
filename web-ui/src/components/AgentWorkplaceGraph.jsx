import React, { useMemo } from 'react';
import { ReactFlow, Background, Controls, Handle, Position, MarkerType } from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { Bot, Code, Terminal, ShieldCheck, Search, Settings } from 'lucide-react';

const ICON_MAP = {
  'Code': Code,
  'Terminal': Terminal,
  'ShieldCheck': ShieldCheck,
  'Search': Search,
  'Bot': Bot
};

const SupervisorNode = () => {
  return (
    <div className="bg-[#14161d] border border-white/[0.08] rounded-xl p-3 min-w-[200px] shadow-lg shadow-black/40 text-center relative select-none">
      <div className="flex flex-col items-center gap-1.5">
        <div className="w-8 h-8 rounded-lg bg-[#0d0e12] border border-white/[0.08] flex items-center justify-center text-zinc-200">
          <Bot size={16} />
        </div>
        <div className="font-semibold text-zinc-100 text-xs tracking-tight">Supervisor</div>
        <div className="text-[10px] text-zinc-400">Dynamic Orchestrator</div>
      </div>
      <Handle 
        type="source" 
        position={Position.Bottom} 
        className="!w-2 !h-2 !bg-zinc-500 !border !border-[#14161d] !-bottom-1" 
      />
    </div>
  );
};

const SpecialistNode = ({ data }) => {
  const { agent, onSelectAgent, handleEditAgent } = data;
  const onSelect = onSelectAgent || handleEditAgent;
  const IconComp = ICON_MAP[agent.icon] || Bot;
  
  return (
    <div 
      onClick={() => onSelect?.(agent)}
      className={`group relative flex flex-col bg-[#14161d] border ${
        agent.enabled ? 'border-white/[0.08] hover:border-white/20' : 'border-white/[0.04] opacity-60 hover:opacity-80'
      } rounded-xl p-3 min-w-[260px] max-w-[280px] shadow-lg shadow-black/40 transition-all select-none cursor-pointer hover:-translate-y-0.5`}
    >
      <Handle 
        type="target" 
        position={Position.Top} 
        className="!w-2 !h-2 !bg-zinc-500 !border !border-[#14161d] !-top-1" 
      />
      
      {/* Node Header: Status Ping Indicator + Config Action */}
      <div className="flex items-center justify-between gap-2 mb-2">
        <div className="flex items-center gap-1.5">
          <span className="relative flex h-2 w-2 shrink-0">
            {agent.enabled && (
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
            )}
            <span className={`relative inline-flex rounded-full h-2 w-2 ${agent.enabled ? 'bg-emerald-400' : 'bg-zinc-500'}`} />
          </span>
          <span className={`text-[10px] font-medium uppercase tracking-wider ${agent.enabled ? 'text-emerald-400' : 'text-zinc-500'}`}>
            {agent.enabled ? 'Active' : 'Standby'}
          </span>
        </div>

        <button 
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onSelect?.(agent);
          }}
          className="nodrag flex items-center gap-1 text-[10px] text-zinc-400 hover:text-zinc-200 px-2 py-0.5 hover:bg-white/5 rounded transition-colors border border-transparent hover:border-white/[0.08] cursor-pointer"
          title="Configure specialist"
          aria-label="Configure"
        >
          <Settings size={11} />
          <span>Configure</span>
        </button>
      </div>

      {/* Node Body: Specialist Icon & Role Title */}
      <div className="flex items-center gap-2.5 mb-2.5">
        <div 
          className="flex items-center justify-center w-8 h-8 rounded-lg shrink-0 bg-[#0d0e12] border border-white/[0.08]"
          style={{ color: agent.color || '#94a3b8' }}
        >
          <IconComp size={16} />
        </div>
        
        <div className="flex flex-col min-w-0 flex-1">
          <span className="text-xs font-semibold text-zinc-100 truncate tracking-tight">
            {agent.name}
          </span>
          <span className="text-[11px] text-zinc-400 truncate leading-tight">
            {agent.title || 'Specialist'}
          </span>
        </div>
      </div>

      {/* Node Footer: Assigned Model Pill + Active Tool Count Pill */}
      <div className="flex items-center justify-between pt-2 border-t border-white/[0.08] text-[10px]">
        <span 
          className="font-mono text-zinc-300 bg-white/[0.05] border border-white/[0.08] px-2 py-0.5 rounded truncate max-w-[150px]"
          title={agent.model || 'Workspace Default'}
        >
          {agent.model || 'Default Model'}
        </span>

        <span className="font-mono text-zinc-400 bg-white/[0.05] border border-white/[0.08] px-2 py-0.5 rounded shrink-0">
          {agent.tools ? `${agent.tools.length} tools` : '0 tools'}
        </span>
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
  handleEditAgent,
  onSelectAgent
}) {
  const onSelect = onSelectAgent || handleEditAgent;

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
        handleEditAgent: onSelect,
        onSelectAgent: onSelect
      }
    }));

    return [...defaultNodes, ...specialistNodes];
  }, [agents, handleToggleEnabled, onSelect]);

  const edges = useMemo(() => {
    return agents.map((agent) => ({
      id: `e-supervisor-${agent.id || agent.name}`,
      source: 'supervisor',
      target: agent.id || agent.name,
      animated: agent.enabled,
      label: agent.enabled ? 'delegates / tool results' : 'inactive',
      style: { stroke: agent.enabled ? '#475569' : '#27272a', strokeWidth: 1.5 },
      labelStyle: { fill: '#94a3b8', fontSize: 10, fontWeight: 500 },
      labelBgStyle: { fill: '#14161d', stroke: 'rgba(255,255,255,0.08)', strokeWidth: 1, rx: 4, ry: 4 },
      markerEnd: {
        type: MarkerType.ArrowClosed,
        color: agent.enabled ? '#64748b' : '#334155',
      }
    }));
  }, [agents]);

  return (
    <div className="w-full h-full min-h-[480px] rounded-xl overflow-hidden border border-white/[0.08] bg-[#0d0e12]">
      <ReactFlow 
        key={agents.map(a => a.id || a.name).join('-') || 'empty'}
        nodes={nodes} 
        edges={edges} 
        nodeTypes={nodeTypes}
        onNodeClick={(_event, node) => {
          if (node.data?.agent && onSelect) {
            onSelect(node.data.agent);
          }
        }}
        fitView
        fitViewOptions={{ padding: 0.25 }}
        minZoom={0.3}
        maxZoom={1.2}
      >
        <Background color="#1e212b" gap={20} size={1} />
        <Controls className="bg-[#14161d] border-white/[0.08] fill-zinc-300 [&>button]:bg-[#14161d] [&>button]:border-white/[0.08] [&>button]:fill-zinc-300" />
      </ReactFlow>
    </div>
  );
}
