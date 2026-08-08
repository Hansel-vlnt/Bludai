import React from 'react';
import { Cpu, Plus, Power } from 'lucide-react';

const Sidebar = ({ sessions, currentThread, handleNewChat, loadSession, handleExit }) => {
  return (
    <div className="sidebar">
      <div className="sidebar-header">
        <Cpu size={24} color="#60a5fa" />
        <span className="logo-text">Bludai UI</span>
      </div>
      
      <button className="new-chat-btn" onClick={handleNewChat}>
        <Plus size={18} /> New Chat
      </button>
      
      <div className="sessions-list">
        {sessions.map(s => (
          <div 
            key={s.thread_id} 
            className={`session-item ${s.thread_id === currentThread ? 'active' : ''}`}
            onClick={() => loadSession(s.thread_id, s.mode)}
          >
            <div className="session-title">{s.title || "New Chat"}</div>
            <div className="session-meta">
              <span>{s.mode}</span>
              <span>{new Date(s.updated_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
            </div>
          </div>
        ))}
      </div>
      
      <div style={{ padding: '16px', borderTop: '1px solid var(--panel-border)' }}>
        <button 
          onClick={handleExit}
          style={{
            width: '100%', padding: '10px', background: 'rgba(239, 68, 68, 0.1)', 
            color: '#ef4444', border: '1px solid rgba(239, 68, 68, 0.3)', 
            borderRadius: '8px', cursor: 'pointer', display: 'flex', 
            alignItems: 'center', justifyContent: 'center', gap: '8px',
            transition: 'all 0.2s ease'
          }}
          onMouseOver={(e) => { e.currentTarget.style.background = 'rgba(239, 68, 68, 0.2)'; }}
          onMouseOut={(e) => { e.currentTarget.style.background = 'rgba(239, 68, 68, 0.1)'; }}
        >
          <Power size={18} /> Shutdown Bludai
        </button>
      </div>
    </div>
  );
};

export default Sidebar;
