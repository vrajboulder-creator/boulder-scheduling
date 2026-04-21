'use client';

import { useState } from 'react';
import { useAppStore } from '@/hooks/useAppStore';
import { X, Sparkles, AlertTriangle, RefreshCw, Copy, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';

type Mode = 'lookahead' | 'risk';

const REPORT_STYLES = `
  .ai-report { font-family: inherit; font-size: 13px; color: #1e293b; }

  /* ── Week blocks (look-ahead) ── */
  .week-block { margin-bottom: 20px; background: #fff; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden; box-shadow: 0 1px 4px rgba(0,0,0,0.06); }
  .week-header { padding: 10px 16px; font-weight: 800; font-size: 14px; color: #fff; background: linear-gradient(135deg, #e8793b, #d4662a); border-bottom: 1px solid #e2e8f0; }
  .week-header .week-dates { font-weight: 500; font-size: 12px; color: rgba(255,255,255,0.75); }
  .section-label { padding: 10px 16px 4px; font-size: 10px; font-weight: 700; letter-spacing: 0.07em; color: #94a3b8; text-transform: uppercase; }
  .task-list, .crew-list, .procurement-list { margin: 0; padding: 0 16px 10px 32px; }
  .task-list li, .crew-list li, .procurement-list li { padding: 2px 0; color: #475569; line-height: 1.7; }
  .task-list li strong { color: #0f172a; }
  .action-list { margin: 0; padding: 0 16px 12px 32px; }
  .action-list li { padding: 2px 0; color: #475569; line-height: 1.7; }

  /* ── Severity blocks (risk) ── */
  .severity-block { margin-bottom: 16px; border-radius: 12px; overflow: hidden; border: 1px solid; box-shadow: 0 1px 4px rgba(0,0,0,0.05); }
  .severity-block.high { border-color: #fecaca; background: #fff5f5; }
  .severity-block.medium { border-color: #fde68a; background: #fffbeb; }
  .severity-block.low { border-color: #bbf7d0; background: #f0fdf4; }
  .severity-label { padding: 8px 14px; font-weight: 800; font-size: 12px; border-bottom: 1px solid rgba(0,0,0,0.06); }
  .severity-block.high .severity-label { color: #dc2626; background: #fee2e2; }
  .severity-block.medium .severity-label { color: #d97706; background: #fef3c7; }
  .severity-block.low .severity-label { color: #16a34a; background: #dcfce7; }
  .risk-item { padding: 10px 14px; border-bottom: 1px solid rgba(0,0,0,0.05); display: flex; flex-direction: column; gap: 4px; }
  .risk-item:last-child { border-bottom: none; }
  .risk-item .risk-name { font-weight: 600; color: #0f172a; font-size: 13px; }
  .risk-badge { display: inline-block; padding: 1px 8px; border-radius: 20px; font-size: 10px; font-weight: 700; margin-left: 8px; }
  .risk-badge.delay { background: #fee2e2; color: #dc2626; }
  .risk-badge.blocked { background: #ede9fe; color: #7c3aed; }
  .risk-badge.atrisk { background: #fef3c7; color: #d97706; }
  .risk-action { margin: 2px 0 0; color: #64748b; font-size: 12px; line-height: 1.5; }
`;

export default function AIPanel({ onClose }: { onClose: () => void }) {
  const activities = useAppStore((s) => s.activities);
  const [mode, setMode] = useState<Mode>('lookahead');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  async function generate() {
    setLoading(true);
    setError(null);
    setResult(null);

    const relevant = activities
      .filter((a) => !a.milestone)
      .filter((a) =>
        mode === 'risk'
          ? ['Delayed', 'Blocked', 'In Progress', 'Ready to Start'].includes(a.status)
          : ['In Progress', 'Ready to Start', 'Not Started'].includes(a.status)
      )
      .slice(0, 20);

    if (relevant.length === 0) {
      setError('No relevant activities found for this analysis.');
      setLoading(false);
      return;
    }

    try {
      const res = await fetch('/api/ai-lookahead', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ activities: relevant, mode }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Request failed');
      setResult(data.result);
    } catch (e: any) {
      setError(e.message ?? 'Something went wrong. Please try again.');
    }
    setLoading(false);
  }

  function copyToClipboard() {
    if (!result) return;
    // Strip HTML tags for plain text copy
    const tmp = document.createElement('div');
    tmp.innerHTML = result;
    navigator.clipboard.writeText(tmp.textContent ?? result);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  const accentColor = mode === 'lookahead' ? '#e8793b' : '#ef4444';

  return (
    <div
      className="fixed inset-0 bg-black/75 flex items-center justify-center z-[8000]"
      onClick={onClose}
    >
      <style>{REPORT_STYLES}</style>

      <div
        className="bg-white border border-slate-200 rounded-2xl w-[680px] max-h-[88vh] flex flex-col shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* ── Header ── */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 shrink-0">
          <div>
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4" style={{ color: accentColor }} />
              <span className="font-bold text-[15px] text-slate-900">AI Schedule Assistant</span>
            </div>
            <p className="text-[11px] text-slate-400 mt-0.5">Powered by NVIDIA NIM · Secure server-side analysis</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700 transition-colors">
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* ── Mode tabs ── */}
        <div className="flex gap-2 px-6 py-3 border-b border-slate-100 bg-slate-50 shrink-0">
          <button
            onClick={() => { setMode('lookahead'); setResult(null); setError(null); }}
            className="flex items-center gap-1.5 px-4 py-1.5 rounded-full text-[12px] font-semibold transition-all"
            style={{
              background: mode === 'lookahead' ? '#e8793b' : '#e2e8f0',
              color: mode === 'lookahead' ? '#fff' : '#64748b',
            }}
          >
            <Sparkles className="h-3 w-3" />
            3-Week Look-Ahead
          </button>
          <button
            onClick={() => { setMode('risk'); setResult(null); setError(null); }}
            className="flex items-center gap-1.5 px-4 py-1.5 rounded-full text-[12px] font-semibold transition-all"
            style={{
              background: mode === 'risk' ? '#ef4444' : '#e2e8f0',
              color: mode === 'risk' ? '#fff' : '#64748b',
            }}
          >
            <AlertTriangle className="h-3 w-3" />
            Risk & Delay Analysis
          </button>
        </div>

        {/* ── Body ── */}
        <div className="flex-1 overflow-y-auto px-6 py-5 min-h-0 bg-slate-50">

          {!result && !loading && !error && (
            <div className="text-[13px] text-slate-500 leading-relaxed bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
              {mode === 'lookahead'
                ? 'Reads your active In Progress + Ready to Start activities and generates a formatted 3-week look-ahead with week-by-week task breakdowns, crew coordination notes, procurement reminders, and a PM action items checklist.'
                : 'Scans all Delayed, Blocked, and In Progress activities and flags risks grouped by severity (High / Medium / Low) with concrete recommended actions for each.'}
            </div>
          )}

          {loading && (
            <div className="flex flex-col items-center justify-center py-16 gap-4">
              <div
                className="h-9 w-9 rounded-full border-[3px] border-t-transparent animate-spin"
                style={{ borderColor: `${accentColor} transparent transparent transparent` }}
              />
              <span className="text-[13px] text-slate-500">
                {mode === 'lookahead' ? 'Building your look-ahead report…' : 'Analyzing risks and delays…'}
              </span>
            </div>
          )}

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-[13px] text-red-600">
              {error}
            </div>
          )}

          {result && (
            <div
              className="overflow-auto"
              dangerouslySetInnerHTML={{ __html: result }}
            />
          )}
        </div>

        {/* ── Footer ── */}
        <div className="px-6 py-4 border-t border-slate-100 bg-white shrink-0 flex gap-2 items-center rounded-b-2xl">
          {result ? (
            <>
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5 text-slate-600"
                onClick={() => { setResult(null); setError(null); }}
              >
                <RefreshCw className="h-3.5 w-3.5" />
                Regenerate
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5 text-slate-600"
                onClick={copyToClipboard}
              >
                {copied
                  ? <Check className="h-3.5 w-3.5 text-green-500" />
                  : <Copy className="h-3.5 w-3.5" />}
                {copied ? 'Copied!' : 'Copy Text'}
              </Button>
              <Button
                size="sm"
                onClick={onClose}
                className="ml-auto text-white"
                style={{ background: accentColor }}
              >
                Done
              </Button>
            </>
          ) : (
            <>
              <Button variant="outline" size="sm" onClick={onClose} className="text-slate-600">
                Cancel
              </Button>
              <Button
                size="sm"
                disabled={loading}
                onClick={generate}
                className="ml-auto gap-1.5 text-white"
                style={{ background: loading ? '#94a3b8' : accentColor }}
              >
                <Sparkles className="h-3.5 w-3.5" />
                {loading
                  ? 'Generating…'
                  : mode === 'lookahead'
                  ? 'Generate Look-Ahead'
                  : 'Analyze Risks'}
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
