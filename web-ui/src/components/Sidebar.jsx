import React from 'react';
import { Cpu, Plus, Power, Settings } from 'lucide-react';

const Sidebar = ({ sessions, currentThread, handleNewChat, loadSession, handleExit, setShowSettings, setShowWorkplace }) => {
  return (
    <div className="w-[280px] h-full border-r border-[#313244] flex flex-col bg-[#181825]">
      <div className="flex items-center gap-2 px-5 py-4 border-b border-[#313244] text-lg font-bold text-[#cba6f7]">
        <Cpu size={24} color="#cba6f7" />
        <span>Bludai UI</span>
      </div>
      
      <div className="px-3 mt-4">
        <button className="w-full flex items-center gap-2 px-3 py-2.5 text-sm font-semibold text-[#11111b] bg-[#cba6f7] rounded-lg hover:bg-[#b4befe] shadow-[0_0_15px_rgba(203,166,247,0.25)] transition-all" onClick={handleNewChat}>
          <Plus size={18} /> New Chat
        </button>
      </div>
      
      <div className="flex-1 overflow-y-auto px-3 py-3 space-y-1">
        {sessions.map(s => (
          <div 
            key={s.thread_id} 
            className={`w-full text-left px-3 py-2.5 text-sm rounded-lg cursor-pointer transition-colors truncate ${s.thread_id === currentThread ? 'bg-[#cba6f7]/15 text-[#cba6f7] border-l-2 border-[#cba6f7]' : 'text-[#a6adc8] hover:bg-[#313244]/50'}`}
            onClick={() => loadSession(s.thread_id)}
          >
            <div className="font-medium">{s.title || "New Chat"}</div>
            <div className="text-xs text-[#585b70] mt-1">
              <span>{new Date(s.updated_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
            </div>
          </div>
        ))}
      </div>
      
      <div className="border-t border-[#313244] p-3 space-y-1.5">
        <button 
          onClick={() => setShowWorkplace(true)}
          className="w-full flex items-center justify-center gap-2 px-3 py-2 text-sm font-semibold text-[#cdd6f4] bg-[#cba6f7]/15 border border-[#cba6f7]/30 rounded-lg hover:bg-[#cba6f7]/25 transition-all"
        >
          ⚡ Agent Workplace
        </button>
        <button 
          onClick={() => setShowSettings(true)}
          className="w-full flex items-center justify-center gap-2 px-3 py-2 text-sm text-[#a6adc8] border border-[#313244] rounded-lg hover:bg-[#313244]/40 hover:text-[#cdd6f4] transition-all"
        >
          <Settings size={18} /> Settings
        </button>
        <button 
          onClick={handleExit}
          className="w-full flex items-center justify-center gap-2 px-3 py-2 text-sm text-[#f38ba8] bg-[#f38ba8]/10 border border-[#f38ba8]/30 hover:bg-[#f38ba8]/20 transition-all"
        >
          <Power size={18} /> Shutdown Bludai
        </button>
      </div>
    </div>
  );
};

export default Sidebar;
