import { describe, it, expect, beforeEach } from 'vitest';
import { useStore } from '../store/useStore';
import { mockEvaluationReport } from '../mockData';

describe('Frontend Store State Transitions', () => {
  
  beforeEach(() => {
    // Reset store before each test
    useStore.getState().clearWorkspace();
    useStore.getState().setSessionId('test-session');
    useStore.getState().setSelectedModel('gemini');
    useStore.getState().setGenerating(false);
    useStore.getState().setEvaluating(false);
    useStore.getState().setActiveTab('overview');
  });

  it('should initialize with default states', () => {
    const state = useStore.getState();
    expect(state.messages).toEqual([]);
    expect(state.selectedModel).toBe('gemini');
    expect(state.isSidebarOpen).toBe(false);
    expect(state.activeTab).toBe('overview');
    expect(state.isGenerating).toBe(false);
  });

  it('should change active LLM routing models', () => {
    useStore.getState().setSelectedModel('groq');
    expect(useStore.getState().selectedModel).toBe('groq');
  });

  it('should toggle sidebar and update active evaluation tabs', () => {
    useStore.getState().setSidebarOpen(true);
    expect(useStore.getState().isSidebarOpen).toBe(true);

    useStore.getState().setActiveTab('hallucinations');
    expect(useStore.getState().activeTab).toBe('hallucinations');
  });

  it('should add chat messages to message history', () => {
    const msg = {
      id: 'msg-1',
      sender: 'user' as const,
      content: 'Run calibration test',
      createdAt: new Date().toISOString()
    };
    
    useStore.getState().addMessage(msg);
    expect(useStore.getState().messages).toHaveLength(1);
    expect(useStore.getState().messages[0].content).toBe('Run calibration test');
  });

  it('should append evaluation reports to responses', () => {
    const msg = {
      id: 'msg-ai',
      sender: 'ai' as const,
      content: 'This is the AI response',
      createdAt: new Date().toISOString()
    };

    useStore.getState().addMessage(msg);
    useStore.getState().updateMessageEvaluation('msg-ai', mockEvaluationReport);

    const updatedMessage = useStore.getState().messages[0];
    expect(updatedMessage.evaluation).toBeDefined();
    expect(updatedMessage.evaluation?.trustScore).toBe(68);
    expect(updatedMessage.evaluation?.overallReliability).toBe('MEDIUM');
  });
});
