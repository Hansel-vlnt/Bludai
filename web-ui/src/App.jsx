import React, { useState, useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import { Send, Bot, User, Cpu } from 'lucide-react';
import Sidebar from './components/Sidebar';
import ModelSelector from './components/ModelSelector';
import TemperatureSlider from './components/TemperatureSlider';
import SettingsModal from './components/SettingsModal';
import './index.css';

const API_BASE = 'http://localhost:8000/api';

function App() {
  const [sessions, setSessions] = useState([]);
  const [currentThread, setCurrentThread] = useState(null);
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [mode, setMode] = useState('role');
  const [showSettings, setShowSettings] = useState(false);
  const [selectedModel, setSelectedModel] = useState('meta-llama/llama-3-8b-instruct:free');
  const [temperature, setTemperature] = useState(0.5);
  const [availableModels, setAvailableModels] = useState([
    { id: 'meta-llama/llama-3-8b-instruct:free', name: 'Llama 3 8B (Free)', tag: 'Fast' }
  ]);
  const chatRef = useRef(null);
  
  useEffect(() => {
    fetchSessions();
    fetchModels();
  }, []);

  useEffect(() => {
    if (chatRef.current) {
      chatRef.current.scrollTop = chatRef.current.scrollHeight;
    }
  }, [messages, isTyping]);

  const fetchModels = async () => {
    try {
      const res = await fetch(`${API_BASE}/models`);
      const data = await res.json();
      if (data && data.data) {
        const mappedModels = data.data.map(m => ({
          id: m.id,
          name: m.id.split('/').pop(),
          tag: (m.id.includes('pro') || m.id.includes('opus') || m.id.includes('high')) ? 'High' : 'Fast'
        }));
        setAvailableModels(mappedModels);
        if (mappedModels.length > 0 && !mappedModels.find(m => m.id === selectedModel)) {
          setSelectedModel(mappedModels[0].id);
        }
      }
    } catch (err) {
      console.error("Failed to fetch models", err);
    }
  };

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
          mode: mode,
          basic_model: selectedModel,
          temperature: temperature
        })
      });
      const data = await res.json();
      setMessages(prev => [...prev, { 
        role: data.role || 'assistant', 
        content: data.reply,
        tokens: data.tokens 
      }]);
      fetchSessions();
    } catch (err) {
      console.error("Chat error:", err);
      setMessages(prev => [...prev, { role: 'system', content: 'Connection error to backend.' }]);
    } finally {
      setIsTyping(false);
    }
  };

  const handleExit = async () => {
    if (window.confirm("Are you sure you want to shut down the Bludai ecosystem?")) {
      try {
        await fetch(`${API_BASE}/shutdown`, { method: 'POST' });
        document.body.innerHTML = '<div style="display:flex;height:100vh;align-items:center;justify-content:center;color:white;font-family:sans-serif;font-size:24px;">Bludai Ecosystem has been shut down. You can close this tab.</div>';
      } catch (err) {
        console.error("Failed to shutdown", err);
      }
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
      {showSettings && <SettingsModal onClose={() => setShowSettings(false)} />}
      
      <Sidebar 
        sessions={sessions} 
        currentThread={currentThread} 
        handleNewChat={handleNewChat} 
        loadSession={loadSession} 
        handleExit={handleExit} 
        setShowSettings={setShowSettings}
      />

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
                {msg.tokens && msg.tokens.total > 0 && (
                  <div className="token-tracker">
                    <span className="token-main"><Cpu size={12}/> Tokens: {msg.tokens.total.toLocaleString()}</span>
                    <span className="token-details">[In: {msg.tokens.input.toLocaleString()} | Out: {msg.tokens.output.toLocaleString()}]</span>
                  </div>
                )}
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
          <div className="controls-row" style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
            {mode === 'basic' && (
              <ModelSelector 
                selectedModel={selectedModel}
                setSelectedModel={setSelectedModel}
                availableModels={availableModels}
              />
            )}
            <TemperatureSlider temperature={temperature} setTemperature={setTemperature} />
          </div>
          
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
