import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import fastify from 'fastify';
import cors from '@fastify/cors';
import { 
  createSession, 
  getSession, 
  addMessage, 
  addEvaluation, 
  listSessions, 
  clearSession 
} from '../database/db.js';
import path from 'path';
import fs from 'fs/promises';
import { existsSync } from 'fs';

describe('Phase 1: Environment & Pure JS Database Tests', () => {
  const testSessionId = 'test-env-session-id';

  beforeAll(async () => {
    // Clean up any leftovers
    await clearSession(testSessionId);
  });

  afterAll(async () => {
    // Clean up
    await clearSession(testSessionId);
  });

  it('should create an empty session file', async () => {
    const session = await createSession(testSessionId);
    expect(session).toBeDefined();
    expect(session.sessionId).toBe(testSessionId);
    expect(session.messages).toEqual([]);
    
    const fetched = await getSession(testSessionId);
    expect(fetched).not.toBeNull();
    expect(fetched?.sessionId).toBe(testSessionId);
  });

  it('should successfully add messages to a session', async () => {
    const msg1 = await addMessage(testSessionId, 'user', 'Hello evaluation system!');
    expect(msg1.sender).toBe('user');
    expect(msg1.content).toBe('Hello evaluation system!');
    expect(msg1.id).toBe('1');

    const msg2 = await addMessage(testSessionId, 'ai', 'Hello! Ready to analyze.');
    expect(msg2.sender).toBe('ai');
    expect(msg2.content).toBe('Hello! Ready to analyze.');
    expect(msg2.id).toBe('2');

    const session = await getSession(testSessionId);
    expect(session?.messages).toHaveLength(2);
    expect(session?.messages[0].id).toBe('1');
    expect(session?.messages[1].id).toBe('2');
  });

  it('should successfully attach evaluations to specific messages', async () => {
    const mockReport = { reliability: 'HIGH', logicScore: 9.5 };
    await addEvaluation(testSessionId, '2', mockReport);

    const session = await getSession(testSessionId);
    expect(session?.messages[1].evaluation).toEqual(mockReport);
  });

  it('should verify Fastify starts and the health check endpoint returns 200', async () => {
    const server = fastify();
    await server.register(cors);
    
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
        reply.status(500).send({ status: 'Error', error: String(error) });
      }
    });

    const response = await server.inject({
      method: 'GET',
      url: '/api/health'
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body);
    expect(body.status).toBe('OK');
    expect(body.database).toBe('JSON File Store');
    expect(body.sessionsCount).toBeGreaterThanOrEqual(1);
  });
});
