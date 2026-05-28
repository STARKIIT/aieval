import React from 'react';
import { useStore, EvaluationReport } from '@/store/useStore';
import { X, ShieldAlert, CheckCircle, AlertTriangle, ShieldCheck, HelpCircle, Activity, Scale, Compass, Brain } from 'lucide-react';

interface SidebarProps {
  evaluation: EvaluationReport;
  onClose: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ evaluation, onClose }) => {
  const { activeTab, setActiveTab } = useStore();

  const tabs = [
    { id: 'overview', label: 'Overview', icon: ShieldCheck },
    { id: 'reasoning', label: 'Reasoning', icon: Brain },
    { id: 'assumptions', label: 'Assumptions', icon: HelpCircle },
    { id: 'hallucinations', label: 'Factual', icon: ShieldAlert },
    { id: 'logic', label: 'Logic', icon: Activity },
    { id: 'calibration', label: 'Certainty', icon: Compass },
    { id: 'bias', label: 'Bias', icon: Scale },
  ];

  const getReliabilityStyles = (level: string) => {
    switch (level) {
      case 'HIGH':
        return {
          bg: 'bg-emerald-500/5 border border-emerald-500/20 text-emerald-400',
          text: 'text-emerald-400',
          label: 'High Reliability',
          icon: CheckCircle
        };
      case 'MEDIUM':
        return {
          bg: 'bg-amber-500/5 border border-amber-500/20 text-amber-400',
          text: 'text-amber-400',
          label: 'Medium Reliability',
          icon: AlertTriangle
        };
      case 'LOW':
      default:
        return {
          bg: 'bg-rose-500/5 border border-rose-500/20 text-rose-400',
          text: 'text-rose-400',
          label: 'Low Reliability',
          icon: ShieldAlert
        };
    }
  };

  const rel = getReliabilityStyles(evaluation.overallReliability);
  const RelIcon = rel.icon;

  const radius = 40;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (evaluation.trustScore / 100) * circumference;

  return (
    <div className="h-full flex flex-col bg-[#1e1f20] border-l border-[#2c2e30]/80 text-[#e3e3e3] w-full md:w-[480px] shadow-2xl relative z-40 transition-all duration-300">
      
      {/* Header */}
      <div className="p-4 border-b border-[#2c2e30]/80 flex items-center justify-between">
        <div>
          <h2 className="text-base font-semibold tracking-tight text-white flex items-center gap-2 font-sans">
            <ShieldCheck className="h-5 w-5 text-[#8ab4f8]" />
            Trust & Reliability Panel
          </h2>
          <p className="text-xs text-[#c4c7c5]/60">Layered output reliability analysis</p>
        </div>
        <button
          onClick={onClose}
          className="p-1.5 hover:bg-[#2d2f31] rounded-full text-[#c4c7c5] hover:text-white transition-colors"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      {/* Material Tabs */}
      <div className="flex border-b border-[#2c2e30]/60 overflow-x-auto shrink-0 bg-[#1e1f20] scrollbar-thin">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-1 px-3 py-3 text-[11px] font-semibold border-b-2 transition-all duration-150 whitespace-nowrap cursor-pointer ${
                isActive
                  ? 'border-[#8ab4f8] text-[#8ab4f8] bg-[#8ab4f8]/5'
                  : 'border-transparent text-[#c4c7c5] hover:text-[#e3e3e3] hover:bg-[#2d2f31]/40'
              }`}
            >
              <Icon className="h-3 w-3" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Tab Contents */}
      <div className="flex-1 overflow-y-auto p-5 space-y-6 scrollbar-thin">
        
        {/* OVERVIEW TAB */}
        {activeTab === 'overview' && (
          <div className="space-y-6 animate-fadeIn">
            {/* Reliability Card */}
            <div className={`p-4 rounded-2xl border flex items-center justify-between ${rel.bg}`}>
              <div className="flex items-center gap-3">
                <RelIcon className="h-6 w-6 shrink-0" />
                <div>
                  <h3 className="text-sm font-semibold uppercase tracking-wider text-[#e3e3e3]">
                    {rel.label}
                  </h3>
                  <p className="text-xs opacity-70">Overall response assessment</p>
                </div>
              </div>
              
              {/* Trust Score Radial Dial */}
              <div className="relative h-16 w-16 flex items-center justify-center shrink-0">
                <svg className="absolute transform -rotate-90 w-16 h-16">
                  <circle
                    cx="32"
                    cy="32"
                    r={radius}
                    className="stroke-[#131314]"
                    strokeWidth="4"
                    fill="transparent"
                  />
                  <circle
                    cx="32"
                    cy="32"
                    r={radius}
                    className="stroke-[#8ab4f8] drop-shadow-[0_0_2px_rgba(138,180,248,0.3)]"
                    strokeWidth="4"
                    fill="transparent"
                    strokeDasharray={circumference}
                    strokeDashoffset={strokeDashoffset}
                    strokeLinecap="round"
                  />
                </svg>
                <span className="text-xs font-bold text-white font-mono">{evaluation.trustScore}%</span>
              </div>
            </div>

            {/* Metrics Breakdown Grid */}
            <div className="grid grid-cols-3 gap-3">
              <div className="p-3 bg-[#131314]/40 border border-[#2c2e30] rounded-2xl text-center">
                <span className="block text-[9px] uppercase font-bold tracking-wider text-[#c4c7c5] mb-1">Logic Quality</span>
                <span className="text-sm font-bold text-emerald-400 font-mono">{evaluation.logicScore}%</span>
              </div>
              <div className="p-3 bg-[#131314]/40 border border-[#2c2e30] rounded-2xl text-center">
                <span className="block text-[9px] uppercase font-bold tracking-wider text-[#c4c7c5] mb-1">Factual Risk</span>
                <span className={`text-sm font-bold font-mono ${evaluation.hallucinationScore > 50 ? 'text-rose-400' : 'text-amber-400'}`}>
                  {evaluation.hallucinationScore}%
                </span>
              </div>
              <div className="p-3 bg-[#131314]/40 border border-[#2c2e30] rounded-2xl text-center">
                <span className="block text-[9px] uppercase font-bold tracking-wider text-[#c4c7c5] mb-1">Calibration</span>
                <span className="text-sm font-bold text-[#8ab4f8] font-mono">{evaluation.calibrationScore}%</span>
              </div>
            </div>

            {/* Summary */}
            <div className="space-y-2">
              <h4 className="text-[10px] font-bold uppercase tracking-wider text-[#c4c7c5]/70">Analysis Summary</h4>
              <div className="p-4 bg-[#131314]/30 border border-[#2c2e30] rounded-2xl text-xs leading-relaxed text-[#c4c7c5]">
                {evaluation.summary}
              </div>
            </div>

            {/* Judge Meta-Evaluation */}
            <div className="space-y-2">
              <h4 className="text-[10px] font-bold uppercase tracking-wider text-[#c4c7c5]/70">Judge Meta-Evaluation</h4>
              <div className="grid grid-cols-2 gap-3 p-4 bg-[#131314]/30 border border-[#2c2e30] rounded-2xl">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-[#c4c7c5]">Coherence</span>
                  <span className={`font-semibold px-2 py-0.5 rounded text-[10px] ${
                    evaluation.coherence === 'EXCELLENT' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' :
                    evaluation.coherence === 'GOOD' ? 'bg-[#8ab4f8]/10 text-[#8ab4f8] border border-[#8ab4f8]/20' :
                    evaluation.coherence === 'FAIR' ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' :
                    'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                  }`}>{evaluation.coherence}</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-[#c4c7c5]">Clarity</span>
                  <span className={`font-semibold px-2 py-0.5 rounded text-[10px] ${
                    evaluation.clarity === 'EXCELLENT' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' :
                    evaluation.clarity === 'GOOD' ? 'bg-[#8ab4f8]/10 text-[#8ab4f8] border border-[#8ab4f8]/20' :
                    evaluation.clarity === 'FAIR' ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' :
                    'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                  }`}>{evaluation.clarity}</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-[#c4c7c5]">Completeness</span>
                  <span className={`font-semibold px-2 py-0.5 rounded text-[10px] ${
                    evaluation.completeness === 'EXCELLENT' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' :
                    evaluation.completeness === 'GOOD' ? 'bg-[#8ab4f8]/10 text-[#8ab4f8] border border-[#8ab4f8]/20' :
                    evaluation.completeness === 'FAIR' ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' :
                    'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                  }`}>{evaluation.completeness}</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-[#c4c7c5]">Usefulness</span>
                  <span className={`font-semibold px-2 py-0.5 rounded text-[10px] ${
                    evaluation.usefulness === 'EXCELLENT' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' :
                    evaluation.usefulness === 'GOOD' ? 'bg-[#8ab4f8]/10 text-[#8ab4f8] border border-[#8ab4f8]/20' :
                    evaluation.usefulness === 'FAIR' ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' :
                    'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                  }`}>{evaluation.usefulness}</span>
                </div>
              </div>
            </div>

            {/* Shortcut Findings Widgets */}
            <div className="space-y-3">
              <h4 className="text-[10px] font-bold uppercase tracking-wider text-[#c4c7c5]/70">Identified Findings</h4>
              <div className="divide-y divide-[#2c2e30] border border-[#2c2e30] rounded-2xl overflow-hidden">
                <button
                  onClick={() => setActiveTab('reasoning')}
                  className="w-full flex items-center justify-between p-3.5 text-left text-xs hover:bg-[#2d2f31]/40 transition border-b border-[#2c2e30] cursor-pointer"
                >
                  <span className="flex items-center gap-2 text-[#e3e3e3]">
                    <Brain className="h-4 w-5 text-[#8ab4f8]" />
                    Simulated Reasoning Flow (CoT)
                  </span>
                  <span className="bg-[#8ab4f8]/10 border border-[#8ab4f8]/20 text-[#8ab4f8] px-2.5 py-0.5 rounded-full font-mono text-[10px]">
                    View
                  </span>
                </button>
                <button
                  onClick={() => setActiveTab('assumptions')}
                  className="w-full flex items-center justify-between p-3.5 text-left text-xs hover:bg-[#2d2f31]/40 transition cursor-pointer"
                >
                  <span className="flex items-center gap-2 text-[#e3e3e3]">
                    <HelpCircle className="h-4 w-5 text-amber-400" />
                    Implicit Assumptions
                  </span>
                  <span className="bg-[#131314]/40 border border-[#2c2e30] text-[#c4c7c5] px-2.5 py-0.5 rounded-full font-mono text-[10px]">
                    {evaluation.assumptions.length}
                  </span>
                </button>
                <button
                  onClick={() => setActiveTab('hallucinations')}
                  className="w-full flex items-center justify-between p-3.5 text-left text-xs hover:bg-[#2d2f31]/40 transition cursor-pointer"
                >
                  <span className="flex items-center gap-2 text-[#e3e3e3]">
                    <ShieldAlert className="h-4 w-5 text-rose-400" />
                    Factual Hallucinations
                  </span>
                  <span className="bg-rose-500/10 border border-rose-500/20 text-rose-450 px-2.5 py-0.5 rounded-full font-mono text-[10px]">
                    {evaluation.hallucinations.length}
                  </span>
                </button>
                <button
                  onClick={() => setActiveTab('logic')}
                  className="w-full flex items-center justify-between p-3.5 text-left text-xs hover:bg-[#2d2f31]/40 transition cursor-pointer"
                >
                  <span className="flex items-center gap-2 text-[#e3e3e3]">
                    <Activity className="h-4 w-5 text-[#8ab4f8]" />
                    Reasoning & Logic Flaws
                  </span>
                  <span className="bg-[#131314]/40 border border-[#2c2e30] text-[#c4c7c5] px-2.5 py-0.5 rounded-full font-mono text-[10px]">
                    {evaluation.logicFlaws.length}
                  </span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* REASONING FLOW TAB */}
        {activeTab === 'reasoning' && (
          <div className="space-y-4 animate-fadeIn">
            <div className="flex items-center gap-2 mb-2">
              <Brain className="h-5 w-5 text-[#8ab4f8]" />
              <h3 className="text-sm font-semibold text-white">Simulated Reasoning Flow</h3>
            </div>
            <p className="text-xs text-[#c4c7c5]/60 leading-relaxed mb-4">
              Reconstructed step-by-step logic detailing how the AI likely organized and structured its response.
            </p>
            {evaluation.chainOfThought ? (
              <div className="p-4 bg-[#131314]/30 border border-[#2c2e30] rounded-2xl space-y-4">
                <div className="text-xs leading-relaxed text-[#c4c7c5] whitespace-pre-wrap divide-y divide-[#2c2e30]/40">
                  {evaluation.chainOfThought.split('\n').filter(s => s.trim().length > 0).map((step, idx) => (
                    <div key={idx} className="py-3 first:pt-0 last:pb-0 flex items-start gap-3">
                      <span className="h-5 w-5 shrink-0 rounded-full bg-[#8ab4f8]/10 border border-[#8ab4f8]/20 text-[#8ab4f8] text-[10px] font-bold font-mono flex items-center justify-center">
                        {idx + 1}
                      </span>
                      <span className="text-xs text-[#e3e3e3] mt-0.5">{step.replace(/^\d+\.\s*/, '')}</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <p className="text-xs text-[#c4c7c5]/50 italic">No reasoning flow reconstruction available.</p>
            )}
          </div>
        )}

        {/* ASSUMPTIONS TAB */}
        {activeTab === 'assumptions' && (
          <div className="space-y-4 animate-fadeIn">
            <div className="flex items-center gap-2 mb-2">
              <HelpCircle className="h-5 w-5 text-[#8ab4f8]" />
              <h3 className="text-sm font-semibold text-white">Implicit Assumptions</h3>
            </div>
            <p className="text-xs text-[#c4c7c5]/60 leading-relaxed mb-4">
              Identified unstated dependencies or conditions the AI assumed in its reasoning.
            </p>
            {evaluation.assumptions.length === 0 ? (
              <p className="text-xs text-[#c4c7c5]/50 italic">No implicit assumptions detected.</p>
            ) : (
              evaluation.assumptions.map((item, index) => (
                <div key={index} className="p-4 bg-[#131314]/30 border border-[#2c2e30] rounded-2xl space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[9px] font-bold tracking-wider font-mono uppercase bg-[#8ab4f8]/10 text-[#8ab4f8] border border-[#8ab4f8]/20 px-2 py-0.5 rounded-full">
                      Assumption #{index + 1}
                    </span>
                    <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full font-mono ${
                      item.risk === 'HIGH' ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20' :
                      item.risk === 'MEDIUM' ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' :
                      'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                    }`}>
                      {item.risk} RISK
                    </span>
                  </div>
                  <p className="text-xs font-semibold text-[#e3e3e3] leading-normal">{item.statement}</p>
                  <p className="text-xs text-[#c4c7c5] leading-relaxed pt-2 border-t border-[#2c2e30]/50">
                    <strong className="text-white">Impact:</strong> {item.reason}
                  </p>
                  {item.claim && (
                    <div className="mt-2 text-[10px] bg-amber-500/5 border border-amber-500/10 p-2.5 rounded-xl text-amber-300">
                      <strong>Linked Segment:</strong> "{item.claim}"
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        )}

        {/* HALLUCINATIONS TAB */}
        {activeTab === 'hallucinations' && (
          <div className="space-y-4 animate-fadeIn">
            <div className="flex items-center gap-2 mb-2">
              <ShieldAlert className="h-5 w-5 text-rose-450" />
              <h3 className="text-sm font-semibold text-white">Factual Hallucinations</h3>
            </div>
            <p className="text-xs text-[#c4c7c5]/60 leading-relaxed mb-4">
              Claims flagged as ungrounded or contradicted by fact-checking guidelines.
            </p>
            {evaluation.hallucinations.length === 0 ? (
              <div className="flex flex-col items-center justify-center p-8 bg-[#131314]/20 border border-dashed border-[#2c2e30] rounded-2xl">
                <CheckCircle className="h-8 w-8 text-emerald-400 mb-2" />
                <p className="text-xs text-[#c4c7c5]/60 font-medium">No factual contradictions found</p>
              </div>
            ) : (
              evaluation.hallucinations.map((item, index) => (
                <div key={index} className="p-4 bg-[#131314]/30 border border-[#2c2e30] rounded-2xl space-y-2 relative overflow-hidden group">
                  <div className="absolute top-0 left-0 bottom-0 w-1 bg-rose-500" />
                  <div className="flex items-center justify-between pl-1">
                    <span className="text-[9px] font-bold tracking-wider font-mono uppercase bg-rose-500/10 text-rose-400 border border-rose-500/20 px-2.5 py-0.5 rounded-full">
                      {item.evidenceCode}
                    </span>
                    <span className="text-[10px] text-[#c4c7c5]/40 font-mono">Index {item.startIndex}-{item.endIndex}</span>
                  </div>
                  <div className="pl-1">
                    <p className="text-[10px] font-bold text-[#c4c7c5]/60 uppercase tracking-wider">Flagged Claim</p>
                    <p className="text-xs text-rose-200/90 italic leading-relaxed bg-rose-950/10 border border-rose-500/10 rounded-xl p-2.5 mt-1">
                      "{item.claim}"
                    </p>
                  </div>
                  <div className="pl-1 pt-1.5">
                    <p className="text-[10px] font-bold text-[#c4c7c5]/60 uppercase tracking-wider">Evaluation Audit</p>
                    <p className="text-xs text-[#c4c7c5] leading-relaxed mt-1">{item.reason}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* LOGIC TAB */}
        {activeTab === 'logic' && (
          <div className="space-y-4 animate-fadeIn">
            <div className="flex items-center gap-2 mb-2">
              <Activity className="h-5 w-5 text-[#8ab4f8]" />
              <h3 className="text-sm font-semibold text-white">Reasoning & Logic Quality</h3>
            </div>
            <p className="text-xs text-[#c4c7c5]/60 leading-relaxed mb-4">
              Structural errors, fallacies, or circular reasoning flaws identified in the output text.
            </p>
            {evaluation.logicFlaws.length === 0 ? (
              <p className="text-xs text-[#c4c7c5]/50 italic">No reasoning structural flaws detected.</p>
            ) : (
              evaluation.logicFlaws.map((item, index) => (
                <div key={index} className="p-4 bg-[#131314]/30 border border-[#2c2e30] rounded-2xl space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-white">{item.flaw}</span>
                    <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full font-mono ${
                      item.severity === 'HIGH' ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20' :
                      item.severity === 'MEDIUM' ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' :
                      'bg-[#8ab4f8]/10 text-[#8ab4f8] border border-[#8ab4f8]/20'
                    }`}>
                      {item.severity} SEVERITY
                    </span>
                  </div>
                  <p className="text-xs text-[#c4c7c5] leading-relaxed pt-2 border-t border-[#2c2e30]/40">
                    {item.explanation}
                  </p>
                  {item.claim && (
                    <div className="mt-2 text-[10px] bg-indigo-500/5 border border-indigo-500/10 p-2.5 rounded-xl text-indigo-300">
                      <strong>Linked Sentence:</strong> "{item.claim}"
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        )}

        {/* CALIBRATION TAB */}
        {activeTab === 'calibration' && (
          <div className="space-y-4 animate-fadeIn">
            <div className="flex items-center gap-2 mb-2">
              <Compass className="h-5 w-5 text-[#8ab4f8]" />
              <h3 className="text-sm font-semibold text-white">Calibration Analysis</h3>
            </div>
            <p className="text-xs text-[#c4c7c5]/60 leading-relaxed mb-4">
              Measures certainty indicator mismatch (e.g. overconfidence with weak underlying evidence strength).
            </p>
            {evaluation.calibration.length === 0 ? (
              <p className="text-xs text-[#c4c7c5]/50 italic">No calibration analysis available.</p>
            ) : (
              evaluation.calibration.map((item, index) => (
                <div key={index} className="p-4 bg-[#131314]/30 border border-[#2c2e30] rounded-2xl space-y-2">
                  <div className="flex items-center justify-between">
                    <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full font-mono ${
                      item.status === 'OVERCONFIDENT' ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20' :
                      item.status === 'UNDERCONFIDENT' ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' :
                      'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                    }`}>
                      {item.status}
                    </span>
                    <span className="text-xs text-[#c4c7c5]">Certainty: <strong className="text-white font-mono">{item.certainty}%</strong></span>
                  </div>
                  <p className="text-xs text-[#e3e3e3] italic leading-relaxed">"{item.claim}"</p>
                  <p className="text-xs text-[#c4c7c5] pt-2 border-t border-[#2c2e30]/40">
                    <strong className="text-white">Evidence Strength:</strong> {item.evidenceStrength}
                  </p>
                </div>
              ))
            )}
          </div>
        )}

        {/* BIAS TAB */}
        {activeTab === 'bias' && (
          <div className="space-y-4 animate-fadeIn">
            <div className="flex items-center gap-2 mb-2">
              <Scale className="h-5 w-5 text-[#8ab4f8]" />
              <h3 className="text-sm font-semibold text-white">Bias & Fairness Analysis</h3>
            </div>
            <p className="text-xs text-[#c4c7c5]/60 leading-relaxed mb-4">
              Identifies framing bias, loaded assumptions, or unbalanced viewpoints in the generated text.
            </p>
            {evaluation.bias.length === 0 ? (
              <p className="text-xs text-[#c4c7c5]/50 italic">No framing biases detected.</p>
            ) : (
              evaluation.bias.map((item, index) => (
                <div key={index} className="p-4 bg-[#131314]/30 border border-[#2c2e30] rounded-2xl space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-white">{item.type}</span>
                    <span className="text-[9px] font-bold px-2 py-0.5 rounded-full font-mono bg-[#8ab4f8]/10 text-[#8ab4f8] border border-[#8ab4f8]/20">
                      {item.severity} RISK
                    </span>
                  </div>
                  <p className="text-xs text-[#c4c7c5] leading-relaxed">
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
