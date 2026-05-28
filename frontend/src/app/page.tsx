'use client';

import React, { useEffect, useRef, useState } from 'react';
import { useStore, Message } from '@/store/useStore';
import { Highlighting } from '@/components/Highlighting';
import { Sidebar } from '@/components/Sidebar';
import { 
  Send, 
  Sparkles, 
  Bot, 
  User, 
  ChevronRight, 
  Loader2, 
  Trash2, 
  Shield, 
  ShieldCheck,
  Zap,
  RefreshCw,
  Menu,
  Plus,
  MessageSquare,
  HelpCircle,
  Clock,
  Settings,
  X,
  ChevronDown
} from 'lucide-react';

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:3001/api';

const STARTER_PROMPTS = [
  {
    title: "Analyze Logic Flaws",
    desc: "Test the argument: 'All dogs are animals, therefore all animals are dogs.'",
    prompt: "Evaluate the logic of this statement: 'All dogs are animals, therefore all animals are dogs.'"
  },
  {
    title: "Audit Implicit Assumptions",
    desc: "Examine underlying risks in standard commercial real estate investment projections.",
    prompt: "Provide investment advice for commercial real estate in urban centers. Highlight any assumptions you are making."
  },
  {
    title: "Verify Factual Claims",
    desc: "Audit the grounding of battery range and efficiency statistics for EVs.",
    prompt: "Compare electric vehicle battery technologies and state their range metrics and charging efficiencies."
  },
  {
    title: "Inspect Framing Biases",
    desc: "Examine loaded perspectives in arguments for nuclear energy policy.",
    prompt: "Explain why nuclear energy is the absolute best option for carbon-free baseload power, making it sound very convincing."
  }
];

