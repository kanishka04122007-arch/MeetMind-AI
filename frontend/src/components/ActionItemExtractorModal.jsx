import React, { useState } from 'react';
import { 
  Sparkles, 
  X, 
  CheckSquare, 
  User, 
  Clock, 
  ArrowRight, 
  Loader2, 
  CheckCircle2, 
  AlertCircle,
  Flag
} from 'lucide-react';
import { actionItemService } from '../services/actionItemService';
import { useAuth } from '../context/AuthContext';

export const ActionItemExtractorModal = ({
  isOpen,
  onClose,
  sourceId,
  sourceType = 'meeting',
  sourceTitle = 'Meeting Session',
  sourceText = null,
  onSuccess
}) => {
  const { showToast } = useAuth();
  const [extracting, setExtracting] = useState(false);
  const [extractedTasks, setExtractedTasks] = useState([]);
  const [error, setError] = useState(null);

  if (!isOpen) return null;

  const handleExtract = async () => {
    setExtracting(true);
    setError(null);
    try {
      const response = await actionItemService.extractActionItems({
        source_id: sourceId,
        source_type: sourceType,
        text: sourceText,
        title: sourceTitle
      });
      setExtractedTasks(response.tasks || []);
      if (showToast) {
        showToast(`Successfully extracted ${response.tasks?.length || 0} action items!`, 'success');
      }
      if (onSuccess) {
        onSuccess(response.tasks);
      }
    } catch (err) {
      console.error('Extraction error:', err);
      const msg = err.response?.data?.detail || 'Failed to extract action items. Please try again.';
      setError(msg);
      if (showToast) {
        showToast(msg, 'error');
      }
    } finally {
      setExtracting(false);
    }
  };

  const getPriorityBadge = (priority) => {
    switch (priority) {
      case 'High':
        return 'bg-rose-500/15 text-rose-400 border-rose-500/30';
      case 'Low':
        return 'bg-slate-800 text-slate-400 border-slate-700';
      default:
        return 'bg-amber-500/15 text-amber-400 border-amber-500/30';
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-fade-in">
      <div className="relative w-full max-w-2xl rounded-3xl bg-slate-900 border border-slate-800 shadow-2xl overflow-hidden max-h-[85vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/70">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-pink-500 to-indigo-600 p-0.5 flex items-center justify-center shadow-lg">
              <div className="w-full h-full bg-slate-950 rounded-[10px] flex items-center justify-center">
                <CheckSquare className="w-4 h-4 text-pink-400" />
              </div>
            </div>
            <div>
              <h2 className="text-base font-bold text-white">AI Action Item Extractor</h2>
              <p className="text-xs text-slate-400 truncate max-w-xs sm:max-w-md">{sourceTitle}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-4 flex-1 text-xs">
          {extractedTasks.length === 0 ? (
            <div className="py-8 text-center space-y-4">
              <div className="w-14 h-14 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center mx-auto">
                <Sparkles className="w-7 h-7 text-indigo-400" />
              </div>
              <div className="space-y-1 max-w-sm mx-auto">
                <h3 className="text-sm font-bold text-white">Extract Tasks, Deadlines & Assignees</h3>
                <p className="text-slate-400 leading-relaxed text-[11px]">
                  MeetMind AI will analyze the transcript text and automatically identify commitments, responsible owners, deadlines, and urgency priorities.
                </p>
              </div>

              {error && (
                <div className="p-3 rounded-xl bg-rose-950/40 border border-rose-500/30 text-rose-300 text-xs">
                  {error}
                </div>
              )}

              <button
                onClick={handleExtract}
                disabled={extracting}
                className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-pink-600 to-indigo-600 hover:from-pink-500 hover:to-indigo-500 text-white font-bold transition-all shadow-lg shadow-indigo-600/30 flex items-center gap-2 mx-auto disabled:opacity-50"
              >
                {extracting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Analyzing & Extracting Tasks...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    <span>Extract Action Items Now</span>
                  </>
                )}
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                <span className="font-bold text-white">
                  Extracted {extractedTasks.length} Action Items
                </span>
                <span className="text-[11px] text-emerald-400 font-semibold flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Saved to Task Board</span>
                </span>
              </div>

              <div className="space-y-2.5">
                {extractedTasks.map((t, idx) => (
                  <div key={idx} className="p-3.5 rounded-xl bg-slate-950/70 border border-slate-800 space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <span className={`px-2 py-0.5 rounded-full border text-[9px] font-bold uppercase ${getPriorityBadge(t.priority)}`}>
                        {t.priority} Priority
                      </span>
                      <span className="text-[10px] text-purple-400 font-mono flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        <span>{t.deadline}</span>
                      </span>
                    </div>

                    <p className="text-xs font-semibold text-slate-100 leading-relaxed">
                      {t.task}
                    </p>

                    <div className="flex items-center gap-1.5 text-slate-400 text-[11px] pt-1 border-t border-slate-800/60">
                      <User className="w-3 h-3 text-indigo-400" />
                      <span>Assigned to: <strong className="text-indigo-300 font-semibold">{t.assigned_to}</strong></span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 border-t border-slate-800 bg-slate-950/70 flex items-center justify-between text-xs">
          <span className="text-slate-500">Stored in collection: <code className="text-indigo-400 font-mono">action_items</code></span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold transition-colors"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};

export default ActionItemExtractorModal;
