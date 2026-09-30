import React, { useState, useRef, useEffect } from 'react';
import { Play, Pause, RotateCcw, RotateCw, Volume2, VolumeX } from 'lucide-react';

export const AudioPlayer = ({ audioUrl, currentTime = 0, onTimeUpdate, seekTime = null }) => {
  const audioRef = useRef(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [duration, setDuration] = useState(0);
  const [playerCurrentTime, setPlayerCurrentTime] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [playbackRate, setPlaybackRate] = useState(1);

  // Synchronize with external seek requests
  useEffect(() => {
    if (seekTime !== null && audioRef.current && isFinite(seekTime)) {
      audioRef.current.currentTime = seekTime;
      setPlayerCurrentTime(seekTime);
      if (!isPlaying) {
        audioRef.current.play().then(() => setIsPlaying(true)).catch(() => {});
      }
    }
  }, [seekTime]);

  const togglePlay = () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.play().then(() => setIsPlaying(true)).catch(() => {});
    }
  };

  const handleTimeUpdate = () => {
    if (!audioRef.current) return;
    const cur = audioRef.current.currentTime;
    setPlayerCurrentTime(cur);
    if (onTimeUpdate) {
      onTimeUpdate(cur);
    }
  };

  const handleLoadedMetadata = () => {
    if (!audioRef.current) return;
    setDuration(audioRef.current.duration || 0);
  };

  const handleSeek = (e) => {
    const time = parseFloat(e.target.value);
    if (audioRef.current) {
      audioRef.current.currentTime = time;
      setPlayerCurrentTime(time);
    }
  };

  const skipSeconds = (sec) => {
    if (!audioRef.current) return;
    const newTime = Math.min(Math.max(audioRef.current.currentTime + sec, 0), duration || 1000);
    audioRef.current.currentTime = newTime;
    setPlayerCurrentTime(newTime);
  };

  const toggleMute = () => {
    if (!audioRef.current) return;
    const nextMuted = !isMuted;
    audioRef.current.muted = nextMuted;
    setIsMuted(nextMuted);
  };

  const handleVolumeChange = (e) => {
    const val = parseFloat(e.target.value);
    setVolume(val);
    if (audioRef.current) {
      audioRef.current.volume = val;
      audioRef.current.muted = val === 0;
      setIsMuted(val === 0);
    }
  };

  const cyclePlaybackRate = () => {
    const rates = [1, 1.25, 1.5, 2];
    const nextIndex = (rates.indexOf(playbackRate) + 1) % rates.length;
    const nextRate = rates[nextIndex];
    setPlaybackRate(nextRate);
    if (audioRef.current) {
      audioRef.current.playbackRate = nextRate;
    }
  };

  const formatTime = (secs) => {
    if (isNaN(secs) || secs < 0) return '00:00';
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const progressPercent = duration > 0 ? (playerCurrentTime / duration) * 100 : 0;

  return (
    <div className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800 shadow-xl backdrop-blur-md space-y-3">
      <audio
        ref={audioRef}
        src={audioUrl}
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={handleLoadedMetadata}
        onEnded={() => setIsPlaying(false)}
      />

      {/* Waveform / Visual Bars Animation */}
      <div className="flex items-center justify-between gap-1 h-6 px-1">
        {[40, 65, 80, 50, 90, 75, 45, 85, 95, 60, 70, 80, 50, 65, 90, 80, 55, 75, 85, 45, 60, 75, 90, 50].map((h, i) => {
          const barProgress = (i / 24) * 100;
          const isPassed = barProgress <= progressPercent;
          return (
            <div
              key={i}
              className={`flex-1 rounded-full transition-all duration-150 ${
                isPassed ? 'bg-indigo-500 shadow-sm shadow-indigo-500/50' : 'bg-slate-800'
              } ${isPlaying ? 'animate-pulse' : ''}`}
              style={{
                height: `${isPlaying ? Math.max(20, (h * (0.6 + Math.random() * 0.4))) : h * 0.4}%`,
                animationDelay: `${i * 40}ms`
              }}
            />
          );
        })}
      </div>

      {/* Scrubber Progress Slider */}
      <div className="space-y-1">
        <input
          type="range"
          min={0}
          max={duration || 100}
          step={0.1}
          value={playerCurrentTime}
          onChange={handleSeek}
          className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-indigo-500 hover:accent-indigo-400 transition-all"
        />
        <div className="flex items-center justify-between text-[11px] font-mono text-slate-400">
          <span>{formatTime(playerCurrentTime)}</span>
          <span>{formatTime(duration)}</span>
        </div>
      </div>

      {/* Control Buttons Bar */}
      <div className="flex items-center justify-between pt-1">
        <div className="flex items-center gap-2">
          {/* Skip Back 5s */}
          <button
            onClick={() => skipSeconds(-5)}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-all"
            title="Rewind 5 seconds"
          >
            <RotateCcw className="w-4 h-4" />
          </button>

          {/* Play / Pause Primary Button */}
          <button
            onClick={togglePlay}
            className="w-10 h-10 rounded-full bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-400 hover:to-purple-500 text-white flex items-center justify-center shadow-lg shadow-indigo-500/30 transition-all transform active:scale-95"
            title={isPlaying ? 'Pause' : 'Play Audio'}
          >
            {isPlaying ? <Pause className="w-4 h-4 fill-white" /> : <Play className="w-4 h-4 fill-white ml-0.5" />}
          </button>

          {/* Skip Forward 5s */}
          <button
            onClick={() => skipSeconds(5)}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-all"
            title="Fast forward 5 seconds"
          >
            <RotateCw className="w-4 h-4" />
          </button>
        </div>

        {/* Speed & Volume Controls */}
        <div className="flex items-center gap-3">
          {/* Playback Rate Button */}
          <button
            onClick={cyclePlaybackRate}
            className="px-2 py-1 rounded-md bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700 text-[11px] font-mono font-bold transition-all"
            title="Toggle playback speed"
          >
            {playbackRate}x
          </button>

          {/* Volume Control */}
          <div className="flex items-center gap-1.5">
            <button
              onClick={toggleMute}
              className="text-slate-400 hover:text-white transition-colors"
              title={isMuted ? 'Unmute' : 'Mute'}
            >
              {isMuted || volume === 0 ? (
                <VolumeX className="w-4 h-4 text-rose-400" />
              ) : (
                <Volume2 className="w-4 h-4" />
              )}
            </button>
            <input
              type="range"
              min={0}
              max={1}
              step={0.05}
              value={isMuted ? 0 : volume}
              onChange={handleVolumeChange}
              className="w-16 h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-indigo-500"
            />
          </div>
        </div>
      </div>
    </div>
  );
};
