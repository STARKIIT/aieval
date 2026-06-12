import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import fastify from 'fastify';
import cors from '@fastify/cors';
import { 
  createSession, 
  getSession, 
  clearSession,
  addEvaluation,
  listSessions,
  toUUID
} from '../database/db.js';
import { runEvaluationPipeline, FullEvaluationReportSchema } from '../engines/evaluators.js';
import { generateResponse } from '../engines/modelRouter.js';

describe('Phase 5: Evaluation Pipeline & Server Integration', () => {
  const testSessionId = 'phase5-test-session';
  let server: any;

  beforeAll(async () => {
    // Build Fastify Server for integration tests
    server = fastify();
    await server.register(cors);

    server.post('/api/chat', async (request: any, reply: any) => {
      const { sessionId, model, prompt } = request.body;
      
      const userMsg = { id: 'msg-u', sender: 'user', content: prompt, createdAt: new Date().toISOString() };
      
      // Simulated response content containing phrases that trigger our mapped evaluations
      const aiResponseContent = 'Our primary competitor, ShipCo, reported a 45% delivery failure rate. Also, active customer base of 12.5 million. We will achieve 100% operational profitability within exactly three months.';
      const aiMsg = { id: 'msg-ai', sender: 'ai', content: aiResponseContent, createdAt: new Date().toISOString(), evaluation: undefined as any };

      const evaluationReport = await runEvaluationPipeline(prompt, aiResponseContent);
      aiMsg.evaluation = evaluationReport;

      return { userMessage: userMsg, aiMessage: aiMsg };
    });

    await clearSession(testSessionId);
  });

  afterAll(async () => {
    await clearSession(testSessionId);
  });

  it('should run the evaluation pipeline and return a schema-conforming report', async () => {
    const prompt = 'Analyze e-commerce expansion plans';
    const response = 'Our primary competitor, ShipCo, reported a 45% delivery failure rate. Also, active customer base of 12.5 million. We will achieve 100% operational profitability within exactly three months.';
    
    const report = await runEvaluationPipeline(prompt, response);
    expect(report).toBeDefined();
    
    const parsed = FullEvaluationReportSchema.safeParse(report);
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.trustScore).toBeGreaterThanOrEqual(0);
      expect(parsed.data.trustScore).toBeLessThanOrEqual(100);
      expect(parsed.data.logicScore).toBe(85);
      expect(parsed.data.assumptions[0].statement).toContain('onboarding of external partners');
      
      // Verify lowLogprobs structure
      expect(parsed.data.lowLogprobs).toBeDefined();
      expect(parsed.data.lowLogprobs!.length).toBeGreaterThan(0);
      expect(parsed.data.lowLogprobs![0].logprob).toBeLessThan(0);
      expect(parsed.data.lowLogprobs![0].reason).toBeDefined();
    }
  });

  it('should return the evaluation embedded in the AI message via POST /api/chat', async () => {
    const response = await server.inject({
      method: 'POST',
      url: '/api/chat',
      body: {
        sessionId: testSessionId,
        model: 'gemini',
        prompt: 'expansion options'
      }
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body);
    
    expect(body.userMessage).toBeDefined();
    expect(body.aiMessage).toBeDefined();
    expect(body.aiMessage.evaluation).toBeDefined();
    expect(body.aiMessage.evaluation.overallReliability).toBe('MEDIUM');
    expect(body.aiMessage.evaluation.hallucinations).toHaveLength(2);
  });

  it('should isolate sessions and restrict list metadata based on user ID contexts', async () => {
    const userA = 'user-a-uuid';
    const userB = 'user-b-uuid';
    const sessionAId = 'session-a-id';
    
    // Create session under userA
    const sessionA = await createSession(sessionAId, userA);
    expect(sessionA).toBeDefined();

    // Query sessions list as User A (should contain the session)
    const sessionsListA = await listSessions(userA);
    expect(sessionsListA).toContain(toUUID(sessionAId));

    // Query sessions list as User B (should NOT contain the session)
    const sessionsListB = await listSessions(userB);
    expect(sessionsListB).not.toContain(toUUID(sessionAId));

    // Clean up
    await clearSession(sessionAId, userA);
  });
});
