import { describe, it, expect, beforeEach } from 'vitest';
import { 
  generateCacheKey, 
  getCachedReport, 
  setCachedReport, 
  clearCache, 
  getCacheSize 
} from '../engines/cache.js';
import { aggregateScores, EvaluationReport } from '../engines/evaluators.js';

describe('Phase 6: Caching & Score Aggregator Tests', () => {

  describe('In-Memory Caching Engine', () => {
    const testPrompt = 'Write a sales projection report';
    const testResponse = 'Sales will double next quarter.';
    const mockReport: EvaluationReport = {
      overallReliability: 'HIGH',
      trustScore: 90,
      logicScore: 90,
      hallucinationScore: 5,
      calibrationScore: 85,
      summary: 'High confidence sales metrics.',
      assumptions: [],
      hallucinations: [],
      logicFlaws: [],
      calibration: [],
      bias: []
    };

    beforeEach(() => {
      clearCache();
    });

    it('should generate identical SHA-256 hash keys for identical string contents', () => {
      const key1 = generateCacheKey(testPrompt, testResponse);
      const key2 = generateCacheKey(' ' + testPrompt + ' ', ' ' + testResponse + ' ');
      
      expect(key1).toBeDefined();
      expect(key1).toHaveLength(64); // SHA-256 hex string is 64 chars long
      expect(key1).toBe(key2); // trimmed text should generate identical key
    });

    it('should return null for missing cache keys', () => {
      const key = generateCacheKey(testPrompt, testResponse);
      expect(getCachedReport(key)).toBeNull();
    });

    it('should set and get reports for valid cache keys', () => {
      const key = generateCacheKey(testPrompt, testResponse);
      setCachedReport(key, mockReport);
      
      expect(getCacheSize()).toBe(1);
      
      const retrieved = getCachedReport(key);
      expect(retrieved).not.toBeNull();
      expect(retrieved?.trustScore).toBe(90);
    });
  });

  describe('Deterministic Scoring Aggregator', () => {
    const baselineReport: EvaluationReport = {
      overallReliability: 'HIGH',
      trustScore: 95,
      logicScore: 90,
      hallucinationScore: 10,
      calibrationScore: 85,
      summary: 'Clean response.',
      assumptions: [],
      hallucinations: [],
      logicFlaws: [],
      calibration: [],
      bias: []
    };

    it('should downgrade overallReliability to LOW and cap trustScore under 45 if a contradiction exists', () => {
      const badReport: EvaluationReport = {
        ...baselineReport,
        hallucinations: [
          {
            claim: 'Competitor delivery failure is 45%.',
            isSupported: false,
            evidenceCode: 'CONTRADICTED',
            reason: 'Actual rate is under 5%.',
            startIndex: 0,
            endIndex: 20
          }
        ]
      };

      const aggregated = aggregateScores(badReport);
      expect(aggregated.overallReliability).toBe('LOW');
      expect(aggregated.trustScore).toBeLessThanOrEqual(45);
    });

    it('should cap overallReliability under MEDIUM if high risk assumptions are present', () => {
      const riskyReport: EvaluationReport = {
        ...baselineReport,
        assumptions: [
          {
            statement: 'Assumes infinite scaling.',
            risk: 'HIGH',
            reason: 'Limits exist.'
          }
        ]
      };

      const aggregated = aggregateScores(riskyReport);
      expect(aggregated.overallReliability).toBe('MEDIUM');
      expect(aggregated.trustScore).toBeLessThanOrEqual(75);
    });
  });
});
