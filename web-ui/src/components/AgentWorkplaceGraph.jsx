import React, { useState, useRef, useMemo, useEffect } from 'react';
import TerminalApprovalCard from './TerminalApprovalCard';
import { ZoomIn, ZoomOut, RotateCcw, ShieldCheck, GitBranch, Radio } from 'lucide-react';

const DEFAULT_AGENTS = [
  { id: 'developer', name: 'Developer', role: 'developer', enabled: true },
  { id: 'executor', name: 'Executor', role: 'executor', enabled: true },
  { id: 'code_reviewer', name: 'CodeReviewer', role: 'reviewer', enabled: true },
  { id: 'researcher', name: 'Researcher', role: 'search', enabled: true },
];

const normalize = (s) => (s || '').toLowerCase().replace(/[^a-z0-9]/g, '');

export default function AgentWorkplaceGraph({
  agents = [],
  handleToggleEnabled: _handleToggleEnabled,
  handleEditAgent,
  onSelectAgent,
  isExecuting = false,
  activeAgentId = null,
  activeAgentProgress = null,
  peerDelegation = null,
  liveStatus = '',
  liveTools = [],
  liveThoughts = [],
  pendingInterrupt = null,
  onRespondInterrupt = null,
}) {
  const onSelect = onSelectAgent || handleEditAgent;
  const containerRef = useRef(null);
  
  // Dimensions and interactive pan/zoom state
  const [dimensions, setDimensions] = useState({ width: 900, height: 540 });
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [isDragging, setIsDragging] = useState(false);
  const dragStartRef = useRef({ x: 0, y: 0 });

  // Interactive controls for testing & visualization
  const [simulatedInterrupt, setSimulatedInterrupt] = useState(null);
  const [demoP2P, setDemoP2P] = useState(false);

  // Dynamic set of specialist agents that have completed tasks in this session
  const [completedAgents, setCompletedAgents] = useState(() => new Set());
  const prevExecutingRef = useRef(false);

  // When a new execution run begins, reset the completed set
  useEffect(() => {
    if (isExecuting && !prevExecutingRef.current) {
      setCompletedAgents(new Set());
    }
    prevExecutingRef.current = isExecuting;
  }, [isExecuting]);

  // Record active specialist as completed once activated
  useEffect(() => {
    if (isExecuting && activeAgentId && activeAgentId !== 'Supervisor' && activeAgentId !== 'tools') {
      const targetNorm = normalize(activeAgentId);
      setCompletedAgents(prev => {
        if (prev.has(targetNorm)) return prev;
        const next = new Set(prev);
        next.add(targetNorm);
        return next;
      });
    }
  }, [isExecuting, activeAgentId]);

  // Approval data (real or simulated)
  const activeApproval = pendingInterrupt || simulatedInterrupt;

  // ResizeObserver for responsive graph sizing
  useEffect(() => {
    if (!containerRef.current) return;
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        if (width > 0 && height > 0) {
          setDimensions({ width, height });
        }
      }
    });
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  // Use provided agents or canonical constellation defaults
  const activeAgentList = useMemo(() => {
    const list = (agents && agents.length > 0) ? agents : DEFAULT_AGENTS;
    const target = normalize(activeAgentId);

    return list.map((a, idx) => {
      const id = a.id || a.name || `agent-${idx}`;
      const rawName = (a.name || id).toLowerCase();
      let role = a.role || a.title || 'specialist';
      
      // Clean up common verbose role titles to concise terminal domain tags
      if (role.toLowerCase().includes('developer') || id === 'developer') role = 'code';
      else if (role.toLowerCase().includes('terminal') || role.toLowerCase().includes('devops') || id === 'executor') role = 'terminal';
      else if (role.toLowerCase().includes('review') || role.toLowerCase().includes('auditor') || id.includes('reviewer')) role = 'review';
      else if (role.toLowerCase().includes('research') || id === 'researcher') role = 'search';

      // Robust normalized target matching for active execution
      const isTarget = Boolean(target) && target !== 'supervisor' && target !== 'tools' && (
        normalize(id) === target ||
        normalize(a.name) === target ||
        normalize(role) === target ||
        (target === 'reviewer' && normalize(id).includes('reviewer')) ||
        (target === 'code' && normalize(id).includes('developer'))
      );

      const isAct = isExecuting && isTarget;
      const isCompleted = completedAgents.has(normalize(id)) || completedAgents.has(normalize(a.name));

      let prog = 100;
      if (isAct) {
        prog = activeAgentProgress ?? 45;
      }

      return {
        ...a,
        id,
        displayName: rawName.startsWith('*') ? rawName.slice(1).trim() : rawName,
        displayRole: role,
        isActive: isAct,
        isCompleted: isCompleted,
        progress: prog,
        enabled: a.enabled !== false,
      };
    });
  }, [agents, activeAgentId, activeAgentProgress, isExecuting, completedAgents]);

  // Center Orchestrator coordinates (adjust upward when approval console is open)
  const center = useMemo(() => {
    return {
      x: dimensions.width / 2,
      y: dimensions.height / 2 - (activeApproval ? 65 : 12),
    };
  }, [dimensions, activeApproval]);

  // Dynamically calculate radial/orbital coordinates with safe boundary margins
  const specialistNodes = useMemo(() => {
    const count = activeAgentList.length;
    if (count === 0) return [];

    const maxRx = Math.max(70, (dimensions.width / 2) - 102);
    const rx = Math.min(Math.max(dimensions.width * 0.35, 110), Math.min(maxRx, 280));

    const maxRy = activeApproval
      ? Math.max(50, Math.min((dimensions.height / 2) - 110, 85))
      : Math.max(60, Math.min((dimensions.height / 2) - 75, 145));
    const ry = Math.min(Math.max(dimensions.height * 0.25, 60), maxRy);

    const canonical4Angles = [
      -Math.PI * 0.75, // Top-Left
      -Math.PI * 0.25, // Top-Right
      Math.PI * 0.25,  // Bottom-Right
      Math.PI * 0.75   // Bottom-Left
    ];

    const canonical6Angles = [
      -Math.PI * (2 / 3), // -120° (Top-Left)
      -Math.PI / 3,       // -60° (Top-Right)
      0,                  // 0° (Right)
      Math.PI / 3,        // 60° (Bottom-Right)
      Math.PI * (2 / 3),  // 120° (Bottom-Left)
      Math.PI             // 180° (Left)
    ];

    return activeAgentList.map((agent, i) => {
      let angle;
      if (count === 4) {
        angle = canonical4Angles[i];
      } else if (count === 6) {
        angle = canonical6Angles[i];
      } else {
        angle = -Math.PI * (2 / 3) + (i * 2 * Math.PI) / count;
      }

      const x = center.x + rx * Math.cos(angle);
      const y = center.y + ry * Math.sin(angle);

      return {
        ...agent,
        x,
        y,
        angle,
      };
    });
  }, [activeAgentList, center, dimensions, activeApproval]);

  // Active Peer-to-Peer delegation vector (Worker to Worker handoff)
  const peerDelegationVector = useMemo(() => {
    if (specialistNodes.length < 2) return null;

    let fromTarget = null;
    let toTarget = null;

    if (isExecuting && peerDelegation?.from && peerDelegation?.to) {
      fromTarget = normalize(peerDelegation.from);
      toTarget = normalize(peerDelegation.to);
    } else if (!isExecuting && demoP2P) {
      fromTarget = normalize(specialistNodes[Math.min(2, specialistNodes.length - 1)].id);
      toTarget = normalize(specialistNodes[0].id);
    }

    if (!fromTarget || !toTarget || fromTarget === toTarget) return null;

    const findNode = (t) => specialistNodes.find(n => 
      normalize(n.id) === t || 
      normalize(n.displayName) === t || 
      normalize(n.displayRole) === t ||
      (t === 'reviewer' && normalize(n.id).includes('reviewer')) ||
      (t === 'code' && normalize(n.id).includes('developer'))
    );

    const fromNode = findNode(fromTarget);
    const toNode = findNode(toTarget);

    if (!fromNode || !toNode || fromNode.id === toNode.id) return null;

    const midX = (fromNode.x + toNode.x) / 2;
    const midY = (fromNode.y + toNode.y) / 2;

    // Chord vector connecting fromNode to toNode
    const vx = toNode.x - fromNode.x;
    const vy = toNode.y - fromNode.y;
    const vLen = Math.hypot(vx, vy) || 1;

    // Normal vector perpendicular to chord
    let nx = -vy / vLen;
    let ny = vx / vLen;

    // Direct normal away from center
    const fromCenterDot = nx * (midX - center.x) + ny * (midY - center.y);
    if (fromCenterDot < -0.001) {
      nx = -nx;
      ny = -ny;
    } else if (Math.abs(fromCenterDot) <= 0.001) {
      // If chord passes directly through center, curve outward toward top
      if (ny > 0) {
        nx = -nx;
        ny = -ny;
      }
    }

    const arcHeight = Math.max(70, Math.min(130, vLen * 0.28));
    const ctrlX = midX + nx * arcHeight;
    const ctrlY = midY + ny * arcHeight;

    return {
      from: fromNode,
      to: toNode,
      path: `M ${fromNode.x} ${fromNode.y} Q ${ctrlX} ${ctrlY} ${toNode.x} ${toNode.y}`,
    };
  }, [specialistNodes, isExecuting, peerDelegation, demoP2P, center]);

  // Dynamic status bar ticker message
  const tickerMessage = useMemo(() => {
    if (isExecuting) {
      // 1. Actively running tool
      const runningTool = liveTools?.find(t => t.status?.includes('running'));
      if (runningTool) {
        return `[tool] ${runningTool.name} • running...`;
      }
      // 2. Recent thought streaming preview
      if (liveThoughts && liveThoughts.length > 0) {
        const lastThought = liveThoughts[liveThoughts.length - 1];
        if (lastThought?.content) {
          const preview = lastThought.content.trim().slice(-70).replace(/\s+/g, ' ');
          if (preview) {
            return `[${lastThought.agent || 'reasoning'}] ${preview}`;
          }
        }
      }
      // 3. Live supervisor / delegation status message
      if (liveStatus) {
        return liveStatus;
      }
      // 4. Completed tool if present
      if (liveTools && liveTools.length > 0) {
        const lastTool = liveTools[liveTools.length - 1];
        return `[tool] ${lastTool.name} • ${lastTool.status}`;
      }
      // 5. Active specialist fallback
      const activeSpecialist = activeAgentList.find(a => a.isActive);
      if (activeSpecialist) {
        return `[${activeSpecialist.displayName}] executing • telemetry active`;
      }
      return 'orchestrator coordinating task...';
    }
    return `${specialistNodes.filter(s => s.enabled).length} specialists standby • peer routing active • fleet ready`;
  }, [isExecuting, liveTools, liveStatus, liveThoughts, activeAgentList, specialistNodes]);

  // Mouse pan handlers
  const handleMouseDown = (e) => {
    if (e.target.closest('button') || e.target.closest('.interactive-node')) return;
    setIsDragging(true);
    dragStartRef.current = { x: e.clientX - pan.x, y: e.clientY - pan.y };
  };

  const handleMouseMove = (e) => {
    if (!isDragging) return;
    setPan({
      x: e.clientX - dragStartRef.current.x,
      y: e.clientY - dragStartRef.current.y,
    });
  };

  const handleMouseUp = () => setIsDragging(false);

  // Touch pan handlers
  const handleTouchStart = (e) => {
    if (e.target.closest('button') || e.target.closest('.interactive-node') || e.target.closest('.interactive-approval')) return;
    if (e.touches && e.touches.length === 1) {
      setIsDragging(true);
      dragStartRef.current = { x: e.touches[0].clientX - pan.x, y: e.touches[0].clientY - pan.y };
    }
  };

  const handleTouchMove = (e) => {
    if (!isDragging || !e.touches || e.touches.length !== 1) return;
    setPan({
      x: e.touches[0].clientX - dragStartRef.current.x,
      y: e.touches[0].clientY - dragStartRef.current.y,
    });
  };

  const handleTouchEnd = () => setIsDragging(false);

  const handleWheel = (e) => {
    if (e.target.closest('.interactive-approval')) return;
    e.preventDefault();
    const zoomFactor = e.deltaY < 0 ? 1.08 : 0.92;
    setZoom((prev) => Math.min(Math.max(prev * zoomFactor, 0.4), 1.8));
  };

  const resetView = () => {
    setPan({ x: 0, y: 0 });
    setZoom(1);
  };

  const handleApprovalResponse = async (result) => {
    if (pendingInterrupt && onRespondInterrupt) {
      await onRespondInterrupt(result);
    }
    setSimulatedInterrupt(null);
  };

  return (
    <div
      ref={containerRef}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onWheel={handleWheel}
      className="relative w-full h-full min-h-0 bg-[#0c0d12] overflow-hidden select-none cursor-grab active:cursor-grabbing font-mono"
    >
      {/* Top HUD Controls Strip */}
      <div className="absolute top-3 left-3 right-3 z-40 flex items-center justify-between gap-2 pointer-events-none">
        <div className="flex items-center gap-2 pointer-events-auto bg-[#14161d]/90 border border-white/10 rounded-lg px-2.5 py-1 text-[11px] backdrop-blur text-zinc-300 shrink-0">
          <span className="flex items-center gap-1.5 text-cyan-400 font-mono">
            <Radio size={12} className={isExecuting ? "animate-pulse text-amber-400 shrink-0" : "animate-pulse shrink-0"} />
            <span className="hidden sm:inline">fleet constellation</span>
            <span className="sm:hidden">mesh</span>
          </span>
          <span className="text-zinc-600">|</span>
          <span className="text-zinc-400 font-mono text-[10px] sm:text-[11px]">
            {specialistNodes.filter(s => s.enabled).length} active
          </span>
        </div>

        <div className="flex items-center gap-1.5 pointer-events-auto shrink-0">
          {/* Toggle P2P Vector visualizer */}
          <button
            type="button"
            onClick={() => setDemoP2P(prev => !prev)}
            className={`flex items-center gap-1.5 px-2 py-1 rounded-lg text-[10px] border transition-all cursor-pointer font-mono ${
              demoP2P || (isExecuting && peerDelegationVector)
                ? 'bg-amber-500/15 border-amber-500/40 text-amber-300' 
                : 'bg-[#14161d]/90 border-white/10 text-zinc-400 hover:text-zinc-200'
            }`}
            title="Toggle Peer-to-Peer Delegation Vector"
          >
            <GitBranch size={11} />
            <span className="hidden sm:inline">p2p vector</span>
            <span className="sm:hidden">p2p</span>
          </button>

          {/* Toggle Simulated Approval Modal for Testing */}
          <button
            type="button"
            onClick={() => {
              if (simulatedInterrupt) {
                setSimulatedInterrupt(null);
              } else {
                setSimulatedInterrupt({
                  type: 'terminal_approval',
                  agent: 'executor',
                  action: 'run shell command: npm test -- --coverage',
                  scope: 'sandbox: web-ui • non-destructive execution'
                });
              }
            }}
            className={`flex items-center gap-1.5 px-2 py-1 rounded-lg text-[10px] border transition-all cursor-pointer font-mono ${
              activeApproval 
                ? 'bg-amber-400/20 border-amber-400/50 text-amber-300' 
                : 'bg-[#14161d]/90 border-white/10 text-zinc-400 hover:text-zinc-200'
            }`}
            title="Toggle Inline Terminal Approval Interface"
          >
            <ShieldCheck size={11} />
            <span className="hidden sm:inline">{activeApproval ? 'close approval' : 'test approval'}</span>
            <span className="sm:hidden">{activeApproval ? 'close' : 'test'}</span>
          </button>

          {/* Zoom & Reset Controls */}
          <div className="flex items-center gap-0.5 bg-[#14161d]/90 border border-white/10 rounded-lg p-0.5 text-zinc-300">
            <button
              type="button"
              onClick={() => setZoom(prev => Math.min(prev * 1.15, 1.8))}
              className="p-1 hover:text-white hover:bg-white/5 rounded transition-colors cursor-pointer"
              title="Zoom In"
            >
              <ZoomIn size={12} />
            </button>
            <button
              type="button"
              onClick={() => setZoom(prev => Math.max(prev * 0.85, 0.4))}
              className="p-1 hover:text-white hover:bg-white/5 rounded transition-colors cursor-pointer"
              title="Zoom Out"
            >
              <ZoomOut size={12} />
            </button>
            <button
              type="button"
              onClick={resetView}
              className="px-1.5 py-0.5 text-[10px] hover:text-white hover:bg-white/5 rounded transition-colors cursor-pointer font-mono"
              title="Reset View"
            >
              <RotateCcw size={11} />
            </button>
          </div>
        </div>
      </div>

      {/* Main Pan/Zoom Canvas Viewport */}
      <div
        className="w-full h-full origin-center transition-transform duration-75"
        style={{
          transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
          transformOrigin: `${center.x}px ${center.y}px`,
        }}
      >
        {/* SVG Vector Connections Layer */}
        <svg
          className="absolute inset-0 w-full h-full pointer-events-none"
          style={{ overflow: 'visible' }}
        >
          <defs>
            <filter id="packet-glow-cyan" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="2.5" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>

            <filter id="packet-glow-amber" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="2.5" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>

            {/* Directional arrowhead for P2P delegation handoffs */}
            <marker
              id="p2p-arrow"
              viewBox="0 0 10 10"
              refX="8"
              refY="5"
              markerWidth="6"
              markerHeight="6"
              orient="auto-start-reverse"
            >
              <path d="M 0 1.5 L 8 5 L 0 8.5 z" fill="#f59e0b" />
            </marker>
          </defs>

          {/* Direct Peer-to-Peer Delegation Vector (Worker to Worker) */}
          {peerDelegationVector && (
            <g className="peer-vector">
              <path
                id="p2p-path"
                d={peerDelegationVector.path}
                fill="none"
                stroke="#eab308"
                strokeWidth="2"
                strokeDasharray="4 4"
                opacity="0.95"
                markerEnd="url(#p2p-arrow)"
              />
              <circle r="3.5" fill="#f59e0b" filter="url(#packet-glow-amber)">
                <animateMotion
                  dur="2.2s"
                  repeatCount="indefinite"
                  path={peerDelegationVector.path}
                />
              </circle>
            </g>
          )}

          {/* Orchestrator to Specialists Dotted Constellation Vectors */}
          {specialistNodes.map((node) => {
            const pathId = `vector-path-${node.id}`;
            const pathOut = `M ${center.x} ${center.y} L ${node.x} ${node.y}`;
            const pathIn = `M ${node.x} ${node.y} L ${center.x} ${center.y}`;
            const hasDataFlow = isExecuting && node.isActive && node.enabled;
            const packetColor = '#fb923c';
            const filterId = 'url(#packet-glow-amber)';

            return (
              <g key={node.id} className="constellation-edge">
                {/* Dotted vector path */}
                <path
                  id={pathId}
                  d={pathOut}
                  fill="none"
                  stroke={node.isActive ? '#eab308' : (node.enabled ? '#272b38' : '#181b24')}
                  strokeWidth={node.isActive ? '2' : '1.5'}
                  strokeDasharray={node.isActive ? '4 4' : '3 5'}
                  opacity={node.isActive ? '1' : '0.6'}
                  className="transition-all duration-300"
                />

                {/* Animated glowing packets traveling along vector path only during execution */}
                {hasDataFlow && (
                  <>
                    {/* Outbound Orchestrator -> Specialist */}
                    <circle r="3.5" fill={packetColor} filter={filterId}>
                      <animateMotion
                        dur="1.8s"
                        repeatCount="indefinite"
                        path={pathOut}
                      />
                    </circle>
                    {/* Inbound Specialist -> Orchestrator */}
                    <circle r="2.5" fill="#38bdf8" filter="url(#packet-glow-cyan)" opacity="0.8">
                      <animateMotion
                        dur="2.2s"
                        begin="0.7s"
                        repeatCount="indefinite"
                        path={pathIn}
                      />
                    </circle>
                  </>
                )}

                {/* Connection anchor dots at orchestrator boundary */}
                <circle
                  cx={center.x + 36 * Math.cos(node.angle)}
                  cy={center.y + 24 * Math.sin(node.angle)}
                  r="2"
                  fill={node.isActive ? '#fb923c' : (node.enabled ? '#475569' : '#1e293b')}
                />
              </g>
            );
          })}
        </svg>

        {/* HTML Layer: Center Orchestrator Node */}
        <div
          className="absolute transform -translate-x-1/2 -translate-y-1/2 z-30 select-none"
          style={{ left: `${center.x}px`, top: `${center.y}px` }}
        >
          <div className={`bg-[#121319] border ${
            isExecuting 
              ? 'border-cyan-400 bg-[#141824] shadow-cyan-500/20 ring-1 ring-cyan-400/40' 
              : 'border-zinc-700/70'
          } hover:border-cyan-500/50 rounded-xl px-4 py-2.5 shadow-2xl shadow-black/90 flex flex-col items-center gap-0.5 min-w-[165px] text-center transition-all cursor-default`}>
            {/* Header: ◆ orchestrator */}
            <div className="flex items-center gap-1.5 text-xs font-semibold tracking-wide">
              <span className="text-cyan-400 font-bold text-xs leading-none">◆</span>
              <span className="text-zinc-100 tracking-wide text-xs lowercase font-mono">orchestrator</span>
            </div>

            {/* Subtitle: you • N workers */}
            <div className="text-[11px] text-cyan-400 font-mono font-medium">
              you &bull; {specialistNodes.length} workers
            </div>

            {/* Status Pulse */}
            <div className="flex items-center gap-1.5 mt-0.5 text-[10px]">
              {isExecuting ? (
                <>
                  <span className="relative flex h-1.5 w-1.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75" />
                    <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-cyan-400" />
                  </span>
                  <span className="tracking-tight text-cyan-300 font-mono">
                    {activeAgentList.some(a => a.isActive)
                      ? `streaming to ${activeAgentList.find(a => a.isActive)?.displayName}`
                      : 'coordinating'}
                  </span>
                </>
              ) : (
                <>
                  <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-400" />
                  <span className="tracking-tight text-zinc-400 font-mono">standby</span>
                </>
              )}
            </div>
          </div>
        </div>

        {/* HTML Layer: Radial Specialist Nodes */}
        {specialistNodes.map((agent) => {
          return (
            <div
              key={agent.id}
              onClick={() => onSelect?.(agent)}
              className="interactive-node absolute transform -translate-x-1/2 -translate-y-1/2 z-30 select-none cursor-pointer group"
              style={{ left: `${agent.x}px`, top: `${agent.y}px` }}
              title={`Configure specialist: ${agent.displayName}`}
            >
              {/* Top header: * agent-name */}
              <div className="flex items-center gap-1.5 text-xs font-mono font-medium mb-1 px-1">
                <span className={`font-bold text-sm leading-none ${agent.isActive ? 'text-amber-400 animate-pulse' : 'text-[#ea7a52]'}`}>*</span>
                <span className={`tracking-tight lowercase font-mono transition-colors ${
                  agent.isActive ? 'text-amber-200 font-semibold' : 'text-zinc-200 group-hover:text-white'
                }`}>
                  {agent.displayName}
                </span>
              </div>

              {/* Specialist Terminal Card */}
              <div
                className={`bg-[#121319] border ${
                  agent.isActive
                    ? 'border-amber-400 bg-[#161824] shadow-amber-500/20 shadow-xl ring-1 ring-amber-400/40'
                    : agent.enabled
                    ? 'border-zinc-800/90 group-hover:border-zinc-600 group-hover:bg-[#151720]'
                    : 'border-zinc-800/40 opacity-50'
                } rounded-md px-3 py-2 min-w-[145px] max-w-[175px] shadow-lg shadow-black/80 transition-all flex items-center justify-between gap-3`}
              >
                {/* Role title */}
                <span className={`text-xs font-mono ${agent.isActive ? 'text-amber-200 font-semibold' : 'text-zinc-300'}`}>
                  {agent.displayRole}
                </span>

                {/* Dynamic Status Pill */}
                <div className="flex items-center text-xs font-mono shrink-0">
                  {agent.isActive ? (
                    <span className="text-amber-400 flex items-center gap-1 text-[11px] font-bold">
                      <span className="animate-pulse font-bold leading-none">:</span>
                      <span>{agent.progress}%</span>
                    </span>
                  ) : agent.isCompleted ? (
                    <span className="text-emerald-400 flex items-center gap-1 text-[11px]">
                      <span className="text-[12px] font-bold leading-none">✓</span>
                      <span>100%</span>
                    </span>
                  ) : (
                    <span className="text-zinc-500 text-[10px]">
                      {agent.enabled ? 'idle' : 'standby'}
                    </span>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Cyber-terminal status strip (Bottom Ticker) */}
      {!activeApproval && (
        <div className="absolute bottom-2.5 left-4 right-4 z-20 flex items-center justify-between text-[10px] text-zinc-400 pointer-events-none font-mono gap-3 bg-[#0d0e14]/90 border border-white/[0.08] rounded-md px-3 py-1.5 backdrop-blur-sm">
          <div className="flex items-center gap-2 min-w-0 truncate">
            <span className={`font-bold shrink-0 ${isExecuting ? 'text-amber-400 animate-pulse' : 'text-cyan-400/90'}`}>
              {isExecuting ? 'exec://stream' : 'fleet://mesh'}
            </span>
            <span className="text-zinc-600 shrink-0">&bull;</span>
            <span className="text-zinc-300 truncate">
              {tickerMessage}
            </span>
          </div>
          <div className="text-zinc-400 hidden sm:flex items-center gap-1.5 shrink-0">
            <span className={`w-1.5 h-1.5 rounded-full ${isExecuting ? 'bg-amber-400 animate-ping' : 'bg-emerald-500/80 animate-pulse'}`} />
            <span>{isExecuting ? 'live execution' : 'fleet online'}</span>
          </div>
        </div>
      )}

      {/* Inline Permission & Approval Terminal (Anchored at the bottom of the canvas) */}
      {activeApproval && (
        <div className="interactive-approval absolute bottom-2.5 left-1/2 -translate-x-1/2 w-[94%] max-w-[740px] z-50 animate-in fade-in slide-in-from-bottom-2 duration-200">
          <TerminalApprovalCard
            interruptData={activeApproval}
            onRespond={handleApprovalResponse}
            onClose={() => setSimulatedInterrupt(null)}
          />
        </div>
      )}
    </div>
  );
}
