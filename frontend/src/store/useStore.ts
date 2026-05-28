import { create } from 'zustand';

export interface Message {
  id: string;
  sender: 'user' | 'ai';
  content: string;
  createdAt: string;
  evaluation?: EvaluationReport;
}

export interface EvaluationReport {
  overallReliability: 'LOW' | 'MEDIUM' | 'HIGH';
  trustScore: number; // 0-100
  logicScore: number; // 0-100
  hallucinationScore: number; // 0-100 (risk)
  calibrationScore: number; // 0-100
  summary: string;
  chainOfThought: string; // Reconstructed step-by-step reasoning
  
  // LLM-as-a-Judge Meta Evaluation
  coherence: 'POOR' | 'FAIR' | 'GOOD' | 'EXCELLENT';
  clarity: 'POOR' | 'FAIR' | 'GOOD' | 'EXCELLENT';
  completeness: 'POOR' | 'FAIR' | 'GOOD' | 'EXCELLENT';
  usefulness: 'POOR' | 'FAIR' | 'GOOD' | 'EXCELLENT';

  assumptions: {
    statement: string;
    risk: 'LOW' | 'MEDIUM' | 'HIGH';
    reason: string;
    claim?: string; // Optional sentence segment where this is made
  }[];
  hallucinations: {
    claim: string;
    isSupported: boolean;
    evidenceCode: 'SUPPORTED' | 'UNSUPPORTED' | 'CONTRADICTED';
    reason: string;
    startIndex: number;
    endIndex: number;
  }[];
  logicFlaws: {
    flaw: string;
    severity: 'LOW' | 'MEDIUM' | 'HIGH';
    explanation: string;
    claim?: string; // Optional sentence segment where this occurs
  }[];
  calibration: {
    claim: string;
    certainty: number; // 0-100
    evidenceStrength: 'WEAK' | 'MODERATE' | 'STRONG';
    status: 'CALIBRATED' | 'OVERCONFIDENT' | 'UNDERCONFIDENT';
  }[];
  bias: {
    type: string;
    evidence: string;
    severity: 'LOW' | 'MEDIUM' | 'HIGH';
  }[];
}

interface WorkspaceState {
  sessionId: string;
  messages: Message[];
  activeMessageId: string | null;
  isSidebarOpen: boolean;
  activeTab: string;
  selectedModel: 'gemini' | 'groq';
  isGenerating: boolean;
  isEvaluating: boolean;
  
  // Actions
  setSessionId: (id: string) => void;
  setMessages: (messages: Message[]) => void;
  addMessage: (message: Message) => void;
  updateMessageEvaluation: (messageId: string, evaluation: EvaluationReport) => void;
  setActiveMessageId: (id: string | null) => void;
  setSidebarOpen: (isOpen: boolean) => void;
  setActiveTab: (tab: string) => void;
  setSelectedModel: (model: 'gemini' | 'groq') => void;
  setGenerating: (isGenerating: boolean) => void;
  setEvaluating: (isEvaluating: boolean) => void;
  clearWorkspace: () => void;
}

export const useStore = create<WorkspaceState>((set) => ({
  sessionId: '',
  messages: [],
  activeMessageId: null,
  isSidebarOpen: false,
  activeTab: 'overview',
  selectedModel: 'gemini',
  isGenerating: false,
  isEvaluating: false,

  setSessionId: (sessionId) => set({ sessionId }),
  setMessages: (messages) => set({ messages }),
  addMessage: (message) => set((state) => ({ 
    messages: [...state.messages, message] 
  })),
  updateMessageEvaluation: (messageId, evaluation) => set((state) => ({
    messages: state.messages.map((msg) => 
      msg.id === messageId ? { ...msg, evaluation } : msg
    )
  })),
  setActiveMessageId: (activeMessageId) => set({ activeMessageId }),
  setSidebarOpen: (isSidebarOpen) => set({ isSidebarOpen }),
  setActiveTab: (activeTab) => set({ activeTab }),
  setSelectedModel: (selectedModel) => set({ selectedModel }),
  setGenerating: (isGenerating) => set({ isGenerating }),
  setEvaluating: (isEvaluating) => set({ isEvaluating }),
  clearWorkspace: () => set({ messages: [], activeMessageId: null, isSidebarOpen: false })
}));
