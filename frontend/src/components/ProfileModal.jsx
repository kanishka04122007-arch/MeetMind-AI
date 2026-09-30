import React, { useState, useEffect } from 'react';
import { X, User, Mail, Calendar, Shield, KeyRound, Save, Check, Loader2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { PasswordInput } from './PasswordInput';

export const ProfileModal = ({ isOpen, onClose, initialTab = 'view' }) => {
  const { user, updateProfile, changePassword } = useAuth();
  const [activeTab, setActiveTab] = useState(initialTab);

  // Edit Profile Form State
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [role, setRole] = useState('Member');
  const [editLoading, setEditLoading] = useState(false);
  const [editError, setEditError] = useState('');

  // Change Password Form State
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [pwdLoading, setPwdLoading] = useState(false);
  const [pwdError, setPwdError] = useState('');

  useEffect(() => {
    setActiveTab(initialTab);
  }, [initialTab]);

  useEffect(() => {
    if (user) {
      setName(user.name || '');
      setPhone(user.phone || '');
      setRole(user.role || 'Member');
    }
  }, [user, isOpen]);

  if (!isOpen || !user) return null;

  // Handle Edit Profile Submission
  const handleProfileSubmit = async (e) => {
    e.preventDefault();
    setEditError('');
    if (name.trim().length < 2) {
      setEditError('Full Name must be at least 2 characters.');
      return;
    }

    setEditLoading(true);
    try {
      await updateProfile({
        name: name.trim(),
        phone: phone.trim() || null,
        role: role.trim() || 'Member',
      });
      setActiveTab('view');
    } catch (err) {
      const msg = err.response?.data?.detail || 'Failed to update profile. Please try again.';
      setEditError(msg);
    } finally {
      setEditLoading(false);
    }
  };

  // Handle Change Password Submission
  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    setPwdError('');

    if (newPassword.length < 6) {
      setPwdError('New password must be at least 6 characters long.');
      return;
    }
    if (newPassword !== confirmNewPassword) {
      setPwdError('New password and confirm password do not match.');
      return;
    }
    if (currentPassword === newPassword) {
      setPwdError('New password cannot be the same as your current password.');
      return;
    }

    setPwdLoading(true);
    try {
      await changePassword({
        current_password: currentPassword,
        new_password: newPassword,
        confirm_new_password: confirmNewPassword,
      });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmNewPassword('');
      setActiveTab('view');
    } catch (err) {
      const msg = err.response?.data?.detail || 'Failed to change password. Please check your current password.';
      setPwdError(msg);
    } finally {
      setPwdLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md animate-fade-in">
      <div className="relative w-full max-w-lg rounded-2xl bg-slate-900 border border-slate-800 shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/50">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
              <User className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">User Profile & Account</h2>
              <p className="text-xs text-slate-400">Manage your MeetMind AI account details</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-slate-800 px-6 bg-slate-950/20">
          <button
            onClick={() => setActiveTab('view')}
            className={`py-3 px-4 text-xs font-semibold border-b-2 transition-all ${
              activeTab === 'view'
                ? 'border-indigo-500 text-indigo-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            Overview
          </button>
          <button
            onClick={() => setActiveTab('edit')}
            className={`py-3 px-4 text-xs font-semibold border-b-2 transition-all ${
              activeTab === 'edit'
                ? 'border-indigo-500 text-indigo-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            Edit Profile
          </button>
          <button
            onClick={() => setActiveTab('password')}
            className={`py-3 px-4 text-xs font-semibold border-b-2 transition-all ${
              activeTab === 'password'
                ? 'border-indigo-500 text-indigo-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            Change Password
          </button>
        </div>

        {/* Tab Content */}
        <div className="p-6">
          {/* TAB 1: OVERVIEW */}
          {activeTab === 'view' && (
            <div className="space-y-6">
              <div className="flex items-center gap-4 p-4 rounded-xl bg-slate-950/60 border border-slate-800">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-indigo-500 via-purple-500 to-pink-500 flex items-center justify-center text-white text-xl font-bold shadow-lg">
                  {user.name ? user.name[0].toUpperCase() : 'U'}
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white">{user.name}</h3>
                  <p className="text-xs text-indigo-400 font-medium">{user.role || 'Active Member'}</p>
                  <p className="text-xs text-slate-400 mt-0.5">MeetMind AI Registered Account</p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div className="p-3.5 rounded-xl bg-slate-800/40 border border-slate-800/80">
                  <div className="flex items-center gap-2 text-slate-400 mb-1">
                    <User className="w-3.5 h-3.5 text-indigo-400" />
                    <span className="font-semibold uppercase tracking-wider text-[10px]">Full Name</span>
                  </div>
                  <p className="text-slate-200 font-medium text-sm">{user.name}</p>
                </div>

                <div className="p-3.5 rounded-xl bg-slate-800/40 border border-slate-800/80">
                  <div className="flex items-center gap-2 text-slate-400 mb-1">
                    <Mail className="w-3.5 h-3.5 text-indigo-400" />
                    <span className="font-semibold uppercase tracking-wider text-[10px]">Email Address</span>
                  </div>
                  <p className="text-slate-200 font-medium text-sm truncate">{user.email}</p>
                </div>

                <div className="p-3.5 rounded-xl bg-slate-800/40 border border-slate-800/80">
                  <div className="flex items-center gap-2 text-slate-400 mb-1">
                    <Calendar className="w-3.5 h-3.5 text-indigo-400" />
                    <span className="font-semibold uppercase tracking-wider text-[10px]">Member Since</span>
                  </div>
                  <p className="text-slate-200 font-medium text-sm">{user.createdAt || '2026-09-27'}</p>
                </div>

                <div className="p-3.5 rounded-xl bg-slate-800/40 border border-slate-800/80">
                  <div className="flex items-center gap-2 text-slate-400 mb-1">
                    <Shield className="w-3.5 h-3.5 text-emerald-400" />
                    <span className="font-semibold uppercase tracking-wider text-[10px]">Security</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-emerald-400 font-medium text-xs mt-0.5">
                    <Check className="w-3.5 h-3.5" />
                    <span>JWT & Bcrypt Protected</span>
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setActiveTab('edit')}
                  className="px-4 py-2 text-xs font-semibold rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white transition-colors"
                >
                  Edit Profile Details
                </button>
              </div>
            </div>
          )}

          {/* TAB 2: EDIT PROFILE */}
          {activeTab === 'edit' && (
            <form onSubmit={handleProfileSubmit} className="space-y-4">
              {editError && (
                <div className="p-3 rounded-xl bg-rose-950/40 border border-rose-500/30 text-rose-300 text-xs">
                  {editError}
                </div>
              )}

              <div className="space-y-1.5">
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300">
                  Full Name <span className="text-rose-400">*</span>
                </label>
                <div className="relative">
                  <User className="absolute left-3.5 top-3 w-4 h-4 text-slate-400 pointer-events-none" />
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Kanishka R"
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-950/70 border border-slate-700/80 rounded-xl text-white text-sm focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300">
                  Email Address
                </label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-3 w-4 h-4 text-slate-500 pointer-events-none" />
                  <input
                    type="email"
                    disabled
                    value={user.email}
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-950/40 border border-slate-800 rounded-xl text-slate-400 text-sm cursor-not-allowed"
                  />
                </div>
                <p className="text-[11px] text-slate-500">Email address is your unique system identifier and cannot be modified.</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300">
                    Phone (Optional)
                  </label>
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+91 98765 43210"
                    className="w-full px-3.5 py-2.5 bg-slate-950/70 border border-slate-700/80 rounded-xl text-white text-sm focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300">
                    Role / Title
                  </label>
                  <input
                    type="text"
                    value={role}
                    onChange={(e) => setRole(e.target.value)}
                    placeholder="Product Lead / Engineer"
                    className="w-full px-3.5 py-2.5 bg-slate-950/70 border border-slate-700/80 rounded-xl text-white text-sm focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setActiveTab('view')}
                  className="px-4 py-2 text-xs font-medium text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={editLoading}
                  className="flex items-center gap-2 px-5 py-2 text-xs font-semibold rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white transition-all shadow-md shadow-indigo-600/30 disabled:opacity-50"
                >
                  {editLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  Save Changes
                </button>
              </div>
            </form>
          )}

          {/* TAB 3: CHANGE PASSWORD */}
          {activeTab === 'password' && (
            <form onSubmit={handlePasswordSubmit} className="space-y-4">
              {pwdError && (
                <div className="p-3 rounded-xl bg-rose-950/40 border border-rose-500/30 text-rose-300 text-xs">
                  {pwdError}
                </div>
              )}

              <PasswordInput
                id="current-password"
                name="currentPassword"
                label="Current Password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="Enter current password"
                required
              />

              <PasswordInput
                id="new-password"
                name="newPassword"
                label="New Password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Min 6-8 chars, symbols/numbers"
                required
                showStrength={true}
              />

              <PasswordInput
                id="confirm-new-password"
                name="confirmNewPassword"
                label="Confirm New Password"
                value={confirmNewPassword}
                onChange={(e) => setConfirmNewPassword(e.target.value)}
                placeholder="Re-enter new password"
                required
              />

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setActiveTab('view')}
                  className="px-4 py-2 text-xs font-medium text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={pwdLoading}
                  className="flex items-center gap-2 px-5 py-2 text-xs font-semibold rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white transition-all shadow-md shadow-purple-600/30 disabled:opacity-50"
                >
                  {pwdLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <KeyRound className="w-4 h-4" />}
                  Update Password
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
