import React from 'react';
import { useStore, EvaluationReport } from '@/store/useStore';
import ReactMarkdown from 'react-markdown';

interface HighlightingProps {
  content: string;
  evaluation?: EvaluationReport;
}

export const Highlighting: React.FC<HighlightingProps> = ({ content, evaluation }) => {
  const { setSidebarOpen, setActiveTab } = useStore();

  // Compile active highlight targets
  const highlightsList: {
    text: string;
    type: 'hallucination' | 'logic' | 'assumption';
    reason: string;
    title: string;
    tab: string;
    styleClass: string;
    tooltipClass: string;
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
          styleClass: 'border-rose-500 bg-rose-500/10 hover:bg-rose-500/20 text-rose-250',
          tooltipClass: 'text-rose-450 border-rose-500/20'
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
            styleClass: 'border-[#8ab4f8] bg-[#8ab4f8]/10 hover:bg-[#8ab4f8]/20 text-[#8ab4f8]',
            tooltipClass: 'text-[#8ab4f8] border-[#8ab4f8]/20'
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
            styleClass: 'border-amber-500 bg-amber-500/10 hover:bg-amber-500/20 text-amber-250',
            tooltipClass: 'text-amber-450 border-amber-500/20'
          });
        }
      });
    }
  }

  // Fallback if no evaluation or highlights
  if (!evaluation || highlightsList.length === 0) {
    return (
      <div className="prose prose-invert max-w-none text-[#e3e3e3] leading-relaxed text-[15px]">
        <ReactMarkdown>{content}</ReactMarkdown>
      </div>
    );
  }

  // Deduplicate and prioritize: Hallucination > Logic > Assumption
  const activeHighlightsMap = new Map<string, typeof highlightsList[0]>();
  highlightsList.forEach(hl => {
    const existing = activeHighlightsMap.get(hl.text);
    if (!existing) {
      activeHighlightsMap.set(hl.text, hl);
    } else {
      if (hl.type === 'hallucination') {
        activeHighlightsMap.set(hl.text, hl);
      } else if (hl.type === 'logic' && existing.type === 'assumption') {
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
          <ReactMarkdown components={{ p: 'span' }}>
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
        className={`relative group cursor-pointer border-b-2 border-dashed px-1 py-0.5 rounded transition duration-200 inline ${highlight.styleClass}`}
        title={`Click to view ${highlight.tab} evaluation details`}
      >
        <ReactMarkdown components={{ p: 'span' }}>
          {highlight.text}
        </ReactMarkdown>
        
        {/* Tooltip Inspector */}
        <span className="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-72 scale-95 opacity-0 group-hover:scale-100 group-hover:opacity-100 transition-all duration-200 origin-bottom z-50 p-3 rounded-xl border bg-gray-900/95 backdrop-blur-md shadow-2xl text-xs text-gray-200 leading-relaxed normal-case font-normal">
          <span className={`block font-semibold mb-1 ${highlight.tooltipClass}`}>
            {highlight.title}
          </span>
          {highlight.reason}
          <span className="block mt-1.5 text-[10px] text-gray-500 font-medium font-mono uppercase">
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
        <ReactMarkdown components={{ p: 'span' }}>
          {remainingText.substring(lastIndex)}
        </ReactMarkdown>
      </span>
    );
  }

  return (
    <div className="prose prose-invert max-w-none text-[#e3e3e3] leading-relaxed text-[15px]">
      {segments.length > 0 ? segments : <ReactMarkdown>{content}</ReactMarkdown>}
    </div>
  );
};
