import React, { useState, useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import { Send, Bot, User, Cpu } from 'lucide-react';
import Sidebar from './components/Sidebar';
import ModelSelector from './components/ModelSelector';
import TemperatureSlider from './components/TemperatureSlider';
import SettingsModal from './components/SettingsModal';
import ThinkingBlock from './components/ThinkingBlock';
import ThinkingIndicator from './components/ThinkingIndicator';
import { extractThinking } from './utils/thinkingParser';
import './index.css';

const API_BASE = 'http://localhost:8000/api';

function App() {
  const [sessions, setSessions] = useState([]);
  const [currentThread, setCurrentThread] = useState(null);
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [mode, setMode] = useState('role');
  const [showSettings, setShowSettings] = useState(false);
  const [selectedModel, setSelectedModel] = useState('');
  const [temperature, setTemperature] = useState(0.5);
  const [availableModels, setAvailableModels] = useState([]);
  const [isRefreshingModels, setIsRefreshingModels] = useState(false);
  const chatRef = useRef(null);
  const timerRef = useRef(null);
  
  useEffect(() => {
    const init = async () => {
      await fetchSettings();
      await fetchModels();
      fetchSessions();
    };
    init();
  }, []);

  const fetchSettings = async () => {
    try {
      const res = await fetch(`${API_BASE}/settings`);
      const data = await res.json();
      if (data.theme_accent) {
        document.documentElement.setAttribute('data-theme', data.theme_accent);
      }
      if (data.default_temperature !== undefined) {
        setTemperature(data.default_temperature);
      }
      if (data.default_model) {
        setSelectedModel(data.default_model);
      }
    } catch (err) {
      console.error("Failed to load settings in App", err);
    }
  };

  useEffect(() => {
    if (chatRef.current) {
      chatRef.current.scrollTop = chatRef.current.scrollHeight;
    }
  }, [messages, isTyping]);

  const fetchModels = async (force = false) => {
    setIsRefreshingModels(true);
    try {
      const res = await fetch(`${API_BASE}/models${force ? '?refresh=true' : ''}`);
      const data = await res.json();
      if (data && data.data && data.data.length > 0) {
        setAvailableModels(data.data);
        setSelectedModel(prev => {
          if (prev && data.data.find(m => m.id === prev)) {
            return prev;
          }
          return data.active_model || data.data[0].id;
        });
      }
    } catch (err) {
      console.error("Failed to fetch models", err);
    } finally {
      setIsRefreshingModels(false);
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
    setElapsedSeconds(0);

    const startTime = Date.now();
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setElapsedSeconds((Date.now() - startTime) / 1000);
    }, 100);

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
      const calcDuration = data.duration || parseFloat(((Date.now() - startTime) / 1000).toFixed(1));
      
      setMessages(prev => [...prev, { 
        role: data.role || 'assistant', 
        content: data.reply,
        thinking: data.thinking,
        duration: calcDuration,
        tokens: data.tokens 
      }]);
      fetchSessions();
    } catch (err) {
      console.error("Chat error:", err);
      setMessages(prev => [...prev, { role: 'system', content: 'Connection error to backend.' }]);
    } finally {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      setIsTyping(false);
      setElapsedSeconds(0);
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
      {showSettings && (
        <SettingsModal 
          onClose={() => setShowSettings(false)} 
          onSettingsUpdated={(updated) => {
            if (updated.theme_accent) {
              document.documentElement.setAttribute('data-theme', updated.theme_accent);
            }
            if (updated.default_temperature !== undefined) {
              setTemperature(updated.default_temperature);
            }
            if (updated.default_model) {
              setSelectedModel(updated.default_model);
            }
            fetchModels();
          }}
        />
      )}
      
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

          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div 
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                fontSize: '0.75rem',
                color: 'var(--text-secondary)',
                background: 'rgba(0,0,0,0.3)',
                padding: '4px 10px',
                border: '1px solid var(--panel-border)',
                borderRadius: '0'
              }}
              title={availableModels.length > 0 ? `${availableModels.length} models loaded via 9Router proxy` : "9Router offline or unreachable"}
            >
              <span 
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: '50%',
                  background: availableModels.length > 0 ? '#10b981' : '#f59e0b',
                  boxShadow: availableModels.length > 0 ? '0 0 8px #10b981' : 'none',
                  display: 'inline-block'
                }} 
              />
              <span>9Router: {availableModels.length > 0 ? `${availableModels.length} Models` : 'Offline'}</span>
            </div>
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
          
          {messages.map((msg, i) => {
            const isAi = msg.role !== 'user';
            const { thinking, cleanContent } = isAi 
              ? extractThinking(msg.content, msg.thinking)
              : { thinking: null, cleanContent: msg.content };

            return (
              <div key={i} className={`message-wrapper ${msg.role === 'user' ? 'user' : 'ai'}`}>
                <div className="message-sender">
                  {msg.role === 'user' ? <User size={14} /> : <Bot size={14} />}
                  {msg.role === 'user' ? 'You' : 'Bludai'}
                </div>
                <div className="message-bubble">
                  {thinking && (
                    <ThinkingBlock thinking={thinking} duration={msg.duration} />
                  )}
                  {cleanContent && (
                    <div className="markdown-body">
                      <ReactMarkdown>{cleanContent}</ReactMarkdown>
                    </div>
                  )}
                  {msg.tokens && msg.tokens.total > 0 && (
                    <div className="token-tracker">
                      <span className="token-main"><Cpu size={12}/> Tokens: {msg.tokens.total.toLocaleString()}</span>
                      <span className="token-details">[In: {msg.tokens.input.toLocaleString()} | Out: {msg.tokens.output.toLocaleString()}]</span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
          
          {isTyping && (
            <div className="message-wrapper ai">
              <div className="message-sender"><Bot size={14} /> Bludai</div>
              <ThinkingIndicator elapsedSeconds={elapsedSeconds} mode={mode} />
            </div>
          )}
        </div>

        <div className="input-area">
          <div className="controls-row" style={{ display: 'flex', gap: '16px', alignItems: 'center', flexWrap: 'wrap' }}>
            <ModelSelector 
              selectedModel={selectedModel}
              setSelectedModel={setSelectedModel}
              availableModels={availableModels}
              label={mode === 'role' ? 'Agent Model' : 'Direct Model'}
              onRefresh={() => fetchModels(true)}
              isRefreshing={isRefreshingModels}
            />
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
