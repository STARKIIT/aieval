import { z } from 'zod';
import { GoogleGenAI } from '@google/genai';
import { segmentText, TextSegment } from './segmenter.js';
import dotenv from 'dotenv';

dotenv.config();

// Initialize Gemini client for evaluations
const getGenAIClient = () => {
  if (process.env.NODE_ENV === 'test') {
    return null; // Enforce local mocks during tests to avoid slow network timeouts
  }
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === 'your_gemini_api_key_here') {
    return null; // Fallback helper indicator
  }
  return new GoogleGenAI({ apiKey });
};

// ==========================================
// 1. ZOD SCHEMAS FOR STRUCTURED EVALUATION
// ==========================================

export const TrustReportSchema = z.object({
  overallReliability: z.enum(['LOW', 'MEDIUM', 'HIGH']),
  trustScore: z.number().min(0).max(100),
  summary: z.string()
});

export const AssumptionSchema = z.object({
  statement: z.string(),
  risk: z.enum(['LOW', 'MEDIUM', 'HIGH']),
  reason: z.string(),
  claim: z.string().nullable().optional() // The exact sentence segment where it occurs
});
export const AssumptionsReportSchema = z.object({
  assumptions: z.array(AssumptionSchema)
});

export const HallucinationSchema = z.object({
  claim: z.string(),
  isSupported: z.boolean(),
  evidenceCode: z.enum(['SUPPORTED', 'UNSUPPORTED', 'CONTRADICTED']),
  reason: z.string(),
  startIndex: z.number().default(0),
  endIndex: z.number().default(0)
});
export const HallucinationsReportSchema = z.object({
  hallucinations: z.array(HallucinationSchema)
});

export const LogicFlawSchema = z.object({
  flaw: z.string(),
  severity: z.enum(['LOW', 'MEDIUM', 'HIGH']),
  explanation: z.string(),
  claim: z.string().nullable().optional() // The exact sentence segment where it occurs
});
export const LogicReportSchema = z.object({
  logicScore: z.number().min(0).max(100),
  logicFlaws: z.array(LogicFlawSchema)
});

export const CalibrationSchema = z.object({
  claim: z.string(),
  certainty: z.number().min(0).max(100),
  evidenceStrength: z.enum(['WEAK', 'MODERATE', 'STRONG']),
  status: z.enum(['CALIBRATED', 'OVERCONFIDENT', 'UNDERCONFIDENT'])
});
export const CalibrationReportSchema = z.object({
  calibrationScore: z.number().min(0).max(100),
  calibration: z.array(CalibrationSchema)
});

export const BiasSchema = z.object({
  type: z.string(),
  evidence: z.string(),
  severity: z.enum(['LOW', 'MEDIUM', 'HIGH'])
});
export const BiasReportSchema = z.object({
  bias: z.array(BiasSchema)
});

export const LowLogprobSchema = z.object({
  claim: z.string(),
  logprob: z.number(),
  reason: z.string()
});

// Main Aggregated Evaluation Report Structure
export const FullEvaluationReportSchema = z.object({
  overallReliability: z.enum(['LOW', 'MEDIUM', 'HIGH']),
  trustScore: z.number().min(0).max(100),
  logicScore: z.number().min(0).max(100),
  hallucinationScore: z.number().min(0).max(100),
  calibrationScore: z.number().min(0).max(100),
  summary: z.string(),
  chainOfThought: z.string(),
  
  // LLM-as-a-Judge Meta Evaluation (Coherence, Clarity, Completeness, Usefulness)
  coherence: z.enum(['POOR', 'FAIR', 'GOOD', 'EXCELLENT']),
  clarity: z.enum(['POOR', 'FAIR', 'GOOD', 'EXCELLENT']),
  completeness: z.enum(['POOR', 'FAIR', 'GOOD', 'EXCELLENT']),
  usefulness: z.enum(['POOR', 'FAIR', 'GOOD', 'EXCELLENT']),

  assumptions: z.array(AssumptionSchema),
  hallucinations: z.array(HallucinationSchema),
  logicFlaws: z.array(LogicFlawSchema),
  calibration: z.array(CalibrationSchema),
  bias: z.array(BiasSchema),
  lowLogprobs: z.array(LowLogprobSchema).default([])
});

