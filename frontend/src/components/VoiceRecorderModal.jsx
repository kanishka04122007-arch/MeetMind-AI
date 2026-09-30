import React, { useState, useRef, useEffect } from 'react';
import { Mic, MicOff, Square, Play, Pause, X, Loader2, Sparkles, AlertCircle } from 'lucide-react';

export const VoiceRecorderModal = ({ isOpen, onClose, onTranscriptionComplete }) => {
  const [isRecording, setIsRecording] = useState(false);
  const [recordedBlob, setRecordedBlob] = useState(null);
  const [audioUrl, setAudioUrl] = useState(null);
  const [recordingTime, setRecordingTime] = useState(0);
  const [title, setTitle] = useState('');
  const [isPlayingPreview, setIsPlayingPreview] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);

  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const timerIntervalRef = useRef(null);
  const previewAudioRef = useRef(null);

  useEffect(() => {
    if (!isOpen) {
      cleanupRecording();
    }
  }, [isOpen]);

  const cleanupRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
    }
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
    }
    setIsRecording(false);
    setRecordedBlob(null);
    if (audioUrl) {
      URL.revokeObjectURL(audioUrl);
      setAudioUrl(null);
    }
    setRecordingTime(0);
    setTitle('');
    setIsPlayingPreview(false);
    setIsSubmitting(false);
    setErrorMsg(null);
  };

  const startRecording = async () => {
    setErrorMsg(null);
    audioChunksRef.current = [];
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        setRecordedBlob(audioBlob);
        const url = URL.createObjectURL(audioBlob);
        setAudioUrl(url);
        // Stop all audio tracks to release microphone
        stream.getTracks().forEach((track) => track.stop());
      };

      mediaRecorder.start(250); // collect 250ms chunks
      setIsRecording(true);
      setRecordingTime(0);

      timerIntervalRef.current = setInterval(() => {
        setRecordingTime((prev) => prev + 1);
      }, 1000);
    } catch (err) {
      setErrorMsg('Microphone access was denied or is not available. Please check browser permissions.');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
    }
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
    }
    setIsRecording(false);
  };

  const togglePreviewPlay = () => {
    if (!previewAudioRef.current) return;
    if (isPlayingPreview) {
      previewAudioRef.current.pause();
      setIsPlayingPreview(false);
    } else {
      previewAudioRef.current.play();
      setIsPlayingPreview(true);
    }
  };

  const handleTranscribe = async () => {
    if (!recordedBlob) return;
    setIsSubmitting(true);
    setErrorMsg(null);
    try {
      const audioFile = new File([recordedBlob], `mic_recording_${Date.now()}.webm`, {
        type: 'audio/webm'
      });
      await onTranscriptionComplete(audioFile, title || 'Live Voice Recording');
      onClose();
    } catch (err) {
      setErrorMsg(err.response?.data?.detail || 'Failed to upload and transcribe audio.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatTimer = (secs) => {
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in">
      <div className="relative w-full max-w-lg rounded-3xl bg-slate-900 border border-slate-800 p-6 shadow-2xl space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-pink-500 to-rose-600 flex items-center justify-center shadow-lg shadow-pink-500/20">
              <Mic className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Live Microphone Recorder</h3>
              <p className="text-xs text-slate-400">Record spoken meeting notes and transcribe with Whisper</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {errorMsg && (
          <div className="p-3 rounded-xl bg-rose-950/60 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Recording Visual Stage */}
        <div className="flex flex-col items-center justify-center py-6 space-y-4">
          <div className="relative">
            {isRecording && (
              <div className="absolute inset-0 rounded-full bg-rose-500/30 animate-ping pointer-events-none" />
            )}
            <div
              className={`w-24 h-24 rounded-full flex items-center justify-center transition-all ${
                isRecording
                  ? 'bg-rose-600 shadow-xl shadow-rose-600/40'
                  : recordedBlob
                  ? 'bg-emerald-600 shadow-xl shadow-emerald-600/30'
                  : 'bg-slate-800 border border-slate-700'
              }`}
            >
              {isRecording ? (
                <Mic className="w-10 h-10 text-white animate-pulse" />
              ) : recordedBlob ? (
                <Sparkles className="w-10 h-10 text-white" />
              ) : (
                <MicOff className="w-10 h-10 text-slate-400" />
              )}
            </div>
          </div>

          {/* Time Counter */}
          <div className="text-center">
            <span className="font-mono text-3xl font-extrabold text-white tracking-wider">
              {formatTimer(recordingTime)}
            </span>
            <p className="text-xs text-slate-400 mt-1">
              {isRecording
                ? 'Recording in progress... Click Stop when finished'
                : recordedBlob
                ? 'Audio captured successfully'
                : 'Click "Start Recording" to begin'}
            </p>
          </div>

          {/* Controls: Start / Stop */}
          <div className="flex items-center gap-3 pt-2">
            {!isRecording && !recordedBlob && (
              <button
                onClick={startRecording}
                className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-rose-600 to-pink-600 hover:from-rose-500 hover:to-pink-500 text-white text-xs font-bold shadow-lg shadow-rose-600/30 transition-all transform active:scale-95"
              >
                <Mic className="w-4 h-4" />
                <span>Start Recording</span>
              </button>
            )}

            {isRecording && (
              <button
                onClick={stopRecording}
                className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-rose-700 hover:bg-rose-800 text-white text-xs font-bold shadow-lg transition-all animate-pulse"
              >
                <Square className="w-4 h-4 fill-white" />
                <span>Stop Recording</span>
              </button>
            )}

            {!isRecording && recordedBlob && (
              <button
                onClick={startRecording}
                className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 hover:text-white border border-slate-700 text-xs font-semibold transition-all"
              >
                Re-record
              </button>
            )}
          </div>
        </div>

        {/* Audio Preview if blob exists */}
        {recordedBlob && audioUrl && (
          <div className="p-4 rounded-2xl bg-slate-950/70 border border-slate-800 space-y-3">
            <audio
              ref={previewAudioRef}
              src={audioUrl}
              onEnded={() => setIsPlayingPreview(false)}
            />
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-300">Recorded Audio Preview</span>
              <button
                onClick={togglePreviewPlay}
                className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-indigo-600/30 text-indigo-300 border border-indigo-500/30 text-xs font-medium hover:bg-indigo-600/50 transition-all"
              >
                {isPlayingPreview ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5 fill-current" />}
                <span>{isPlayingPreview ? 'Pause' : 'Play Preview'}</span>
              </button>
            </div>

            {/* Optional Title input */}
            <div>
              <label className="block text-[11px] font-semibold text-slate-400 uppercase mb-1">
                Meeting Title (Optional)
              </label>
              <input
                type="text"
                placeholder="e.g. Quick Team Standup Voice Note"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-200 text-xs focus:outline-none focus:border-indigo-500"
              />
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
          <button
            onClick={onClose}
            disabled={isSubmitting}
            className="px-4 py-2 rounded-xl text-slate-400 hover:text-white text-xs font-semibold transition-all"
          >
            Cancel
          </button>
          <button
            onClick={handleTranscribe}
            disabled={!recordedBlob || isSubmitting}
            className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 hover:from-indigo-500 hover:to-pink-500 disabled:opacity-50 text-white text-xs font-bold shadow-lg shadow-indigo-600/30 transition-all"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Transcribing with Whisper...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                <span>Transcribe Audio</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
