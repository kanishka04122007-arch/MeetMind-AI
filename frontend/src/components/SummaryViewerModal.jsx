import React, { useState, useEffect } from 'react';
import { 
  Sparkles, 
  X, 
  Copy, 
  Check, 
  Download, 
  FileText, 
  RefreshCw, 
  Loader2, 
  TrendingDown, 
  Clock, 
  CheckCircle2, 
  AlertCircle,
  Cpu,
  Layers,
  ListOrdered,
  Calendar,
  UserCheck,
  Zap,
  Share2,
  FileDown
} from 'lucide-react';
import { summaryService } from '../services/summaryService';
import { useAuth } from '../context/AuthContext';

export const SummaryViewerModal = ({
  isOpen,
  onClose,
  sourceId,
  sourceType = 'meeting', // 'meeting' or 'document'
  sourceTitle = 'Meeting Summary',
  sourceText = null
}) => {
  const { showToast } = useAuth();

  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [copied, setCopied] = useState(false);
  const [downloadingPdf, setDownloadingPdf] = useState(false);
  const [downloadingTxt, setDownloadingTxt] = useState(false);
  const [selectedStyle, setSelectedStyle] = useState('executive'); // 'executive', 'detailed', 'action_focused'
  const [activeTab, setActiveTab] = useState('structured'); // 'structured' or 'markdown'
  const [error, setError] = useState(null);

  useEffect(() => {
    if (isOpen && sourceId) {
      loadExistingSummary();
    }
  }, [isOpen, sourceId]);

  const loadExistingSummary = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await summaryService.getSummaryBySource(sourceId);
      if (data) {
        setSummary(data);
        setSelectedStyle(data.style || 'executive');
      } else {
        // If no summary exists yet, trigger initial generation
        await handleGenerate(selectedStyle);
      }
    } catch (err) {
      console.error('Failed to load summary:', err);
      // Try generating if not found
      await handleGenerate(selectedStyle);
    } finally {
      setLoading(false);
    }
  };

  const handleGenerate = async (style = selectedStyle) => {
    setGenerating(true);
    setError(null);
    try {
      const result = await summaryService.generateSummary({
        source_id: sourceId,
        source_type: sourceType,
        style: style,
        text: sourceText,
        title: sourceTitle
      });
      setSummary(result);
      if (showToast) {
        showToast('AI Summary generated successfully!', 'success');
      }
    } catch (err) {
      console.error('Failed to generate summary:', err);
      const msg = err.response?.data?.detail || err.message || 'Failed to generate AI summary. Please check content.';
      setError(msg);
      if (showToast) {
        showToast(msg, 'error');
      }
    } finally {
      setGenerating(false);
    }
  };

  const handleCopy = async () => {
    if (!summary?.summary_text) return;
    try {
      await navigator.clipboard.writeText(summary.summary_text);
      setCopied(true);
      if (showToast) {
        showToast('Summary copied to clipboard!', 'success');
      }
      setTimeout(() => setCopied(false), 2500);
    } catch {
      if (showToast) {
        showToast('Failed to copy to clipboard', 'error');
      }
    }
  };

  const handleDownloadPdf = async () => {
    if (!summary?._id) return;
    setDownloadingPdf(true);
    try {
      await summaryService.downloadPdf(summary._id, summary.source_title || sourceTitle);
      if (showToast) {
        showToast('PDF summary report downloaded!', 'success');
      }
    } catch (err) {
      console.error('Download PDF error:', err);
      if (showToast) {
        showToast('Failed to download PDF summary report.', 'error');
      }
    } finally {
      setDownloadingPdf(false);
    }
  };

  const handleDownloadTxt = async () => {
    if (!summary?._id) return;
    setDownloadingTxt(true);
    try {
      await summaryService.downloadTxt(summary._id, summary.source_title || sourceTitle);
      if (showToast) {
        showToast('Text summary downloaded!', 'success');
      }
    } catch (err) {
      console.error('Download TXT error:', err);
      if (showToast) {
        showToast('Failed to download TXT file.', 'error');
      }
    } finally {
      setDownloadingTxt(false);
    }
  };

  if (!isOpen) return null;

  const structured = summary?.structured_data || {};
  const stats = {
    originalWords: summary?.original_word_count || 0,
    summaryWords: summary?.summary_word_count || 0,
    compressionRatio: summary?.compression_ratio || 0,
    readingTimeSaved: summary?.reading_time_saved_mins || 0
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md animate-fade-in overflow-y-auto">
      <div className="relative w-full max-w-4xl my-auto rounded-3xl bg-slate-900 border border-slate-800 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/70">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-indigo-600 via-purple-600 to-pink-500 p-0.5 flex items-center justify-center shadow-lg shadow-indigo-500/20">
              <div className="w-full h-full bg-slate-950 rounded-[14px] flex items-center justify-center">
                <Sparkles className="w-5 h-5 text-indigo-400" />
              </div>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-bold text-white truncate max-w-md">
                  AI Meeting Summary
                </h2>
                <span className="px-2 py-0.5 rounded-full bg-indigo-500/15 border border-indigo-500/30 text-indigo-300 text-[10px] font-bold uppercase tracking-wider">
                  Module 3 AI
                </span>
              </div>
              <p className="text-xs text-slate-400 truncate max-w-md">
                {sourceTitle} &bull; {sourceType === 'document' ? 'PDF Document' : 'Audio/Video Recording'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {summary?.model_used && (
              <span className={`hidden md:inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-semibold border transition-all ${
                summary.model_used.includes('Gemini')
                  ? 'bg-gradient-to-r from-indigo-950/80 to-purple-950/80 border-indigo-500/40 text-indigo-300 shadow-sm shadow-indigo-500/10'
                  : 'bg-gradient-to-r from-amber-950/80 to-orange-950/80 border-amber-500/40 text-amber-300 shadow-sm shadow-amber-500/10'
              }`}>
                {summary.model_used.includes('Gemini') ? (
                  <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
                ) : (
                  <Cpu className="w-3.5 h-3.5 text-amber-400" />
                )}
                <span>
                  {summary.model_used.includes('Gemini')
                    ? `Primary: ${summary.model_used}`
                    : `Fallback: ${summary.model_used}`}
                </span>
              </span>
            )}
            <button
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              aria-label="Close modal"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Loading Spinner */}
        {(loading || generating) && !summary ? (
          <div className="py-24 px-6 flex flex-col items-center justify-center gap-4 text-center">
            <div className="w-16 h-16 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center animate-pulse">
              <Sparkles className="w-8 h-8 text-indigo-400 animate-spin" />
            </div>
            <div className="space-y-1">
              <h3 className="text-base font-bold text-white">
                {generating ? 'Synthesizing AI Summary...' : 'Loading Summary Details...'}
              </h3>
              <p className="text-xs text-slate-400 max-w-sm">
                AI is extracting executive overview, key decisions, deliverables, and action items from your transcript.
              </p>
            </div>
          </div>
        ) : error && !summary ? (
          <div className="py-16 px-6 flex flex-col items-center justify-center gap-4 text-center">
            <div className="w-12 h-12 rounded-2xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center">
              <AlertCircle className="w-6 h-6 text-rose-400" />
            </div>
            <p className="text-sm text-rose-300 font-medium">{error}</p>
            <button
              onClick={() => handleGenerate(selectedStyle)}
              className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold"
            >
              Retry Generation
            </button>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {/* Top Statistics Panel (Module 3 Requirement) */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="p-3.5 rounded-2xl bg-slate-950/60 border border-slate-800/80 space-y-1">
                <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                  Original Words
                </span>
                <p className="text-lg font-mono font-extrabold text-white">
                  {stats.originalWords.toLocaleString()}
                </p>
                <span className="text-[10px] text-slate-500">Source transcript</span>
              </div>

              <div className="p-3.5 rounded-2xl bg-slate-950/60 border border-slate-800/80 space-y-1">
                <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                  Summary Words
                </span>
                <p className="text-lg font-mono font-extrabold text-indigo-400">
                  {stats.summaryWords.toLocaleString()}
                </p>
                <span className="text-[10px] text-slate-500">Concise takeaways</span>
              </div>

              <div className="p-3.5 rounded-2xl bg-slate-950/60 border border-slate-800/80 space-y-1">
                <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                  Compression Ratio
                </span>
                <div className="flex items-center gap-1">
                  <TrendingDown className="w-4 h-4 text-emerald-400" />
                  <p className="text-lg font-mono font-extrabold text-emerald-400">
                    {stats.compressionRatio}%
                  </p>
                </div>
                <span className="text-[10px] text-emerald-400/80">Reduction achieved</span>
              </div>

              <div className="p-3.5 rounded-2xl bg-slate-950/60 border border-slate-800/80 space-y-1">
                <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                  Reading Time Saved
                </span>
                <div className="flex items-center gap-1">
                  <Clock className="w-4 h-4 text-purple-400" />
                  <p className="text-lg font-mono font-extrabold text-purple-300">
                    ~{stats.readingTimeSaved}m
                  </p>
                </div>
                <span className="text-[10px] text-purple-400/80">Estimated efficiency</span>
              </div>
            </div>

            {/* Controls Bar: Style Selector & Action Buttons */}
            <div className="flex flex-wrap items-center justify-between gap-3 p-3 rounded-2xl bg-slate-950/80 border border-slate-800">
              {/* Style selector */}
              <div className="flex items-center gap-1.5 text-xs">
                <span className="text-slate-400 font-medium pl-1 hidden sm:inline">Focus:</span>
                <button
                  onClick={() => {
                    setSelectedStyle('executive');
                    handleGenerate('executive');
                  }}
                  disabled={generating}
                  className={`px-3 py-1.5 rounded-xl font-semibold transition-all ${
                    selectedStyle === 'executive'
                      ? 'bg-indigo-600 text-white shadow-sm'
                      : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
                  }`}
                >
                  Executive
                </button>
                <button
                  onClick={() => {
                    setSelectedStyle('detailed');
                    handleGenerate('detailed');
                  }}
                  disabled={generating}
                  className={`px-3 py-1.5 rounded-xl font-semibold transition-all ${
                    selectedStyle === 'detailed'
                      ? 'bg-indigo-600 text-white shadow-sm'
                      : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
                  }`}
                >
                  Detailed
                </button>
                <button
                  onClick={() => {
                    setSelectedStyle('action_focused');
                    handleGenerate('action_focused');
                  }}
                  disabled={generating}
                  className={`px-3 py-1.5 rounded-xl font-semibold transition-all ${
                    selectedStyle === 'action_focused'
                      ? 'bg-indigo-600 text-white shadow-sm'
                      : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
                  }`}
                >
                  Action Items
                </button>
              </div>

              {/* Action Buttons: Regenerate, Copy, TXT, PDF */}
              <div className="flex flex-wrap items-center gap-2">
                <button
                  onClick={() => handleGenerate(selectedStyle)}
                  disabled={generating}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold transition-all disabled:opacity-50"
                  title="Regenerate summary with AI"
                >
                  <RefreshCw className={`w-3.5 h-3.5 text-indigo-400 ${generating ? 'animate-spin' : ''}`} />
                  <span>{generating ? 'Regenerating...' : 'Regenerate'}</span>
                </button>

                <button
                  onClick={handleCopy}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold transition-all"
                  title="Copy full summary to clipboard"
                >
                  {copied ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                      <span className="text-emerald-400">Copied!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5 text-purple-400" />
                      <span>Copy</span>
                    </>
                  )}
                </button>

                <button
                  onClick={handleDownloadTxt}
                  disabled={downloadingTxt}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold transition-all disabled:opacity-50"
                  title="Download clean text file"
                >
                  <FileText className="w-3.5 h-3.5 text-amber-400" />
                  <span>TXT</span>
                </button>

                <button
                  onClick={handleDownloadPdf}
                  disabled={downloadingPdf}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold transition-all shadow-md shadow-indigo-600/20 disabled:opacity-50"
                  title="Download professional PDF report"
                >
                  {downloadingPdf ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <FileDown className="w-3.5 h-3.5" />
                  )}
                  <span>Download PDF</span>
                </button>
              </div>
            </div>

            {/* View Switcher: Structured View vs Raw Markdown */}
            <div className="flex border-b border-slate-800 text-xs font-semibold">
              <button
                onClick={() => setActiveTab('structured')}
                className={`pb-2.5 px-4 border-b-2 transition-all ${
                  activeTab === 'structured'
                    ? 'border-indigo-500 text-indigo-400'
                    : 'border-transparent text-slate-400 hover:text-slate-200'
                }`}
              >
                Structured Intelligence
              </button>
              <button
                onClick={() => setActiveTab('markdown')}
                className={`pb-2.5 px-4 border-b-2 transition-all ${
                  activeTab === 'markdown'
                    ? 'border-indigo-500 text-indigo-400'
                    : 'border-transparent text-slate-400 hover:text-slate-200'
                }`}
              >
                Markdown View
              </button>
            </div>

            {/* Tab 1: Structured Intelligence View */}
            {activeTab === 'structured' ? (
              <div className="space-y-6">
                {/* 1. Executive Overview */}
                <div className="p-5 rounded-2xl bg-slate-950/60 border border-slate-800 space-y-2">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-indigo-400 flex items-center gap-2">
                    <Sparkles className="w-4 h-4" />
                    <span>Executive Overview & Meeting Purpose</span>
                  </h3>
                  <p className="text-sm text-slate-200 leading-relaxed">
                    {structured.overview || 'Overview unavailable.'}
                  </p>
                </div>

                {/* 2. Key Discussion Points */}
                <div className="p-5 rounded-2xl bg-slate-950/60 border border-slate-800 space-y-3">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-purple-400 flex items-center gap-2">
                    <Layers className="w-4 h-4" />
                    <span>Key Discussion Topics</span>
                  </h3>
                  <div className="space-y-2">
                    {(structured.key_points || []).map((point, idx) => (
                      <div key={idx} className="flex items-start gap-2.5 text-xs text-slate-300">
                        <span className="w-5 h-5 rounded-full bg-purple-500/15 text-purple-400 font-bold text-[10px] flex items-center justify-center shrink-0 mt-0.5">
                          {idx + 1}
                        </span>
                        <p className="leading-relaxed">{point}</p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* 3. Decisions Made */}
                <div className="p-5 rounded-2xl bg-slate-950/60 border border-slate-800 space-y-3">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Decisions Made</span>
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                    {(structured.decisions || []).map((dec, idx) => (
                      <div key={idx} className="p-3 rounded-xl bg-slate-900/80 border border-slate-800/80 flex items-start gap-2.5 text-xs text-slate-200">
                        <span className="w-2 h-2 rounded-full bg-emerald-400 shrink-0 mt-1.5" />
                        <span className="leading-relaxed">{dec}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* 4. Action Items Table (Module 3 Highlight) */}
                <div className="p-5 rounded-2xl bg-slate-950/60 border border-slate-800 space-y-3">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-pink-400 flex items-center gap-2">
                    <UserCheck className="w-4 h-4" />
                    <span>Action Items & Next Steps</span>
                  </h3>

                  <div className="overflow-x-auto rounded-xl border border-slate-800">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-900/90 text-slate-400 text-[11px] font-bold uppercase">
                        <tr>
                          <th className="py-2.5 px-4">Task Description</th>
                          <th className="py-2.5 px-4">Assignee</th>
                          <th className="py-2.5 px-4">Deadline</th>
                          <th className="py-2.5 px-4">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/80">
                        {(structured.action_items || []).map((item, idx) => (
                          <tr key={idx} className="hover:bg-slate-900/40 transition-colors">
                            <td className="py-3 px-4 font-medium text-white max-w-xs">
                              {item.task}
                            </td>
                            <td className="py-3 px-4 text-indigo-300 font-semibold whitespace-nowrap">
                              {item.owner}
                            </td>
                            <td className="py-3 px-4 text-slate-400 whitespace-nowrap">
                              {item.deadline}
                            </td>
                            <td className="py-3 px-4 whitespace-nowrap">
                              <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px] font-bold">
                                {item.status || 'Pending'}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* 5. Next Steps */}
                {structured.next_steps && structured.next_steps.length > 0 && (
                  <div className="p-5 rounded-2xl bg-slate-950/60 border border-slate-800 space-y-2">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-cyan-400 flex items-center gap-2">
                      <Calendar className="w-4 h-4" />
                      <span>Next Steps & Timeline</span>
                    </h3>
                    <div className="space-y-1.5">
                      {structured.next_steps.map((ns, idx) => (
                        <div key={idx} className="flex items-center gap-2 text-xs text-slate-300">
                          <span className="text-cyan-400 font-bold">&bull;</span>
                          <span>{ns}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              /* Tab 2: Raw Markdown View */
              <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 font-mono text-xs text-slate-300 overflow-x-auto whitespace-pre-wrap leading-relaxed">
                {summary?.summary_text}
              </div>
            )}
          </div>
        )}

        {/* Footer */}
        <div className="px-6 py-3.5 border-t border-slate-800 bg-slate-950/70 flex items-center justify-between text-xs text-slate-400">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400" />
            <span>Stored in MongoDB collection: <code className="text-indigo-300 font-mono">summaries</code></span>
          </div>

          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default SummaryViewerModal;