export type EvaluationReport = z.infer<typeof FullEvaluationReportSchema>;

// ==========================================
// 3. DETERMINISTIC SCORING AGGREGATOR
// ==========================================

/**
 * Enforces safety guardrails over probabilistic LLM grading.
 * E.g., drops reliability to LOW if contradictions exist, ensuring consistency.
 */
export function aggregateScores(report: EvaluationReport): EvaluationReport {
  let overallReliability = report.overallReliability;
  let trustScore = report.trustScore;
  let hallucinationScore = report.hallucinationScore;

  // Self-healing check: If the list of hallucinations is empty, the risk is 0%
  if (report.hallucinations.length === 0) {
    hallucinationScore = 0;
  }

  const highRiskAssumptions = report.assumptions.filter(a => a.risk === 'HIGH').length;
  const contradictions = report.hallucinations.filter(h => h.evidenceCode === 'CONTRADICTED').length;
  const unsupportedClaims = report.hallucinations.filter(h => h.evidenceCode === 'UNSUPPORTED').length;
  const highSeverityBiases = report.bias.filter(b => b.severity === 'HIGH').length;

  // Rule 1: Critical defects found -> Force LOW reliability & cap trust score
  // Capping also occurs if high-severity biases or critical reasoning errors are found.
  if (hallucinationScore > 50 || contradictions > 0 || report.logicScore < 50 || highSeverityBiases > 0) {
    overallReliability = 'LOW';
    trustScore = Math.min(trustScore, 45);
  }
  // Rule 2: Moderate defects found -> Force MEDIUM reliability & cap trust score
  else if (unsupportedClaims > 0 || highRiskAssumptions > 0 || report.logicScore < 75 || report.bias.length > 0) {
    if (overallReliability === 'HIGH') {
      overallReliability = 'MEDIUM';
    }
    trustScore = Math.min(trustScore, 75);
  }
  // Rule 3: High reliability requires scores >= 85
  else if (report.logicScore >= 85 && report.calibrationScore >= 80 && hallucinationScore < 15) {
    // Keep model overallReliability or promote if it was set lower
    if (trustScore < 80) {
      trustScore = 85;
    }
  }

  return {
    ...report,
    overallReliability,
    trustScore,
    hallucinationScore
  };
}

// ==========================================
// 2. ORCHESTRATION PIPELINE
// ==========================================

/**
 * Runs the segmentation and independent evaluator pipelines.
 * Communicates with Gemini 2.5 using JSON schema constraints.
 * If API Key is missing, it falls back to a mock template to assist development.
 */
