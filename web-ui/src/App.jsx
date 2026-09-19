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

  const loadSession = async (threadId) => {
    setCurrentThread(threadId);
    
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
                const currentAgent = event.agent || 'Model';
                if (streamThoughts.length === 0 || streamThoughts[streamThoughts.length - 1].agent !== currentAgent) {
                  streamThoughts.push({ agent: currentAgent, content: event.delta });
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
    <div className="flex w-full h-full bg-[#11111b] text-[#cdd6f4] font-sans">
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

      <div className="flex-1 flex flex-col h-full relative">
        <div className="h-[65px] px-6 flex items-center justify-between border-b border-[#313244] bg-[#181825]/80 backdrop-blur-md shrink-0">
          <div className="flex items-center gap-3">
            <span 
              className="flex items-center gap-2 px-3 py-1.5 text-xs font-semibold rounded-md bg-[#cba6f7]/15 text-[#cba6f7] border border-[#cba6f7]/30" 
              title="Autonomous Supervisor orchestrating specialized agents"
            >
              ⚡ Multi-Agent Workplace
            </span>
            <button
              onClick={() => setShowWorkplace(true)}
              className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-md text-[#cba6f7] bg-[#cba6f7]/15 border border-[#cba6f7]/30 cursor-pointer transition-all hover:bg-[#cba6f7]/25"
              title="Manage dynamic multi-agent roles and tool whitelisting"
            >
              <Users size={14} /> Workplace Roles
            </button>
          </div>

          <div className="flex items-center gap-3">
            <div 
              className="flex items-center gap-2 text-xs font-semibold text-[#a6adc8] bg-[#11111b]/70 px-3 py-1.5 border border-[#313244] rounded shadow-inner"
              title={availableModels.length > 0 ? `${availableModels.length} models loaded via 9Router proxy` : "9Router offline or unreachable"}
            >
              <span className={`w-2 h-2 rounded-full ${availableModels.length > 0 ? 'bg-[#a6e3a1] animate-pulse' : 'bg-[#f9e2af]'}`}></span>
              <span>9Router: {availableModels.length > 0 ? `${availableModels.length} Models` : 'Offline'}</span>
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-6 space-y-6 scroll-smooth bg-[#11111b]" ref={chatRef}>
          {messages.length === 0 && (
            <div className="flex flex-col items-center justify-center h-full text-center opacity-50">
              <Cpu size={48} className="mb-4 text-[#585b70]" />
              <h2 className="text-xl font-semibold text-[#cdd6f4] mb-2">How can I help you today?</h2>
              <p className="text-sm text-[#a6adc8]">Type a message to start communicating with Bludai.</p>
            </div>
          )}
          
          {messages.map((msg, i) => {
            const isAi = msg.role !== 'user';
            const { thinking, cleanContent } = isAi 
              ? extractThinking(msg.content, msg.thinking)
              : { thinking: null, cleanContent: msg.content };

            return (
              <div key={i} className={`flex flex-col gap-1.5 ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
                <div className="flex items-center gap-1.5 text-xs font-semibold text-[#a6adc8] px-1">
                  {msg.role === 'user' ? <User size={14} /> : <Bot size={14} />}
                  {msg.role === 'user' ? 'You' : 'Bludai'}
                </div>
                <div className={`max-w-[85%] rounded-xl px-4 py-3 text-sm leading-relaxed ${
                  msg.role === 'user' 
                    ? 'bg-[#1e1e2e] border border-[#cba6f7]/40 text-[#cdd6f4]' 
                    : 'bg-[#181825] border border-[#313244] text-[#cdd6f4]'
                }`}>
                  {thinking && (
                    <ThinkingBlock thinking={thinking} duration={msg.duration} />
                  )}
                  {cleanContent && (
                    <div className="markdown-body">
                      <ReactMarkdown>{cleanContent}</ReactMarkdown>
                    </div>
                  )}
                  {isAi && (msg.tokens || msg.duration) && (
                    <div className="mt-3 pt-2 border-t border-[#313244]/60">
                      <div 
                        className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md bg-[#11111b]/50 text-[11px] text-[#a6adc8] font-mono" 
                        title={msg.tokens ? `Prompt tokens: ${msg.tokens.input?.toLocaleString()} | Completion: ${msg.tokens.output?.toLocaleString()}` : ''}
                      >
                        <Cpu size={12} className="text-[#6c7086]" />
                        <span>
                          {msg.tokens?.total ? `${msg.tokens.total.toLocaleString()} tokens` : (msg.tokens?.input ? `${(msg.tokens.input + (msg.tokens.output || 0)).toLocaleString()} tokens` : 'Tokens tracked')}
                        </span>
                        {msg.duration && (
                          <span className="text-[#6c7086]">· {msg.duration}s</span>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
          
          {isTyping && (
            <div className="flex flex-col gap-1.5 items-start">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-[#a6adc8] px-1"><Bot size={14} /> Bludai</div>
              <div className="max-w-[85%] rounded-xl px-4 py-3 text-sm border border-[#313244] bg-[#181825]">
                <ThinkingIndicator 
                  elapsedSeconds={elapsedSeconds} 
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

        <div className="border-t border-[#313244] bg-[#181825]/90 backdrop-blur-md px-6 py-4 space-y-3">
          <div className="flex items-center gap-4 flex-wrap">
            <ModelSelector 
              selectedModel={selectedModel}
              setSelectedModel={setSelectedModel}
              availableModels={availableModels}
              label="Default / Supervisor Model"
              onRefresh={() => fetchModels(true)}
              isRefreshing={isRefreshingModels}
            />
          </div>
          
          <div className="flex items-center gap-2 bg-[#1e1e2e] border border-[#313244] rounded-xl px-3 py-2 focus-within:border-[#cba6f7] focus-within:ring-1 focus-within:ring-[#cba6f7]/30 transition-all">
            <textarea
              className="flex-1 bg-transparent border-none outline-none text-[#cdd6f4] text-sm resize-none font-sans placeholder:text-[#6c7086]"
              placeholder={pendingInterrupt ? "Approve or reject terminal command first..." : "Ask Bludai..."}
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={!!pendingInterrupt || isTyping}
              rows={1}
            />
            <button 
              className="p-2 text-[#cba6f7] hover:text-[#b4befe] disabled:opacity-30 disabled:cursor-not-allowed transition-colors rounded-lg hover:bg-[#cba6f7]/20" 
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
