import fastify from 'fastify';
import cors from '@fastify/cors';
import dotenv from 'dotenv';
import { z } from 'zod';
import { 
  createSession, 
  getSession, 
  addMessage, 
  listSessions, 
  clearSession,
  addEvaluation
} from './database/db.js';
import { generateResponse } from './engines/modelRouter.js';
import { runEvaluationPipeline } from './engines/evaluators.js';
import { generateCacheKey, getCachedReport, setCachedReport } from './engines/cache.js';

dotenv.config();

const server = fastify({ logger: true });

// Register CORS
await server.register(cors, {
  origin: '*', // Allow any origin for development
});

// Health check endpoint
server.get('/api/health', async (request, reply) => {
  try {
    const sessions = await listSessions();
    return { 
      status: 'OK', 
      database: 'JSON File Store',
      sessionsCount: sessions.length,
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    server.log.error(error);
    reply.status(500).send({ status: 'Error', error: String(error) });
  }
});

// Get or create session
server.get('/api/session/:sessionId', async (request, reply) => {
  const paramsSchema = z.object({
    sessionId: z.string().min(1)
  });

  try {
    const { sessionId } = paramsSchema.parse(request.params);
    const userId = request.headers['x-user-id'] as string | undefined;
    let session = await getSession(sessionId, userId);
    if (!session) {
      session = await createSession(sessionId, userId);
    }
    return session;
  } catch (error) {
    server.log.error(error);
    if (error instanceof z.ZodError) {
      reply.status(400).send({ error: 'Invalid parameters', details: error.errors });
    } else {
      reply.status(500).send({ error: String(error) });
    }
  }
});

// Clear session
server.post('/api/session/clear', async (request, reply) => {
  const bodySchema = z.object({
    sessionId: z.string().min(1)
  });

  try {
    const { sessionId } = bodySchema.parse(request.body);
    const userId = request.headers['x-user-id'] as string | undefined;
    const cleared = await clearSession(sessionId, userId);
    return { success: cleared };
  } catch (error) {
    server.log.error(error);
    if (error instanceof z.ZodError) {
      reply.status(400).send({ error: 'Invalid request body', details: error.errors });
    } else {
      reply.status(500).send({ error: String(error) });
    }
  }
});

// List sessions metadata route
server.get('/api/sessions', async (request, reply) => {
  try {
    const userId = request.headers['x-user-id'] as string | undefined;
    const sessionIds = await listSessions(userId);
    const sessionsList = [];
    for (const id of sessionIds) {
      const sess = await getSession(id, userId);
      if (sess) {
        const firstUserMsg = sess.messages.find(m => m.sender === 'user')?.content || 'New Chat';
        sessionsList.push({
          id,
          title: firstUserMsg.length > 30 ? firstUserMsg.substring(0, 30) + '...' : firstUserMsg,
          updatedAt: sess.updatedAt
        });
      }
    }
    // Sort by updatedAt descending
    sessionsList.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
    return sessionsList;
  } catch (error) {
    server.log.error(error);
    reply.status(500).send({ error: String(error) });
  }
});

// Chat generation endpoint
server.post('/api/chat', async (request, reply) => {
  const chatBodySchema = z.object({
    sessionId: z.string().min(1),
    model: z.enum(['gemini', 'groq']),
    prompt: z.string().min(1),
    refinement: z.object({
      messageId: z.string().min(1),
      adjustments: z.array(z.object({
        type: z.string(),
        original: z.string(),
        modification: z.string()
      })),
      customFeedback: z.string().optional()
    }).optional(),
    generationSettings: z.object({
      tone: z.enum(['empathetic', 'neutral', 'raw']),
      multiplePaths: z.boolean()
    }).optional()
  });

  try {
    const { sessionId, model, prompt, refinement, generationSettings } = chatBodySchema.parse(request.body);
    const userId = request.headers['x-user-id'] as string | undefined;
    
    // 1. Get existing session messages (for history context)
    const session = await getSession(sessionId, userId) || await createSession(sessionId, userId);
    const history = session.messages;

    // 2. Save user's prompt message (use custom feedback summary if refining)
    const displayPrompt = refinement 
      ? (refinement.customFeedback || 'Refined previous response based on audit findings') 
      : prompt;
    const userMsg = await addMessage(sessionId, 'user', displayPrompt, userId);

    // 3. Retrieve original AI response content if refining
    let originalResponse = '';
    if (refinement) {
      const originalMsg = history.find(m => m.id === refinement.messageId);
      if (originalMsg) {
        originalResponse = originalMsg.content;
      }
    }

    // 4. Generate response using Model Router (passing refinement context if present)
    const aiResponseContent = await generateResponse(
      model, 
      prompt, 
      history,
      refinement ? {
        originalResponse,
        adjustments: refinement.adjustments,
        customFeedback: refinement.customFeedback
      } : undefined,
      generationSettings
    );

    // 4. Save AI's response message (initially without evaluation)
    const aiMsg = await addMessage(sessionId, 'ai', aiResponseContent, userId);

    // 5. Check Cache Layer first (prevent duplicate API costs)
    const cacheKey = generateCacheKey(prompt, aiResponseContent);
    let evaluationReport = getCachedReport(cacheKey);

    if (evaluationReport) {
      server.log.info(`Evaluation cache hit for key: ${cacheKey}`);
    } else {
      server.log.info(`Evaluation cache miss. Running evaluation pipeline...`);
      evaluationReport = await runEvaluationPipeline(prompt, aiResponseContent);
      setCachedReport(cacheKey, evaluationReport);
    }

    // 6. Save the evaluation report to the database
    await addEvaluation(sessionId, aiMsg.id, evaluationReport, userId);

    // 7. Retrieve the updated session to get the message with its evaluation attached
    const updatedSession = await getSession(sessionId, userId);
    const savedAiMsg = updatedSession?.messages.find(m => m.id === aiMsg.id);

    return {
      userMessage: userMsg,
      aiMessage: savedAiMsg || aiMsg
    };
  } catch (error) {
    server.log.error(error);
    if (error instanceof z.ZodError) {
      reply.status(400).send({ error: 'Invalid request body', details: error.errors });
    } else {
      reply.status(500).send({ error: String(error) });
    }
  }
});

const start = async () => {
  try {
    const port = parseInt(process.env.PORT || '3001');
    const host = process.env.HOST || '0.0.0.0';
    await server.listen({ port, host });
  } catch (err) {
    server.log.error(err);
    process.exit(1);
  }
};

start();
export { server };
