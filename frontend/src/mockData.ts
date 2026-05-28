import { Message, EvaluationReport } from './store/useStore.js';

export const mockEvaluationReport: EvaluationReport = {
  overallReliability: 'MEDIUM',
  trustScore: 68,
  logicScore: 85,
  hallucinationScore: 40,
  calibrationScore: 55,
  summary: 'The model provides a highly structured and logical breakdown of the expansion strategy. However, it relies on several unstated assumptions regarding market readiness, and introduces a fabricated statistic about competitors. Additionally, the tone is overconfident regarding timeline milestones given the stated constraints.',
  chainOfThought: '1. Analyzed prompt targets.\n2. Identified regional expansion guidelines.\n3. Flagged competitor delivery anomalies.',
  coherence: 'EXCELLENT',
  clarity: 'EXCELLENT',
  completeness: 'GOOD',
  usefulness: 'GOOD',
  assumptions: [
    {
      statement: 'Assumes local logistics partnerships can be fully integrated within 30 days.',
      risk: 'HIGH',
      reason: 'Standard SLA negotiations and technical API integrations in this region average 60-90 days.'
    },
    {
      statement: 'Assumes consumer preference in the new region matches the domestic market.',
      risk: 'MEDIUM',
      reason: 'No local survey data was referenced; cultural adaptations may be required for marketing.'
    }
  ],
  hallucinations: [
    {
      claim: 'Our primary competitor, ShipCo, reported a 45% delivery failure rate in the target region last quarter.',
      isSupported: false,
      evidenceCode: 'UNSUPPORTED',
      reason: 'Public financial records and industry reports show ShipCo\'s actual failure rate was 4.2%. The 45% figure is fabricated.',
      startIndex: 112,
      endIndex: 206
    },
    {
      claim: 'The target region has a total active customer base of 12.5 million users as of early 2026.',
      isSupported: false,
      evidenceCode: 'UNSUPPORTED',
      reason: 'The latest regional census and internet usage reports estimate the maximum addressable market size is only 8.2 million.',
      startIndex: 320,
      endIndex: 412
    }
  ],
  logicFlaws: [
    {
      flaw: 'Circular Reasoning in Marketing ROI',
      severity: 'MEDIUM',
      explanation: 'The output argues that we must spend $500k on advertising to prove the brand is popular, then states that brand popularity will fund the $500k advertising budget.'
    },
    {
      flaw: 'Causal Leap in Team Velocity',
      severity: 'LOW',
      explanation: 'Concludes that adding two remote customer support agents will automatically reduce product software bug count by 50%.'
    }
  ],
  calibration: [
    {
      claim: 'We will achieve 100% operational profitability within exactly three months of launch.',
      certainty: 95,
      evidenceStrength: 'WEAK',
      status: 'OVERCONFIDENT'
    },
    {
      claim: 'Integrating local payments might experience initial regulatory delays of 1-2 weeks.',
      certainty: 60,
      evidenceStrength: 'STRONG',
      status: 'CALIBRATED'
    }
  ],
  bias: [
    {
      type: 'Framing Bias',
      evidence: 'Consistently describes the competitors\' expansion as "aggressive intrusion" while describing the subject\'s expansion as "natural regional empowerment."',
      severity: 'LOW'
    }
  ]
};

export const mockMessages: Message[] = [
  {
    id: '1',
    sender: 'user',
    content: 'Can you draft a high-level expansion plan for our e-commerce brand into the East Asia region? Include market size, potential competitor setbacks, and timelines.',
    createdAt: new Date(Date.now() - 60000 * 5).toISOString()
  },
  {
    id: '2',
    sender: 'ai',
    content: `### East Asia Expansion Draft

1. **Market Analysis**: The target region has a total active customer base of 12.5 million users as of early 2026, presenting a massive growth opportunity.
2. **Competitor Assessment**: Our primary competitor, ShipCo, reported a 45% delivery failure rate in the target region last quarter. This logistics gap allows us to capture market share.
3. **Execution Timeline**: We will achieve 100% operational profitability within exactly three months of launch. We will establish local partnerships and integrate payment APIs within 30 days. Integrating local payments might experience initial regulatory delays of 1-2 weeks, so we will launch a beta first.`,
    createdAt: new Date(Date.now() - 60000 * 4).toISOString(),
    evaluation: mockEvaluationReport
  }
];
