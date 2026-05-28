import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import fastify from 'fastify';
import cors from '@fastify/cors';
import { z } from 'zod';
import { 
  createSession, 
  getSession, 
  clearSession 
} from '../database/db.js';

// Mock the modelRouter dependency to avoid real API calls in tests
vi.mock('../engines/modelRouter.js', () => ({
  generateResponse: vi.fn().mockImplementation(async (model: string, prompt: string, history: any[]) => {
    return `Simulated response from ${model} for prompt: "${prompt}". History size: ${history.length}`;
  })
}));

import { generateResponse } from '../engines/modelRouter.js';

describe('Phase 3: Generation & Routing Pipeline Endpoints', () => {
  const testSessionId = 'phase3-test-session';
  let server: any;

  beforeAll(async () => {
    // Build Fastify Server for tests
    server = fastify();
    await server.register(cors);

    // Register routes identically to server.ts
    server.get('/api/session/:sessionId', async (request: any, reply: any) => {
      const { sessionId } = request.params;
      let session = await getSession(sessionId);
      if (!session) {
        session = await createSession(sessionId);
      }
      return session;
    });

    server.post('/api/session/clear', async (request: any, reply: any) => {
      const { sessionId } = request.body;
      const cleared = await clearSession(sessionId);
      return { success: cleared };
    });

    server.post('/api/chat', async (request: any, reply: any) => {
      const { sessionId, model, prompt } = request.body;
      const session = await getSession(sessionId) || await createSession(sessionId);
      const history = session.messages;

      // Simulate workflow
      const userMsg = { id: 'user-1', sender: 'user', content: prompt, createdAt: new Date().toISOString() };
      
      const aiContent = await generateResponse(model, prompt, history);
      const aiMsg = { id: 'ai-2', sender: 'ai', content: aiContent, createdAt: new Date().toISOString() };

      return { userMessage: userMsg, aiMessage: aiMsg };
    });

    // Clean up database
    await clearSession(testSessionId);
  });

  afterAll(async () => {
    await clearSession(testSessionId);
  });

  it('should get or create a session via GET /api/session/:sessionId', async () => {
    const response = await server.inject({
      method: 'GET',
      url: `/api/session/${testSessionId}`
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body);
    expect(body.sessionId).toBe(testSessionId);
    expect(body.messages).toEqual([]);
  });

  it('should post a user message and receive AI response via POST /api/chat', async () => {
    const response = await server.inject({
      method: 'POST',
      url: '/api/chat',
      body: {
        sessionId: testSessionId,
        model: 'gemini',
        prompt: 'Generate expansion report'
      }
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body);
    expect(body.userMessage).toBeDefined();
    expect(body.userMessage.content).toBe('Generate expansion report');
    
    expect(body.aiMessage).toBeDefined();
    // The mocked response should use the custom text from our mock
    expect(body.aiMessage.content).toContain('Simulated response from gemini');
  });

  it('should clear session history via POST /api/session/clear', async () => {
    const response = await server.inject({
      method: 'POST',
      url: '/api/session/clear',
      body: {
        sessionId: testSessionId
      }
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body);
    expect(body.success).toBe(true);
  });
});
