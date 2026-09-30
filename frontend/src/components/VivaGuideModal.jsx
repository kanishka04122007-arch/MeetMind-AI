import React, { useState } from 'react';
import { 
  GraduationCap, 
  X, 
  CheckCircle2, 
  XCircle, 
  FolderTree, 
  Database, 
  Sparkles, 
  Cpu, 
  Copy, 
  Check, 
  FileText, 
  FileAudio, 
  Video, 
  Layers,
  ArrowRight
} from 'lucide-react';

export const VivaGuideModal = ({ isOpen, onClose }) => {
  const [copiedKey, setCopiedKey] = useState(null);

  if (!isOpen) return null;

  const handleCopy = (key, text) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const thanglishAudio = `Audio & PDF Upload Module user-kitta irundhu meeting audio files and PDF documents receive pannum. User file select pannumbodhu system file format validate pannum. Valid file-na server upload pannitu uploads folder-la save pannum. Audio file Whisper AI-kku send pannappadum transcript generate panna. PDF file PyPDF2/pdfplumber use panni text extract panna use aagum. Indha module AI summarization process-ku input provide pannudhu.`;

  const thanglishMp4 = `Enga system MP3, WAV, M4A mattum illa MP4 files-um support pannum. User Zoom, Google Meet, Teams recording-a MP4 format-la upload panna mudiyum. Upload panna MP4 file-la irundhu FFmpeg use panni audio extract pannuvom. Extract pannina audio-a Whisper AI-kku kuduthu transcript generate pannuvom. Athukkapparam AI summary and action items generate pannappadum.`;

  const thanglishGemini = `Enga project-la AI summarization-kku Dual-Engine Architecture use pandrom. Primary engine Google Gemini AI (gemini-3.8-flash). User meeting audio or PDF upload pannumbodhu, transcript extract aagi Gemini AI-kku send aagum. Gemini AI Purpose, Key Discussion Points, Decisions, Action Items and Next Steps generate pannum. Suppose Gemini API key illana, quota limit reach aachuna, illa internet fail aachuna, system crash aagathu — immediately enga Local Deterministic NLP Engine fallback aagi summary and action items generate pannidum. Viva demonstration-la internet disconnected-a irunthalum project 100% reliably work aagum!`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md overflow-y-auto">
      <div className="relative w-full max-w-4xl my-8 bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="px-6 py-5 border-b border-slate-800 bg-slate-950/60 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-amber-500 to-orange-600 flex items-center justify-center shadow-lg shadow-amber-500/20">
              <GraduationCap className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-bold text-white">MeetMind AI: Viva & Architecture Guide</h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-indigo-500/20 border border-indigo-500/30 text-indigo-300">
                  Full Pipeline & Fallback
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Primary Gemini AI + Local NLP Fallback, Audio/PDF upload, Whisper AI & viva explanations
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 text-sm">
          
          {/* Quick Summary Pill Banner */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <div className="p-4 rounded-2xl bg-indigo-950/40 border border-indigo-800/40 flex items-start gap-3">
              <FileAudio className="w-5 h-5 text-indigo-400 mt-0.5 shrink-0" />
              <div>
                <p className="text-xs font-bold text-indigo-200 uppercase tracking-wider">Audio & Video</p>
                <p className="text-xs text-slate-300 mt-1">MP3, WAV, M4A, MP4 (Zoom, Meet, Teams)</p>
              </div>
            </div>
            <div className="p-4 rounded-2xl bg-purple-950/40 border border-purple-800/40 flex items-start gap-3">
              <FileText className="w-5 h-5 text-purple-400 mt-0.5 shrink-0" />
              <div>
                <p className="text-xs font-bold text-purple-200 uppercase tracking-wider">PDF Documents</p>
                <p className="text-xs text-slate-300 mt-1">PDF notes & agenda extracted via pdfplumber</p>
              </div>
            </div>
            <div className="p-4 rounded-2xl bg-indigo-950/40 border border-indigo-800/40 flex items-start gap-3">
              <Sparkles className="w-5 h-5 text-indigo-400 mt-0.5 shrink-0" />
              <div>
                <p className="text-xs font-bold text-indigo-200 uppercase tracking-wider">Primary AI</p>
                <p className="text-xs text-slate-300 mt-1">Google Gemini AI (gemini-3.8-flash)</p>
              </div>
            </div>
            <div className="p-4 rounded-2xl bg-emerald-950/40 border border-emerald-800/40 flex items-start gap-3">
              <Cpu className="w-5 h-5 text-emerald-400 mt-0.5 shrink-0" />
              <div>
                <p className="text-xs font-bold text-emerald-200 uppercase tracking-wider">Backup Fallback</p>
                <p className="text-xs text-slate-300 mt-1">Local NLP Engine (100% Offline)</p>
              </div>
            </div>
          </div>

          {/* Viva Explanations in Thanglish */}
          <div className="space-y-4">
            <h4 className="text-sm font-bold text-slate-200 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-amber-400" />
              Viva Explanation (Thanglish) — Memorize for Evaluation
            </h4>
            
            {/* Box 1: Core Module 2 Explanation */}
            <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-amber-300 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-amber-400"></span>
                  Module 2: Audio & PDF Processing Viva Answer
                </span>
                <button
                  onClick={() => handleCopy('audio', thanglishAudio)}
                  className="flex items-center gap-1 text-[11px] text-slate-400 hover:text-white px-2 py-1 bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors"
                >
                  {copiedKey === 'audio' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedKey === 'audio' ? 'Copied' : 'Copy'}</span>
                </button>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed italic bg-slate-900/60 p-3 rounded-xl border border-slate-800/60">
                "{thanglishAudio}"
              </p>
            </div>

            {/* Box 2: MP4 Support Viva Explanation */}
            <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-emerald-300 flex items-center gap-1.5">
                  <Video className="w-3.5 h-3.5 text-emerald-400" />
                  Why MP4 Video Support? (Special Viva Question)
                </span>
                <button
                  onClick={() => handleCopy('mp4', thanglishMp4)}
                  className="flex items-center gap-1 text-[11px] text-slate-400 hover:text-white px-2 py-1 bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors"
                >
                  {copiedKey === 'mp4' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedKey === 'mp4' ? 'Copied' : 'Copy'}</span>
                </button>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed italic bg-slate-900/60 p-3 rounded-xl border border-slate-800/60">
                "{thanglishMp4}"
              </p>
            </div>

            {/* Box 3: Dual-Engine AI Architecture (Gemini Primary + Local NLP Backup) */}
            <div className="p-4 rounded-2xl bg-gradient-to-r from-indigo-950/70 to-purple-950/70 border border-indigo-700/50 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-indigo-300 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
                  Module 3 & 4: Primary Gemini AI + Local NLP Fallback (Critical Viva Defense)
                </span>
                <button
                  onClick={() => handleCopy('gemini', thanglishGemini)}
                  className="flex items-center gap-1 text-[11px] text-slate-400 hover:text-white px-2 py-1 bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors"
                >
                  {copiedKey === 'gemini' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedKey === 'gemini' ? 'Copied' : 'Copy'}</span>
                </button>
              </div>
              <p className="text-xs text-indigo-100 leading-relaxed italic bg-slate-900/80 p-3 rounded-xl border border-indigo-800/50">
                "{thanglishGemini}"
              </p>
              <div className="p-3 rounded-xl bg-slate-950/80 border border-indigo-500/20 text-xs text-slate-300 space-y-1.5">
                <p className="font-bold text-indigo-300">Why this architecture scores maximum marks in final-year CSE viva:</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px]">
                  <div className="p-2 rounded-lg bg-indigo-950/40 border border-indigo-800/30">
                    <span className="text-indigo-300 font-bold">1. Superior Intelligence:</span>
                    <p className="text-slate-400 mt-0.5">Google Gemini delivers enterprise-grade Purpose, Decisions, and Action Items extraction.</p>
                  </div>
                  <div className="p-2 rounded-lg bg-emerald-950/40 border border-emerald-800/30">
                    <span className="text-emerald-300 font-bold">2. Zero-Downtime Reliability:</span>
                    <p className="text-slate-400 mt-0.5">Local NLP Engine ensures flawless live presentation even if external API limits or Wi-Fi drops.</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Validation Matrix & Workflows */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            
            {/* Validation Rules */}
            <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-3">
              <h5 className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                Format Validation Matrix
              </h5>
              <div className="space-y-2 text-xs">
                <div className="flex items-center justify-between p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-300">
                  <span>meeting.mp3 / recording.wav</span>
                  <span className="font-bold">✓ Accepted (Audio)</span>
                </div>
                <div className="flex items-center justify-between p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-300">
                  <span>meeting_zoom.mp4 / gmeet.mp4</span>
                  <span className="font-bold">✓ Accepted (Video)</span>
                </div>
                <div className="flex items-center justify-between p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-300">
                  <span>notes.pdf / agenda.pdf</span>
                  <span className="font-bold">✓ Accepted (PDF)</span>
                </div>
                <div className="flex items-center justify-between p-2 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-300">
                  <span>image.jpg / screenshot.png</span>
                  <span className="font-bold">✗ Rejected (Invalid)</span>
                </div>
                <div className="flex items-center justify-between p-2 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-300">
                  <span>notes.pdf in Audio Upload</span>
                  <span className="font-bold">✗ Rejected (Redirect)</span>
                </div>
              </div>
            </div>

            {/* Folder Structure */}
            <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-3">
              <h5 className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center gap-2">
                <FolderTree className="w-4 h-4 text-indigo-400" />
                Storage Folder Structure
              </h5>
              <div className="font-mono text-xs p-3 rounded-xl bg-slate-900 text-indigo-300 border border-slate-800 space-y-1">
                <p className="text-white font-bold">MeetMind AI/</p>
                <p>├── backend/</p>
                <p>│   └── uploads/</p>
                <p>│       ├── audio/       <span className="text-slate-400 text-[11px]">← .mp3, .wav, .m4a, .mp4</span></p>
                <p>│       │   ├── meeting1.mp3</p>
                <p>│       │   └── zoom_call.mp4</p>
                <p>│       └── pdf/         <span className="text-slate-400 text-[11px]">← meeting documents</span></p>
                <p>│           └── notes.pdf</p>
              </div>
            </div>
          </div>

          {/* Database Schema Examples */}
          <div className="space-y-3">
            <h5 className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center gap-2">
              <Database className="w-4 h-4 text-purple-400" />
              MongoDB Database Collections
            </h5>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Audio Collection */}
              <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800">
                <p className="text-xs font-semibold text-indigo-300 mb-2">meetings Collection (Audio/Video)</p>
                <pre className="font-mono text-[11px] p-3 rounded-xl bg-slate-900 text-slate-300 overflow-x-auto border border-slate-800">
{`{
  "_id": "001",
  "fileName": "meeting.mp3",
  "uploadDate": "2026-09-28",
  "status": "Uploaded",
  "file_type": "audio/mp3",
  "duration": 184.5,
  "transcript_text": "Good morning team..."
}`}
                </pre>
              </div>

              {/* PDF Collection */}
              <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800">
                <p className="text-xs font-semibold text-purple-300 mb-2">documents Collection (PDF)</p>
                <pre className="font-mono text-[11px] p-3 rounded-xl bg-slate-900 text-slate-300 overflow-x-auto border border-slate-800">
{`{
  "_id": "002",
  "fileName": "meeting_notes.pdf",
  "uploadDate": "2026-09-28",
  "status": "Uploaded",
  "page_count": 3,
  "word_count": 241,
  "extracted_text": "MEETMIND AI SPRINT 4..."
}`}
                </pre>
              </div>
            </div>
          </div>

          {/* End-to-End Pipeline Visualization */}
          <div className="p-4 rounded-2xl bg-gradient-to-br from-slate-950 to-slate-900 border border-slate-800 space-y-3">
            <h5 className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center gap-2">
              <Layers className="w-4 h-4 text-cyan-400" />
              Real Workflow Pipeline
            </h5>
            <div className="space-y-3 text-xs">
              <div className="flex flex-wrap items-center gap-2 p-2.5 rounded-xl bg-slate-900/80 border border-slate-800">
                <span className="font-semibold text-indigo-300">Audio/MP4 Flow:</span>
                <span className="text-slate-300">Upload File</span>
                <ArrowRight className="w-3 h-3 text-slate-500" />
                <span className="text-slate-300">Format & Size Validation</span>
                <ArrowRight className="w-3 h-3 text-slate-500" />
                <span className="text-slate-300">uploads/audio/</span>
                <ArrowRight className="w-3 h-3 text-slate-500" />
                <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-semibold">FFmpeg Extract</span>
                <ArrowRight className="w-3 h-3 text-slate-500" />
                <span className="px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300 font-semibold">Whisper AI</span>
                <ArrowRight className="w-3 h-3 text-slate-500" />
                <span className="text-emerald-400 font-bold">Transcript</span>
              </div>
              <div className="flex flex-wrap items-center gap-2 p-2.5 rounded-xl bg-slate-900/80 border border-slate-800">
                <span className="font-semibold text-purple-300">PDF Flow:</span>
                <span className="text-slate-300">Select PDF</span>
                <ArrowRight className="w-3 h-3 text-slate-500" />
                <span className="text-slate-300">Header & Size Validation</span>
                <ArrowRight className="w-3 h-3 text-slate-500" />
                <span className="text-slate-300">uploads/pdf/</span>
                <ArrowRight className="w-3 h-3 text-slate-500" />
                <span className="px-2 py-0.5 rounded bg-purple-500/20 text-purple-300 font-semibold">pdfplumber / pypdf</span>
                <ArrowRight className="w-3 h-3 text-slate-500" />
                <span className="text-purple-300 font-bold">Extracted Text</span>
              </div>
              <div className="flex flex-wrap items-center gap-2 p-2.5 rounded-xl bg-slate-900/80 border border-slate-800">
                <span className="font-semibold text-emerald-300">Dual-Engine Flow:</span>
                <span className="text-slate-300">Transcript / PDF Text</span>
                <ArrowRight className="w-3 h-3 text-slate-500" />
                <span className="px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300 font-semibold">Gemini AI (Primary)</span>
                <span className="text-slate-500 text-[10px]">or</span>
                <span className="px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 font-semibold">Local NLP (Fallback)</span>
                <ArrowRight className="w-3 h-3 text-slate-500" />
                <span className="text-emerald-400 font-bold">Purpose • Points • Decisions • Tasks</span>
              </div>
            </div>
          </div>

        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-800 bg-slate-950 flex items-center justify-between text-xs text-slate-400">
          <span>MeetMind AI Module 2: Audio, Video & PDF Upload Management</span>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-bold hover:shadow-lg hover:shadow-indigo-600/30 transition-all"
          >
            Close Guide
          </button>
        </div>

      </div>
    </div>
  );
};
