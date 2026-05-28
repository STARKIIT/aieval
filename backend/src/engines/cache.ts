import crypto from 'crypto';
import { EvaluationReport } from './evaluators.js';

// Simple in-memory Cache Store
const cacheStore = new Map<string, { report: EvaluationReport; timestamp: number }>();

// Cache TTL (Time to Live) - 1 hour in milliseconds
const CACHE_TTL = 60 * 60 * 1000;

/**
 * Computes a SHA-256 hash of the user prompt and AI response text
 */
export function generateCacheKey(prompt: string, responseContent: string): string {
  const data = `${prompt.trim()}|||${responseContent.trim()}`;
  return crypto.createHash('sha256').update(data).digest('hex');
}

/**
 * Get evaluation report from cache if it exists and has not expired
 */
export function getCachedReport(key: string): EvaluationReport | null {
  const cached = cacheStore.get(key);
  if (!cached) return null;

  const isExpired = Date.now() - cached.timestamp > CACHE_TTL;
  if (isExpired) {
    cacheStore.delete(key);
    return null;
  }

  return cached.report;
}

/**
 * Save evaluation report to cache
 */
export function setCachedReport(key: string, report: EvaluationReport): void {
  cacheStore.set(key, {
    report,
    timestamp: Date.now()
  });
}

/**
 * Clear the entire cache
 */
export function clearCache(): void {
  cacheStore.clear();
}

/**
 * Get current cache size
 */
export function getCacheSize(): number {
  return cacheStore.size;
}