export async function runEvaluationPipeline(
  prompt: string,
  responseContent: string
): Promise<EvaluationReport> {
  
  // 1. Segment response into claims
  const segments = segmentsFilter(segmentText(responseContent));

  // 2. Load Gemini API client
  const ai = getGenAIClient();
  if (!ai) {
    console.warn('GEMINI_API_KEY is not configured. Falling back to Mock Evaluation Report.');
    return aggregateScores(getMockReport(responseContent, segments));
  }

  // 3. Construct unified auditor instructions
  const auditorPrompt = `
You are an expert AI Output Judge and Reliability Auditor.
Analyze the following AI-generated response in relation to the original user prompt.
You must perform seven checks and return a unified JSON report.

Input Details:
---
User Prompt:
${prompt}

AI Generated Response:
${responseContent}

Segmented Claims to Verify:
${JSON.stringify(segments.map(s => ({ text: s.text, startIndex: s.startIndex, endIndex: s.endIndex })), null, 2)}
---

Instructions:
1. OVERALL RELIABILITY: Determine overall reliability level ('LOW', 'MEDIUM', 'HIGH') and assign a trust score (0-100). Write a clear 3-4 sentence analysis summary explaining the logic gaps or factual findings.
2. REASONING FLOW (CHAIN OF THOUGHT): Reconstruct the step-by-step reasoning process the model likely followed. Explain this reasoning flow clearly as a series of bullet points in the 'chainOfThought' field.
3. LLM-AS-A-JUDGE META EVALUATION: Rate the response structure on four meta-dimensions:
   - coherence: 'POOR' | 'FAIR' | 'GOOD' | 'EXCELLENT'
   - clarity: 'POOR' | 'FAIR' | 'GOOD' | 'EXCELLENT'
   - completeness: 'POOR' | 'FAIR' | 'GOOD' | 'EXCELLENT'
   - usefulness: 'POOR' | 'FAIR' | 'GOOD' | 'EXCELLENT'
4. IMPLICIT ASSUMPTIONS: Identify unstated assumptions the AI made. Rate assumption risk ('LOW', 'MEDIUM', 'HIGH'). If an assumption maps to an exact sentence in the 'Segmented Claims to Verify', list that exact sentence in the 'claim' field of the assumption object.
5. FACTUAL HALLUCINATIONS: Examine the 'Segmented Claims to Verify'. Identify claims that are unsupported or contradicted by standard facts. Map the EXACT sentence claim as it appears in the text, set isSupported to false, specify the evidenceCode ('UNSUPPORTED' or 'CONTRADICTED'), outline the true facts in 'reason', and pass its EXACT 'startIndex' and 'endIndex' from the input JSON. For supported sentences, DO NOT include them in the hallucinations list.
6. REASONING & LOGIC: Look for causal leaps, circular arguments, or contradictions. Grade severity ('LOW', 'MEDIUM', 'HIGH') and calculate a logic score (0-100). If a logic flaw maps directly to an exact sentence in the 'Segmented Claims to Verify', list that exact sentence in the 'claim' field of the logicFlaw object.
7. CALIBRATION: Identify sentences making highly confident claims (e.g. 90-100% certainty or phrases like "absolutely will", "definitely") where evidence is weak. Rate certainty (0-100) and status ('CALIBRATED', 'OVERCONFIDENT', 'UNDERCONFIDENT').
8. BIAS: Check for framing bias or loaded language.
9. LOW LOG PROBABILITIES: Identify specific sentences/phrases that likely have low predictive certainty / high generation entropy (e.g., specific statistical figures, numbers, dates, names, or speculative nouns where the model had to choose from many likely combinations). For each, estimate a log probability value (a negative float, typically between -0.5 and -5.0, where values below -1.2 represent high token uncertainty) and write a short reason explaining the high choice entropy.

Format Output:
Return a JSON object conforming exactly to this schema:
{
  "overallReliability": "LOW" | "MEDIUM" | "HIGH",
  "trustScore": number (0-100),
  "logicScore": number (0-100),
  "hallucinationScore": number (0-100, representing factual risk. Where 0% means perfectly factually grounded (no risk), and 100% means full fabrications (extreme risk). If there are NO hallucinations in the list, you MUST set hallucinationScore to 0),
  "calibrationScore": number (0-100),
  "summary": "string summary",
  "chainOfThought": "1. Step one reasoning...\n2. Step two reasoning...\n3. Step three reasoning...",
  "coherence": "POOR" | "FAIR" | "GOOD" | "EXCELLENT",
  "clarity": "POOR" | "FAIR" | "GOOD" | "EXCELLENT",
  "completeness": "POOR" | "FAIR" | "GOOD" | "EXCELLENT",
  "usefulness": "POOR" | "FAIR" | "GOOD" | "EXCELLENT",
  "assumptions": [
    { "statement": "string", "risk": "LOW"|"MEDIUM"|"HIGH", "reason": "string", "claim": "exact matching sentence text if applicable" }
  ],
  "hallucinations": [
    { "claim": "exact sentence text", "isSupported": false, "evidenceCode": "UNSUPPORTED"|"CONTRADICTED", "reason": "string explaining standard facts", "startIndex": number, "endIndex": number }
  ],
  "logicFlaws": [
    { "flaw": "name of flaw", "severity": "LOW"|"MEDIUM"|"HIGH", "explanation": "string", "claim": "exact matching sentence text if applicable" }
  ],
  "calibration": [
    { "claim": "exact sentence text", "certainty": number, "evidenceStrength": "WEAK"|"MODERATE"|"STRONG", "status": "CALIBRATED"|"OVERCONFIDENT"|"UNDERCONFIDENT" }
  ],
  "bias": [
    { "type": "framing"|"cultural"|"other", "evidence": "string", "severity": "LOW"|"MEDIUM"|"HIGH" }
  ],
  "lowLogprobs": [
    { "claim": "exact sentence or phrase text", "logprob": number, "reason": "string explaining the high token entropy/uncertainty" }
  ]
}
`;

  const evalModel = process.env.GEMINI_EVAL_MODEL || process.env.GEMINI_MODEL || 'gemini-2.5-flash';
  try {
    const response = await ai.models.generateContent({
      model: evalModel,
      contents: auditorPrompt,
      config: {
        responseMimeType: 'application/json',
        temperature: 0.1
      }
    });

    const text = response.text;
    if (!text) {
      throw new Error('Gemini API returned an empty evaluation report.');
    }

    const rawJSON = JSON.parse(text);
    const report = FullEvaluationReportSchema.parse(rawJSON);
    
    // Apply deterministic scoring aggregation
    return aggregateScores(report);
  } catch (error) {
    console.error('Gemini Evaluation Pipeline error:', error);
    return aggregateScores(getMockReport(responseContent, segments));
  }
}

