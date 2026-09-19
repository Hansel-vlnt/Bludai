import React from 'react';
import { Cpu, Plus, Power, Settings } from 'lucide-react';

const Sidebar = ({ sessions, currentThread, handleNewChat, loadSession, handleExit, setShowSettings, setShowWorkplace }) => {
  return (
    <div className="w-[280px] h-full border-r border-gray-800 flex flex-col bg-[rgba(11,15,25,0.8)]">
      <div className="flex items-center gap-2 px-5 py-4 border-b border-gray-800/60 text-lg font-bold text-cyan-400">
        <Cpu size={24} color="#60a5fa" />
        <span>Bludai UI</span>
      </div>
      
      <div className="px-3 mt-4">
        <button className="w-full flex items-center gap-2 px-3 py-2.5 text-sm font-semibold text-black bg-cyan-400 rounded-lg hover:bg-cyan-300 shadow-[0_0_10px_rgba(0,229,255,0.2)] transition-all" onClick={handleNewChat}>
          <Plus size={18} /> New Chat
        </button>
      </div>
      
      <div className="flex-1 overflow-y-auto px-3 py-3 space-y-1">
        {sessions.map(s => (
          <div 
            key={s.thread_id} 
            className={`w-full text-left px-3 py-2.5 text-sm rounded-lg cursor-pointer transition-colors truncate ${s.thread_id === currentThread ? 'bg-cyan-950/20 text-cyan-400 border-l-2 border-cyan-400' : 'text-gray-400 hover:bg-gray-800/50'}`}
            onClick={() => loadSession(s.thread_id)}
          >
            <div className="font-medium">{s.title || "New Chat"}</div>
            <div className="text-xs text-gray-500 mt-1">
              <span>{new Date(s.updated_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
            </div>
          </div>
        ))}
      </div>
      
      <div className="border-t border-gray-800/60 p-3 space-y-1.5">
        <button 
          onClick={() => setShowWorkplace(true)}
          className="w-full flex items-center justify-center gap-2 px-3 py-2 text-sm font-semibold text-gray-300 bg-cyan-400/10 border border-cyan-400/30 rounded-lg hover:bg-cyan-400/20 transition-all"
        >
          ⚡ Agent Workplace
        </button>
        <button 
          onClick={() => setShowSettings(true)}
          className="w-full flex items-center justify-center gap-2 px-3 py-2 text-sm text-gray-400 border border-gray-800 rounded-lg hover:bg-white/5 transition-all"
        >
          <Settings size={18} /> Settings
        </button>
        <button 
          onClick={handleExit}
          className="w-full flex items-center justify-center gap-2 px-3 py-2 text-sm text-red-500 bg-red-500/10 border border-red-500/30 hover:bg-red-500/20 transition-all"
        >
          <Power size={18} /> Shutdown Bludai
        </button>
      </div>
    </div>
  );
};

export default Sidebar;
