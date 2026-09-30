import React, { useState, useEffect } from 'react';
import { 
  Sparkles, 
  FileText, 
  FileAudio, 
  Download, 
  Trash2, 
  ExternalLink, 
  Clock, 
  TrendingDown, 
  Search, 
  RefreshCw, 
  Loader2,
  BookOpen,
  Calendar
} from 'lucide-react';
import { summaryService } from '../services/summaryService';
import { SummaryViewerModal } from '../components/SummaryViewerModal';

export const SummariesListPage = ({ onNavigateToModule }) => {
  const [summaries, setSummaries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSummary, setSelectedSummary] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [deletingId, setDeletingId] = useState(null);

  useEffect(() => {
    fetchSummaries();
  }, []);

  const fetchSummaries = async () => {
    setLoading(true);
    try {
      const data = await summaryService.getSummaries();
      setSummaries(data.summaries || []);
    } catch (err) {
      console.error('Failed to fetch summaries:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (summaryId, e) => {
    e.stopPropagation();
    if (!window.confirm('Are you sure you want to delete this AI summary?')) return;
    setDeletingId(summaryId);
    try {
      await summaryService.deleteSummary(summaryId);
      setSummaries(prev => prev.filter(s => s.id !== summaryId));
    } catch (err) {
      console.error('Failed to delete summary:', err);
    } finally {
      setDeletingId(null);
    }
  };

  const handleOpenSummary = (item) => {
    setSelectedSummary(item);
    setIsModalOpen(true);
  };

  const filtered = summaries.filter(s => 
    s.source_title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.overview_preview?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6 animate-fade-in pb-16">
      {/* Top Banner */}
      <div className="relative overflow-hidden rounded-3xl border border-indigo-500/20 bg-gradient-to-r from-slate-950 via-indigo-950/40 to-slate-950 p-8 shadow-2xl backdrop-blur-xl">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/20 border border-indigo-500/30 text-indigo-300 text-xs font-semibold">
              <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
              <span>Module 3: AI Summary Generation</span>
            </div>
            <h1 className="text-3xl font-extrabold text-white tracking-tight">
              Generated AI Meeting Summaries
            </h1>
            <p className="text-sm text-slate-300 max-w-2xl leading-relaxed">
              Every summary here is generated directly from MongoDB <code className="text-indigo-300 font-mono text-xs bg-slate-900 px-1 py-0.5 rounded">extracted_text</code> (PDF) or <code className="text-indigo-300 font-mono text-xs bg-slate-900 px-1 py-0.5 rounded">transcripts</code> (Audio) and stored in <code className="text-indigo-300 font-mono text-xs bg-slate-900 px-1 py-0.5 rounded">summaries</code>.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="px-5 py-3 rounded-2xl bg-slate-900/90 border border-slate-800 text-center shadow-lg">
              <p className="text-[10px] uppercase font-bold text-slate-400">Total Summaries</p>
              <p className="text-2xl font-mono font-extrabold text-indigo-400">{summaries.length}</p>
            </div>
            <button
              onClick={fetchSummaries}
              className="p-3 rounded-2xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 hover:text-white transition-all"
              title="Refresh summaries"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-indigo-400' : ''}`} />
            </button>
          </div>
        </div>
      </div>

      {/* Search Bar */}
      <div className="relative">
        <Search className="w-4 h-4 text-slate-500 absolute left-4 top-1/2 -translate-y-1/2" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search generated summaries by title or content..."
          className="w-full pl-11 pr-4 py-3 rounded-2xl bg-slate-900/90 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-all"
        />
      </div>

      {/* Summaries List */}
      {loading ? (
        <div className="p-12 rounded-3xl bg-slate-900/50 border border-slate-800/80 flex flex-col items-center justify-center gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-indigo-400" />
          <p className="text-xs text-slate-400">Loading AI summaries from MongoDB...</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="p-12 rounded-3xl bg-slate-900/50 border border-slate-800/80 text-center space-y-4">
          <div className="w-16 h-16 mx-auto rounded-3xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center">
            <Sparkles className="w-8 h-8 text-indigo-400" />
          </div>
          <div>
            <h3 className="text-base font-bold text-white">No AI Summaries Found</h3>
            <p className="text-xs text-slate-400 max-w-md mx-auto mt-1">
              Upload an audio file or PDF meeting document and click <strong className="text-indigo-300">Generate AI Summary</strong> to synthesize your first intelligent summary.
            </p>
          </div>
          {onNavigateToModule && (
            <div className="flex justify-center gap-3 pt-2">
              <button
                onClick={() => onNavigateToModule('audio')}
                className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition-all shadow-md shadow-indigo-600/20"
              >
                Go to Audio Studio
              </button>
              <button
                onClick={() => onNavigateToModule('pdf')}
                className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold transition-all shadow-md shadow-purple-600/20"
              >
                Go to PDF Studio
              </button>
            </div>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filtered.map(item => (
            <div
              key={item.id}
              onClick={() => handleOpenSummary(item)}
              className="p-5 rounded-3xl bg-slate-900/90 border border-slate-800 hover:border-indigo-500/50 hover:bg-slate-900 transition-all cursor-pointer shadow-xl flex flex-col justify-between gap-4 group"
            >
              <div className="space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="p-2 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400">
                      {item.source_type === 'document' ? <FileText className="w-4 h-4" /> : <FileAudio className="w-4 h-4" />}
                    </span>
                    <div>
                      <h3 className="text-sm font-bold text-white group-hover:text-indigo-300 transition-colors line-clamp-1">
                        {item.source_title || 'Untitled Meeting'}
                      </h3>
                      <p className="text-[10px] text-slate-400 capitalize">
                        Source: {item.source_type || 'Audio Recording'}
                      </p>
                    </div>
                  </div>
                  <span className="px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[10px] font-bold">
                    {item.compression_ratio}% Reduction
                  </span>
                </div>

                <p className="text-xs text-slate-300 line-clamp-3 leading-relaxed">
                  {item.overview_preview || 'Click to view complete structured AI meeting summary.'}
                </p>
              </div>

              <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400">
                <div className="flex items-center gap-3">
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5 text-slate-500" />
                    {item.created_at?.slice(0, 10) || 'Recent'}
                  </span>
                  <span className="flex items-center gap-1 font-mono text-indigo-300">
                    <Clock className="w-3.5 h-3.5" />
                    Saved ~{item.reading_time_saved_mins || 1} min
                  </span>
                </div>

                <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                  <button
                    onClick={() => handleOpenSummary(item)}
                    className="px-3 py-1.5 rounded-xl bg-indigo-600/30 hover:bg-indigo-600 border border-indigo-500/40 text-indigo-200 hover:text-white font-bold text-[11px] transition-all"
                  >
                    View Summary
                  </button>
                  <button
                    onClick={(e) => handleDelete(item.id, e)}
                    disabled={deletingId === item.id}
                    className="p-1.5 rounded-lg text-slate-500 hover:text-rose-400 transition-colors"
                    title="Delete summary"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Summary Viewer Modal */}
      {selectedSummary && (
        <SummaryViewerModal
          isOpen={isModalOpen}
          onClose={() => {
            setIsModalOpen(false);
            setSelectedSummary(null);
          }}
          sourceId={selectedSummary.source_id || selectedSummary.id}
          sourceType={selectedSummary.source_type || 'meeting'}
          sourceTitle={selectedSummary.source_title}
        />
      )}
    </div>
  );
};

export default SummariesListPage;
