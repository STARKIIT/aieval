import fs from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { getSupabaseClient } from '../lib/supabaseClient.js';
import { createHash } from 'crypto';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DATA_DIR = path.resolve(__dirname, '../../data');
const SESSIONS_DIR = path.join(DATA_DIR, 'sessions');

// Ensure directories exist
async function ensureDirectories() {
  if (!existsSync(DATA_DIR)) {
    await fs.mkdir(DATA_DIR, { recursive: true });
  }
  if (!existsSync(SESSIONS_DIR)) {
    await fs.mkdir(SESSIONS_DIR, { recursive: true });
  }
}

export interface Message {
  id: string;
  sender: 'user' | 'ai';
  content: string;
  createdAt: string;
  evaluation?: any; // The JSON evaluation report
}

export interface Session {
  sessionId: string;
  createdAt: string;
  updatedAt: string;
  messages: Message[];
}

// Deterministically convert any string ID to a valid UUID for Postgres compliance
export function toUUID(str: string): string {
  if (!str) return '00000000-0000-0000-0000-000000000000';
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (uuidRegex.test(str)) {
    return str;
  }
  const hash = createHash('sha256').update(str).digest('hex');
  return [
    hash.substring(0, 8),
    hash.substring(8, 12),
    hash.substring(12, 16),
    hash.substring(16, 20),
    hash.substring(20, 32)
  ].join('-');
}

function getSessionFilePath(sessionId: string): string {
  const safeSessionId = sessionId.replace(/[^a-zA-Z0-9_-]/g, '');
  return path.join(SESSIONS_DIR, `${safeSessionId}.json`);
}

// ----------------------------------------------------
// DATABASE API WITH SUPABASE CONNECTIVITY & FALLBACK
// ----------------------------------------------------

export async function getSession(sessionId: string, userId?: string): Promise<Session | null> {
  const supabase = getSupabaseClient();
  
  if (supabase && userId) {
    try {
      const sId = toUUID(sessionId);
      const uId = toUUID(userId);

      // Fetch session
      const { data: sessionData, error: sError } = await supabase
        .from('sessions')
        .select('*')
        .eq('id', sId)
        .eq('user_id', uId)
        .maybeSingle();

      if (sError || !sessionData) return null;

      // Fetch messages
      const { data: msgData, error: mError } = await supabase
        .from('messages')
        .select('*')
        .eq('session_id', sId)
        .order('created_at', { ascending: true });

      if (mError) return null;

      return {
        sessionId: sessionId,
        createdAt: sessionData.created_at,
        updatedAt: sessionData.updated_at,
        messages: (msgData || []).map(m => ({
          id: m.id,
          sender: m.sender as 'user' | 'ai',
          content: m.content,
          createdAt: m.created_at,
          evaluation: m.evaluation
        }))
      };
    } catch (err) {
      console.error('Supabase getSession failed, falling back:', err);
    }
  }

  // Fallback to local file store
  await ensureDirectories();
  const filePath = getSessionFilePath(sessionId);
  try {
    const data = await fs.readFile(filePath, 'utf-8');
    return JSON.parse(data) as Session;
  } catch (error) {
    return null;
  }
}

export async function createSession(sessionId: string, userId?: string): Promise<Session> {
  const supabase = getSupabaseClient();

  if (supabase && userId) {
    try {
      const sId = toUUID(sessionId);
      const uId = toUUID(userId);

      // Make sure user profile exists in public.users to satisfy foreign key (trigger fallback)
      const { data: userExists } = await supabase
        .from('users')
        .select('id')
        .eq('id', uId)
        .maybeSingle();

      if (!userExists) {
        await supabase
          .from('users')
          .insert({
            id: uId,
            auth_type: 'guest',
            name: 'Guest User'
          });
      }

      // Upsert/Create session
      const { data: sessionData, error } = await supabase
        .from('sessions')
        .upsert({
          id: sId,
          user_id: uId,
          title: 'New Chat'
        })
        .select()
        .single();

      if (!error && sessionData) {
        return {
          sessionId: sessionId,
          createdAt: sessionData.created_at,
          updatedAt: sessionData.updated_at,
          messages: []
        };
      }
      console.error('Supabase createSession error:', error);
    } catch (err) {
      console.error('Supabase createSession failed, falling back:', err);
    }
  }

  // Fallback to local file store
  await ensureDirectories();
  const existing = await getSession(sessionId);
  if (existing) {
    return existing;
  }

  const newSession: Session = {
    sessionId,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    messages: []
  };

  const filePath = getSessionFilePath(sessionId);
  await fs.writeFile(filePath, JSON.stringify(newSession, null, 2), 'utf-8');
  return newSession;
}

