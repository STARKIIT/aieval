import fs from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

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

function getSessionFilePath(sessionId: string): string {
  // Sanitize sessionId to prevent directory traversal
  const safeSessionId = sessionId.replace(/[^a-zA-Z0-9_-]/g, '');
  return path.join(SESSIONS_DIR, `${safeSessionId}.json`);
}

export async function getSession(sessionId: string): Promise<Session | null> {
  await ensureDirectories();
  const filePath = getSessionFilePath(sessionId);
  try {
    const data = await fs.readFile(filePath, 'utf-8');
    return JSON.parse(data) as Session;
  } catch (error) {
    return null;
  }
}

export async function createSession(sessionId: string): Promise<Session> {
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
  content: string
): Promise<Message> {
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
  report: any
): Promise<void> {
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

export async function listSessions(): Promise<string[]> {
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

export async function clearSession(sessionId: string): Promise<boolean> {
  await ensureDirectories();
  const filePath = getSessionFilePath(sessionId);
  try {
    await fs.unlink(filePath);
    return true;
  } catch (error) {
    return false;
  }
}