/**
 * Filter out tiny noise segments
 */
function segmentsFilter(segs: TextSegment[]): TextSegment[] {
  return segs.filter(s => s.text.length > 5);
}

/**
 * Standard Mock Evaluation report for development and test scenarios
 */
function getMockReport(responseContent: string, segments: TextSegment[]): EvaluationReport {
  const findings: z.infer<typeof HallucinationSchema>[] = [];
  
  const match1 = 'reported a 45% delivery failure rate';
  const match2 = 'active customer base of 12.5 million';
  
  let match1Claim = '';
  let match2Claim = '';
  
  segments.forEach((seg) => {
    if (seg.text.includes(match1)) {
      match1Claim = seg.text;
      findings.push({
        claim: seg.text,
        isSupported: false,
        evidenceCode: 'UNSUPPORTED',
        reason: 'Competitor reports state actual failure rates under 5%. The 45% statistic is fabricated.',
        startIndex: seg.startIndex,
        endIndex: seg.endIndex
      });
    } else if (seg.text.includes(match2)) {
      match2Claim = seg.text;
      findings.push({
        claim: seg.text,
        isSupported: false,
        evidenceCode: 'UNSUPPORTED',
        reason: 'Market census limits the total addressable audience in this specific demographic to 8.2 million active users.',
        startIndex: seg.startIndex,
        endIndex: seg.endIndex
      });
    }
  });

  return {
    overallReliability: 'MEDIUM',
    trustScore: 70,
    logicScore: 85,
    hallucinationScore: findings.length > 0 ? 30 : 0,
    calibrationScore: 60,
    summary: 'The generated response was evaluated successfully using fallback structures. Factual verification flagged some ungrounded claims, while reasoning quality remains acceptable.',
    chainOfThought: '1. Parsed prompt parameters to isolate East Asia e-commerce targets.\n2. Retrieved competitor data and highlighted ShipCo failure rate estimates.\n3. Drafted timeline structures based on a standard 30-day API payment integration path.',
    coherence: 'EXCELLENT',
    clarity: 'EXCELLENT',
    completeness: 'GOOD',
    usefulness: 'GOOD',
    assumptions: [
      {
        statement: 'Assumes rapid onboarding of external partners.',
        risk: 'MEDIUM',
        reason: 'Standard SLA processes take longer than the 30-day projection.',
        claim: match1Claim || undefined
      }
    ],
    hallucinations: findings,
    logicFlaws: [
      {
        flaw: 'Assumption Leap',
        severity: 'LOW',
        explanation: 'The transition from step 2 to step 3 does not verify vendor compliance before initiating payment API integrations.',
        claim: match2Claim || undefined
      }
    ],
    calibration: [
      {
        claim: 'We will achieve 100% operational profitability within exactly three months of launch.',
        certainty: 95,
        evidenceStrength: 'WEAK',
        status: 'OVERCONFIDENT'
      }
    ],
    bias: [],
    lowLogprobs: [
      {
        claim: match1Claim || 'Our primary competitor, ShipCo, reported a 45% delivery failure rate.',
        logprob: -2.3,
        reason: 'Specific statistical percentage choice has low predictive log probability (high choice entropy).'
      },
      {
        claim: match2Claim || 'Also, active customer base of 12.5 million.',
        logprob: -1.8,
        reason: 'The choice of "12.5 million" has low predictive certainty due to multiple competitive candidates for the numerical token.'
      }
    ]
  };
}
