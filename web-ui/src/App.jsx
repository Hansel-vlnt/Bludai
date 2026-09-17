import React, { useState, useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import { Send, Bot, User, Cpu, Users } from 'lucide-react';
import Sidebar from './components/Sidebar';
import ModelSelector from './components/ModelSelector';
import SettingsModal from './components/SettingsModal';
import AgentWorkplaceModal from './components/AgentWorkplaceModal';
import ThinkingBlock from './components/ThinkingBlock';
import ThinkingIndicator from './components/ThinkingIndicator';
import TerminalApprovalCard from './components/TerminalApprovalCard';
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
  const [liveStatus, setLiveStatus] = useState('');
  const [liveThoughts, setLiveThoughts] = useState([]);
  const [liveTools, setLiveTools] = useState([]);
  const [pendingInterrupt, setPendingInterrupt] = useState(null);
  const [mode, setMode] = useState('role');
  const [showSettings, setShowSettings] = useState(false);
  const [showWorkplace, setShowWorkplace] = useState(false);
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
    if (sessionMode) setMode(sessionMode);
    
    try {
      const res = await fetch(`${API_BASE}/sessions/${threadId}/history`);
      const data = await res.json();
      setMessages(data.messages || []);
      if (data.mode) {
        setMode(data.mode);
      }
    } catch (err) {
      console.error("Failed to fetch session history", err);
    }
  };


  const handleNewChat = () => {
    const newThread = Math.random().toString(36).substring(2, 15);
    setCurrentThread(newThread);
    setMessages([]);
  };

  const handleStreamResponse = async (response, startTime) => {
    const reader = response.body.getReader();
    const decoder = new TextDecoder('utf-8');
    let buffer = '';
    let replyContent = '';
    let finalThinking = '';
    let calcDuration = null;
    let calcTokens = { input: 0, output: 0, total: 0 };
    const streamThoughts = [];
    const streamTools = [];

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const parts = buffer.split('\n\n');
      buffer = parts.pop();

      for (const part of parts) {
        const lines = part.split('\n');
        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed.startsWith('data: ')) continue;
          try {
            const event = JSON.parse(trimmed.slice(6));
            if (event.type === 'status') {
              setLiveStatus(event.text);
            } else if (event.type === 'thought') {
              if (event.content) {
                streamThoughts.push({ agent: event.agent || 'Agent', content: event.content });
                setLiveThoughts([...streamThoughts]);
              } else if (event.delta) {
                if (streamThoughts.length === 0) {
                  streamThoughts.push({ agent: event.agent || 'Model', content: event.delta });
                } else {
                  streamThoughts[streamThoughts.length - 1].content += event.delta;
                }
                setLiveThoughts([...streamThoughts]);
              }
            } else if (event.type === 'tool') {
              const existingIdx = streamTools.findIndex(t => t.name === event.name);
              if (existingIdx >= 0) {
                streamTools[existingIdx].status = event.status;
              } else {
                streamTools.push({ name: event.name, status: event.status });
              }
              setLiveTools([...streamTools]);
            } else if (event.type === 'content') {
              replyContent += event.delta;
            } else if (event.type === 'reply') {
              replyContent = event.reply;
            } else if (event.type === 'interrupt') {
              setPendingInterrupt(event.interrupt);
              if (!finalThinking && streamThoughts.length > 0) {
                finalThinking = streamThoughts.map(t => `⚡ **Thinking · ${t.agent}**:\n${t.content}`).join('\n\n---\n\n');
              }
              const dur = calcDuration || parseFloat(((Date.now() - startTime) / 1000).toFixed(1));
              setMessages(prev => [...prev, { 
                role: 'assistant', 
                content: replyContent || "Paused for approval...",
                thinking: finalThinking,
                duration: dur,
                tokens: calcTokens,
                isInterrupted: true 
              }]);
              return true; // Indicates we hit an interrupt
            } else if (event.type === 'done') {
              if (event.reply) replyContent = event.reply;
              if (event.thinking) finalThinking = event.thinking;
              if (event.duration) calcDuration = event.duration;
              if (event.tokens) calcTokens = event.tokens;
            } else if (event.type === 'error') {
              throw new Error(event.error);
            }
          } catch (errParse) {
            console.warn("Parse stream event error:", errParse);
          }
        }
      }
    }

    if (!finalThinking && streamThoughts.length > 0) {
      finalThinking = streamThoughts.map(t => `⚡ **Thinking · ${t.agent}**:\n${t.content}`).join('\n\n---\n\n');
    }

    const dur = calcDuration || parseFloat(((Date.now() - startTime) / 1000).toFixed(1));
    setMessages(prev => [...prev, { 
      role: 'assistant', 
      content: replyContent || "Task completed.",
      thinking: finalThinking,
      duration: dur,
      tokens: calcTokens 
    }]);
    return false; // No interrupt
  };

  const handleResumeAction = async (approved) => {
    setPendingInterrupt(null);
    setIsTyping(true);
    setElapsedSeconds(0);
    setLiveStatus('Resuming execution...');
    setLiveThoughts([]);
    setLiveTools([]);

    const startTime = Date.now();
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setElapsedSeconds((Date.now() - startTime) / 1000);
    }, 100);

    // Remove the temporary interrupted message
    setMessages(prev => {
      const newMsg = [...prev];
      if (newMsg.length > 0 && newMsg[newMsg.length - 1].isInterrupted) {
        newMsg.pop();
      }
      return newMsg;
    });

    try {
      const response = await fetch(`${API_BASE}/chat/resume`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          thread_id: currentThread,
          approved: approved
        })
      });

      if (!response.ok || !response.body) {
        throw new Error(`Resume HTTP ${response.status}`);
      }

      await handleStreamResponse(response, startTime);
      fetchSessions();
    } catch (err) {
      console.error("Resume stream error:", err);
      setMessages(prev => [...prev, { role: 'system', content: 'Error resuming execution.' }]);
    } finally {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      setIsTyping(false);
      setElapsedSeconds(0);
      setLiveStatus('');
      setLiveThoughts([]);
      setLiveTools([]);
    }
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
    setLiveStatus('Analyzing request...');
    setLiveThoughts([]);
    setLiveTools([]);

    const startTime = Date.now();
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setElapsedSeconds((Date.now() - startTime) / 1000);
    }, 100);

    try {
      const response = await fetch(`${API_BASE}/chat/stream`, {
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

      if (!response.ok || !response.body) {
        throw new Error(`Stream HTTP ${response.status}`);
      }

      const wasInterrupted = await handleStreamResponse(response, startTime);
      if (!wasInterrupted) {
        fetchSessions();
      }
    } catch (err) {
      console.warn("Streaming failed, falling back to standard /chat:", err);
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
      } catch (fallbackErr) {
        console.error("Chat fallback error:", fallbackErr);
        setMessages(prev => [...prev, { role: 'system', content: 'Connection error to backend.' }]);
      }
    } finally {
      if (!pendingInterrupt) {
        if (timerRef.current) {
          clearInterval(timerRef.current);
          timerRef.current = null;
        }
        setIsTyping(false);
        setElapsedSeconds(0);
        setLiveStatus('');
        setLiveThoughts([]);
        setLiveTools([]);
      }
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

      {showWorkplace && (
        <AgentWorkplaceModal 
          models={availableModels}
          onClose={() => setShowWorkplace(false)}
        />
      )}
      
      <Sidebar 
        sessions={sessions} 
        currentThread={currentThread} 
        handleNewChat={handleNewChat} 
        loadSession={loadSession} 
        handleExit={handleExit} 
        setShowSettings={setShowSettings}
        setShowWorkplace={setShowWorkplace}
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
            {mode === 'role' ? (
              <span 
                className="mode-indicator-pill role" 
                title="Role Mode: Autonomous Supervisor orchestrating specialized agents (Developer, Executor, Researcher, etc.)"
              >
                ⚡ Multi-Agent Workplace
              </span>
            ) : (
              <span 
                className="mode-indicator-pill basic" 
                title="Basic Mode: Direct single-model streaming with live search and zero agent overhead"
              >
                💬 Direct Chat (Basic)
              </span>
            )}
            <button
              onClick={() => setShowWorkplace(true)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                fontSize: '0.8rem',
                color: '#00E5FF',
                background: 'rgba(0, 229, 255, 0.08)',
                padding: '6px 12px',
                border: '1px solid rgba(0, 229, 255, 0.3)',
                borderRadius: '8px',
                cursor: 'pointer',
                fontWeight: 600,
                transition: 'all 0.2s ease'
              }}
              title="Manage dynamic multi-agent roles and tool whitelisting"
              onMouseOver={(e) => { e.currentTarget.style.background = 'rgba(0, 229, 255, 0.18)'; }}
              onMouseOut={(e) => { e.currentTarget.style.background = 'rgba(0, 229, 255, 0.08)'; }}
            >
              <Users size={14} /> Workplace Roles
            </button>
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
                  {isAi && (msg.tokens || msg.duration) && (
                    <div className="token-meta-bar">
                      <div 
                        className="token-pill-badge" 
                        title={msg.tokens ? `Prompt tokens: ${msg.tokens.input?.toLocaleString()} | Completion: ${msg.tokens.output?.toLocaleString()}` : ''}
                      >
                        <Cpu size={12} className="token-cpu-icon" />
                        <span className="token-count-text">
                          {msg.tokens?.total ? `${msg.tokens.total.toLocaleString()} tokens` : (msg.tokens?.input ? `${(msg.tokens.input + (msg.tokens.output || 0)).toLocaleString()} tokens` : 'Tokens tracked')}
                        </span>
                        {msg.duration && (
                          <span className="token-dur-text">· {msg.duration}s</span>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
          
          {isTyping && (
            <div className="message-wrapper ai">
              <div className="message-sender"><Bot size={14} /> Bludai</div>
              <div className="message-bubble claude-bubble-thinking">
                <ThinkingIndicator 
                  elapsedSeconds={elapsedSeconds} 
                  mode={mode} 
                  liveStatus={liveStatus}
                  liveThoughts={liveThoughts}
                  liveTools={liveTools}
                />
              </div>
            </div>
          )}

          {pendingInterrupt && (
            <TerminalApprovalCard 
              interruptData={pendingInterrupt} 
              onRespond={handleResumeAction} 
            />
          )}
        </div>

        <div className="input-area">
          <div className="controls-row" style={{ display: 'flex', gap: '16px', alignItems: 'center', flexWrap: 'wrap' }}>
            <ModelSelector 
              selectedModel={selectedModel}
              setSelectedModel={setSelectedModel}
              availableModels={availableModels}
              label={mode === 'role' ? 'Supervisor Model' : 'Chat Model'}
              onRefresh={() => fetchModels(true)}
              isRefreshing={isRefreshingModels}
            />
            {mode === 'role' && (
              <button
                type="button"
                onClick={() => setShowWorkplace(true)}
                style={{
                  background: 'rgba(0, 229, 255, 0.05)',
                  border: '1px dashed rgba(0, 229, 255, 0.3)',
                  borderRadius: '6px',
                  color: '#00E5FF',
                  padding: '5px 10px',
                  fontSize: '0.75rem',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  transition: 'all 0.2s ease'
                }}
                title="Configure custom models and tools for workplace specialists (Developer, Executor, etc.)"
                onMouseOver={(e) => { e.currentTarget.style.background = 'rgba(0, 229, 255, 0.12)'; }}
                onMouseOut={(e) => { e.currentTarget.style.background = 'rgba(0, 229, 255, 0.05)'; }}
              >
                <Users size={12} />
                <span>Specialist Agents Roster</span>
              </button>
            )}
          </div>
          
          <div className="input-box glass-panel">
            <textarea
              placeholder={pendingInterrupt ? "Approve or reject terminal command first..." : "Ask Bludai..."}
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={!!pendingInterrupt || isTyping}
              rows={1}
            />
            <button 
              className="send-btn" 
              onClick={sendMessage}
              disabled={!inputText.trim() || isTyping || !!pendingInterrupt}
              title="Send prompt"
            >
              <Send size={16} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
