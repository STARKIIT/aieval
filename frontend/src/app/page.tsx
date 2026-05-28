'use client';

import React, { useEffect, useRef, useState } from 'react';
import { useStore, Message } from '@/store/useStore';
import { Highlighting } from '@/components/Highlighting';
import { Sidebar } from '@/components/Sidebar';
import { 
  Send, 
  Sparkles, 
  ChevronRight, 
  Loader2, 
  Trash2, 
  Shield, 
  ShieldCheck,
  Zap,
  Menu,
  Plus,
  MessageSquare,
  HelpCircle,
  Clock,
  Settings,
  X,
  ChevronDown,
  Search,
  ArrowUp
} from 'lucide-react';

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:3001/api';

const STARTER_PROMPTS = [
  {
    title: "Analyze Logic Flaws",
    desc: "Test the argument: 'All dogs are animals, therefore all animals are dogs.'",
    prompt: "Evaluate the logic of this statement: 'All dogs are animals, therefore all animals are dogs.'",
    icon: "🧠"
  },
  {
    title: "Audit Implicit Assumptions",
    desc: "Examine underlying risks in standard commercial real estate investment projections.",
    prompt: "Provide investment advice for commercial real estate in urban centers. Highlight any assumptions you are making.",
    icon: "💡"
  },
  {
    title: "Verify Factual Claims",
    desc: "Audit the grounding of battery range and efficiency statistics for EVs.",
    prompt: "Compare electric vehicle battery technologies and state their range metrics and charging efficiencies.",
    icon: "🔍"
  },
  {
    title: "Inspect Framing Biases",
    desc: "Examine loaded perspectives in arguments for nuclear energy policy.",
    prompt: "Explain why nuclear energy is the absolute best option for carbon-free baseload power, making it sound very convincing.",
    icon: "⚖️"
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
  
  // Interactive Refinement state hooks
  const [openRefinementMsgId, setOpenRefinementMsgId] = useState<string | null>(null);
  const [refinementAdjustments, setRefinementAdjustments] = useState<Record<string, { selected: boolean; modification: string }>>({});
  const [refinementFeedback, setRefinementFeedback] = useState('');
  
  const chatEndRef = useRef<HTMLDivElement>(null);
  const modelDropdownRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Helper to harvest audit findings from evaluation report for refinement selection
  const getAuditFindings = (evaluation: any) => {
    const list: { id: string; type: 'assumption' | 'logic' | 'hallucination' | 'calibration'; original: string; label: string }[] = [];
    if (!evaluation) return list;
    
    if (evaluation.assumptions) {
      evaluation.assumptions.forEach((a: any, idx: number) => {
        list.push({
          id: `ass-${idx}`,
          type: 'assumption',
          original: a.statement,
          label: `Implicit Assumption: "${a.statement}" (${a.risk} risk)`
        });
      });
    }
    
    if (evaluation.logicFlaws) {
      evaluation.logicFlaws.forEach((l: any, idx: number) => {
        list.push({
          id: `log-${idx}`,
          type: 'logic',
          original: l.flaw,
          label: `Logic Flaw: "${l.flaw}" (${l.severity} severity)`
        });
      });
    }
    
    if (evaluation.hallucinations) {
      evaluation.hallucinations.forEach((h: any, idx: number) => {
        list.push({
          id: `hal-${idx}`,
          type: 'hallucination',
          original: h.claim,
          label: `Factual Claim: "${h.claim}"`
        });
      });
    }

    if (evaluation.calibration) {
      evaluation.calibration.forEach((c: any, idx: number) => {
        if (c.status === 'OVERCONFIDENT' || c.status === 'UNDERCONFIDENT') {
          list.push({
            id: `cal-${idx}`,
            type: 'calibration',
            original: c.claim,
            label: `${c.status === 'OVERCONFIDENT' ? 'Overconfident' : 'Underconfident'} Claim: "${c.claim}" (Certainty: ${c.certainty}%)`
          });
        }
      });
    }
    
    return list;
  };

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

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 160) + 'px';
    }
  }, [prompt]);

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

  // Submit Prompt to API (supports optional refinement parameters)
  const handleSend = async (
    e: React.FormEvent, 
    customPrompt?: string,
    refinement?: {
      messageId: string;
      adjustments: { type: string; original: string; modification: string }[];
      customFeedback?: string;
    }
  ) => {
    if (e) e.preventDefault();
    
    let activePrompt = customPrompt || prompt;
    
    // If refining, find the user prompt that generated the target AI response
    if (refinement) {
      const aiMsgIndex = messages.findIndex(m => m.id === refinement.messageId);
      if (aiMsgIndex > 0) {
        const prevUserMsg = messages.slice(0, aiMsgIndex).reverse().find(m => m.sender === 'user');
        if (prevUserMsg) {
          activePrompt = prevUserMsg.content;
        }
      }
    }

    if (!activePrompt.trim() && !refinement) return;
    if (isGenerating || isEvaluating) return;

    setErrorMsg(null);

    // 1. Add user message locally (using refinement description if active)
    const displayPrompt = refinement 
      ? (refinement.customFeedback || 'Refined previous response based on audit findings') 
      : activePrompt;

    const userMsg: Message = {
      id: `user-${Date.now()}`,
      sender: 'user',
      content: displayPrompt,
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
          prompt: activePrompt, // Original base prompt
          refinement
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
      
      {/* ═══ 1. LEFT COLLAPSIBLE NAVIGATION DRAWER ═══ */}
      <aside 
        className={`h-full flex flex-col justify-between shrink-0 transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] relative z-30 ${
          isLeftSidebarExpanded ? 'w-[264px]' : 'w-[68px]'
        }`}
        style={{ background: '#1e1f20' }}
      >
        {/* Top Section */}
        <div className="flex flex-col p-3 space-y-3">
          
          {/* Hamburger & Brand */}
          <div className="flex items-center gap-2.5 px-1">
            <button 
              onClick={() => setIsLeftSidebarExpanded(!isLeftSidebarExpanded)}
              className="p-2.5 hover:bg-[#2d2f31] rounded-full text-[#9aa0a6] hover:text-[#e3e3e3] transition-all duration-200"
              title={isLeftSidebarExpanded ? "Collapse Sidebar" : "Expand Sidebar"}
            >
              <Menu className="h-[18px] w-[18px]" />
            </button>
            
            {isLeftSidebarExpanded && (
              <span className="font-semibold text-[13px] tracking-tight text-white/90 flex items-center gap-1.5 animate-fadeIn select-none">
                <Sparkles className="h-[18px] w-[18px] text-[#8ab4f8]" />
                TrustLayer AI
              </span>
            )}
          </div>

          {/* New Chat Button */}
          {isLeftSidebarExpanded ? (
            <button
              onClick={handleNewChat}
              className="flex items-center gap-3 w-full px-4 py-2.5 bg-[#131314]/30 hover:bg-[#2d2f31] border border-[#36383a]/60 rounded-full text-[13px] font-medium text-[#c4c7c5] hover:text-white transition-all duration-200 animate-fadeIn"
            >
              <Plus className="h-[18px] w-[18px] text-[#8ab4f8]" />
              New chat
            </button>
          ) : (
            <button
              onClick={handleNewChat}
              className="flex items-center justify-center w-10 h-10 hover:bg-[#2d2f31] rounded-full text-[#8ab4f8] transition-all duration-200 mx-auto"
              title="New Chat"
            >
              <Plus className="h-5 w-5" />
            </button>
          )}

          {/* Recent History Section */}
          {isLeftSidebarExpanded && (
            <div className="flex flex-col pt-3 space-y-0.5 animate-fadeIn max-h-[calc(100vh-320px)] overflow-y-auto scrollbar-none">
              <span className="text-[11px] font-semibold text-[#9aa0a6] tracking-wide px-3 pb-2 uppercase">Recent</span>
              {sessionsList.length === 0 ? (
                <span className="text-[12px] text-[#9aa0a6]/60 px-3 italic">No past sessions</span>
              ) : (
                sessionsList.map((session) => {
                  const isActive = sessionId === session.id;
                  return (
                    <div
                      key={session.id}
                      onClick={() => handleSelectSession(session.id)}
                      className={`group flex items-center justify-between px-3 py-2.5 rounded-[22px] text-[13px] cursor-pointer transition-all duration-150 relative ${
                        isActive 
                          ? 'bg-[#2d2f31] text-white font-medium' 
                          : 'text-[#c4c7c5] hover:bg-[#2d2f31]/50 hover:text-[#e3e3e3]'
                      }`}
                    >
                      <span className="flex items-center gap-2.5 truncate pr-6">
                        <MessageSquare className="h-[14px] w-[14px] shrink-0 opacity-60" />
                        <span className="truncate">{session.title}</span>
                      </span>
                      
                      <button
                        onClick={(e) => handleDeleteSession(session.id, e)}
                        className="opacity-0 group-hover:opacity-100 hover:text-rose-400 p-1.5 rounded-full transition-all duration-150 shrink-0 hover:bg-[#131314]/50 absolute right-1.5"
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

          {/* Collapsed: show session icons */}
          {!isLeftSidebarExpanded && (
            <div className="flex flex-col items-center space-y-1 pt-2">
              <button className="p-2.5 hover:bg-[#2d2f31] rounded-full text-[#9aa0a6] hover:text-[#e3e3e3] transition-all" title="Recent Chats">
                <Clock className="h-[18px] w-[18px]" />
              </button>
              <button className="p-2.5 hover:bg-[#2d2f31] rounded-full text-[#9aa0a6] hover:text-[#e3e3e3] transition-all" title="Search">
                <Search className="h-[18px] w-[18px]" />
              </button>
            </div>
          )}
        </div>

        {/* Bottom Section */}
        <div className="flex flex-col p-3 space-y-1">
          
          <button 
            className="flex items-center gap-3 px-3 py-2.5 hover:bg-[#2d2f31] rounded-full text-[13px] text-[#c4c7c5] hover:text-[#e3e3e3] transition-all duration-150"
            title="Help"
          >
            <HelpCircle className="h-[18px] w-[18px]" />
            {isLeftSidebarExpanded && <span>Help</span>}
          </button>
          
          <button 
            className="flex items-center gap-3 px-3 py-2.5 hover:bg-[#2d2f31] rounded-full text-[13px] text-[#c4c7c5] hover:text-[#e3e3e3] transition-all duration-150"
            title="Activity"
          >
            <Clock className="h-[18px] w-[18px]" />
            {isLeftSidebarExpanded && <span>Activity</span>}
          </button>
          
          <button 
            className="flex items-center gap-3 px-3 py-2.5 hover:bg-[#2d2f31] rounded-full text-[13px] text-[#c4c7c5] hover:text-[#e3e3e3] transition-all duration-150"
            title="Settings"
          >
            <Settings className="h-[18px] w-[18px]" />
            {isLeftSidebarExpanded && <span>Settings</span>}
          </button>

          {/* Profile Bubble */}
          <div className="flex items-center gap-3 px-2 py-2.5 mt-1">
            <div className="h-8 w-8 rounded-full bg-gradient-to-br from-[#8ab4f8]/30 to-[#4b90ff]/20 border border-[#8ab4f8]/25 text-[#8ab4f8] flex items-center justify-center font-semibold text-[11px] shrink-0 select-none">
              BL
            </div>
            {isLeftSidebarExpanded && (
              <div className="flex flex-col leading-tight animate-fadeIn truncate">
                <span className="text-[13px] font-medium text-white/90">Boragala Likhit</span>
                <span className="text-[11px] text-[#9aa0a6] truncate">Auditor Account</span>
              </div>
            )}
          </div>

        </div>
      </aside>

      {/* ═══ 2. MAIN WORKSPACE AREA ═══ */}
      <main className="flex-1 flex flex-col min-h-0 overflow-hidden relative">
        
        {/* Top Navbar */}
        <header className="h-[56px] flex items-center justify-between px-4 md:px-6 shrink-0 z-20">
          <div className="flex items-center gap-2">
            {/* Hamburger (visible when collapsed) */}
            {!isLeftSidebarExpanded && (
              <button 
                onClick={() => setIsLeftSidebarExpanded(true)}
                className="p-2.5 hover:bg-[#2d2f31] rounded-full text-[#9aa0a6] hover:text-[#e3e3e3] transition-all duration-200 mr-1"
                title="Expand Sidebar"
              >
                <Menu className="h-[18px] w-[18px]" />
              </button>
            )}
            
            {/* Model Selector Dropdown */}
            <div className="relative" ref={modelDropdownRef}>
              <button
                onClick={() => setIsModelDropdownOpen(!isModelDropdownOpen)}
                className="flex items-center gap-1.5 px-4 py-2 hover:bg-[#2d2f31] rounded-full text-[14px] font-medium text-[#c4c7c5] hover:text-white transition-all duration-150 cursor-pointer"
              >
                {selectedModel === 'gemini' ? (
                  <Sparkles className="h-4 w-4 text-[#8ab4f8]" />
                ) : (
                  <Zap className="h-4 w-4 text-[#d7aef8]" />
                )}
                {selectedModelLabel}
                <ChevronDown className={`h-3.5 w-3.5 opacity-50 ml-0.5 transition-transform duration-200 ${isModelDropdownOpen ? 'rotate-180' : ''}`} />
              </button>
              
              {isModelDropdownOpen && (
                <div className="absolute left-0 mt-1.5 w-[240px] glass-surface border border-[#36383a] rounded-xl shadow-2xl z-50 p-1.5 animate-fadeIn">
                  <button
                    onClick={() => {
                      setSelectedModel('gemini');
                      setIsModelDropdownOpen(false);
                    }}
                    className={`w-full flex items-center gap-3 px-3 py-3 rounded-lg text-left text-[13px] font-medium transition-all duration-150 ${
                      selectedModel === 'gemini' 
                        ? 'bg-[#8ab4f8]/10 text-[#8ab4f8]' 
                        : 'text-[#c4c7c5] hover:bg-[#2d2f31]/60 hover:text-white'
                    }`}
                  >
                    <div className="h-8 w-8 rounded-full bg-[#8ab4f8]/10 flex items-center justify-center shrink-0">
                      <Sparkles className="h-4 w-4 text-[#8ab4f8]" />
                    </div>
                    <div>
                      <span className="block font-semibold text-[13px]">Gemini 2.5 Flash</span>
                      <span className="block text-[11px] opacity-60 font-normal">Google's fast, multimodal model</span>
                    </div>
                  </button>
                  <button
                    onClick={() => {
                      setSelectedModel('groq');
                      setIsModelDropdownOpen(false);
                    }}
                    className={`w-full flex items-center gap-3 px-3 py-3 rounded-lg text-left text-[13px] font-medium transition-all duration-150 ${
                      selectedModel === 'groq' 
                        ? 'bg-[#d7aef8]/10 text-[#d7aef8]' 
                        : 'text-[#c4c7c5] hover:bg-[#2d2f31]/60 hover:text-white'
                    }`}
                  >
                    <div className="h-8 w-8 rounded-full bg-[#d7aef8]/10 flex items-center justify-center shrink-0">
                      <Zap className="h-4 w-4 text-[#d7aef8]" />
                    </div>
                    <div>
                      <span className="block font-semibold text-[13px]">Llama 3.3 (Groq)</span>
                      <span className="block text-[11px] opacity-60 font-normal">Meta's 70B parameter engine</span>
                    </div>
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Right Header Actions */}
          <div className="flex items-center gap-2">
            
            {errorMsg && (
              <span className="text-[11px] text-rose-400 bg-rose-500/10 border border-rose-500/20 px-3 py-1 rounded-full animate-pulse font-medium">
                Offline
              </span>
            )}

            {/* Sidebar toggle (visible if active evaluation exists) */}
            {activeMessage?.evaluation && (
              <button
                onClick={() => setSidebarOpen(!isSidebarOpen)}
                className={`flex items-center gap-1.5 px-3.5 py-2 rounded-full text-[12px] font-semibold transition-all duration-200 ${
                  isSidebarOpen 
                    ? 'bg-[#8ab4f8]/10 text-[#8ab4f8]' 
                    : 'text-[#c4c7c5] hover:text-white hover:bg-[#2d2f31]'
                }`}
                title="Toggle Trust Evaluation Sidebar"
              >
                <Shield className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Output Eval</span>
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
              className="p-2.5 hover:bg-[#2d2f31] rounded-full text-[#9aa0a6] hover:text-white transition-all duration-150"
            >
              <Trash2 className="h-4 w-4" />
            </button>
            
            {/* Profile badge */}
            <div className="h-8 w-8 rounded-full bg-gradient-to-br from-[#d7aef8]/25 to-[#9106ff]/15 border border-[#d7aef8]/25 text-[#d7aef8] flex items-center justify-center font-semibold text-[11px] select-none cursor-default">
              TL
            </div>
          </div>
        </header>

        {/* ═══ Scrollable Chat Pane ═══ */}
        <div className="flex-1 overflow-y-auto min-h-0 px-4 md:px-8 py-6 scrollbar-thin relative">
          
          {/* Gemini ambient glow (only on empty state) */}
          {messages.length === 0 && (
            <div className="absolute inset-0 pointer-events-none overflow-hidden select-none">
              {/* Center Indigo/Blue Glow */}
              <div 
                className="absolute w-[600px] h-[600px] rounded-full animate-glow-1"
                style={{
                  background: 'radial-gradient(circle, rgba(66, 133, 244, 0.16) 0%, rgba(66, 133, 244, 0) 70%)',
                  left: 'calc(50% - 300px)',
                  top: 'calc(45% - 300px)',
                  filter: 'blur(100px)',
                }}
              />
              {/* Left Purple/Violet Glow */}
              <div 
                className="absolute w-[450px] h-[450px] rounded-full animate-glow-2"
                style={{
                  background: 'radial-gradient(circle, rgba(145, 6, 255, 0.10) 0%, rgba(145, 6, 255, 0) 75%)',
                  left: '15%',
                  top: '25%',
                  filter: 'blur(90px)',
                }}
              />
              {/* Right Pink/Amber Glow */}
              <div 
                className="absolute w-[400px] h-[400px] rounded-full animate-glow-3"
                style={{
                  background: 'radial-gradient(circle, rgba(255, 85, 70, 0.08) 0%, rgba(255, 85, 70, 0) 70%)',
                  right: '15%',
                  top: '35%',
                  filter: 'blur(80px)',
                }}
              />
            </div>
          )}

          {messages.length === 0 ? (
            
            /* ─── GREETING SCREEN & STARTER CARDS ─── */
            <div className="h-full max-w-[640px] mx-auto flex flex-col items-center justify-center py-8 space-y-10 animate-fadeIn relative z-10">
              
              {/* Gradient Greeting */}
              <div className="text-center space-y-4">
                <h1 
                  className="text-[42px] md:text-[52px] font-medium tracking-[-0.025em] leading-[1.05] py-1 select-none"
                  style={{
                    background: 'linear-gradient(135deg, #4b90ff 0%, #ff5546 45%, #d946ef 70%, #9106ff 100%)',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    backgroundClip: 'text',
                  }}
                >
                  What can I evaluate today?
                </h1>
                <p className="text-[15px] text-[#9aa0a6] font-normal leading-relaxed max-w-[480px] mx-auto">
                  Audit factual grounding, logical consistency, bias risk, and implicit conditions in AI outputs.
                </p>
              </div>

              {/* Starter Suggestions Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full">
                {STARTER_PROMPTS.map((starter, index) => (
                  <div
                    key={index}
                    onClick={(e) => handleSend(e, starter.prompt)}
                    className="group p-4 bg-[#1e1f20]/60 hover:bg-[#1e1f20] border border-[#2c2e30]/40 hover:border-[#36383a] rounded-2xl cursor-pointer transition-all duration-200 flex flex-col justify-between min-h-[100px]"
                  >
                    <div>
                      <div className="flex items-center gap-2 mb-1.5">
                        <span className="text-[15px]">{starter.icon}</span>
                        <h3 className="text-[13px] font-semibold text-[#e3e3e3]">{starter.title}</h3>
                      </div>
                      <p className="text-[12px] text-[#9aa0a6] leading-relaxed line-clamp-2">{starter.desc}</p>
                    </div>
                    <div className="flex justify-end mt-2">
                      <span className="p-1.5 bg-[#131314]/60 text-[#8ab4f8] rounded-full opacity-0 group-hover:opacity-100 transition-all duration-200">
                        <ArrowUp className="h-3 w-3" />
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            
            /* ─── BORDERLESS MESSAGES FLOW ─── */
            <div className="max-w-[680px] mx-auto space-y-8">
              {messages.map((msg) => (
                <div key={msg.id} className="animate-fadeIn">
                  
                  {/* Avatar Row */}
                  <div className="flex items-center gap-2.5 mb-3">
                    {msg.sender === 'user' ? (
                      <div className="h-7 w-7 rounded-full bg-[#8ab4f8]/15 text-[#8ab4f8] flex items-center justify-center font-semibold text-[10px] shrink-0 select-none">
                        You
                      </div>
                    ) : (
                      <div className="h-7 w-7 rounded-full bg-gradient-to-br from-[#4b90ff] via-[#8ab4f8] to-[#9106ff] text-white flex items-center justify-center p-[5px] shrink-0">
                        <Sparkles className="h-3.5 w-3.5" />
                      </div>
                    )}
                    <span className="text-[13px] font-semibold text-white/90">
                      {msg.sender === 'user' ? 'You' : 'TrustLayer AI'}
                    </span>
                    <span className="text-[11px] text-[#9aa0a6] font-normal">
                      {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>

                  {/* Content */}
                  <div className="pl-[38px]">
                    {msg.sender === 'user' ? (
                      <p className="text-[15px] text-[#e3e3e3] leading-[1.7] whitespace-pre-wrap">
                        {msg.content}
                      </p>
                    ) : (
                      <Highlighting content={msg.content} evaluation={msg.evaluation} />
                    )}

                    {/* Trust audit sub-bar */}
                    {msg.sender === 'ai' && (
                      <div className="pt-4 mt-5 border-t border-[#2c2e30]/30 flex flex-wrap items-center justify-between gap-3">
                        {msg.evaluation ? (
                          <>
                            <div className="flex items-center gap-2">
                              <ShieldCheck className="h-3.5 w-3.5 text-[#8ab4f8]" />
                              <span className="text-[12px] text-[#9aa0a6] font-medium">Trust Score</span>
                              <span className={`text-[12px] font-bold font-mono px-2.5 py-0.5 rounded-full ${
                                msg.evaluation.overallReliability === 'HIGH' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/15' :
                                msg.evaluation.overallReliability === 'MEDIUM' ? 'bg-amber-500/10 text-amber-400 border border-amber-500/15' :
                                'bg-rose-500/10 text-rose-400 border border-rose-500/15'
                              }`}>
                                {msg.evaluation.trustScore}% · {msg.evaluation.overallReliability}
                              </span>
                            </div>

                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => {
                                  setActiveMessageId(msg.id);
                                  setSidebarOpen(true);
                                }}
                                className="flex items-center gap-1.5 px-3 py-1.5 text-[12px] font-medium text-[#9aa0a6] hover:text-white hover:bg-[#1e1f20] rounded-full transition-all duration-150 border border-[#2c2e30]/40"
                              >
                                Inspect Analysis
                                <ChevronRight className="h-3 w-3" />
                              </button>

                              <button
                                onClick={() => {
                                  setOpenRefinementMsgId(openRefinementMsgId === msg.id ? null : msg.id);
                                  setRefinementAdjustments({});
                                  setRefinementFeedback('');
                                }}
                                className={`flex items-center gap-1.5 px-3 py-1.5 text-[12px] font-medium rounded-full transition-all duration-150 border ${
                                  openRefinementMsgId === msg.id 
                                    ? 'bg-[#8ab4f8]/10 text-[#8ab4f8] border-[#8ab4f8]/30'
                                    : 'text-[#8ab4f8] hover:text-white hover:bg-[#8ab4f8]/10 border-[#8ab4f8]/20'
                                }`}
                              >
                                <Sparkles className="h-3.5 w-3.5" />
                                Adjust Findings
                              </button>
                            </div>
                          </>
                        ) : (
                          <span className="text-[12px] text-[#9aa0a6]/50 italic">No evaluation report.</span>
                        )}
                      </div>
                    )}

                    {/* Collapsible Refinement Panel */}
                    {openRefinementMsgId === msg.id && msg.evaluation && (
                      <div className="mt-4 p-4 bg-[#1e1f20]/60 border border-[#2c2e30]/50 rounded-2xl space-y-4 animate-fadeIn select-none">
                        <div className="flex items-center justify-between border-b border-[#2c2e30]/40 pb-2">
                          <h4 className="text-[13px] font-semibold text-white">✨ Adjust Audit Findings & Re-evaluate</h4>
                          <button 
                            onClick={() => setOpenRefinementMsgId(null)}
                            className="text-[#9aa0a6] hover:text-white"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        </div>

                        <p className="text-[12px] text-[#9aa0a6] leading-relaxed">
                          Select the specific assumptions, logic flaws, or factual details you want to modify, and specify your corrections:
                        </p>

                        <div className="space-y-3 max-h-[220px] overflow-y-auto pr-1">
                          {getAuditFindings(msg.evaluation).map((finding) => {
                            const isSelected = !!refinementAdjustments[finding.id]?.selected;
                            return (
                              <div key={finding.id} className="space-y-2 p-3 bg-[#131314]/30 rounded-xl border border-[#2c2e30]/30 transition duration-150">
                                <label className="flex items-start gap-2.5 cursor-pointer">
                                  <input 
                                    type="checkbox"
                                    checked={isSelected}
                                    onChange={(e) => {
                                      setRefinementAdjustments(prev => ({
                                        ...prev,
                                        [finding.id]: {
                                          selected: e.target.checked,
                                          modification: prev[finding.id]?.modification || ''
                                        }
                                      }));
                                    }}
                                    className="mt-0.5 rounded border-[#2c2e30]/60 bg-[#1e1f20] text-[#8ab4f8] focus:ring-0 focus:ring-offset-0 h-4 w-4"
                                  />
                                  <span className="text-[12px] text-[#e3e3e3] leading-snug">{finding.label}</span>
                                </label>
                                
                                {isSelected && (
                                  <input 
                                    type="text"
                                    placeholder="e.g. Change parameter / Set new condition / Adjust factual ground"
                                    value={refinementAdjustments[finding.id]?.modification || ''}
                                    onChange={(e) => {
                                      setRefinementAdjustments(prev => ({
                                        ...prev,
                                        [finding.id]: {
                                          ...prev[finding.id],
                                          modification: e.target.value
                                        }
                                      }));
                                    }}
                                    className="w-full text-[12px] bg-[#131314] border border-[#2c2e30]/80 rounded-lg px-3 py-1.5 text-white placeholder-[#9aa0a6]/50 focus:outline-none focus:border-[#8ab4f8]/50"
                                  />
                                )}
                              </div>
                            );
                          })}
                          {getAuditFindings(msg.evaluation).length === 0 && (
                            <p className="text-[12px] text-[#9aa0a6] italic">No findings or implicit assumptions detected to adjust.</p>
                          )}
                        </div>

                        {/* Custom guidelines */}
                        <div className="space-y-1.5">
                          <label className="text-[11px] font-semibold text-[#9aa0a6] uppercase tracking-wide">Additional Guidelines (Optional)</label>
                          <textarea 
                            rows={2}
                            placeholder="e.g. Keep the output professional and focus on structural solutions..."
                            value={refinementFeedback}
                            onChange={(e) => setRefinementFeedback(e.target.value)}
                            className="w-full text-[12px] bg-[#131314] border border-[#2c2e30]/60 rounded-lg p-2.5 text-white placeholder-[#9aa0a6]/50 focus:outline-none focus:border-[#8ab4f8]/50 resize-none leading-relaxed"
                          />
                        </div>

                        <div className="flex justify-end gap-2 pt-2 border-t border-[#2c2e30]/40">
                          <button
                            onClick={() => {
                              setOpenRefinementMsgId(null);
                              setRefinementAdjustments({});
                              setRefinementFeedback('');
                            }}
                            className="px-3.5 py-1.5 text-[12px] font-medium text-[#9aa0a6] hover:text-white rounded-lg transition"
                          >
                            Cancel
                          </button>
                          <button
                            onClick={async () => {
                              const selectedList = getAuditFindings(msg.evaluation)
                                .filter(f => refinementAdjustments[f.id]?.selected)
                                .map(f => ({
                                  type: f.type,
                                  original: f.original,
                                  modification: refinementAdjustments[f.id]?.modification || 'Address this finding'
                                }));
                              
                              setOpenRefinementMsgId(null);
                              setRefinementAdjustments({});
                              setRefinementFeedback('');
                              
                              await handleSend(null as any, undefined, {
                                messageId: msg.id,
                                adjustments: selectedList,
                                customFeedback: refinementFeedback
                              });
                            }}
                            className="px-4 py-1.5 text-[12px] font-semibold bg-[#8ab4f8] hover:bg-[#aecbfa] text-[#131314] rounded-lg transition"
                          >
                            Regenerate Response
                          </button>
                        </div>
                      </div>
                    )}
                  </div>

                </div>
              ))}

              {/* Loading Skeleton */}
              {isGenerating && (
                <div className="space-y-3 animate-fadeIn">
                  <div className="flex items-center gap-2.5">
                    <div className="h-7 w-7 rounded-full bg-gradient-to-br from-[#4b90ff] to-[#9106ff] flex items-center justify-center p-[5px]">
                      <Sparkles className="h-3.5 w-3.5 text-white" />
                    </div>
                    <span className="text-[13px] font-semibold text-white/90">TrustLayer AI</span>
                  </div>
                  <div className="pl-[38px] space-y-2.5">
                    <div className="h-4 w-full animate-shimmer rounded-lg" />
                    <div className="h-4 w-[85%] animate-shimmer rounded-lg" />
                    <div className="h-4 w-[60%] animate-shimmer rounded-lg" />
                  </div>
                </div>
              )}

              <div ref={chatEndRef} />
            </div>
          )}
        </div>

        {/* ═══ Bottom Prompt Composer ═══ */}
        <div className="px-4 md:px-6 pb-4 pt-2 shrink-0 z-20">
          <form onSubmit={(e) => handleSend(e)} className="max-w-[680px] mx-auto">
            <div className="flex items-end gap-2 bg-[#1e1f20] border border-[#36383a]/60 rounded-3xl px-4 py-3 transition-all duration-200 hover:border-[#36383a] focus-within:border-[#8ab4f8]/40 focus-within:shadow-[0_0_0_1px_rgba(138,180,248,0.15)]">
              
              {/* Attach Icon */}
              <button
                type="button"
                className="p-1.5 hover:bg-[#2d2f31] text-[#9aa0a6] hover:text-[#e3e3e3] rounded-full mb-0.5 shrink-0 transition-all duration-150"
                title="Add attachment"
              >
                <Plus className="h-5 w-5" />
              </button>

              {/* Textarea */}
              <textarea
                ref={textareaRef}
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
                className="flex-1 max-h-[160px] min-h-[24px] py-1 px-1 bg-transparent border-none focus:outline-none resize-none text-[15px] text-[#e3e3e3] placeholder-[#9aa0a6]/50 leading-relaxed scrollbar-none"
              />

              {/* Send Button */}
              <button
                type="submit"
                disabled={!prompt.trim() || isGenerating || isEvaluating}
                className={`p-2.5 rounded-full transition-all duration-200 shrink-0 ${
                  prompt.trim() && !isGenerating && !isEvaluating
                    ? 'bg-white text-[#131314] hover:bg-white/90 shadow-sm'
                    : 'bg-[#36383a]/60 text-[#9aa0a6]/40 cursor-not-allowed'
                }`}
              >
                {isGenerating || isEvaluating ? (
                  <Loader2 className="h-[18px] w-[18px] animate-spin" />
                ) : (
                  <ArrowUp className="h-[18px] w-[18px]" />
                )}
              </button>

            </div>
          </form>
          
          <p className="text-center text-[11px] text-[#9aa0a6]/50 mt-3 font-normal select-none">
            Click highlight markers to expand evaluation sidebar analysis. Reports are advisory.
          </p>
        </div>

      </main>

      {/* ═══ 3. RIGHT EVALUATION SIDEBAR ═══ */}
      {isSidebarOpen && activeMessage?.evaluation && (
        <Sidebar 
          evaluation={activeMessage.evaluation} 
          onClose={() => setSidebarOpen(false)} 
        />
      )}

    </div>
  );
}
