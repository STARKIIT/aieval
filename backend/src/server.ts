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
    let session = await getSession(sessionId);
    if (!session) {
      session = await createSession(sessionId);
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
    const cleared = await clearSession(sessionId);
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
    const sessionIds = await listSessions();
    const sessionsList = [];
    for (const id of sessionIds) {
      const sess = await getSession(id);
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
    prompt: z.string().min(1)
  });

  try {
    const { sessionId, model, prompt } = chatBodySchema.parse(request.body);
    
    // 1. Get existing session messages (for history context)
    const session = await getSession(sessionId) || await createSession(sessionId);
    const history = session.messages;

    // 2. Save user's prompt message
    const userMsg = await addMessage(sessionId, 'user', prompt);

    // 3. Generate response using Model Router
    const aiResponseContent = await generateResponse(model, prompt, history);

    // 4. Save AI's response message (initially without evaluation)
    const aiMsg = await addMessage(sessionId, 'ai', aiResponseContent);

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
    await addEvaluation(sessionId, aiMsg.id, evaluationReport);

    // 7. Retrieve the updated session to get the message with its evaluation attached
    const updatedSession = await getSession(sessionId);
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
