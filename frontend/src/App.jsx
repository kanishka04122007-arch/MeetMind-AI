import React, { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Navbar } from './components/Navbar';
import { LoginPage } from './pages/LoginPage';
import { RegisterPage } from './pages/RegisterPage';
import { DashboardPage } from './pages/DashboardPage';
import { MeetingTranscriptionPage } from './pages/MeetingTranscriptionPage';
import { SummariesListPage } from './pages/SummariesListPage';
import { ActionItemsPage } from './pages/ActionItemsPage';
import { ProfileModal } from './components/ProfileModal';
import { Notification } from './components/Notification';
import { Shield, Sparkles, Database, Lock, Loader2, Mic } from 'lucide-react';

const MainContent = () => {
  const { isAuthenticated, loading, user } = useAuth();
  const [authView, setAuthView] = useState('login'); // 'login' or 'register'
  const [initialEmail, setInitialEmail] = useState('');
  const [profileModalOpen, setProfileModalOpen] = useState(false);
  const [profileTab, setProfileTab] = useState('view');
  const [activeTab, setActiveTab] = useState('audio'); // 'audio', 'pdf', 'summaries'
  const [transcriptionInitialTab, setTranscriptionInitialTab] = useState('audio');
  const [transcriptionSelectedId, setTranscriptionSelectedId] = useState(null);

  const handleOpenProfile = (tab = 'view') => {
    setProfileTab(tab);
    setProfileModalOpen(true);
  };

  const handleNavigateToTranscription = (tab = 'audio', meetingId = null) => {
    setTranscriptionInitialTab(tab);
    setTranscriptionSelectedId(meetingId);
    setActiveTab('transcription');
  };

  if (loading) {
    return (
      <div className="min-h-screen w-full flex flex-col items-center justify-center bg-[#0a0d14] text-white">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/30 animate-pulse">
            <Sparkles className="w-6 h-6 text-white" />
          </div>
          <div className="flex items-center gap-2 text-sm text-slate-400 font-medium">
            <Loader2 className="w-4 h-4 animate-spin text-indigo-400" />
            <span>Verifying MeetMind AI Authentication Session...</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full bg-[#0a0d14] text-slate-100 flex flex-col bg-mesh">
      {/* Toast Notifications */}
      <Notification />

      {/* Global Navbar */}
      <Navbar
        onOpenProfile={handleOpenProfile}
        activeTab={activeTab}
        onSelectTab={setActiveTab}
      />

      {/* Main Container */}
      <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex flex-col justify-start">
        {isAuthenticated && user ? (
          activeTab === 'summaries' ? (
            /* Module 3: All Generated AI Summaries from MongoDB summaries collection */
            <SummariesListPage
              onNavigateToModule={(tab) => {
                setTranscriptionInitialTab(tab);
                setActiveTab(tab);
              }}
            />
          ) : activeTab === 'pdf' ? (
            /* Module 1 & 2: PDF Document Upload & pdfplumber Extracted Text */
            <MeetingTranscriptionPage
              initialTab="pdf"
              initialMeetingId={transcriptionSelectedId}
            />
          ) : (
            /* Module 1 & 2: Audio/Video Upload & Whisper AI Transcription */
            <MeetingTranscriptionPage
              initialTab="audio"
              initialMeetingId={transcriptionSelectedId}
            />
          )
        ) : (
          /* Public Auth View (Login / Register) */
          <div className="w-full py-6 flex flex-col items-center justify-center">
            {/* View Switcher Tabs */}
            <div className="mb-6 p-1 rounded-2xl bg-slate-900/90 border border-slate-800 shadow-xl inline-flex items-center gap-1">
              <button
                onClick={() => setAuthView('login')}
                className={`px-5 py-2 rounded-xl text-xs font-bold transition-all ${
                  authView === 'login'
                    ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-lg shadow-indigo-600/30'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Sign In
              </button>
              <button
                onClick={() => setAuthView('register')}
                className={`px-5 py-2 rounded-xl text-xs font-bold transition-all ${
                  authView === 'register'
                    ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-lg shadow-indigo-600/30'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Register New User
              </button>
            </div>

            {/* Auth Cards */}
            {authView === 'login' ? (
              <LoginPage
                onSwitchToRegister={(email) => {
                  setInitialEmail(email);
                  setAuthView('register');
                }}
                initialEmail={initialEmail}
              />
            ) : (
              <RegisterPage
                onSwitchToLogin={(email) => {
                  setInitialEmail(email);
                  setAuthView('login');
                }}
              />
            )}

            {/* Feature Footnote Badge */}
            <div className="mt-8 flex flex-wrap items-center justify-center gap-6 text-[11px] text-slate-500">
              <div className="flex items-center gap-1.5">
                <Database className="w-3.5 h-3.5 text-indigo-400" />
                <span>MongoDB Storage</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Lock className="w-3.5 h-3.5 text-purple-400" />
                <span>Bcrypt Password Encryption</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Shield className="w-3.5 h-3.5 text-pink-400" />
                <span>JWT Secure Sessions</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Mic className="w-3.5 h-3.5 text-cyan-400" />
                <span>Whisper Speech-to-Text</span>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Profile & Account Modal */}
      <ProfileModal
        isOpen={profileModalOpen}
        onClose={() => setProfileModalOpen(false)}
        initialTab={profileTab}
      />

      {/* Footer */}
      <footer className="border-t border-slate-900 bg-slate-950/80 py-4 text-center text-xs text-slate-500">
        <p>
          MeetMind AI — Enterprise Meeting Intelligence & Speech-to-Text Platform &bull; Powered by OpenAI Whisper
        </p>
      </footer>
    </div>
  );
};

export default function App() {
  return (
    <AuthProvider>
      <MainContent />
    </AuthProvider>
  );
}
