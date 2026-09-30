import React, { useState, useEffect } from 'react';
import { 
  Sparkles, 
  Mic, 
  Video, 
  FileText, 
  Clock, 
  ArrowRight, 
  UploadCloud, 
  CheckCircle2, 
  Zap, 
  BarChart3, 
  FolderOpen, 
  Plus, 
  Play, 
  Loader2,
  Calendar,
  FileCheck,
  TrendingUp,
  Cpu,
  Layers,
  ChevronRight,
  ListFilter,
  CheckSquare,
  Search,
  ExternalLink
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { meetingService } from '../services/meetingService';
import { documentService } from '../services/documentService';
import { summaryService } from '../services/summaryService';
import { actionItemService } from '../services/actionItemService';
import { VoiceRecorderModal } from '../components/VoiceRecorderModal';
import { SummaryViewerModal } from '../components/SummaryViewerModal';

export const DashboardPage = ({ onOpenProfile, onNavigateToTranscription, onNavigateToTasks }) => {
  const { user, showToast } = useAuth();

  const [meetings, setMeetings] = useState([]);
  const [documents, setDocuments] = useState([]);
  const [summaryStats, setSummaryStats] = useState(null);
  const [taskStats, setTaskStats] = useState(null);
  const [activeSummaryItem, setActiveSummaryItem] = useState(null);
  const [loadingData, setLoadingData] = useState(true);
  const [creatingDemo, setCreatingDemo] = useState(false);
  const [isRecorderOpen, setIsRecorderOpen] = useState(false);
  const [activeFilter, setActiveFilter] = useState('all'); // 'all', 'recordings', 'documents'

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    setLoadingData(true);
    try {
      const [meetingsRes, docsRes, statsRes, taskStatsRes] = await Promise.allSettled([
        meetingService.getMeetings(),
        documentService.getDocuments(),
        summaryService.getSummaryStats(),
        actionItemService.getTaskStats()
      ]);

      if (meetingsRes.status === 'fulfilled' && meetingsRes.value) {
        setMeetings(meetingsRes.value.meetings || []);
      }
      if (docsRes.status === 'fulfilled' && docsRes.value) {
        setDocuments(docsRes.value.documents || []);
      }
      if (statsRes.status === 'fulfilled' && statsRes.value) {
        setSummaryStats(statsRes.value);
      }
      if (taskStatsRes.status === 'fulfilled' && taskStatsRes.value) {
        setTaskStats(taskStatsRes.value);
      }
    } catch (err) {
      console.error('Error fetching dashboard data:', err);
    } finally {
      setLoadingData(false);
    }
  };

  const handleCreateDemoMeeting = async () => {
    setCreatingDemo(true);
    try {
      const demoMeeting = await meetingService.createDemoMeeting(
        'sprint_planning',
        'Q3 Product Roadmap & Sprint Planning Sync'
      );
      if (showToast) {
        showToast('Sample meeting created successfully! Opening transcript...', 'success');
      }
      if (onNavigateToTranscription) {
        onNavigateToTranscription('audio', demoMeeting._id);
      } else {
        await loadDashboardData();
      }
    } catch (err) {
      if (showToast) {
        showToast('Failed to create demo meeting: ' + (err.message || 'Error'), 'error');
      }
    } finally {
      setCreatingDemo(false);
    }
  };

  const handleVoiceRecorded = (newMeeting) => {
    if (showToast) {
      showToast('Voice recording transcribed successfully!', 'success');
    }
    if (onNavigateToTranscription) {
      onNavigateToTranscription('audio', newMeeting._id);
    } else {
      loadDashboardData();
    }
  };

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
  };

  const formatDuration = (seconds) => {
    if (!seconds || isNaN(seconds)) return '0m';
    const mins = Math.floor(seconds / 60);
    const hrs = Math.floor(mins / 60);
    const remainingMins = mins % 60;
    if (hrs > 0) {
      return `${hrs}h ${remainingMins}m`;
    }
    const secs = Math.floor(seconds % 60);
    return `${mins}m ${secs}s`;
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return 'Recently';
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      });
    } catch {
      return dateStr;
    }
  };

  // Aggregated Statistics
  const totalAudioDurationSec = meetings.reduce((acc, m) => acc + (m.duration || 0), 0);
  const totalPages = documents.reduce((acc, d) => acc + (d.page_count || 1), 0);
  const totalItemsCount = meetings.length + documents.length;

  // Combined and sorted recent activity items
  const combinedActivity = [
    ...meetings.map((m) => ({
      id: m._id,
      type: m.is_video ? 'video' : 'audio',
      title: m.title || 'Untitled Meeting Recording',
      date: m.created_at || m.uploadDate,
      duration: m.duration,
      status: m.status || 'Transcribed',
      raw: m
    })),
    ...documents.map((d) => ({
      id: d._id,
      type: 'document',
      title: d.title || d.fileName || 'Untitled Meeting Document',
      date: d.created_at || d.upload_date,
      pages: d.page_count || 1,
      status: d.status || 'Extracted',
      raw: d
    }))
  ].sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0));

  const filteredActivity = combinedActivity.filter((item) => {
    if (activeFilter === 'recordings') return item.type === 'audio' || item.type === 'video';
    if (activeFilter === 'documents') return item.type === 'document';
    return true;
  });

  return (
    <div className="space-y-8 animate-fade-in pb-16">
      {/* 1. TOP WELCOME SECTION (Modern SaaS Notion/Slack/Zoom AI Style) */}
      <div className="relative overflow-hidden rounded-3xl border border-indigo-500/20 bg-gradient-to-r from-slate-900/90 via-indigo-950/40 to-slate-900/90 p-8 shadow-2xl backdrop-blur-xl">
        <div className="absolute -top-24 -right-24 w-80 h-80 bg-indigo-500/15 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -left-24 w-80 h-80 bg-purple-500/15 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/15 border border-indigo-500/30 text-indigo-300 text-xs font-semibold">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
              <span>AI Meeting Intelligence Workspace &bull; Enterprise Ready</span>
            </div>

            <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
              {getGreeting()}, <span className="bg-gradient-to-r from-indigo-300 via-purple-300 to-pink-300 bg-clip-text text-transparent">{user?.name || 'there'}</span>! 👋
            </h1>

            <p className="text-sm sm:text-base text-slate-300 leading-relaxed">
              Transform your discussions into structured intelligence, searchable transcripts, and actionable takeaways with automated speech recognition.
            </p>
          </div>

          {/* Quick Actions (Meeting Operations Focused) */}
          <div className="flex flex-wrap items-center gap-3">
            {/* Primary Action: Upload Recording */}
            <button
              onClick={() => onNavigateToTranscription && onNavigateToTranscription('audio')}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 hover:from-indigo-500 hover:to-pink-500 text-white text-xs font-bold transition-all shadow-lg shadow-indigo-600/30 hover:scale-[1.02] active:scale-[0.98]"
            >
              <UploadCloud className="w-4 h-4" />
              <span>Upload Recording</span>
            </button>

            {/* Upload PDF Document */}
            <button
              onClick={() => onNavigateToTranscription && onNavigateToTranscription('pdf')}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-800/90 hover:bg-slate-700/90 text-slate-200 border border-slate-700/80 text-xs font-semibold transition-all shadow-md hover:scale-[1.02] active:scale-[0.98]"
            >
              <FileText className="w-4 h-4 text-purple-400" />
              <span>Upload Notes (PDF)</span>
            </button>

            {/* Instant Demo Meeting */}
            <button
              onClick={handleCreateDemoMeeting}
              disabled={creatingDemo}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-950/60 hover:bg-indigo-900/60 text-indigo-300 border border-indigo-500/40 text-xs font-semibold transition-all shadow-md hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50"
            >
              {creatingDemo ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-indigo-400" />
                  <span>Generating Demo...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 text-indigo-400" />
                  <span>Try Sample Meeting</span>
                </>
              )}
            </button>

            {/* Live Audio Recorder Modal */}
            <button
              onClick={() => setIsRecorderOpen(true)}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-900/90 hover:bg-slate-800/90 text-slate-300 border border-slate-700/80 text-xs font-semibold transition-all shadow-md hover:scale-[1.02] active:scale-[0.98]"
              title="Record audio directly from your microphone"
            >
              <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
              <Mic className="w-4 h-4 text-rose-400" />
              <span>Record Live</span>
            </button>
          </div>
        </div>
      </div>

      {/* 2. MEETING STATISTICS CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {/* Card 1: Total Meetings */}
        <div className="glass-card rounded-2xl p-5 border border-slate-800/80 relative overflow-hidden group hover:border-indigo-500/40 transition-all shadow-lg">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Meetings Transcribed
            </span>
            <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 group-hover:scale-110 transition-transform">
              <Video className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-white">
              {loadingData ? '—' : meetings.length}
            </span>
            <span className="text-xs font-semibold text-emerald-400 flex items-center gap-0.5">
              <TrendingUp className="w-3 h-3" />
              <span>100% Processed</span>
            </span>
          </div>
          <p className="mt-1 text-xs text-slate-400">
            Audio & video sessions indexed with speaker segments
          </p>
        </div>

        {/* Card 2: Audio Duration */}
        <div className="glass-card rounded-2xl p-5 border border-slate-800/80 relative overflow-hidden group hover:border-purple-500/40 transition-all shadow-lg">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Audio Duration
            </span>
            <div className="p-2 rounded-xl bg-purple-500/10 text-purple-400 border border-purple-500/20 group-hover:scale-110 transition-transform">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-white">
              {loadingData ? '—' : formatDuration(totalAudioDurationSec)}
            </span>
            <span className="text-xs font-semibold text-indigo-400">
              Whisper STT
            </span>
          </div>
          <p className="mt-1 text-xs text-slate-400">
            Millisecond-accurate timestamp alignment
          </p>
        </div>

        {/* Card 3: Meeting Documents (PDF) */}
        <div className="glass-card rounded-2xl p-5 border border-slate-800/80 relative overflow-hidden group hover:border-emerald-500/40 transition-all shadow-lg">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Meeting Notes & PDFs
            </span>
            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 group-hover:scale-110 transition-transform">
              <FileText className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-white">
              {loadingData ? '—' : documents.length}
            </span>
            <span className="text-xs font-semibold text-emerald-400">
              {totalPages} {totalPages === 1 ? 'Page' : 'Pages'}
            </span>
          </div>
          <p className="mt-1 text-xs text-slate-400">
            Agendas, minutes & reports parsed with pdfplumber
          </p>
        </div>

        {/* Card 4: AI Summaries & Insights */}
        <div className="glass-card rounded-2xl p-5 border border-slate-800/80 relative overflow-hidden group hover:border-pink-500/40 transition-all shadow-lg">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              {summaryStats && summaryStats.total_summaries > 0 ? 'AI Summaries' : 'AI Performance'}
            </span>
            <div className="p-2 rounded-xl bg-pink-500/10 text-pink-400 border border-pink-500/20 group-hover:scale-110 transition-transform">
              <Sparkles className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-white">
              {summaryStats && summaryStats.total_summaries > 0 ? summaryStats.total_summaries : '98.4%'}
            </span>
            <span className="text-xs font-semibold text-pink-400">
              {summaryStats && summaryStats.total_summaries > 0 
                ? `${summaryStats.avg_compression_ratio}% Reduced` 
                : 'Accuracy'}
            </span>
          </div>
          <p className="mt-1 text-xs text-slate-400">
            {summaryStats && summaryStats.total_reading_time_saved_mins > 0 
              ? `~${summaryStats.total_reading_time_saved_mins} mins reading time saved` 
              : 'Groq & Gemini AI Synthesis Pipeline'}
          </p>
        </div>
      </div>

      {/* 3. RECENT UPLOADS & AI INSIGHTS (Two-column layout) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column (2 Cols): Recent Uploads & Activity */}
        <div className="lg:col-span-2 glass-card rounded-2xl p-6 border border-slate-800/80 space-y-5 shadow-xl">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <FolderOpen className="w-5 h-5 text-indigo-400" />
                <span>Recent Meetings & Uploads</span>
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Quickly access and inspect transcripts, audio playback, and extracted documents
              </p>
            </div>

            {/* Filter Pills */}
            <div className="flex items-center gap-1 bg-slate-950/70 p-1 rounded-xl border border-slate-800 text-xs">
              <button
                onClick={() => setActiveFilter('all')}
                className={`px-2.5 py-1 rounded-lg font-medium transition-all ${
                  activeFilter === 'all'
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                All ({totalItemsCount})
              </button>
              <button
                onClick={() => setActiveFilter('recordings')}
                className={`px-2.5 py-1 rounded-lg font-medium transition-all ${
                  activeFilter === 'recordings'
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Recordings ({meetings.length})
              </button>
              <button
                onClick={() => setActiveFilter('documents')}
                className={`px-2.5 py-1 rounded-lg font-medium transition-all ${
                  activeFilter === 'documents'
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                PDFs ({documents.length})
              </button>
            </div>
          </div>

          {/* Activity List */}
          {loadingData ? (
            <div className="py-12 flex flex-col items-center justify-center gap-3 text-slate-400">
              <Loader2 className="w-6 h-6 animate-spin text-indigo-400" />
              <p className="text-xs">Loading recent workspace activity...</p>
            </div>
          ) : filteredActivity.length === 0 ? (
            /* Empty State */
            <div className="py-12 px-6 rounded-2xl bg-slate-950/40 border border-dashed border-slate-800 flex flex-col items-center justify-center text-center">
              <div className="w-14 h-14 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center mb-3">
                <Mic className="w-7 h-7 text-indigo-400" />
              </div>
              <h3 className="text-sm font-bold text-white">No Meeting Recordings Yet</h3>
              <p className="text-xs text-slate-400 max-w-sm mt-1 mb-5">
                Upload your first audio/video file or load a sample scenario to experience AI transcription in action.
              </p>
              <div className="flex flex-wrap items-center justify-center gap-3">
                <button
                  onClick={() => onNavigateToTranscription && onNavigateToTranscription('audio')}
                  className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold transition-all shadow-md shadow-indigo-600/30"
                >
                  Upload Recording
                </button>
                <button
                  onClick={handleCreateDemoMeeting}
                  disabled={creatingDemo}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold transition-all"
                >
                  {creatingDemo ? 'Generating Demo...' : 'Load Sample Meeting'}
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-2.5">
              {filteredActivity.slice(0, 5).map((item) => (
                <div
                  key={`${item.type}-${item.id}`}
                  onClick={() => {
                    if (onNavigateToTranscription) {
                      onNavigateToTranscription(item.type === 'document' ? 'pdf' : 'audio', item.id);
                    }
                  }}
                  className="group p-3.5 rounded-xl bg-slate-950/50 hover:bg-slate-900 border border-slate-800/80 hover:border-indigo-500/40 transition-all cursor-pointer flex items-center justify-between gap-4 shadow-sm"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className={`p-2.5 rounded-xl shrink-0 ${
                        item.type === 'video'
                          ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                          : item.type === 'audio'
                          ? 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20'
                          : 'bg-purple-500/10 text-purple-400 border border-purple-500/20'
                      }`}
                    >
                      {item.type === 'video' ? (
                        <Video className="w-4 h-4" />
                      ) : item.type === 'audio' ? (
                        <Mic className="w-4 h-4" />
                      ) : (
                        <FileText className="w-4 h-4" />
                      )}
                    </div>

                    <div className="min-w-0">
                      <p className="text-xs sm:text-sm font-semibold text-white truncate group-hover:text-indigo-300 transition-colors">
                        {item.title}
                      </p>
                      <div className="flex items-center gap-2 mt-0.5 text-[11px] text-slate-400">
                        <span>{formatDate(item.date)}</span>
                        <span>&bull;</span>
                        {item.type === 'document' ? (
                          <span>{item.pages} {item.pages === 1 ? 'page' : 'pages'}</span>
                        ) : (
                          <span>{formatDuration(item.duration)}</span>
                        )}
                        <span>&bull;</span>
                        <span className="uppercase text-[10px] tracking-wider text-slate-500 font-semibold">
                          {item.type}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setActiveSummaryItem(item);
                      }}
                      className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 text-[11px] font-semibold transition-all hover:scale-105"
                      title="Generate or view AI Summary"
                    >
                      <Sparkles className="w-3 h-3 text-indigo-400" />
                      <span>AI Summary</span>
                    </button>

                    <span className="hidden sm:inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px] font-semibold">
                      <CheckCircle2 className="w-3 h-3" />
                      <span>{item.status}</span>
                    </span>

                    <button className="flex items-center gap-1 text-xs font-semibold text-indigo-400 group-hover:text-indigo-300 group-hover:translate-x-0.5 transition-all">
                      <span className="hidden md:inline">Open</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}

              {filteredActivity.length > 5 && (
                <div className="pt-2 text-center">
                  <button
                    onClick={() => onNavigateToTranscription && onNavigateToTranscription('audio')}
                    className="text-xs font-semibold text-indigo-400 hover:text-indigo-300 transition-colors inline-flex items-center gap-1"
                  >
                    <span>View all {filteredActivity.length} items in Transcription Studio</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right Column (1 Col): AI Intelligence & Performance Card */}
        <div className="glass-card rounded-2xl p-6 border border-slate-800/80 space-y-5 shadow-xl flex flex-col justify-between">
          <div className="space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h2 className="text-sm font-bold text-white flex items-center gap-2">
                <Cpu className="w-4 h-4 text-indigo-400" />
                <span>AI Performance & Pipeline</span>
              </h2>
              <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px] font-bold">
                Online
              </span>
            </div>

            <div className="space-y-3 text-xs">
              <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800 space-y-1">
                <div className="flex items-center justify-between text-slate-400">
                  <span className="font-semibold text-[11px] uppercase tracking-wider">Speech-to-Text Model</span>
                  <span className="text-indigo-400 font-bold">OpenAI Whisper CPU</span>
                </div>
                <p className="text-slate-300 text-[11px] leading-relaxed">
                  Automatic multilingual transcription with timestamped speaker segments.
                </p>
              </div>

              <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800 space-y-1">
                <div className="flex items-center justify-between text-slate-400">
                  <span className="font-semibold text-[11px] uppercase tracking-wider">Document Parser</span>
                  <span className="text-purple-400 font-bold">pdfplumber + PyPDF</span>
                </div>
                <p className="text-slate-300 text-[11px] leading-relaxed">
                  Deep text layout analysis and multi-page structured table extraction.
                </p>
              </div>

              <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800 space-y-1">
                <div className="flex items-center justify-between text-slate-400">
                  <span className="font-semibold text-[11px] uppercase tracking-wider">Media Engine</span>
                  <span className="text-pink-400 font-bold">FFmpeg 9.0 Pipeline</span>
                </div>
                <p className="text-slate-300 text-[11px] leading-relaxed">
                  Instant MP4 video audio track demuxing & MP3, WAV, M4A normalizations.
                </p>
              </div>
            </div>
          </div>

          {/* Action Items Quick Overview Widget */}
          <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/20">
                  <CheckSquare className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-xs font-bold text-white">Action Items & Tasks</h3>
                  <p className="text-[10px] text-slate-400">Module 4 Live Status</p>
                </div>
              </div>
              <button
                onClick={() => onNavigateToTasks && onNavigateToTasks()}
                className="text-[11px] font-semibold text-amber-400 hover:text-amber-300 flex items-center gap-1 transition-colors"
              >
                <span>View All</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="grid grid-cols-3 gap-2 pt-1 text-center">
              <div className="p-2 rounded-lg bg-slate-900/80 border border-slate-800/80">
                <span className="block text-xs font-bold text-amber-400">
                  {loadingData ? '—' : taskStats?.pending_tasks ?? 0}
                </span>
                <span className="text-[10px] text-slate-400 uppercase tracking-wider">Pending</span>
              </div>
              <div className="p-2 rounded-lg bg-slate-900/80 border border-slate-800/80">
                <span className="block text-xs font-bold text-sky-400">
                  {loadingData ? '—' : taskStats?.in_progress_tasks ?? 0}
                </span>
                <span className="text-[10px] text-slate-400 uppercase tracking-wider">In Prog</span>
              </div>
              <div className="p-2 rounded-lg bg-slate-900/80 border border-slate-800/80">
                <span className="block text-xs font-bold text-emerald-400">
                  {loadingData ? '—' : taskStats?.completed_tasks ?? 0}
                </span>
                <span className="text-[10px] text-slate-400 uppercase tracking-wider">Done</span>
              </div>
            </div>

            <button
              onClick={() => onNavigateToTasks && onNavigateToTasks()}
              className="w-full py-2 px-3 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 text-xs font-semibold flex items-center justify-center gap-1.5 transition-all"
            >
              <span>Launch Task Management Board</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Quick SaaS Tip / Value Banner */}
          <div className="p-4 rounded-xl bg-gradient-to-br from-indigo-950/40 via-purple-950/20 to-slate-950/60 border border-indigo-500/20 space-y-2">
            <div className="flex items-center gap-1.5 text-xs font-bold text-indigo-300">
              <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
              <span>Pro Tip for Meeting Intelligence</span>
            </div>
            <p className="text-[11px] text-slate-400 leading-normal">
              You can click any segment in the transcript player to instantly jump audio playback directly to that exact spoken sentence.
            </p>
          </div>
        </div>
      </div>

      {/* 4. CORE AI CAPABILITIES & FEATURES (Renamed & Cleaned SaaS Section) */}
      <div className="space-y-4">
        <div>
          <h2 className="text-base sm:text-lg font-bold text-white tracking-tight flex items-center gap-2">
            <Layers className="w-5 h-5 text-indigo-400" />
            <span>AI Meeting Capabilities & Features</span>
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            End-to-end automated speech recognition, meeting document synthesis, and smart action item tracking
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Feature 1: Speech-to-Text */}
          <div 
            onClick={() => onNavigateToTranscription && onNavigateToTranscription('audio')}
            className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800/90 relative overflow-hidden group hover:border-indigo-500/50 hover:bg-slate-900/90 transition-all cursor-pointer shadow-lg flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between mb-3">
                <div className="p-2.5 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                  <Mic className="w-5 h-5" />
                </div>
                <span className="px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 text-[10px] font-bold">
                  Whisper AI
                </span>
              </div>
              <h3 className="text-sm font-bold text-white mb-1 group-hover:text-indigo-300 transition-colors">
                Audio & Video Transcription
              </h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Transcribe Zoom, Google Meet, Teams recordings or MP3, WAV, and MP4 files with millisecond timestamps.
              </p>
            </div>
            <div className="mt-4 flex items-center justify-between text-[11px] font-semibold text-indigo-400 group-hover:translate-x-0.5 transition-transform pt-2 border-t border-slate-800/50">
              <span>Open Studio & Transcribe</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </div>
          </div>

          {/* Feature 2: PDF Document Synthesis */}
          <div 
            onClick={() => onNavigateToTranscription && onNavigateToTranscription('pdf')}
            className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800/90 relative overflow-hidden group hover:border-purple-500/50 hover:bg-slate-900/90 transition-all cursor-pointer shadow-lg flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between mb-3">
                <div className="p-2.5 rounded-xl bg-purple-500/10 text-purple-400 border border-purple-500/20">
                  <FileText className="w-5 h-5" />
                </div>
                <span className="px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30 text-[10px] font-bold">
                  pdfplumber
                </span>
              </div>
              <h3 className="text-sm font-bold text-white mb-1 group-hover:text-purple-300 transition-colors">
                Document & Agenda Synthesis
              </h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Extract and organize meeting agendas, minutes, and slide decks from multi-page PDFs using deep text parsers.
              </p>
            </div>
            <div className="mt-4 flex items-center justify-between text-[11px] font-semibold text-purple-400 group-hover:translate-x-0.5 transition-transform pt-2 border-t border-slate-800/50">
              <span>Extract & View Text</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </div>
          </div>

          {/* Feature 3: Action Items & Decisions */}
          <div 
            onClick={() => onNavigateToTasks && onNavigateToTasks()}
            className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800/90 relative overflow-hidden group hover:border-amber-500/50 hover:bg-slate-900/90 transition-all cursor-pointer flex flex-col justify-between shadow-lg"
          >
            <div>
              <div className="flex items-center justify-between mb-3">
                <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
                  <CheckSquare className="w-5 h-5" />
                </div>
                <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[10px] font-bold">
                  {taskStats && taskStats.total_tasks > 0 ? `${taskStats.total_tasks} Tasks` : 'Module 4'}
                </span>
              </div>
              <h3 className="text-sm font-bold text-white mb-1 group-hover:text-amber-300 transition-colors">
                Action Items & Task Tracker
              </h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Automatically extract tasks, assignees, deadlines, and priorities from meeting transcripts or PDF notes with AI.
              </p>
            </div>
            <div className="mt-4 flex items-center justify-between text-[11px] font-semibold text-amber-400 group-hover:translate-x-0.5 transition-transform pt-2 border-t border-slate-800/50">
              <span>Open Task Board & Extract</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </div>
          </div>

          {/* Feature 4: Interactive Transcript Player */}
          <div 
            onClick={() => onNavigateToTranscription && onNavigateToTranscription('audio')}
            className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800/90 relative overflow-hidden group hover:border-cyan-500/50 hover:bg-slate-900/90 transition-all cursor-pointer shadow-lg flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between mb-3">
                <div className="p-2.5 rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                  <Play className="w-5 h-5" />
                </div>
                <span className="px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 text-[10px] font-bold">
                  Sync Player
                </span>
              </div>
              <h3 className="text-sm font-bold text-white mb-1 group-hover:text-cyan-300 transition-colors">
                Interactive Transcript Player
              </h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Synchronized audio playback with clickable timestamps, live search, inline editing, and JSON/TXT export.
              </p>
            </div>
            <div className="mt-4 flex items-center justify-between text-[11px] font-semibold text-cyan-400 group-hover:translate-x-0.5 transition-transform pt-2 border-t border-slate-800/50">
              <span>Browse Transcripts</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </div>
          </div>
        </div>
      </div>

      {/* Voice Recorder Modal (accessible directly from Dashboard) */}
      <VoiceRecorderModal
        isOpen={isRecorderOpen}
        onClose={() => setIsRecorderOpen(false)}
        onTranscriptionComplete={handleVoiceRecorded}
      />

      {/* Module 3: AI Summary Generator Modal from Dashboard */}
      {activeSummaryItem && (
        <SummaryViewerModal
          isOpen={Boolean(activeSummaryItem)}
          onClose={() => {
            setActiveSummaryItem(null);
            loadDashboardData();
          }}
          sourceId={activeSummaryItem.id}
          sourceType={activeSummaryItem.type === 'document' ? 'document' : 'meeting'}
          sourceTitle={activeSummaryItem.title}
        />
      )}
    </div>
  );
};

export default DashboardPage;
