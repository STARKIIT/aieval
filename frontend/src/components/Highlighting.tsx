import React from 'react';
import { useStore, EvaluationReport } from '@/store/useStore';
import ReactMarkdown from 'react-markdown';

interface HighlightingProps {
  content: string;
  evaluation?: EvaluationReport;
}

/* ─── Styled Markdown Components for polished AI output ─── */
const markdownComponents = {
  h1: ({ children, ...props }: any) => (
    <h1 className="text-[20px] font-semibold text-white mt-6 mb-3 leading-tight tracking-[-0.01em]" {...props}>{children}</h1>
  ),
  h2: ({ children, ...props }: any) => (
    <h2 className="text-[17px] font-semibold text-white mt-5 mb-2.5 leading-tight" {...props}>{children}</h2>
  ),
  h3: ({ children, ...props }: any) => (
    <h3 className="text-[15px] font-semibold text-white mt-4 mb-2 leading-snug" {...props}>{children}</h3>
  ),
  h4: ({ children, ...props }: any) => (
    <h4 className="text-[14px] font-semibold text-[#e3e3e3] mt-3 mb-1.5" {...props}>{children}</h4>
  ),
  p: ({ children, ...props }: any) => (
    <p className="text-[14px] text-[#c4c7c5] leading-[1.8] mb-3 last:mb-0" {...props}>{children}</p>
  ),
  ul: ({ children, ...props }: any) => (
    <ul className="space-y-1.5 my-3 pl-1" {...props}>{children}</ul>
  ),
  ol: ({ children, ...props }: any) => (
    <ol className="space-y-1.5 my-3 pl-1 list-none counter-reset-item" {...props}>{children}</ol>
  ),
  li: ({ children, ordered, ...props }: any) => (
    <li className="flex items-start gap-2.5 text-[14px] text-[#c4c7c5] leading-[1.7]" {...props}>
      <span className="mt-[9px] h-[5px] w-[5px] rounded-full bg-[#8ab4f8]/50 shrink-0" />
      <span className="flex-1">{children}</span>
    </li>
  ),
  strong: ({ children, ...props }: any) => (
    <strong className="font-semibold text-white" {...props}>{children}</strong>
  ),
  em: ({ children, ...props }: any) => (
    <em className="italic text-[#c4c7c5]/90" {...props}>{children}</em>
  ),
  code: ({ children, className, ...props }: any) => {
    const isBlock = className?.includes('language-');
    if (isBlock) {
      return (
        <code className="block bg-[#131314] border border-[#2c2e30]/50 rounded-lg p-4 text-[13px] font-mono text-[#c4c7c5] overflow-x-auto my-3 leading-relaxed" {...props}>
          {children}
        </code>
      );
    }
    return (
      <code className="bg-[#282a2c] text-[#8ab4f8] px-1.5 py-0.5 rounded-md text-[13px] font-mono" {...props}>
        {children}
      </code>
    );
  },
  pre: ({ children, ...props }: any) => (
    <pre className="bg-[#131314] border border-[#2c2e30]/50 rounded-xl p-4 overflow-x-auto my-4 text-[13px]" {...props}>
      {children}
    </pre>
  ),
  blockquote: ({ children, ...props }: any) => (
    <blockquote className="border-l-[3px] border-[#8ab4f8]/40 pl-4 my-3 text-[14px] text-[#9aa0a6] italic" {...props}>
      {children}
    </blockquote>
  ),
  hr: (props: any) => (
    <hr className="border-t border-[#2c2e30]/40 my-5" {...props} />
  ),
  a: ({ children, ...props }: any) => (
    <a className="text-[#8ab4f8] hover:underline" {...props}>{children}</a>
  ),
  table: ({ children, ...props }: any) => (
    <div className="overflow-x-auto my-4 rounded-lg border border-[#2c2e30]/50">
      <table className="w-full text-[13px]" {...props}>{children}</table>
    </div>
  ),
  th: ({ children, ...props }: any) => (
    <th className="bg-[#1e1f20] text-left text-[11px] font-semibold text-[#9aa0a6] uppercase tracking-wider px-3 py-2 border-b border-[#2c2e30]/50" {...props}>{children}</th>
  ),
  td: ({ children, ...props }: any) => (
    <td className="px-3 py-2 text-[#c4c7c5] border-b border-[#2c2e30]/20" {...props}>{children}</td>
  ),
};

