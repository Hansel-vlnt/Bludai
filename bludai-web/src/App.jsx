import React, { useState, useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import { Send, Plus, Bot, User, Menu, Cpu } from 'lucide-react';
import './index.css';

const API_BASE = 'http://localhost:8000/api';

function App() {
  const [sessions, setSessions] = useState([]);
  const [currentThread, setCurrentThread] = useState(null);
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [mode, setMode] = useState('role'); // 'role' or 'basic'
  const chatRef = useRef(null);
  
  useEffect(() => {
    fetchSessions();
  }, []);

  useEffect(() => {
    if (chatRef.current) {
      chatRef.current.scrollTop = chatRef.current.scrollHeight;
    }
  }, [messages, isTyping]);

  const fetchSessions = async () => {
    try {
      const res = await fetch(`${API_BASE}/sessions`);
      const data = await res.json();
      setSessions(data);
    } catch (err) {
      console.error("Failed to fetch sessions", err);
    }
  };

  const loadSession = async (threadId, sessionMode) => {
    setCurrentThread(threadId);
    if(sessionMode) setMode(sessionMode);
    
    try {
      const res = await fetch(`${API_BASE}/sessions/${threadId}/history`);
      const data = await res.json();
      setMessages(data.messages || []);
    } catch (err) {
      console.error("Failed to fetch session history", err);
    }
  };

  const handleNewChat = () => {
    // Generate simple random thread_id (in a real app, use uuid)
    const newThread = Math.random().toString(36).substring(2, 15);
    setCurrentThread(newThread);
    setMessages([]);
  };

  const sendMessage = async () => {
    if (!inputText.trim()) return;
    
    const thread_id = currentThread || Math.random().toString(36).substring(2, 15);
    if(!currentThread) setCurrentThread(thread_id);

    const newMsg = { role: 'user', content: inputText };
    setMessages(prev => [...prev, newMsg]);
    const currentInput = inputText;
    setInputText('');
    setIsTyping(true);

    try {
      const res = await fetch(`${API_BASE}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          thread_id: thread_id,
          message: currentInput,
          mode: mode
        })
      });
      const data = await res.json();
      setMessages(prev => [...prev, { role: data.role || 'assistant', content: data.reply }]);
      fetchSessions(); // refresh history
    } catch (err) {
      console.error("Chat error:", err);
      setMessages(prev => [...prev, { role: 'system', content: 'Connection error to backend.' }]);
    } finally {
      setIsTyping(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <div className="app-container">
      {/* Sidebar */}
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
      </div>

      {/* Main Area */}
      <div className="main-area">
        <div className="topbar">
          <div className="mode-selector">
            <button 
              className={`mode-btn ${mode === 'role' ? 'active' : ''}`}
              onClick={() => setMode('role')}
            >
              Role Mode (Agents)
            </button>
            <button 
              className={`mode-btn ${mode === 'basic' ? 'active' : ''}`}
              onClick={() => setMode('basic')}
            >
              Basic Mode
            </button>
          </div>
        </div>

        <div className="chat-container" ref={chatRef}>
          {messages.length === 0 && (
            <div style={{margin: 'auto', textAlign: 'center', opacity: 0.5}}>
              <Cpu size={48} style={{marginBottom: 16}} />
              <h2>How can I help you today?</h2>
              <p>Type a message to start communicating with Bludai.</p>
            </div>
          )}
          
          {messages.map((msg, i) => (
            <div key={i} className={`message-wrapper ${msg.role === 'user' ? 'user' : 'ai'}`}>
              <div className="message-sender">
                {msg.role === 'user' ? <User size={14} /> : <Bot size={14} />}
                {msg.role === 'user' ? 'You' : 'Bludai'}
              </div>
              <div className="message-bubble">
                <ReactMarkdown>{msg.content}</ReactMarkdown>
              </div>
            </div>
          ))}
          
          {isTyping && (
            <div className="message-wrapper ai">
              <div className="message-sender"><Bot size={14} /> Bludai</div>
              <div className="message-bubble" style={{opacity: 0.7}}>
                Thinking...
              </div>
            </div>
          )}
        </div>

        <div className="input-area">
          <div className="input-box glass-panel">
            <textarea
              placeholder="Message Bludai..."
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={handleKeyDown}
              rows={1}
            />
            <button 
              className="send-btn" 
              onClick={sendMessage}
              disabled={!inputText.trim() || isTyping}
            >
              <Send size={18} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
