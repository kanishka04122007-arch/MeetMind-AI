import React, { useState } from 'react';
import { Sparkles, User, LogOut, Shield, ChevronDown, CheckCircle, Database, LayoutDashboard, Mic, FileAudio, FileText, Edit3, CheckSquare } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export const Navbar = ({ onOpenProfile, activeTab = 'dashboard', onSelectTab }) => {
  const { user, logout, isAuthenticated } = useAuth();
  const [dropdownOpen, setDropdownOpen] = useState(false);

  // Generate initials for avatar
  const getInitials = (name) => {
    if (!name) return 'U';
    const parts = name.trim().split(' ');
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  };

  return (
    <header className="sticky top-0 z-40 w-full border-b border-slate-800/80 bg-slate-950/80 backdrop-blur-xl">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Logo and Brand */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 via-purple-600 to-pink-500 p-0.5 flex items-center justify-center shadow-lg shadow-indigo-500/20">
            <div className="w-full h-full bg-slate-950 rounded-[10px] flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-indigo-400" />
            </div>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-lg tracking-tight bg-gradient-to-r from-white via-indigo-100 to-indigo-300 bg-clip-text text-transparent">
                MeetMind AI
              </span>
              <span className="text-[10px] font-semibold tracking-wider uppercase px-2 py-0.5 bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 rounded-full">
                AI Meeting Intelligence
              </span>
            </div>
            <p className="text-[11px] text-slate-400 hidden sm:block">
              Intelligent Meeting Summaries & Speech Recognition
            </p>
          </div>
        </div>

        {/* Center Navigation Tabs for Modules 1, 2 & 3 */}
        {isAuthenticated && user && onSelectTab && (
          <nav className="hidden md:flex items-center p-1 rounded-2xl bg-slate-900 border border-slate-800 shadow-inner">
            <button
              onClick={() => onSelectTab('audio')}
              className={`flex items-center gap-2 px-4 py-1.5 rounded-xl text-xs font-bold transition-all ${
                activeTab === 'audio' || activeTab === 'transcription'
                  ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-md shadow-indigo-600/20'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <FileAudio className="w-3.5 h-3.5 text-indigo-400" />
              <span>Audio & Video</span>
            </button>

            <button
              onClick={() => onSelectTab('pdf')}
              className={`flex items-center gap-2 px-4 py-1.5 rounded-xl text-xs font-bold transition-all relative ${
                activeTab === 'pdf'
                  ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-md shadow-indigo-600/20'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <FileText className="w-3.5 h-3.5 text-purple-400" />
              <span>PDF Documents</span>
            </button>

            <button
              onClick={() => onSelectTab('summaries')}
              className={`flex items-center gap-2 px-4 py-1.5 rounded-xl text-xs font-bold transition-all relative ${
                activeTab === 'summaries'
                  ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-md shadow-indigo-600/20'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              <span>AI Summaries</span>
            </button>
          </nav>
        )}

        {/* Right side items */}
        {isAuthenticated && user && (
          <div className="flex items-center gap-3">
            {/* System Status Pill */}
            <div className="hidden lg:flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-medium">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              <span>Whisper AI Engine Active</span>
            </div>

            {/* Profile Dropdown */}
            <div className="relative">
              <button
                onClick={() => setDropdownOpen(!dropdownOpen)}
                className="flex items-center gap-3 p-1.5 pl-3 rounded-full bg-slate-900 border border-slate-800 hover:border-slate-700 transition-all focus:outline-none"
                aria-expanded={dropdownOpen}
                aria-haspopup="true"
              >
                <div className="text-left hidden sm:block">
                  <p className="text-xs font-semibold text-slate-200 leading-tight">
                    {user.name}
                  </p>
                  <p className="text-[10px] text-slate-400 leading-tight">
                    {user.email}
                  </p>
                </div>
                <div className="w-8 h-8 rounded-full bg-gradient-to-r from-indigo-500 to-purple-600 flex items-center justify-center text-white text-xs font-bold shadow-md">
                  {getInitials(user.name)}
                </div>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400 mr-1" />
              </button>

              {dropdownOpen && (
                <>
                  <div
                    className="fixed inset-0 z-10"
                    onClick={() => setDropdownOpen(false)}
                  />
                  <div className="absolute right-0 mt-2 w-56 rounded-2xl bg-slate-900 border border-slate-800 shadow-2xl p-2 z-20 animate-fade-in">
                    <div className="px-3 py-2 border-b border-slate-800 mb-1">
                      <p className="text-xs text-slate-400">Signed in as</p>
                      <p className="text-sm font-bold text-white truncate">{user.name}</p>
                      <p className="text-xs text-indigo-400 truncate">{user.email}</p>
                    </div>

                    {onSelectTab && (
                      <>
                        <button
                          onClick={() => {
                            setDropdownOpen(false);
                            onSelectTab('dashboard');
                          }}
                          className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-medium text-slate-300 hover:text-white hover:bg-slate-800/80 rounded-xl transition-colors text-left"
                        >
                          <LayoutDashboard className="w-4 h-4 text-indigo-400" />
                          Dashboard
                        </button>
                        <button
                          onClick={() => {
                            setDropdownOpen(false);
                            onSelectTab('transcription');
                          }}
                          className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-medium text-slate-300 hover:text-white hover:bg-slate-800/80 rounded-xl transition-colors text-left"
                        >
                          <FileAudio className="w-4 h-4 text-purple-400" />
                          Meetings & Transcripts
                        </button>
                        <button
                          onClick={() => {
                            setDropdownOpen(false);
                            onSelectTab('tasks');
                          }}
                          className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-medium text-slate-300 hover:text-white hover:bg-slate-800/80 rounded-xl transition-colors text-left"
                        >
                          <CheckSquare className="w-4 h-4 text-pink-400" />
                          Action Items & Tasks
                        </button>
                        <div className="border-t border-slate-800 my-1"></div>
                      </>
                    )}

                    <button
                      onClick={() => {
                        setDropdownOpen(false);
                        onOpenProfile('view');
                      }}
                      className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-medium text-slate-300 hover:text-white hover:bg-slate-800/80 rounded-xl transition-colors text-left"
                    >
                      <User className="w-4 h-4 text-indigo-400" />
                      View Profile
                    </button>

                    <button
                      onClick={() => {
                        setDropdownOpen(false);
                        onOpenProfile('edit');
                      }}
                      className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-medium text-slate-300 hover:text-white hover:bg-slate-800/80 rounded-xl transition-colors text-left"
                    >
                      <Edit3 className="w-4 h-4 text-emerald-400" />
                      Edit Profile
                    </button>

                    <button
                      onClick={() => {
                        setDropdownOpen(false);
                        onOpenProfile('password');
                      }}
                      className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-medium text-slate-300 hover:text-white hover:bg-slate-800/80 rounded-xl transition-colors text-left"
                    >
                      <Shield className="w-4 h-4 text-purple-400" />
                      Change Password
                    </button>

                    <div className="border-t border-slate-800 my-1"></div>

                    <button
                      onClick={() => {
                        setDropdownOpen(false);
                        logout();
                      }}
                      className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-medium text-rose-400 hover:text-rose-300 hover:bg-rose-950/30 rounded-xl transition-colors text-left"
                    >
                      <LogOut className="w-4 h-4" />
                      Sign Out
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </header>
  );
};