export default function WorkspacePage() {
  const {
    sessionId,
    setSessionId,
    messages,
    setMessages,
    addMessage,
    activeMessageId,
    setActiveMessageId,
    isSidebarOpen,
    setSidebarOpen,
    selectedModel,
    setSelectedModel,
    isGenerating,
    setGenerating,
    isEvaluating,
    setEvaluating,
    clearWorkspace
  } = useStore();

  const [prompt, setPrompt] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isLeftSidebarExpanded, setIsLeftSidebarExpanded] = useState(true);
  const [sessionsList, setSessionsList] = useState<{ id: string; title: string; updatedAt: string }[]>([]);
  const [isModelDropdownOpen, setIsModelDropdownOpen] = useState(false);
  
  const chatEndRef = useRef<HTMLDivElement>(null);
  const modelDropdownRef = useRef<HTMLDivElement>(null);

  // Initialize session and fetch session history
  useEffect(() => {
    let activeSessionId = sessionId;
    if (!activeSessionId) {
      const storedSession = localStorage.getItem('trustlayer_session_id');
      if (storedSession) {
        activeSessionId = storedSession;
      } else {
        activeSessionId = 'session_' + Math.random().toString(36).substring(2, 11);
        localStorage.setItem('trustlayer_session_id', activeSessionId);
      }
      setSessionId(activeSessionId);
    }
    
    fetchSessionHistory(activeSessionId);
    loadSessionsList();
  }, []);

  // Scroll to bottom on message list update
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    loadSessionsList();
  }, [messages, isGenerating, isEvaluating]);

  // Click outside listener for model dropdown
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (modelDropdownRef.current && !modelDropdownRef.current.contains(event.target as Node)) {
        setIsModelDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  // Fetch history from Fastify API
  const fetchSessionHistory = async (id: string) => {
    try {
      setErrorMsg(null);
      const res = await fetch(`${API_BASE}/session/${id}`);
      if (!res.ok) throw new Error('Failed to retrieve session history');
      
      const data = await res.json() as { messages: Message[] };
      setMessages(data.messages || []);
      
      // Auto-select the last AI response with evaluations for sidebar
      const aiMsgs = (data.messages || []).filter(m => m.sender === 'ai' && m.evaluation);
      if (aiMsgs.length > 0) {
        setActiveMessageId(aiMsgs[aiMsgs.length - 1].id);
      } else {
        setActiveMessageId(null);
      }
    } catch (err) {
      console.error(err);
      setErrorMsg('Could not connect to the backend server. Make sure it is running on port 3001.');
    }
  };

  // Load sessions metadata list
  const loadSessionsList = async () => {
    try {
      const res = await fetch(`${API_BASE}/sessions`);
      if (res.ok) {
        const data = await res.json();
        setSessionsList(data);
      }
    } catch (err) {
      console.error('Failed to load sessions list:', err);
    }
  };

  // Select a past session
  const handleSelectSession = (id: string) => {
    setSessionId(id);
    fetchSessionHistory(id);
  };

  // Delete a specific session
  const handleDeleteSession = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const res = await fetch(`${API_BASE}/session/clear`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId: id })
      });
      if (res.ok) {
        loadSessionsList();
        if (sessionId === id) {
          clearWorkspace();
          const newId = 'session_' + Math.random().toString(36).substring(2, 11);
          localStorage.setItem('trustlayer_session_id', newId);
          setSessionId(newId);
          setMessages([]);
        }
      }
    } catch (err) {
      console.error('Failed to delete session:', err);
    }
  };

  // Start new clean chat
  const handleNewChat = () => {
    clearWorkspace();
    const newId = 'session_' + Math.random().toString(36).substring(2, 11);
    localStorage.setItem('trustlayer_session_id', newId);
    setSessionId(newId);
    setMessages([]);
    loadSessionsList();
  };

  // Clear chat history for the active session
  const handleClearHistory = async () => {
    if (!sessionId) return;
    try {
      const res = await fetch(`${API_BASE}/session/clear`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId })
      });
      if (res.ok) {
        clearWorkspace();
        setMessages([]);
        loadSessionsList();
      }
    } catch (err) {
      console.error('Failed to clear active session history:', err);
    }
  };

  // Submit Prompt to API
  const handleSend = async (e: React.FormEvent, customPrompt?: string) => {
    if (e) e.preventDefault();
    
    const activePrompt = customPrompt || prompt;
    if (!activePrompt.trim() || isGenerating || isEvaluating) return;

    setErrorMsg(null);

    // 1. Add user message locally
    const userMsg: Message = {
      id: `user-${Date.now()}`,
      sender: 'user',
      content: activePrompt,
      createdAt: new Date().toISOString()
    };
    addMessage(userMsg);
    setPrompt('');
    
    // 2. Start generation loader states
    setGenerating(true);

    try {
      const res = await fetch(`${API_BASE}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId,
          model: selectedModel,
          prompt: userMsg.content
        })
      });

      setGenerating(false);

      if (!res.ok) {
        const errorData = await res.json() as { error?: string };
        throw new Error(errorData.error || 'Server failed to generate a response.');
      }

      const data = await res.json() as { aiMessage: Message };
      
      // 3. Add AI message with embedded evaluation report
      addMessage(data.aiMessage);
      
      if (data.aiMessage.evaluation) {
        setActiveMessageId(data.aiMessage.id);
        setSidebarOpen(true);
      }
    } catch (err: any) {
      console.error(err);
      setGenerating(false);
      setEvaluating(false);
      setErrorMsg(err.message || 'An unexpected error occurred.');
      
      // Add error system message to chat log
      addMessage({
        id: `sys-${Date.now()}`,
        sender: 'ai',
        content: `❌ **Error**: ${err.message || 'Failed to complete the query.'}\n\nPlease check your backend server logs and ensure your API keys are loaded in the backend \`.env\` configuration file.`,
        createdAt: new Date().toISOString()
      });
    }
  };

  const activeMessage = messages.find(m => m.id === activeMessageId);
  const selectedModelLabel = selectedModel === 'gemini' ? 'Gemini 2.5 Flash' : 'Llama 3.3 (Groq)';

  return (
    <div className="h-screen w-screen flex bg-[#131314] text-[#e3e3e3] font-sans overflow-hidden">
      
      {/* 1. LEFT COLLAPSIBLE NAVIGATION DRAWER */}
      <aside 
        className={`h-full bg-[#1e1f20] flex flex-col justify-between shrink-0 transition-all duration-300 relative border-r border-[#2c2e30]/40 z-30 ${
          isLeftSidebarExpanded ? 'w-[260px]' : 'w-[68px]'
        }`}
      >
        {/* Top Section */}
        <div className="flex flex-col p-3.5 space-y-4">
          
          {/* Hamburger & Brand Icon */}
          <div className="flex items-center gap-3">
            <button 
              onClick={() => setIsLeftSidebarExpanded(!isLeftSidebarExpanded)}
              className="p-2 hover:bg-[#2d2f31] rounded-full text-[#c4c7c5] hover:text-[#e3e3e3] transition duration-200"
              title={isLeftSidebarExpanded ? "Collapse Sidebar" : "Expand Sidebar"}
            >
              <Menu className="h-5 w-5" />
            </button>
            
            {isLeftSidebarExpanded && (
              <span className="font-semibold text-sm tracking-tight text-white flex items-center gap-1.5 animate-fadeIn">
                <Sparkles className="h-4.5 w-4.5 text-[#8ab4f8]" />
                TrustLayer AI
              </span>
            )}
          </div>

          {/* New Chat Button */}
          {isLeftSidebarExpanded ? (
            <button
              onClick={handleNewChat}
              className="flex items-center gap-3 w-full px-4 py-3 bg-[#131314]/40 hover:bg-[#2d2f31] border border-[#2c2e30] rounded-full text-xs font-semibold text-[#8ab4f8] transition duration-200 shadow-sm animate-fadeIn"
            >
              <Plus className="h-4.5 w-4.5" />
              New Chat
            </button>
          ) : (
            <button
              onClick={handleNewChat}
              className="flex items-center justify-center w-11 h-11 bg-[#131314]/40 hover:bg-[#2d2f31] border border-[#2c2e30] rounded-full text-[#8ab4f8] transition duration-200 shadow-sm mx-auto"
              title="New Chat"
            >
              <Plus className="h-5 w-5" />
            </button>
          )}

          {/* Recent History Section */}
          {isLeftSidebarExpanded && (
            <div className="flex flex-col pt-4 space-y-2 animate-fadeIn max-h-[55vh] overflow-y-auto pr-1">
              <span className="text-[11px] font-bold text-[#c4c7c5]/60 uppercase tracking-wider px-2">Recent</span>
              {sessionsList.length === 0 ? (
                <span className="text-xs text-[#c4c7c5]/50 px-2 italic">No past sessions</span>
              ) : (
                sessionsList.map((session) => {
                  const isActive = sessionId === session.id;
                  return (
                    <div
                      key={session.id}
                      onClick={() => handleSelectSession(session.id)}
                      className={`group flex items-center justify-between px-2.5 py-2.5 rounded-full text-xs cursor-pointer transition duration-150 relative ${
                        isActive 
                          ? 'bg-[#2d2f31] text-white font-medium' 
                          : 'text-[#c4c7c5] hover:bg-[#2d2f31]/60 hover:text-[#e3e3e3]'
                      }`}
                    >
                      <span className="flex items-center gap-2 truncate pr-4">
                        <MessageSquare className="h-3.5 w-3.5 shrink-0 opacity-70" />
                        <span className="truncate">{session.title}</span>
                      </span>
                      
                      <button
                        onClick={(e) => handleDeleteSession(session.id, e)}
                        className="opacity-0 group-hover:opacity-100 hover:text-rose-400 p-1 rounded-full transition-all shrink-0 hover:bg-[#131314]/40 absolute right-2"
                        title="Delete Session"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  );
                })
              )}
            </div>
          )}
        </div>

        {/* Bottom Section */}
        <div className="flex flex-col p-3.5 space-y-2.5 border-t border-[#2c2e30]/40">
          
          <button 
            className="flex items-center gap-3.5 px-2.5 py-2 hover:bg-[#2d2f31] rounded-full text-xs text-[#c4c7c5] transition"
            title="Help"
          >
            <HelpCircle className="h-4.5 w-4.5" />
            {isLeftSidebarExpanded && <span>Help & Support</span>}
          </button>
          
          <button 
            className="flex items-center gap-3.5 px-2.5 py-2 hover:bg-[#2d2f31] rounded-full text-xs text-[#c4c7c5] transition"
            title="Activity"
          >
            <Clock className="h-4.5 w-4.5" />
            {isLeftSidebarExpanded && <span>Activity History</span>}
          </button>
          
          <button 
            className="flex items-center gap-3.5 px-2.5 py-2 hover:bg-[#2d2f31] rounded-full text-xs text-[#c4c7c5] transition"
            title="Settings"
          >
            <Settings className="h-4.5 w-4.5" />
            {isLeftSidebarExpanded && <span>Settings</span>}
          </button>

          {/* User initials Profile bubble */}
          <div className="flex items-center gap-3 px-1.5 py-2">
            <div className="h-8 w-8 rounded-full bg-[#8ab4f8]/20 border border-[#8ab4f8]/40 text-[#8ab4f8] flex items-center justify-center font-bold text-xs shrink-0 shadow-inner">
              BL
            </div>
            {isLeftSidebarExpanded && (
              <div className="flex flex-col leading-tight animate-fadeIn truncate">
                <span className="text-xs font-semibold text-white">Boragala Likhit</span>
                <span className="text-[10px] text-[#c4c7c5]/60 truncate">Auditor Account</span>
              </div>
            )}
          </div>

        </div>
      </aside>

      {/* 2. MAIN WORKSPACE AREA */}
      <main className="flex-1 flex flex-col min-h-0 overflow-hidden relative">
        
        {/* Top Navbar */}
        <header className="h-14 flex items-center justify-between px-6 shrink-0 z-20">
          <div className="flex items-center gap-3">
            {/* Hamburger button (visible only when left sidebar is collapsed) */}
            {!isLeftSidebarExpanded && (
              <button 
                onClick={() => setIsLeftSidebarExpanded(true)}
                className="p-2 hover:bg-[#2d2f31] rounded-full text-[#c4c7c5] hover:text-[#e3e3e3] transition duration-200"
                title="Expand Sidebar"
              >
                <Menu className="h-5 w-5" />
              </button>
            )}
            
            {/* Model Selector Dropdown Popover */}
            <div className="relative" ref={modelDropdownRef}>
              <button
                onClick={() => setIsModelDropdownOpen(!isModelDropdownOpen)}
                className="flex items-center gap-1.5 px-4 py-2 hover:bg-[#2d2f31] border border-[#2c2e30]/80 rounded-full text-xs font-semibold text-white transition duration-150 cursor-pointer"
              >
                {selectedModel === 'gemini' ? (
                  <Sparkles className="h-3.5 w-3.5 text-[#8ab4f8]" />
                ) : (
                  <Zap className="h-3.5 w-3.5 text-[#d7aef8]" />
                )}
                {selectedModelLabel}
                <ChevronDown className="h-3 w-3 opacity-60 ml-0.5" />
              </button>
              
              {isModelDropdownOpen && (
                <div className="absolute left-0 mt-2 w-52 bg-[#1e1f20] border border-[#2c2e30] rounded-xl shadow-2xl z-50 p-1.5 overflow-hidden animate-fadeIn">
                  <button
                    onClick={() => {
                      setSelectedModel('gemini');
                      setIsModelDropdownOpen(false);
                    }}
                    className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-left text-xs font-medium transition ${
                      selectedModel === 'gemini' 
                        ? 'bg-[#2d2f31] text-[#8ab4f8]' 
                        : 'text-[#c4c7c5] hover:bg-[#2d2f31]/50 hover:text-white'
                    }`}
                  >
                    <Sparkles className="h-4 w-4 shrink-0 text-[#8ab4f8]" />
                    <div>
                      <span className="block font-semibold">Gemini 2.5 Flash</span>
                      <span className="block text-[10px] opacity-75 font-normal">Google's fast, multimodal model</span>
                    </div>
                  </button>
                  <button
                    onClick={() => {
                      setSelectedModel('groq');
                      setIsModelDropdownOpen(false);
                    }}
                    className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-left text-xs font-medium transition ${
                      selectedModel === 'groq' 
                        ? 'bg-[#2d2f31] text-[#d7aef8]' 
                        : 'text-[#c4c7c5] hover:bg-[#2d2f31]/50 hover:text-white'
                    }`}
                  >
                    <Zap className="h-4 w-4 shrink-0 text-[#d7aef8]" />
                    <div>
                      <span className="block font-semibold">Llama 3.3 (Groq)</span>
                      <span className="block text-[10px] opacity-75 font-normal">Meta's 70B parameter engine</span>
                    </div>
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Right Header Actions */}
          <div className="flex items-center gap-3">
            
            {errorMsg && (
              <span className="text-[10px] text-rose-400 bg-rose-500/10 border border-rose-500/20 px-2.5 py-0.5 rounded-full animate-pulse font-medium">
                Offline
              </span>
            )}

            {/* Sidebar toggle button (visible if active evaluation exists) */}
            {activeMessage?.evaluation && (
              <button
                onClick={() => setSidebarOpen(!isSidebarOpen)}
                className={`flex items-center gap-1.5 px-3.5 py-2 rounded-full text-xs font-semibold border transition duration-200 ${
                  isSidebarOpen 
                    ? 'bg-[#8ab4f8]/10 border-[#8ab4f8]/30 text-[#8ab4f8]' 
                    : 'bg-[#1e1f20] border-[#2c2e30] text-[#c4c7c5] hover:text-white hover:bg-[#2d2f31]'
                }`}
                title="Toggle Trust Evaluation Sidebar"
              >
                <Shield className="h-3.5 w-3.5" />
                <span>Output Eval</span>
                <span className={`h-2 w-2 rounded-full shrink-0 ${
                  activeMessage.evaluation.overallReliability === 'HIGH' ? 'bg-emerald-400' :
                  activeMessage.evaluation.overallReliability === 'MEDIUM' ? 'bg-amber-400' :
                  'bg-rose-400'
                }`} />
              </button>
            )}

            <button
              onClick={handleClearHistory}
              title="Reset Active Chat"
              className="p-2 hover:bg-[#2d2f31] rounded-full text-[#c4c7c5] hover:text-white transition-colors"
            >
              <Trash2 className="h-4 w-4" />
            </button>
            
            <div className="h-8 w-8 rounded-full bg-[#d7aef8]/20 border border-[#d7aef8]/40 text-[#d7aef8] flex items-center justify-center font-bold text-xs shadow-inner">
              TL
            </div>
          </div>
        </header>

        {/* Scrollable chat messages pane */}
        <div className="flex-1 overflow-y-auto min-h-0 px-4 md:px-8 py-4 space-y-8">
          {messages.length === 0 ? (
            
            /* GREETING SCREEN & STARTER CARDS */
            <div className="h-full max-w-3xl mx-auto flex flex-col justify-center py-8 space-y-12 animate-fadeIn">
              
              {/* Massive colorful gradient greeting */}
              <div className="space-y-3">
                <h1 className="text-4xl md:text-5xl font-medium tracking-tight bg-gradient-to-r from-[#4b90ff] via-[#ff5546] to-[#9106ff] bg-clip-text text-transparent leading-none py-1">
                  What can I evaluate today?
                </h1>
                <p className="text-base text-[#c4c7c5] font-normal leading-relaxed max-w-xl">
                  Inspect output reliability instantly. Submit prompts below to audit factual grounding, logical consistency, bias risk, and implicit conditions.
                </p>
              </div>

              {/* Starter Suggestions Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {STARTER_PROMPTS.map((starter, index) => (
                  <div
                    key={index}
                    onClick={(e) => handleSend(e, starter.prompt)}
                    className="p-5 bg-[#1e1f20]/45 hover:bg-[#2d2f31]/50 border border-[#2c2e30]/60 hover:border-[#2c2e30] rounded-2xl cursor-pointer transition-all duration-200 group flex flex-col justify-between h-[124px]"
                  >
                    <div>
                      <h3 className="text-xs font-bold text-[#e3e3e3] mb-1">{starter.title}</h3>
                      <p className="text-xs text-[#c4c7c5] leading-relaxed line-clamp-2">{starter.desc}</p>
                    </div>
                    <div className="flex justify-end">
                      <span className="p-1.5 bg-[#131314] text-[#8ab4f8] rounded-full opacity-0 group-hover:opacity-100 transition-all duration-200">
                        <Send className="h-3 w-3" />
                      </span>
                    </div>
                  </div>
                ))}
              </div>

            </div>
          ) : (
            
            /* BORDERLESS MESSAGES FLOW */
            <div className="max-w-3xl mx-auto space-y-10">
              {messages.map((msg) => (
                <div key={msg.id} className="space-y-2">
                  
                  {/* User bubble initials / bot indicator */}
                  <div className="flex items-center gap-3">
                    {msg.sender === 'user' ? (
                      <div className="h-6 w-6 rounded-full bg-[#8ab4f8]/20 text-[#8ab4f8] border border-[#8ab4f8]/30 flex items-center justify-center font-bold text-[10px]">
                        You
                      </div>
                    ) : (
                      <div className="h-6 w-6 rounded-full bg-gradient-to-tr from-[#4b90ff] to-[#9106ff] text-white flex items-center justify-center p-1 shadow-inner">
                        <Sparkles className="h-3.5 w-3.5" />
                      </div>
                    )}
                    <span className="text-xs font-bold text-white/95">
                      {msg.sender === 'user' ? 'You' : 'TrustLayer AI'}
                    </span>
                    <span className="text-[10px] text-[#c4c7c5]/50 font-medium">
                      {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>

                  {/* Render content */}
                  <div className="pl-9 pr-2">
                    {msg.sender === 'user' ? (
                      <p className="text-[15px] text-[#e3e3e3] leading-relaxed whitespace-pre-wrap font-normal">
                        {msg.content}
                      </p>
                    ) : (
                      <Highlighting content={msg.content} evaluation={msg.evaluation} />
                    )}

                    {/* Factual audit sub-chip details */}
                    {msg.sender === 'ai' && (
                      <div className="pt-4 mt-4 border-t border-[#2c2e30]/40 flex flex-wrap items-center justify-between gap-3">
                        {msg.evaluation ? (
                          <>
                            <div className="flex items-center gap-2">
                              <span className="text-xs text-[#c4c7c5] flex items-center gap-1 font-medium">
                                <ShieldCheck className="h-3.5 w-3.5 text-[#8ab4f8]" />
                                Trust Score:
                              </span>
                              <span className={`text-xs font-bold font-mono px-2 py-0.5 rounded-full ${
                                msg.evaluation.overallReliability === 'HIGH' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' :
                                msg.evaluation.overallReliability === 'MEDIUM' ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' :
                                'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                              }`}>
                                {msg.evaluation.trustScore}% ({msg.evaluation.overallReliability})
                              </span>
                            </div>

                            <button
                              onClick={() => {
                                setActiveMessageId(msg.id);
                                setSidebarOpen(true);
                              }}
                              className="flex items-center gap-1 px-3 py-1.5 bg-[#8ab4f8]/5 hover:bg-[#8ab4f8]/15 border border-[#8ab4f8]/20 text-[#8ab4f8] hover:text-white rounded-full text-xs font-semibold transition duration-150"
                            >
                              Inspect Detailed Analysis
                              <ChevronRight className="h-3 w-3" />
                            </button>
                          </>
                        ) : (
                          <span className="text-xs text-[#c4c7c5]/50 italic">No evaluation report created.</span>
                        )}
                      </div>
                    )}
                  </div>

                </div>
              ))}

              {/* Streaming loading skeleton */}
              {isGenerating && (
                <div className="space-y-3 animate-pulse">
                  <div className="flex items-center gap-3">
                    <div className="h-6 w-6 rounded-full bg-[#1e1f20] border border-[#2c2e30] flex items-center justify-center">
                      <Sparkles className="h-3.5 w-3.5 text-[#8ab4f8]" />
                    </div>
                    <div className="h-3 w-20 bg-[#2d2f31] rounded-full" />
                  </div>
                  <div className="pl-9 space-y-2">
                    <div className="h-4 w-full bg-[#2d2f31] rounded-full" />
                    <div className="h-4 w-[90%] bg-[#2d2f31] rounded-full" />
                  </div>
                </div>
              )}

              <div ref={chatEndRef} />
            </div>
          )}
        </div>

        {/* Bottom Prompt Composer (Rounded input capsule) */}
        <div className="p-4 md:p-6 shrink-0 bg-[#131314] z-20">
          <form onSubmit={(e) => handleSend(e)} className="max-w-3xl mx-auto">
            <div className="flex items-end gap-2 bg-[#1e1f20] border border-[#2c2e30] rounded-[28px] px-4 py-3 shadow-md hover:border-[#2c2e30]/80 focus-within:border-[#8ab4f8]/60 transition">
              
              {/* Add shortcut icon */}
              <button
                type="button"
                className="p-1.5 hover:bg-[#2d2f31] text-[#c4c7c5] hover:text-white rounded-full mb-0.5 shrink-0 transition"
                title="Add attachment"
              >
                <Plus className="h-5 w-5" />
              </button>

              {/* Textarea */}
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSend(e);
                  }
                }}
                placeholder="Ask TrustLayer AI to generate and evaluate..."
                rows={1}
                disabled={isGenerating || isEvaluating}
                className="flex-1 max-h-[160px] min-h-[24px] py-1 px-1 bg-transparent border-none focus:outline-none resize-none text-[15px] text-[#e3e3e3] placeholder-[#c4c7c5]/50 leading-relaxed scrollbar-none"
                style={{ height: 'auto' }}
              />

              {/* Inside Pill Controls */}
              <div className="flex items-center gap-2 shrink-0">
                
                {/* Send Button */}
                <button
                  type="submit"
                  disabled={!prompt.trim() || isGenerating || isEvaluating}
                  className="p-2 bg-[#8ab4f8] hover:bg-[#8ab4f8]/90 disabled:bg-[#2d2f31]/60 text-[#131314] disabled:text-[#c4c7c5]/30 rounded-full transition duration-200"
                >
                  {isGenerating || isEvaluating ? (
                    <Loader2 className="h-4.5 w-4.5 animate-spin" />
                  ) : (
                    <Send className="h-4.5 w-4.5" />
                  )}
                </button>

              </div>

            </div>
          </form>
          
          <p className="text-center text-[10px] text-[#c4c7c5]/60 mt-3 font-normal">
            Click highlight markers (Red: Contradictions, Indigo: Logic errors, Amber: Assumptions) to expand evaluation sidebar analysis. Reports are advisory.
          </p>
        </div>

      </main>

      {/* 3. RIGHT COLLAPSIBLE SIDEBAR PANEL */}
      {isSidebarOpen && activeMessage?.evaluation && (
        <Sidebar 
          evaluation={activeMessage.evaluation} 
          onClose={() => setSidebarOpen(false)} 
        />
      )}

    </div>
  );
}
