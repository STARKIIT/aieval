import React from 'react';
import { useStore, EvaluationReport } from '@/store/useStore';
import { X, ShieldAlert, CheckCircle, AlertTriangle, ShieldCheck, HelpCircle, Activity, Scale, Compass, Brain, ArrowLeft, ChevronRight } from 'lucide-react';

interface SidebarProps {
  evaluation: EvaluationReport;
  onClose: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ evaluation, onClose }) => {
  const { activeTab, setActiveTab } = useStore();

  const getReliabilityStyles = (level: string) => {
    switch (level) {
      case 'HIGH':
        return {
          bg: 'bg-emerald-500/5',
          border: 'border-emerald-500/15',
          text: 'text-emerald-400',
          label: 'High Reliability',
          icon: CheckCircle,
          ringColor: '#34d399'
        };
      case 'MEDIUM':
        return {
          bg: 'bg-amber-500/5',
          border: 'border-amber-500/15',
          text: 'text-amber-400',
          label: 'Medium Reliability',
          icon: AlertTriangle,
          ringColor: '#fbbf24'
        };
      case 'LOW':
      default:
        return {
          bg: 'bg-rose-500/5',
          border: 'border-rose-500/15',
          text: 'text-rose-400',
          label: 'Low Reliability',
          icon: ShieldAlert,
          ringColor: '#fb7185'
        };
    }
  };

  const rel = getReliabilityStyles(evaluation.overallReliability);
  const RelIcon = rel.icon;

  const radius = 38;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (evaluation.trustScore / 100) * circumference;

  // Sub-view labels for header
  const subViewLabels: Record<string, { label: string; icon: React.ElementType; color: string }> = {
    reasoning: { label: 'Simulated Reasoning Flow', icon: Brain, color: 'text-[#8ab4f8]' },
    assumptions: { label: 'Implicit Assumptions', icon: HelpCircle, color: 'text-amber-400' },
    hallucinations: { label: 'Factual Hallucinations', icon: ShieldAlert, color: 'text-rose-400' },
    logic: { label: 'Reasoning & Logic', icon: Activity, color: 'text-[#8ab4f8]' },
    calibration: { label: 'Calibration Analysis', icon: Compass, color: 'text-[#8ab4f8]' },
    bias: { label: 'Bias & Fairness', icon: Scale, color: 'text-[#d7aef8]' },
  };

  const isSubView = activeTab !== 'overview';
  const currentSubView = subViewLabels[activeTab];

  return (
    <div className="h-full flex flex-col text-[#e3e3e3] w-full md:w-[420px] lg:w-[460px] shadow-2xl relative z-40 transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] border-l border-[#2c2e30]/50"
      style={{ background: '#1e1f20' }}
    >
      
      {/* ─── Header ─── */}
      <div className="px-5 py-4 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          {isSubView ? (
            <>
              <button
                onClick={() => setActiveTab('overview')}
                className="p-1.5 hover:bg-[#2d2f31] rounded-full text-[#9aa0a6] hover:text-white transition-all duration-150 -ml-1"
                title="Back to Overview"
              >
                <ArrowLeft className="h-[18px] w-[18px]" />
              </button>
              <div>
                <h2 className="text-[15px] font-semibold tracking-tight text-white flex items-center gap-2">
                  {currentSubView && <currentSubView.icon className={`h-[16px] w-[16px] ${currentSubView.color}`} />}
                  {currentSubView?.label}
                </h2>
              </div>
            </>
          ) : (
            <div>
              <h2 className="text-[15px] font-semibold tracking-tight text-white flex items-center gap-2">
                <ShieldCheck className="h-[18px] w-[18px] text-[#8ab4f8]" />
                Trust & Reliability
              </h2>
              <p className="text-[11px] text-[#9aa0a6] mt-0.5">Output reliability analysis</p>
            </div>
          )}
        </div>
        <button
          onClick={onClose}
          className="p-2 hover:bg-[#2d2f31] rounded-full text-[#9aa0a6] hover:text-white transition-all duration-150"
        >
          <X className="h-[18px] w-[18px]" />
        </button>
      </div>

      {/* ─── Content ─── */}
      <div className="flex-1 overflow-y-auto p-5 space-y-5 scrollbar-thin">
        
        {/* ═══ OVERVIEW (Landing View) ═══ */}
        {activeTab === 'overview' && (
          <div className="space-y-5 animate-fadeIn">
            {/* Reliability Card */}
            <div className={`p-5 rounded-2xl border flex items-center justify-between ${rel.bg} ${rel.border}`}>
              <div className="flex items-center gap-3">
                <div className={`h-10 w-10 rounded-xl flex items-center justify-center ${rel.bg} ${rel.text}`}>
                  <RelIcon className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-[13px] font-semibold text-white">
                    {rel.label}
                  </h3>
                  <p className="text-[11px] text-[#9aa0a6]">Overall assessment</p>
                </div>
              </div>
              
              {/* Trust Score Radial */}
              <div className="relative h-[72px] w-[72px] flex items-center justify-center shrink-0">
                <svg className="absolute transform -rotate-90 w-full h-full">
                  <circle cx="36" cy="36" r={radius} className="stroke-[#131314]" strokeWidth="5" fill="transparent" />
                  <circle
                    cx="36" cy="36" r={radius}
                    stroke={rel.ringColor}
                    strokeWidth="5" fill="transparent"
                    strokeDasharray={circumference}
                    strokeDashoffset={strokeDashoffset}
                    strokeLinecap="round"
                    className="transition-all duration-700 ease-out"
                    style={{ filter: `drop-shadow(0 0 4px ${rel.ringColor}30)` }}
                  />
                </svg>
                <span className="text-[13px] font-bold text-white font-mono">{evaluation.trustScore}%</span>
              </div>
            </div>

            {/* Metrics Grid */}
            <div className="grid grid-cols-3 gap-2.5">
              <div className="p-3 bg-[#131314]/30 border border-[#2c2e30]/50 rounded-xl text-center">
                <span className="block text-[9px] font-semibold tracking-wider text-[#9aa0a6] mb-1 uppercase">Logic</span>
                <span className="text-[14px] font-bold text-emerald-400 font-mono">{evaluation.logicScore}%</span>
              </div>
              <div className="p-3 bg-[#131314]/30 border border-[#2c2e30]/50 rounded-xl text-center">
                <span className="block text-[9px] font-semibold tracking-wider text-[#9aa0a6] mb-1 uppercase">Factual</span>
                <span className={`text-[14px] font-bold font-mono ${evaluation.hallucinationScore > 50 ? 'text-rose-400' : 'text-amber-400'}`}>
                  {evaluation.hallucinationScore}%
                </span>
              </div>
              <div className="p-3 bg-[#131314]/30 border border-[#2c2e30]/50 rounded-xl text-center">
                <span className="block text-[9px] font-semibold tracking-wider text-[#9aa0a6] mb-1 uppercase">Calibration</span>
                <span className="text-[14px] font-bold text-[#8ab4f8] font-mono">{evaluation.calibrationScore}%</span>
              </div>
            </div>

            {/* Summary */}
            <div className="space-y-2">
              <h4 className="text-[10px] font-bold uppercase tracking-wider text-[#9aa0a6]">Analysis Summary</h4>
              <div className="p-4 bg-[#131314]/20 border border-[#2c2e30]/40 rounded-xl text-[12px] leading-relaxed text-[#c4c7c5]">
                {evaluation.summary}
              </div>
            </div>

            {/* Judge Meta-Evaluation */}
            <div className="space-y-2">
              <h4 className="text-[10px] font-bold uppercase tracking-wider text-[#9aa0a6]">Judge Meta-Evaluation</h4>
              <div className="grid grid-cols-2 gap-2.5 p-4 bg-[#131314]/20 border border-[#2c2e30]/40 rounded-xl">
                {[
                  { label: 'Coherence', value: evaluation.coherence },
                  { label: 'Clarity', value: evaluation.clarity },
                  { label: 'Completeness', value: evaluation.completeness },
                  { label: 'Usefulness', value: evaluation.usefulness },
                ].map((metric) => (
                  <div key={metric.label} className="flex items-center justify-between text-[12px]">
                    <span className="text-[#9aa0a6]">{metric.label}</span>
                    <span className={`font-semibold px-2 py-0.5 rounded text-[10px] ${
                      metric.value === 'EXCELLENT' ? 'bg-emerald-500/10 text-emerald-400' :
                      metric.value === 'GOOD' ? 'bg-[#8ab4f8]/10 text-[#8ab4f8]' :
                      metric.value === 'FAIR' ? 'bg-amber-500/10 text-amber-400' :
                      'bg-rose-500/10 text-rose-400'
                    }`}>{metric.value}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* ─── DRILL-DOWN NAVIGATION CARDS ─── */}
            <div className="space-y-2">
              <h4 className="text-[10px] font-bold uppercase tracking-wider text-[#9aa0a6]">Detailed Analysis</h4>
              <div className="space-y-1.5">
                {[
                  { tab: 'reasoning', label: 'Simulated Reasoning (CoT)', icon: Brain, color: 'text-[#8ab4f8]', iconBg: 'bg-[#8ab4f8]/10', badge: 'View', badgeStyle: 'bg-[#8ab4f8]/10 text-[#8ab4f8]' },
                  { tab: 'assumptions', label: 'Implicit Assumptions', icon: HelpCircle, color: 'text-amber-400', iconBg: 'bg-amber-500/10', badge: String(evaluation.assumptions.length), badgeStyle: evaluation.assumptions.length > 0 ? 'bg-amber-500/10 text-amber-400' : 'bg-[#131314]/40 text-[#9aa0a6]' },
                  { tab: 'hallucinations', label: 'Factual Hallucinations', icon: ShieldAlert, color: 'text-rose-400', iconBg: 'bg-rose-500/10', badge: String(evaluation.hallucinations.length), badgeStyle: evaluation.hallucinations.length > 0 ? 'bg-rose-500/10 text-rose-400' : 'bg-[#131314]/40 text-[#9aa0a6]' },
                  { tab: 'logic', label: 'Reasoning & Logic Flaws', icon: Activity, color: 'text-[#8ab4f8]', iconBg: 'bg-[#8ab4f8]/10', badge: String(evaluation.logicFlaws.length), badgeStyle: evaluation.logicFlaws.length > 0 ? 'bg-amber-500/10 text-amber-400' : 'bg-[#131314]/40 text-[#9aa0a6]' },
                  { tab: 'calibration', label: 'Certainty Calibration', icon: Compass, color: 'text-[#8ab4f8]', iconBg: 'bg-[#8ab4f8]/10', badge: String(evaluation.calibration.length), badgeStyle: 'bg-[#131314]/40 text-[#9aa0a6]' },
                  { tab: 'bias', label: 'Bias & Fairness', icon: Scale, color: 'text-[#d7aef8]', iconBg: 'bg-[#d7aef8]/10', badge: String(evaluation.bias.length), badgeStyle: evaluation.bias.length > 0 ? 'bg-[#d7aef8]/10 text-[#d7aef8]' : 'bg-[#131314]/40 text-[#9aa0a6]' },
                ].map((item) => {
                  const Icon = item.icon;
                  return (
                    <button
                      key={item.tab}
                      onClick={() => setActiveTab(item.tab)}
                      className="w-full flex items-center gap-3 p-3 text-left text-[13px] hover:bg-[#2d2f31]/40 rounded-xl transition-all duration-150 cursor-pointer group"
                    >
                      <div className={`h-8 w-8 rounded-lg flex items-center justify-center shrink-0 ${item.iconBg}`}>
                        <Icon className={`h-4 w-4 ${item.color}`} />
                      </div>
                      <span className="flex-1 text-[#e3e3e3] font-medium">{item.label}</span>
                      <span className={`px-2 py-0.5 rounded-full font-mono text-[10px] font-semibold ${item.badgeStyle}`}>
                        {item.badge}
                      </span>
                      <ChevronRight className="h-3.5 w-3.5 text-[#9aa0a6]/40 group-hover:text-[#9aa0a6] transition-colors" />
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* ═══ REASONING SUB-VIEW ═══ */}
        {activeTab === 'reasoning' && (
          <div className="space-y-4 animate-fadeIn">
            <p className="text-[12px] text-[#9aa0a6] leading-relaxed">
              Reconstructed step-by-step logic detailing how the AI likely organized its response.
            </p>
            {evaluation.chainOfThought ? (
              <div className="space-y-0">
                {evaluation.chainOfThought.split('\n').filter(s => s.trim().length > 0).map((step, idx) => (
                  <div key={idx} className="py-3 flex items-start gap-3 border-b border-[#2c2e30]/20 last:border-0">
                    <span className="h-6 w-6 shrink-0 rounded-full bg-[#8ab4f8]/10 text-[#8ab4f8] text-[10px] font-bold font-mono flex items-center justify-center mt-0.5">
                      {idx + 1}
                    </span>
                    <span className="text-[13px] text-[#e3e3e3] leading-relaxed">{step.replace(/^\d+\.\s*/, '')}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-[12px] text-[#9aa0a6]/50 italic">No reasoning flow reconstruction available.</p>
            )}
          </div>
        )}

        {/* ═══ ASSUMPTIONS SUB-VIEW ═══ */}
        {activeTab === 'assumptions' && (
          <div className="space-y-4 animate-fadeIn">
            <p className="text-[12px] text-[#9aa0a6] leading-relaxed">
              Identified unstated dependencies or conditions the AI assumed in its reasoning.
            </p>
            {evaluation.assumptions.length === 0 ? (
              <div className="flex flex-col items-center justify-center p-8 bg-[#131314]/15 border border-dashed border-[#2c2e30]/40 rounded-xl">
                <CheckCircle className="h-8 w-8 text-emerald-400 mb-2" />
                <p className="text-[12px] text-[#9aa0a6] font-medium">No implicit assumptions detected</p>
              </div>
            ) : (
              evaluation.assumptions.map((item, index) => (
                <div key={index} className="p-4 bg-[#131314]/20 border border-[#2c2e30]/40 rounded-xl space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[9px] font-bold tracking-wider font-mono uppercase bg-amber-500/10 text-amber-400 px-2.5 py-0.5 rounded-full">
                      Assumption #{index + 1}
                    </span>
                    <span className={`text-[9px] font-bold px-2.5 py-0.5 rounded-full font-mono ${
                      item.risk === 'HIGH' ? 'bg-rose-500/10 text-rose-400' :
                      item.risk === 'MEDIUM' ? 'bg-amber-500/10 text-amber-400' :
                      'bg-emerald-500/10 text-emerald-400'
                    }`}>
                      {item.risk} RISK
                    </span>
                  </div>
                  <p className="text-[13px] font-semibold text-[#e3e3e3] leading-relaxed">{item.statement}</p>
                  <p className="text-[12px] text-[#c4c7c5] leading-relaxed pt-2 border-t border-[#2c2e30]/30">
                    <strong className="text-white">Impact:</strong> {item.reason}
                  </p>
                  {item.claim && (
                    <div className="text-[11px] bg-amber-500/5 border border-amber-500/10 p-2.5 rounded-lg text-amber-300/90">
                      <strong>Linked Segment:</strong> &quot;{item.claim}&quot;
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        )}

        {/* ═══ HALLUCINATIONS SUB-VIEW ═══ */}
        {activeTab === 'hallucinations' && (
          <div className="space-y-4 animate-fadeIn">
            <p className="text-[12px] text-[#9aa0a6] leading-relaxed">
              Claims flagged as ungrounded or contradicted by fact-checking guidelines.
            </p>
            {evaluation.hallucinations.length === 0 ? (
              <div className="flex flex-col items-center justify-center p-8 bg-[#131314]/15 border border-dashed border-[#2c2e30]/40 rounded-xl">
                <CheckCircle className="h-8 w-8 text-emerald-400 mb-2" />
                <p className="text-[12px] text-[#9aa0a6] font-medium">No factual contradictions found</p>
              </div>
            ) : (
              evaluation.hallucinations.map((item, index) => (
                <div key={index} className="p-4 bg-[#131314]/20 border border-[#2c2e30]/40 rounded-xl space-y-3 relative overflow-hidden">
                  <div className="absolute top-0 left-0 bottom-0 w-[3px] bg-rose-500 rounded-r" />
                  <div className="flex items-center justify-between pl-2">
                    <span className="text-[9px] font-bold tracking-wider font-mono uppercase bg-rose-500/10 text-rose-400 px-2.5 py-0.5 rounded-full">
                      {item.evidenceCode}
                    </span>
                    <span className="text-[10px] text-[#9aa0a6]/50 font-mono">Index {item.startIndex}-{item.endIndex}</span>
                  </div>
                  <div className="pl-2 space-y-2">
                    <p className="text-[10px] font-bold text-[#9aa0a6] uppercase tracking-wider">Flagged Claim</p>
                    <p className="text-[12px] text-rose-200/80 italic leading-relaxed bg-rose-950/10 border border-rose-500/10 rounded-lg p-3">
                      &quot;{item.claim}&quot;
                    </p>
                    <p className="text-[10px] font-bold text-[#9aa0a6] uppercase tracking-wider pt-1">Evaluation Audit</p>
                    <p className="text-[12px] text-[#c4c7c5] leading-relaxed">{item.reason}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* ═══ LOGIC SUB-VIEW ═══ */}
        {activeTab === 'logic' && (
          <div className="space-y-4 animate-fadeIn">
            <p className="text-[12px] text-[#9aa0a6] leading-relaxed">
              Structural errors, fallacies, or circular reasoning flaws identified in the output.
            </p>
            {evaluation.logicFlaws.length === 0 ? (
              <div className="flex flex-col items-center justify-center p-8 bg-[#131314]/15 border border-dashed border-[#2c2e30]/40 rounded-xl">
                <CheckCircle className="h-8 w-8 text-emerald-400 mb-2" />
                <p className="text-[12px] text-[#9aa0a6] font-medium">No reasoning structural flaws detected</p>
              </div>
            ) : (
              evaluation.logicFlaws.map((item, index) => (
                <div key={index} className="p-4 bg-[#131314]/20 border border-[#2c2e30]/40 rounded-xl space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[13px] font-semibold text-white">{item.flaw}</span>
                    <span className={`text-[9px] font-bold px-2.5 py-0.5 rounded-full font-mono ${
                      item.severity === 'HIGH' ? 'bg-rose-500/10 text-rose-400' :
                      item.severity === 'MEDIUM' ? 'bg-amber-500/10 text-amber-400' :
                      'bg-[#8ab4f8]/10 text-[#8ab4f8]'
                    }`}>
                      {item.severity} SEVERITY
                    </span>
                  </div>
                  <p className="text-[12px] text-[#c4c7c5] leading-relaxed pt-2 border-t border-[#2c2e30]/30">
                    {item.explanation}
                  </p>
                  {item.claim && (
                    <div className="text-[11px] bg-indigo-500/5 border border-indigo-500/10 p-2.5 rounded-lg text-indigo-300/90">
                      <strong>Linked Sentence:</strong> &quot;{item.claim}&quot;
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        )}

        {/* ═══ CALIBRATION SUB-VIEW ═══ */}
        {activeTab === 'calibration' && (
          <div className="space-y-4 animate-fadeIn">
            <p className="text-[12px] text-[#9aa0a6] leading-relaxed">
              Measures certainty indicator mismatch (e.g. overconfidence with weak evidence).
            </p>
            {evaluation.calibration.length === 0 ? (
              <div className="flex flex-col items-center justify-center p-8 bg-[#131314]/15 border border-dashed border-[#2c2e30]/40 rounded-xl">
                <CheckCircle className="h-8 w-8 text-emerald-400 mb-2" />
                <p className="text-[12px] text-[#9aa0a6] font-medium">No calibration analysis available</p>
              </div>
            ) : (
              evaluation.calibration.map((item, index) => (
                <div key={index} className="p-4 bg-[#131314]/20 border border-[#2c2e30]/40 rounded-xl space-y-3">
                  <div className="flex items-center justify-between">
                    <span className={`text-[9px] font-bold px-2.5 py-0.5 rounded-full font-mono ${
                      item.status === 'OVERCONFIDENT' ? 'bg-rose-500/10 text-rose-400' :
                      item.status === 'UNDERCONFIDENT' ? 'bg-amber-500/10 text-amber-400' :
                      'bg-emerald-500/10 text-emerald-400'
                    }`}>
                      {item.status}
                    </span>
                    <span className="text-[12px] text-[#9aa0a6]">Certainty: <strong className="text-white font-mono">{item.certainty}%</strong></span>
                  </div>
                  <p className="text-[12px] text-[#e3e3e3] italic leading-relaxed">&quot;{item.claim}&quot;</p>
                  <p className="text-[12px] text-[#c4c7c5] pt-2 border-t border-[#2c2e30]/30">
                    <strong className="text-white">Evidence Strength:</strong> {item.evidenceStrength}
                  </p>
                </div>
              ))
            )}
          </div>
        )}

        {/* ═══ BIAS SUB-VIEW ═══ */}
        {activeTab === 'bias' && (
          <div className="space-y-4 animate-fadeIn">
            <p className="text-[12px] text-[#9aa0a6] leading-relaxed">
              Identifies framing bias, loaded assumptions, or unbalanced viewpoints in the generated text.
            </p>
            {evaluation.bias.length === 0 ? (
              <div className="flex flex-col items-center justify-center p-8 bg-[#131314]/15 border border-dashed border-[#2c2e30]/40 rounded-xl">
                <Scale className="h-8 w-8 text-emerald-400 mb-2" />
                <p className="text-[12px] text-[#9aa0a6] font-medium">No framing biases detected</p>
              </div>
            ) : (
              evaluation.bias.map((item, index) => (
                <div key={index} className="p-4 bg-[#131314]/20 border border-[#2c2e30]/40 rounded-xl space-y-3 relative overflow-hidden">
                  <div className="absolute top-0 left-0 bottom-0 w-[3px] bg-[#d7aef8] rounded-r" />
                  <div className="flex items-center justify-between pl-2">
                    <span className="text-[13px] font-semibold text-white">{item.type}</span>
                    <span className={`text-[9px] font-bold px-2.5 py-0.5 rounded-full font-mono ${
                      item.severity === 'HIGH' ? 'bg-rose-500/10 text-rose-400' :
                      item.severity === 'MEDIUM' ? 'bg-amber-500/10 text-amber-400' :
                      'bg-[#d7aef8]/10 text-[#d7aef8]'
                    }`}>
                      {item.severity} RISK
                    </span>
                  </div>
                  <p className="text-[12px] text-[#c4c7c5] leading-relaxed pl-2">
                    <strong className="text-white">Evidence:</strong> {item.evidence}
                  </p>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
};