export async function addMessage(
  sessionId: string,
  sender: 'user' | 'ai',
  content: string,
  userId?: string
): Promise<Message> {
  const supabase = getSupabaseClient();

  if (supabase && userId) {
    try {
      const sId = toUUID(sessionId);
      
      // Ensure session exists
      await createSession(sessionId, userId);

      const msgUUID = toUUID(`msg-${sender}-${Date.now()}-${Math.random()}`);
      
      const { data: msgData, error } = await supabase
        .from('messages')
        .insert({
          id: msgUUID,
          session_id: sId,
          sender,
          content
        })
        .select()
        .single();

      if (!error && msgData) {
        // Touch session updated_at
        await supabase
          .from('sessions')
          .update({ updated_at: new Date().toISOString() })
          .eq('id', sId);

        return {
          id: msgData.id,
          sender: msgData.sender as 'user' | 'ai',
          content: msgData.content,
          createdAt: msgData.created_at
        };
      }
      console.error('Supabase addMessage error:', error);
    } catch (err) {
      console.error('Supabase addMessage failed, falling back:', err);
    }
  }

  // Fallback to local file store
  await ensureDirectories();
  const session = await getSession(sessionId) || await createSession(sessionId);
  
  const newMessage: Message = {
    id: `${session.messages.length + 1}`,
    sender,
    content,
    createdAt: new Date().toISOString()
  };

  session.messages.push(newMessage);
  session.updatedAt = new Date().toISOString();

  const filePath = getSessionFilePath(sessionId);
  await fs.writeFile(filePath, JSON.stringify(session, null, 2), 'utf-8');
  return newMessage;
}

export async function addEvaluation(
  sessionId: string,
  messageId: string,
  report: any,
  userId?: string
): Promise<void> {
  const supabase = getSupabaseClient();

  if (supabase && userId) {
    try {
      const mId = toUUID(messageId);
      const { error } = await supabase
        .from('messages')
        .update({ evaluation: report })
        .eq('id', mId);

      if (!error) return;
      console.error('Supabase addEvaluation error:', error);
    } catch (err) {
      console.error('Supabase addEvaluation failed, falling back:', err);
    }
  }

  // Fallback to local file store
  await ensureDirectories();
  const session = await getSession(sessionId);
  if (!session) {
    throw new Error(`Session ${sessionId} not found`);
  }

  const message = session.messages.find(m => m.id === messageId);
  if (!message) {
    throw new Error(`Message ${messageId} not found in session ${sessionId}`);
  }

  message.evaluation = report;
  session.updatedAt = new Date().toISOString();

  const filePath = getSessionFilePath(sessionId);
  await fs.writeFile(filePath, JSON.stringify(session, null, 2), 'utf-8');
}

export async function listSessions(userId?: string): Promise<string[]> {
  const supabase = getSupabaseClient();

  if (supabase && userId) {
    try {
      const uId = toUUID(userId);
      const { data, error } = await supabase
        .from('sessions')
        .select('id')
        .eq('user_id', uId)
        .order('updated_at', { ascending: false });

      if (!error && data) {
        return data.map(s => s.id);
      }
      console.error('Supabase listSessions error:', error);
    } catch (err) {
      console.error('Supabase listSessions failed, falling back:', err);
    }
  }

  // Fallback to local file store
  await ensureDirectories();
  try {
    const files = await fs.readdir(SESSIONS_DIR);
    return files
      .filter(file => file.endsWith('.json'))
      .map(file => file.substring(0, file.length - 5));
  } catch (error) {
    return [];
  }
}

export async function clearSession(sessionId: string, userId?: string): Promise<boolean> {
  const supabase = getSupabaseClient();

  if (supabase && userId) {
    try {
      const sId = toUUID(sessionId);
      const uId = toUUID(userId);
      const { error } = await supabase
        .from('sessions')
        .delete()
        .eq('id', sId)
        .eq('user_id', uId);

      if (!error) return true;
      console.error('Supabase clearSession error:', error);
      return false;
    } catch (err) {
      console.error('Supabase clearSession failed, falling back:', err);
      return false;
    }
  }

  // Fallback to local file store
  await ensureDirectories();
  const filePath = getSessionFilePath(sessionId);
  try {
    await fs.unlink(filePath);
    return true;
  } catch (error) {
    return false;
  }
}
