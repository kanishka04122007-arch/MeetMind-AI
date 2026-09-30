import React, { useState, useEffect } from 'react';
import { 
  Mic, 
  UploadCloud, 
  FileAudio, 
  Sparkles, 
  Clock, 
  Search, 
  Copy, 
  Check, 
  Download, 
  Trash2, 
  Edit3, 
  Save, 
  X, 
  Play, 
  CheckCircle2, 
  AlertCircle, 
  Loader2, 
  Layers, 
  Radio, 
  ChevronRight,
  User,
  ExternalLink,
  Video,
  GraduationCap,
  FileText
} from 'lucide-react';
import { meetingService } from '../services/meetingService';
import { AudioPlayer } from '../components/AudioPlayer';
import { VoiceRecorderModal } from '../components/VoiceRecorderModal';
import { PdfDocumentManager } from '../components/PdfDocumentManager';
import { VivaGuideModal } from '../components/VivaGuideModal';
import { SummaryViewerModal } from '../components/SummaryViewerModal';
import { ActionItemExtractorModal } from '../components/ActionItemExtractorModal';
import { CheckSquare } from 'lucide-react';

export const MeetingTranscriptionPage = ({ initialTab = 'audio', initialMeetingId = null }) => {
  const [meetings, setMeetings] = useState([]);
  const [selectedMeeting, setSelectedMeeting] = useState(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [transcriptSearch, setTranscriptSearch] = useState('');
  
  // Sub-Tabs & Viva Guide State
  const [activeModuleTab, setActiveModuleTab] = useState(initialTab || 'audio'); // 'audio' or 'pdf'
  const [isVivaGuideOpen, setIsVivaGuideOpen] = useState(false);
  const [isSummaryOpen, setIsSummaryOpen] = useState(false);
  const [actionSuccess, setActionSuccess] = useState(null);

  const showSuccessNotice = (msg) => {
    setActionSuccess(msg);
    setTimeout(() => setActionSuccess(null), 5000);
  };

  // Upload State
  const [uploadTitle, setUploadTitle] = useState('');
  const [selectedFile, setSelectedFile] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadError, setUploadError] = useState(null);
  const [isDragging, setIsDragging] = useState(false);

  // Recorder Modal State
  const [isRecorderOpen, setIsRecorderOpen] = useState(false);

  // Edit State
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editTranscript, setEditTranscript] = useState('');
  const [editSegments, setEditSegments] = useState([]);
  const [isSaving, setIsSaving] = useState(false);

  // Audio Player Seek state
  const [seekTimestamp, setSeekTimestamp] = useState(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (initialTab) {
      setActiveModuleTab(initialTab);
    }
  }, [initialTab]);

  useEffect(() => {
    fetchMeetings();
  }, [initialMeetingId]);

  const fetchMeetings = async () => {
    setLoading(true);
    try {
      const data = await meetingService.getMeetings();
      setMeetings(data.meetings || []);
      if (data.meetings && data.meetings.length > 0) {
        if (initialMeetingId) {
          const match = data.meetings.find(m => m._id === initialMeetingId);
          if (match) {
            loadMeetingDetails(match._id);
            return;
          }
        }
        if (!selectedMeeting) {
          // Automatically select the most recent meeting
          loadMeetingDetails(data.meetings[0]._id);
        }
      }
    } catch (err) {
      console.error('Failed to load meetings:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadMeetingDetails = async (meetingId) => {
    try {
      const details = await meetingService.getMeeting(meetingId);
      setSelectedMeeting(details);
      setEditTitle(details.title);
      setEditTranscript(details.transcript_text);
      setEditSegments(details.segments || []);
      setIsEditing(false);
      setSeekTimestamp(null);
    } catch (err) {
      console.error('Failed to load meeting details:', err);
    }
  };

  const validateAudioVideoFile = (file) => {
    if (!file) return false;
    const name = file.name.toLowerCase();

    if (name.endsWith('.pdf')) {
      setUploadError("PDF documents must be uploaded in the 'Meeting Documents (PDF)' tab.");
      setSelectedFile(null);
      return false;
    }

    const allowed = ['.mp3', '.wav', '.m4a', '.mp4', '.ogg', '.webm', '.flac', '.aac'];
    const hasAllowedExt = allowed.some((ext) => name.endsWith(ext));
    if (!hasAllowedExt) {
      setUploadError("Unsupported file format. Supported formats: MP3, WAV, M4A, MP4 (Zoom, Google Meet, Teams recordings). Images (.jpg, .png) and executables are rejected.");
      setSelectedFile(null);
      return false;
    }

    if (file.size > 100 * 1024 * 1024) {
      setUploadError('File exceeds maximum allowed size of 100MB.');
      setSelectedFile(null);
      return false;
    }

    setUploadError(null);
    return true;
  };

  const handleFileUpload = async (e) => {
    e.preventDefault();
    if (!selectedFile || !validateAudioVideoFile(selectedFile)) return;

    setIsUploading(true);
    setUploadProgress(0);
    setUploadError(null);

    try {
      const newMeeting = await meetingService.uploadAudio(
        selectedFile,
        uploadTitle,
        (progress) => setUploadProgress(progress)
      );

      // Refresh list and select new meeting
      await fetchMeetings();
      setSelectedMeeting(newMeeting);
      setEditTitle(newMeeting.title);
      setEditTranscript(newMeeting.transcript_text);
      setEditSegments(newMeeting.segments || []);
      
      // Reset form
      setSelectedFile(null);
      setUploadTitle('');
      showSuccessNotice('Audio uploaded successfully! Whisper transcript generated and saved to MongoDB.');
    } catch (err) {
      setUploadError(err.response?.data?.detail || 'Failed to upload and transcribe audio file.');
    } finally {
      setIsUploading(false);
    }
  };

  const handleCreateDemo = async (scenario = 'sprint_planning') => {
    setLoading(true);
    try {
      const demoMeeting = await meetingService.createDemoMeeting(scenario);
      await fetchMeetings();
      setSelectedMeeting(demoMeeting);
      setEditTitle(demoMeeting.title);
      setEditTranscript(demoMeeting.transcript_text);
      setEditSegments(demoMeeting.segments || []);
      showSuccessNotice(`Sample meeting "${demoMeeting.title}" created with Whisper transcript!`);
    } catch (err) {
      console.error('Failed to create demo meeting:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteMeeting = async (meetingId, e) => {
    e.stopPropagation();
    if (!window.confirm('Are you sure you want to delete this meeting transcript and audio?')) {
      return;
    }

    try {
      await meetingService.deleteMeeting(meetingId);
      const updated = meetings.filter((m) => m._id !== meetingId);
      setMeetings(updated);
      if (selectedMeeting && selectedMeeting._id === meetingId) {
        if (updated.length > 0) {
          loadMeetingDetails(updated[0]._id);
        } else {
          setSelectedMeeting(null);
        }
      }
      showSuccessNotice('Meeting and transcript deleted successfully.');
    } catch (err) {
      console.error('Failed to delete meeting:', err);
    }
  };

  const handleSaveEdit = async () => {
    if (!selectedMeeting) return;
    setIsSaving(true);
    try {
      const updated = await meetingService.updateTranscript(selectedMeeting._id, {
        title: editTitle,
        transcript_text: editTranscript,
        segments: editSegments
      });
      setSelectedMeeting(updated);
      setIsEditing(false);
      // Update item in local list
      setMeetings((prev) =>
        prev.map((m) => (m._id === updated._id ? { ...m, title: updated.title } : m))
      );
      showSuccessNotice('Transcript updated and saved to MongoDB successfully!');
    } catch (err) {
      console.error('Failed to update transcript:', err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleCopyTranscript = () => {
    if (!selectedMeeting) return;
    navigator.clipboard.writeText(selectedMeeting.transcript_text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleExportTxt = () => {
    if (!selectedMeeting) return;
    const element = document.createElement('a');
    let content = `MEETMIND AI - TRANSCRIPTION REPORT\n`;
    content += `Title: ${selectedMeeting.title}\n`;
    content += `Date: ${selectedMeeting.created_at}\n`;
    content += `Duration: ${Math.round(selectedMeeting.duration)}s\n`;
    content += `Language: ${selectedMeeting.language}\n`;
    content += `=========================================\n\n`;
    content += `FULL TRANSCRIPT:\n${selectedMeeting.transcript_text}\n\n`;
    content += `=========================================\n`;
    content += `TIMESTAMPS & SPEAKERS:\n`;
    selectedMeeting.segments.forEach((seg) => {
      content += `[${seg.speaker || 'Speaker'}] (${seg.start}s - ${seg.end}s): ${seg.text}\n`;
    });

    const file = new Blob([content], { type: 'text/plain' });
    element.href = URL.createObjectURL(file);
    element.download = `${selectedMeeting.title.replace(/\s+/g, '_')}_transcript.txt`;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  const handleExportJson = () => {
    if (!selectedMeeting) return;
    const element = document.createElement('a');
    const file = new Blob([JSON.stringify(selectedMeeting, null, 2)], { type: 'application/json' });
    element.href = URL.createObjectURL(file);
    element.download = `${selectedMeeting.title.replace(/\s+/g, '_')}_data.json`;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  const filteredMeetings = meetings.filter((m) =>
    m.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (m.transcript_preview && m.transcript_preview.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const formatSeconds = (secs) => {
    if (isNaN(secs) || secs < 0) return '00:00';
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const totalAudioDuration = meetings.reduce((acc, m) => acc + (m.duration || 0), 0);
  const isVideoFile = selectedFile && selectedFile.name.toLowerCase().endsWith('.mp4');

  return (
    <div className="space-y-8 animate-fade-in pb-16">
      {/* Top Banner & Module Info */}
      <div className="relative overflow-hidden rounded-3xl border border-indigo-500/20 bg-gradient-to-r from-slate-950 via-indigo-950/40 to-slate-950 p-8 shadow-2xl backdrop-blur-xl">
        <div className="absolute -top-20 -right-20 w-80 h-80 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/20 border border-indigo-500/30 text-indigo-300 text-xs font-semibold">
              <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
              <span>AI Meeting Ingestion & Transcription Studio</span>
            </div>
            <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
              Meeting Ingestion Studio
            </h1>
            <p className="text-sm text-slate-300 max-w-2xl leading-relaxed">
              Upload meeting audio recordings (.mp3, .wav, .m4a), video recordings (.mp4 from Zoom, Google Meet & Teams), and documents (.pdf). Files are stored securely in dedicated upload directories and processed by OpenAI Whisper AI & pdfplumber.
            </p>
          </div>

          {/* Quick Metrics & Viva Guide Trigger */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="px-4 py-3 rounded-2xl bg-slate-900/80 border border-slate-800 text-center shadow-lg">
              <p className="text-[10px] uppercase font-bold text-slate-400">Total Transcripts</p>
              <p className="text-xl font-mono font-extrabold text-indigo-400">{meetings.length}</p>
            </div>
            <div className="px-4 py-3 rounded-2xl bg-slate-900/80 border border-slate-800 text-center shadow-lg">
              <p className="text-[10px] uppercase font-bold text-slate-400">Audio Processed</p>
              <p className="text-xl font-mono font-extrabold text-purple-400">{formatSeconds(totalAudioDuration)}</p>
            </div>
            <button
              onClick={() => setIsVivaGuideOpen(true)}
              className="flex items-center gap-2 px-4 py-3 rounded-2xl bg-gradient-to-r from-amber-500/20 to-orange-500/20 hover:from-amber-500/30 hover:to-orange-500/30 border border-amber-500/40 text-amber-300 text-xs font-bold transition-all shadow-lg shadow-amber-500/10 cursor-pointer"
            >
              <GraduationCap className="w-4 h-4 text-amber-400" />
              <span>Viva Guide & Schema</span>
            </button>
          </div>
        </div>
      </div>

      {/* Upload & Operation Success Banner */}
      {actionSuccess && (
        <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-center justify-between shadow-lg shadow-emerald-500/10 animate-fade-in">
          <div className="flex items-center gap-2.5">
            <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
            <span className="font-semibold">{actionSuccess}</span>
          </div>
          <button onClick={() => setActionSuccess(null)} className="text-emerald-400 hover:text-white p-1">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Module 2 Sub-Navigation Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-1.5 rounded-2xl bg-slate-900 border border-slate-800 shadow-xl">
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setActiveModuleTab('audio')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              activeModuleTab === 'audio'
                ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-md shadow-indigo-600/30'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <FileAudio className="w-4 h-4 text-indigo-400" />
            <span>Audio & Video Recordings (MP3, WAV, M4A, MP4)</span>
            <span className="px-2 py-0.5 rounded-full bg-slate-800 text-[10px] text-slate-300 font-mono">
              {meetings.length}
            </span>
          </button>

          <button
            onClick={() => setActiveModuleTab('pdf')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              activeModuleTab === 'pdf'
                ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-md shadow-purple-600/30'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <FileText className="w-4 h-4 text-purple-400" />
            <span>Meeting Documents (PDF Text Extraction)</span>
            <span className="px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 text-[10px] font-semibold">
              pdfplumber
            </span>
          </button>
        </div>

        <div className="hidden sm:flex items-center gap-2 text-[11px] text-slate-400 pr-3">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
          <span>Storage: backend/uploads/</span>
        </div>
      </div>

      {/* Conditional View: PDF Document Manager vs Audio/Video Recording Studio */}
      {activeModuleTab === 'pdf' ? (
        <PdfDocumentManager />
      ) : (
        /* Main 2-Column Grid for Audio/Video */
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* LEFT COLUMN: Upload & Meetings List (5 Cols) */}
          <div className="lg:col-span-5 space-y-6">
            
            {/* Audio Upload Box */}
            <div className="glass-card rounded-2xl p-6 border border-slate-800 space-y-5">
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <h2 className="text-sm font-bold text-slate-200 flex items-center gap-2">
                  <UploadCloud className="w-4 h-4 text-indigo-400" />
                  <span>Upload Meeting Audio / Video</span>
                </h2>
                <button
                  onClick={() => setIsRecorderOpen(true)}
                  className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-rose-950/60 hover:bg-rose-900/60 text-rose-300 border border-rose-500/30 text-xs font-semibold transition-all shadow-sm"
                >
                  <Mic className="w-3.5 h-3.5 text-rose-400" />
                  <span>Record Mic</span>
                </button>
              </div>

              {uploadError && (
                <div className="p-3 rounded-xl bg-rose-950/60 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
                  <span>{uploadError}</span>
                </div>
              )}

              <form onSubmit={handleFileUpload} className="space-y-4">
                {/* Meeting Title Input */}
                <div>
                  <label className="block text-[11px] uppercase tracking-wider font-semibold text-slate-400 mb-1.5">
                    Meeting Title (Optional)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Q3 Sprint Planning or Zoom Sync"
                    value={uploadTitle}
                    onChange={(e) => setUploadTitle(e.target.value)}
                    disabled={isUploading}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-200 text-xs focus:outline-none focus:border-indigo-500 transition-colors"
                  />
                </div>

                {/* Drag & Drop File Zone */}
                <div
                  onDragOver={(e) => {
                    e.preventDefault();
                    setIsDragging(true);
                  }}
                  onDragLeave={() => setIsDragging(false)}
                  onDrop={(e) => {
                    e.preventDefault();
                    setIsDragging(false);
                    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                      const file = e.dataTransfer.files[0];
                      if (validateAudioVideoFile(file)) {
                        setSelectedFile(file);
                        if (!uploadTitle) {
                          const cleanName = file.name.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' ');
                          setUploadTitle(cleanName.charAt(0).toUpperCase() + cleanName.slice(1));
                        }
                      }
                    }
                  }}
                  className={`relative border-2 border-dashed rounded-2xl p-6 text-center transition-all cursor-pointer ${
                    isDragging
                      ? 'border-indigo-500 bg-indigo-500/10'
                      : selectedFile
                      ? 'border-emerald-500/50 bg-emerald-950/10'
                      : 'border-slate-800 hover:border-slate-700 bg-slate-950/50'
                  }`}
                >
                  <input
                    type="file"
                    id="audio-file-input"
                    accept="audio/*,video/mp4,.mp3,.wav,.m4a,.mp4,.ogg,.webm,.flac,.aac"
                    onChange={(e) => {
                      if (e.target.files && e.target.files[0]) {
                        const file = e.target.files[0];
                        if (validateAudioVideoFile(file)) {
                          setSelectedFile(file);
                          if (!uploadTitle) {
                            const cleanName = file.name.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' ');
                            setUploadTitle(cleanName.charAt(0).toUpperCase() + cleanName.slice(1));
                          }
                        }
                      }
                    }}
                    disabled={isUploading}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  />

                  <div className="flex flex-col items-center justify-center space-y-2">
                    <div
                      className={`w-12 h-12 rounded-2xl flex items-center justify-center ${
                        selectedFile
                          ? 'bg-emerald-500/20 text-emerald-400'
                          : 'bg-indigo-500/20 text-indigo-400'
                      }`}
                    >
                      {selectedFile && selectedFile.name.toLowerCase().endsWith('.mp4') ? (
                        <Video className="w-6 h-6 text-purple-400" />
                      ) : (
                        <FileAudio className="w-6 h-6" />
                      )}
                    </div>

                    {selectedFile ? (
                      <div>
                        <p className="text-xs font-bold text-white truncate max-w-xs">{selectedFile.name}</p>
                        <p className="text-[11px] text-emerald-400 font-mono mt-0.5">
                          {(selectedFile.size / (1024 * 1024)).toFixed(2)} MB &bull; Ready to transcribe
                        </p>
                      </div>
                    ) : (
                      <div>
                        <p className="text-xs font-semibold text-slate-200">
                          Choose an audio/video recording or drag it here
                        </p>
                        <p className="text-[10px] text-slate-500 mt-1">
                          MP3, WAV, M4A, MP4 (Zoom/Teams) &bull; Max 100MB
                        </p>
                      </div>
                    )}

                    {/* Format Validation Tags */}
                    <div className="flex flex-wrap items-center justify-center gap-1.5 mt-2">
                      <span className="text-[10px] px-2 py-0.5 rounded-md bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-semibold">
                        ✓ MP3, WAV, M4A, MP4 Accepted
                      </span>
                      <span className="text-[10px] px-2 py-0.5 rounded-md bg-rose-500/10 border border-rose-500/20 text-rose-400 font-semibold">
                        ✗ .jpg, .png, .pdf Rejected
                      </span>
                    </div>
                  </div>
                </div>

                {/* MP4 Video Detection Banner */}
                {isVideoFile && (
                  <div className="p-3 rounded-xl bg-purple-950/60 border border-purple-800 text-purple-300 text-xs flex items-center gap-2 animate-fade-in">
                    <Video className="w-4 h-4 shrink-0 text-purple-400" />
                    <span>
                      <strong>MP4 Video Recording detected (Zoom/Teams/Meet):</strong> Audio will be extracted using FFmpeg 9.0 and transcribed with OpenAI Whisper AI.
                    </span>
                  </div>
                )}

                {/* Upload Progress Bar */}
                {isUploading && (
                  <div className="space-y-1.5 pt-1">
                    <div className="flex items-center justify-between text-xs text-slate-300">
                      <span className="flex items-center gap-1.5 font-medium">
                        <Loader2 className="w-3.5 h-3.5 animate-spin text-indigo-400" />
                        <span>Transcribing with OpenAI Whisper AI...</span>
                      </span>
                      <span className="font-mono text-indigo-400 font-bold">{uploadProgress}%</span>
                    </div>
                    <div className="w-full h-2 bg-slate-900 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-indigo-500 to-purple-600 transition-all duration-300 rounded-full"
                        style={{ width: `${uploadProgress}%` }}
                      />
                    </div>
                  </div>
                )}

                {/* Submit Button */}
                <button
                  type="submit"
                  disabled={!selectedFile || isUploading}
                  className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 hover:from-indigo-500 hover:to-pink-500 disabled:opacity-40 text-white text-xs font-bold shadow-lg shadow-indigo-600/30 transition-all flex items-center justify-center gap-2"
                >
                  {isUploading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Processing Whisper Transcription...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4" />
                      <span>Upload & Transcribe Recording</span>
                    </>
                  )}
                </button>
              </form>

            {/* Quick Demo Pre-load Bar */}
            <div className="pt-4 border-t border-slate-800">
              <p className="text-[10px] uppercase tracking-wider font-semibold text-slate-400 mb-2">
                Or Load Demo Audio Scenarios:
              </p>
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => handleCreateDemo('sprint_planning')}
                  className="px-2.5 py-2 rounded-xl bg-slate-950/80 hover:bg-slate-800 border border-slate-800 text-[11px] font-semibold text-slate-300 hover:text-white transition-all text-center truncate"
                  title="Sprint 4 Planning Scenario"
                >
                  Sprint Sync
                </button>
                <button
                  type="button"
                  onClick={() => handleCreateDemo('product_roadmap')}
                  className="px-2.5 py-2 rounded-xl bg-slate-950/80 hover:bg-slate-800 border border-slate-800 text-[11px] font-semibold text-slate-300 hover:text-white transition-all text-center truncate"
                  title="Product Roadmap Scenario"
                >
                  Roadmap
                </button>
                <button
                  type="button"
                  onClick={() => handleCreateDemo('technical_architecture')}
                  className="px-2.5 py-2 rounded-xl bg-slate-950/80 hover:bg-slate-800 border border-slate-800 text-[11px] font-semibold text-slate-300 hover:text-white transition-all text-center truncate"
                  title="Technical Architecture Scenario"
                >
                  Architecture
                </button>
              </div>
            </div>
          </div>

          {/* Past Meetings List */}
          <div className="glass-card rounded-2xl p-6 border border-slate-800 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h2 className="text-sm font-bold text-slate-200 flex items-center gap-2">
                <FileAudio className="w-4 h-4 text-purple-400" />
                <span>Transcribed Meetings</span>
                <span className="px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 text-[10px]">
                  {meetings.length}
                </span>
              </h2>
            </div>

            {/* Search Filter */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-3 top-3 text-slate-500" />
              <input
                type="text"
                placeholder="Search meeting transcripts..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-200 text-xs focus:outline-none focus:border-indigo-500 transition-colors"
              />
            </div>

            {/* Meetings Cards Container */}
            <div className="space-y-2.5 max-h-[360px] overflow-y-auto pr-1">
              {loading && meetings.length === 0 ? (
                <div className="py-8 text-center text-xs text-slate-400 flex flex-col items-center gap-2">
                  <Loader2 className="w-5 h-5 animate-spin text-indigo-400" />
                  <span>Loading meetings...</span>
                </div>
              ) : filteredMeetings.length === 0 ? (
                <div className="py-8 text-center text-xs text-slate-500">
                  {searchQuery ? 'No meetings matched your search.' : 'No meetings transcribed yet. Upload an audio or try a demo!'}
                </div>
              ) : (
                filteredMeetings.map((item) => {
                  const isSelected = selectedMeeting && selectedMeeting._id === item._id;
                  return (
                    <div
                      key={item._id}
                      onClick={() => loadMeetingDetails(item._id)}
                      className={`p-3.5 rounded-2xl border transition-all cursor-pointer group flex items-start justify-between gap-3 ${
                        isSelected
                          ? 'bg-indigo-950/40 border-indigo-500/50 shadow-md shadow-indigo-500/10'
                          : 'bg-slate-950/50 border-slate-800/80 hover:bg-slate-900/80 hover:border-slate-700'
                      }`}
                    >
                      <div className="space-y-1 min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          {item.is_video || item.fileName?.toLowerCase().endsWith('.mp4') || item.filename?.toLowerCase().endsWith('.mp4') ? (
                            <span className="p-1 rounded-md bg-purple-500/10 text-purple-400 shrink-0" title="MP4 Meeting Recording">
                              <Video className="w-3 h-3" />
                            </span>
                          ) : (
                            <span className="p-1 rounded-md bg-indigo-500/10 text-indigo-400 shrink-0" title="Audio Recording">
                              <FileAudio className="w-3 h-3" />
                            </span>
                          )}
                          <span
                            className={`w-2 h-2 rounded-full shrink-0 ${
                              item.status === 'completed' || item.status === 'Uploaded'
                                ? 'bg-emerald-400'
                                : item.status === 'processing'
                                ? 'bg-amber-400 animate-pulse'
                                : 'bg-rose-400'
                            }`}
                          />
                          <p className="text-xs font-bold text-white truncate group-hover:text-indigo-300 transition-colors">
                            {item.title}
                          </p>
                        </div>
                        <p className="text-[11px] text-slate-400 line-clamp-1">
                          {item.transcript_preview || 'No preview available'}
                        </p>
                        <div className="flex items-center gap-2.5 text-[10px] text-slate-500 pt-0.5">
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            <span>{formatSeconds(item.duration)}</span>
                          </span>
                          <span>&bull;</span>
                          <span>{item.segment_count || 0} segs</span>
                          <span>&bull;</span>
                          <span className="text-slate-400">{item.uploadDate || item.created_at?.slice(0, 10)}</span>
                        </div>
                      </div>

                      {/* Delete action */}
                      <button
                        onClick={(e) => handleDeleteMeeting(item._id, e)}
                        className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-950/40 transition-all"
                        title="Delete meeting"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: Interactive Transcript Intelligence Workspace (7 Cols) */}
        <div className="lg:col-span-7 space-y-6">
          {selectedMeeting ? (
            <div className="glass-card rounded-2xl p-6 border border-slate-800 space-y-6">
              
              {/* Meeting Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
                <div className="space-y-1 min-w-0">
                  {isEditing ? (
                    <input
                      type="text"
                      value={editTitle}
                      onChange={(e) => setEditTitle(e.target.value)}
                      className="text-lg font-bold text-white bg-slate-950 px-3 py-1.5 rounded-xl border border-indigo-500 w-full focus:outline-none"
                    />
                  ) : (
                    <h2 className="text-xl font-extrabold text-white tracking-tight truncate">
                      {selectedMeeting.title}
                    </h2>
                  )}
                  <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-400">
                    <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-semibold">
                      Whisper {selectedMeeting.status}
                    </span>
                    <span>&bull;</span>
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3 text-indigo-400" />
                      <span>{formatSeconds(selectedMeeting.duration)}</span>
                    </span>
                    <span>&bull;</span>
                    <span className="uppercase font-mono text-purple-400">{selectedMeeting.language || 'en'}</span>
                    <span>&bull;</span>
                    <span>{selectedMeeting.created_at?.split('T')[0] || 'Today'}</span>
                  </div>
                </div>

                {/* Toolbar Buttons */}
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => setIsSummaryOpen(true)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 hover:from-indigo-500 hover:to-pink-500 text-white text-xs font-bold transition-all shadow-md shadow-indigo-600/30 hover:scale-[1.02] active:scale-[0.98]"
                    title="Generate or view AI Meeting Summary (Module 3)"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-white" />
                    <span>AI Summary</span>
                  </button>

                  <button
                    onClick={handleCopyTranscript}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700 text-xs font-semibold transition-all"
                    title="Copy full transcript"
                  >
                    {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copied ? 'Copied' : 'Copy'}</span>
                  </button>

                  <button
                    onClick={handleExportTxt}
                    className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700 text-xs font-semibold transition-all"
                    title="Download as TXT"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>TXT</span>
                  </button>

                  <button
                    onClick={handleExportJson}
                    className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700 text-xs font-semibold transition-all"
                    title="Download as JSON"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>JSON</span>
                  </button>

                  {isEditing ? (
                    <button
                      onClick={handleSaveEdit}
                      disabled={isSaving}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-all shadow-md"
                    >
                      {isSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                      <span>Save</span>
                    </button>
                  ) : (
                    <button
                      onClick={() => setIsEditing(true)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700 text-xs font-semibold transition-all"
                      title="Edit transcript"
                    >
                      <Edit3 className="w-3.5 h-3.5 text-indigo-400" />
                      <span>Edit</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Audio Player if audio stream URL exists */}
              {selectedMeeting.file_url && (
                <div className="space-y-1.5">
                  <p className="text-[11px] uppercase tracking-wider font-semibold text-slate-400">
                    Audio Playback & Interactive Waveform
                  </p>
                  <AudioPlayer
                    audioUrl={meetingService.getAudioUrl(selectedMeeting.file_url)}
                    seekTime={seekTimestamp}
                  />
                </div>
              )}

              {/* Transcript Search Bar */}
              <div className="relative">
                <Search className="w-3.5 h-3.5 absolute left-3 top-3 text-slate-500" />
                <input
                  type="text"
                  placeholder="Filter keywords in this meeting..."
                  value={transcriptSearch}
                  onChange={(e) => setTranscriptSearch(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-200 text-xs focus:outline-none focus:border-indigo-500 transition-colors"
                />
              </div>

              {/* Segments Diarization Timeline */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                    Timestamped Segments & Speaker Diarization
                  </h3>
                  <span className="text-[11px] font-mono text-indigo-400">
                    {selectedMeeting.segments?.length || 0} segments
                  </span>
                </div>

                <div className="space-y-3 max-h-[500px] overflow-y-auto pr-1">
                  {selectedMeeting.segments && selectedMeeting.segments.length > 0 ? (
                    selectedMeeting.segments
                      .filter(
                        (seg) =>
                          !transcriptSearch ||
                          seg.text.toLowerCase().includes(transcriptSearch.toLowerCase()) ||
                          seg.speaker?.toLowerCase().includes(transcriptSearch.toLowerCase())
                      )
                      .map((seg, index) => {
                        const isMatch =
                          transcriptSearch &&
                          seg.text.toLowerCase().includes(transcriptSearch.toLowerCase());

                        return (
                          <div
                            key={seg.id || index}
                            className={`p-4 rounded-2xl border transition-all ${
                              isMatch
                                ? 'bg-indigo-950/40 border-indigo-500/60 shadow-lg shadow-indigo-500/10'
                                : 'bg-slate-950/60 border-slate-800/90 hover:border-slate-700'
                            }`}
                          >
                            <div className="flex items-center justify-between gap-3 mb-2">
                              <div className="flex items-center gap-2">
                                <span className="w-6 h-6 rounded-lg bg-indigo-500/20 text-indigo-400 flex items-center justify-center text-[10px] font-bold">
                                  <User className="w-3.5 h-3.5" />
                                </span>
                                <span className="text-xs font-bold text-indigo-300">
                                  {seg.speaker || `Speaker ${index % 2 + 1}`}
                                </span>
                              </div>

                              {/* Clickable Timestamp Badge that seeks audio */}
                              <button
                                onClick={() => setSeekTimestamp(seg.start)}
                                className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-900 hover:bg-indigo-600/30 text-slate-400 hover:text-indigo-300 border border-slate-800 hover:border-indigo-500/40 text-[11px] font-mono transition-all"
                                title="Click to jump audio to this timestamp"
                              >
                                <Play className="w-2.5 h-2.5 fill-current" />
                                <span>{formatSeconds(seg.start)} - {formatSeconds(seg.end)}</span>
                              </button>
                            </div>

                            {/* Segment Content */}
                            {isEditing ? (
                              <textarea
                                value={editSegments[index]?.text ?? seg.text}
                                onChange={(e) => {
                                  const updated = [...editSegments];
                                  if (updated[index]) {
                                    updated[index] = { ...updated[index], text: e.target.value };
                                    setEditSegments(updated);
                                  }
                                }}
                                rows={2}
                                className="w-full p-2.5 rounded-xl bg-slate-900 border border-slate-700 text-slate-200 text-xs focus:outline-none focus:border-indigo-500"
                              />
                            ) : (
                              <p className="text-xs text-slate-200 leading-relaxed font-sans">
                                {seg.text}
                              </p>
                            )}
                          </div>
                        );
                      })
                  ) : (
                    <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 text-xs text-slate-300 leading-relaxed">
                      {selectedMeeting.transcript_text || 'No transcription text found.'}
                    </div>
                  )}
                </div>
              </div>

              {/* Full Text View Accordion */}
              <div className="pt-4 border-t border-slate-800 space-y-2">
                <details className="group">
                  <summary className="cursor-pointer text-xs font-bold text-slate-400 hover:text-slate-200 flex items-center justify-between py-1">
                    <span>View Concatenated Full Text</span>
                    <span className="text-[10px] text-indigo-400 group-open:rotate-90 transition-transform">
                      &gt;
                    </span>
                  </summary>
                  <div className="mt-3 p-4 rounded-2xl bg-slate-950 border border-slate-800/90 text-xs text-slate-300 leading-relaxed max-h-48 overflow-y-auto">
                    {selectedMeeting.transcript_text}
                  </div>
                </details>
              </div>

            </div>
          ) : (
            /* Empty State */
            <div className="glass-card rounded-3xl p-12 border border-slate-800 text-center space-y-6 flex flex-col items-center justify-center min-h-[460px]">
              <div className="w-16 h-16 rounded-3xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center shadow-xl shadow-indigo-500/10">
                <Sparkles className="w-8 h-8 text-indigo-400" />
              </div>
              <div className="space-y-2 max-w-md">
                <h3 className="text-lg font-bold text-white">No Meeting Selected</h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Select a past transcribed meeting from the list on the left, upload a new audio file, or try one of the ready-made demo scenarios to view transcription intelligence.
                </p>
              </div>
              <div className="flex flex-wrap items-center justify-center gap-3">
                <button
                  onClick={() => setIsRecorderOpen(true)}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-rose-950/60 hover:bg-rose-900/60 text-rose-300 border border-rose-500/30 text-xs font-semibold transition-all shadow-md"
                >
                  <Mic className="w-4 h-4 text-rose-400" />
                  <span>Record Voice Now</span>
                </button>
                <button
                  onClick={() => handleCreateDemo('sprint_planning')}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white text-xs font-bold shadow-lg shadow-indigo-600/30 transition-all"
                >
                  <Sparkles className="w-4 h-4" />
                  <span>Load Sample Sprint Meeting</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
      )}

      {/* Voice Recorder Modal */}
      <VoiceRecorderModal
        isOpen={isRecorderOpen}
        onClose={() => setIsRecorderOpen(false)}
        onTranscriptionComplete={async (audioFile, title) => {
          setIsUploading(true);
          setUploadProgress(100);
          try {
            const result = await meetingService.uploadAudio(audioFile, title);
            await fetchMeetings();
            setSelectedMeeting(result);
            setEditTitle(result.title);
            setEditTranscript(result.transcript_text);
            setEditSegments(result.segments || []);
          } finally {
            setIsUploading(false);
          }
        }}
      />

      {/* Viva & Architecture Guide Modal */}
      <VivaGuideModal
        isOpen={isVivaGuideOpen}
        onClose={() => setIsVivaGuideOpen(false)}
      />

      {/* Module 3: AI Summary Generator Modal */}
      {selectedMeeting && (
        <SummaryViewerModal
          isOpen={isSummaryOpen}
          onClose={() => setIsSummaryOpen(false)}
          sourceId={selectedMeeting._id}
          sourceType="meeting"
          sourceTitle={selectedMeeting.title}
          sourceText={selectedMeeting.transcript_text}
        />
      )}
    </div>
  );
};