/* Inline-only markdown (for within highlight spans) */
const inlineComponents = {
  ...markdownComponents,
  p: 'span' as any,
};

export const Highlighting: React.FC<HighlightingProps> = ({ content, evaluation }) => {
  const { setSidebarOpen, setActiveTab } = useStore();

  // Compile active highlight targets
  const highlightsList: {
    text: string;
    type: 'hallucination' | 'logic' | 'assumption' | 'calibration' | 'logprob';
    reason: string;
    title: string;
    tab: string;
    styleClass: string;
    tooltipAccent: string;
  }[] = [];

  if (evaluation) {
    // 1. Factual Hallucinations
    if (evaluation.hallucinations) {
      evaluation.hallucinations.forEach(h => {
        highlightsList.push({
          text: h.claim,
          type: 'hallucination',
          reason: h.reason,
          title: '⚠️ Unsupported Claim Detected',
          tab: 'hallucinations',
          styleClass: 'border-rose-500/60 bg-rose-500/8 hover:bg-rose-500/15 text-rose-200',
          tooltipAccent: 'text-rose-400'
        });
      });
    }

    // 2. Logic Flaws (High & Medium severity)
    if (evaluation.logicFlaws) {
      evaluation.logicFlaws.forEach(l => {
        if (l.claim && (l.severity === 'HIGH' || l.severity === 'MEDIUM')) {
          highlightsList.push({
            text: l.claim,
            type: 'logic',
            reason: l.explanation,
            title: `🧠 Logic Flaw: ${l.flaw}`,
            tab: 'logic',
            styleClass: 'border-[#8ab4f8]/60 bg-[#8ab4f8]/8 hover:bg-[#8ab4f8]/15 text-[#8ab4f8]',
            tooltipAccent: 'text-[#8ab4f8]'
          });
        }
      });
    }

    // 3. Assumptions (High & Medium risk)
    if (evaluation.assumptions) {
      evaluation.assumptions.forEach(a => {
        if (a.claim && (a.risk === 'HIGH' || a.risk === 'MEDIUM')) {
          highlightsList.push({
            text: a.claim,
            type: 'assumption',
            reason: `${a.statement} - ${a.reason}`,
            title: `💡 Implicit Assumption (${a.risk} Risk)`,
            tab: 'assumptions',
            styleClass: 'border-amber-500/60 bg-amber-500/8 hover:bg-amber-500/15 text-amber-200',
            tooltipAccent: 'text-amber-400'
          });
        }
      });
    }

    // 4. Calibration (Certainty & Confidence status highlights)
    if (evaluation.calibration) {
      evaluation.calibration.forEach(c => {
        if (c.claim && (c.status === 'OVERCONFIDENT' || c.status === 'UNDERCONFIDENT')) {
          const isOver = c.status === 'OVERCONFIDENT';
          highlightsList.push({
            text: c.claim,
            type: 'calibration',
            reason: `${isOver ? 'Model expressed high certainty but has weak evidence support.' : 'Model expressed low certainty despite strong evidence support.'} Certainty: ${c.certainty}%, Evidence Strength: ${c.evidenceStrength}.`,
            title: isOver ? `⚠️ Overconfident Claim` : `🔍 Underconfident Claim`,
            tab: 'calibration',
            styleClass: isOver 
              ? 'border-rose-400/40 bg-rose-400/5 hover:bg-rose-400/10 text-rose-200'
              : 'border-cyan-400/40 bg-cyan-400/5 hover:bg-cyan-400/10 text-cyan-200',
            tooltipAccent: isOver ? 'text-rose-400' : 'text-cyan-400'
          });
        }
      });
    }

    // 5. Low Logprobs (High entropy highlights)
    if (evaluation.lowLogprobs) {
      evaluation.lowLogprobs.forEach(lp => {
        const certaintyPercent = Math.round(Math.exp(lp.logprob) * 100);
        highlightsList.push({
          text: lp.claim,
          type: 'logprob',
          reason: `${lp.reason} Logprob: ${lp.logprob}.`,
          title: `📉 Low Log Probability (Certainty: ${certaintyPercent}%)`,
          tab: 'logprobs',
          styleClass: 'border-violet-500/60 bg-violet-500/8 hover:bg-violet-500/15 text-violet-200',
          tooltipAccent: 'text-violet-400'
        });
      });
    }
  }

  // Fallback if no evaluation or highlights
  if (!evaluation || highlightsList.length === 0) {
    return (
      <div className="max-w-none">
        <ReactMarkdown components={markdownComponents}>{content}</ReactMarkdown>
      </div>
    );
  }

  // Deduplicate and prioritize: Hallucination > Logic > Assumption > Logprob > Calibration
  const activeHighlightsMap = new Map<string, typeof highlightsList[0]>();
  highlightsList.forEach(hl => {
    const existing = activeHighlightsMap.get(hl.text);
    if (!existing) {
      activeHighlightsMap.set(hl.text, hl);
    } else {
      if (hl.type === 'hallucination') {
        activeHighlightsMap.set(hl.text, hl);
      } else if (hl.type === 'logic' && (existing.type === 'assumption' || existing.type === 'logprob' || existing.type === 'calibration')) {
        activeHighlightsMap.set(hl.text, hl);
      } else if (hl.type === 'assumption' && (existing.type === 'logprob' || existing.type === 'calibration')) {
        activeHighlightsMap.set(hl.text, hl);
      } else if (hl.type === 'logprob' && existing.type === 'calibration') {
        activeHighlightsMap.set(hl.text, hl);
      }
    }
  });

  const uniqueHighlights = Array.from(activeHighlightsMap.values());

  let remainingText = content;
  const sortedHighlights = uniqueHighlights
    .map(h => {
      const index = remainingText.indexOf(h.text);
      return { ...h, index };
    })
    .filter(h => h.index !== -1)
    .sort((a, b) => a.index - b.index);

  let lastIndex = 0;
  const segments: React.ReactNode[] = [];

  sortedHighlights.forEach((highlight, i) => {
    // Add non-highlighted text block
    if (highlight.index > lastIndex) {
      segments.push(
        <span key={`text-${i}`} className="inline">
          <ReactMarkdown components={inlineComponents}>
            {remainingText.substring(lastIndex, highlight.index)}
          </ReactMarkdown>
        </span>
      );
    }

    // Add styled highlight span
    segments.push(
      <span
        key={`highlight-${i}`}
        onClick={() => {
          setSidebarOpen(true);
          setActiveTab(highlight.tab);
        }}
        className={`relative group cursor-pointer border-b-2 border-dashed px-1 py-0.5 rounded transition-all duration-200 inline ${highlight.styleClass}`}
        title={`Click to view ${highlight.tab} evaluation details`}
      >
        <ReactMarkdown components={inlineComponents}>
          {highlight.text}
        </ReactMarkdown>
        
        {/* Glassmorphism Tooltip */}
        <span className="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-72 scale-95 opacity-0 group-hover:scale-100 group-hover:opacity-100 transition-all duration-200 origin-bottom z-50 p-3.5 rounded-xl glass-surface border border-[#36383a] shadow-2xl text-[12px] text-[#c4c7c5] leading-relaxed normal-case font-normal">
          <span className={`block font-semibold mb-1.5 text-[11px] ${highlight.tooltipAccent}`}>
            {highlight.title}
          </span>
          {highlight.reason}
          <span className="block mt-2 text-[10px] text-[#9aa0a6]/60 font-medium font-mono uppercase tracking-wide">
            Click to inspect detailed report
          </span>
        </span>
      </span>
    );

    lastIndex = highlight.index + highlight.text.length;
  });

  // Append remaining content
  if (lastIndex < remainingText.length) {
    segments.push(
      <span key="text-end" className="inline">
        <ReactMarkdown components={inlineComponents}>
          {remainingText.substring(lastIndex)}
        </ReactMarkdown>
      </span>
    );
  }

  return (
    <div className="max-w-none">
      {segments.length > 0 ? segments : <ReactMarkdown components={markdownComponents}>{content}</ReactMarkdown>}
    </div>
  );
};
