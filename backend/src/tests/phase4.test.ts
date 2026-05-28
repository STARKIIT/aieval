import { describe, it, expect } from 'vitest';
import { segmentText } from '../engines/segmenter.js';
import { runEvaluationPipeline, FullEvaluationReportSchema } from '../engines/evaluators.js';

describe('Phase 4: Segmentation & Evaluation Core', () => {

  describe('Text Segmenter', () => {
    it('should split standard sentences and compute accurate character offsets', () => {
      const text = 'First sentence. Second sentence! Third sentence?';
      const segments = segmentText(text);

      expect(segments).toHaveLength(3);
      
      expect(segments[0].text).toBe('First sentence.');
      expect(segments[0].startIndex).toBe(0);
      expect(segments[0].endIndex).toBe(15);

      expect(segments[1].text).toBe('Second sentence!');
      expect(segments[1].startIndex).toBe(16);
      expect(segments[1].endIndex).toBe(32);

      expect(segments[2].text).toBe('Third sentence?');
      expect(segments[2].startIndex).toBe(33);
      expect(segments[2].endIndex).toBe(48);
    });

    it('should NOT split sentences on decimal points in numbers', () => {
      const text = 'The version is 2.5 and rate is 12.5%. This is a separate sentence.';
      const segments = segmentText(text);

      expect(segments).toHaveLength(2);
      expect(segments[0].text).toBe('The version is 2.5 and rate is 12.5%.');
      expect(segments[1].text).toBe('This is a separate sentence.');
    });

    it('should handle text with leading and trailing whitespaces cleanly', () => {
      const text = '   Hello world! Good morning.   ';
      const segments = segmentText(text);

      expect(segments).toHaveLength(2);
      expect(segments[0].text).toBe('Hello world!');
      expect(segments[0].startIndex).toBe(3);
      expect(segments[0].endIndex).toBe(15);
      
      expect(segments[1].text).toBe('Good morning.');
      expect(segments[1].startIndex).toBe(16);
      expect(segments[1].endIndex).toBe(29);
    });
  });

  describe('Evaluation Schema Validation', () => {
    it('should orchestrate and validate full evaluation pipeline output structures', async () => {
      const prompt = 'Test prompt';
      const response = 'Our primary competitor, ShipCo, reported a 45% delivery failure rate. Also, active customer base of 12.5 million. We will achieve 100% operational profitability within exactly three months.';
      
      const report = await runEvaluationPipeline(prompt, response);
      
      // Parse the report to verify it passes Zod validation
      const parsed = FullEvaluationReportSchema.safeParse(report);
      
      expect(parsed.success).toBe(true);
      if (parsed.success) {
        expect(parsed.data.overallReliability).toBe('MEDIUM');
        expect(parsed.data.trustScore).toBe(70);
        expect(parsed.data.hallucinations).toHaveLength(2);
        
        // Check character alignments on mapped hallucinations
        const h1 = parsed.data.hallucinations[0];
        expect(response.substring(h1.startIndex, h1.endIndex)).toBe(h1.claim);
      }
    });
  });
});
