import React, { useState } from 'react';
import { Mail, ArrowRight, ShieldCheck, CheckCircle2, Loader2, AlertCircle, LogIn, Lock } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { PasswordInput } from '../components/PasswordInput';

export const LoginPage = ({ onSwitchToRegister, initialEmail = '' }) => {
  const { login } = useAuth();

  const [email, setEmail] = useState(initialEmail || '');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [apiError, setApiError] = useState('');
  const [loginSuccess, setLoginSuccess] = useState(null);

  const validate = () => {
    const errs = {};
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email.trim()) {
      errs.email = 'Email address is required.';
    } else if (!emailRegex.test(email.trim())) {
      errs.email = 'Please enter a valid email address.';
    }

    if (!password) {
      errs.password = 'Password is required.';
    }

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setApiError('');
    setLoginSuccess(null);

    if (!validate()) return;

    setLoading(true);
    try {
      const data = await login(email.trim(), password);
      setLoginSuccess(data.welcome_message || 'Welcome to MeetMind AI Dashboard');
    } catch (err) {
      const detail = err.response?.data?.detail;
      if (Array.isArray(detail)) {
        setApiError(detail[0]?.msg || 'Validation failed.');
      } else {
        setApiError(detail || 'Invalid email or password. Please verify your credentials.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleFillDemo = () => {
    setEmail('kanishka@gmail.com');
    setPassword('Password@123');
    setErrors({});
  };

  return (
    <div className="w-full max-w-md mx-auto animate-fade-in">
      <div className="glass-panel rounded-3xl p-8 shadow-2xl relative overflow-hidden border border-slate-800">
        {/* Ambient Glow */}
        <div className="absolute -top-24 -right-24 w-48 h-48 bg-indigo-500/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -left-24 w-48 h-48 bg-purple-500/20 rounded-full blur-3xl pointer-events-none" />

        {/* Header */}
        <div className="text-center mb-6 relative">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-purple-500/10 border border-purple-500/20 text-purple-400 text-xs font-semibold mb-3">
            <LogIn className="w-3.5 h-3.5" />
            <span>Secure Authentication</span>
          </div>
          <h1 className="text-2xl font-extrabold text-white tracking-tight m-0">
            Welcome Back
          </h1>
          <p className="text-xs text-slate-400 mt-1.5">
            Log in to access your meeting transcripts, summaries & insights
          </p>
        </div>

        {/* Success Alert */}
        {loginSuccess && (
          <div className="mb-5 p-4 rounded-2xl bg-emerald-950/60 border border-emerald-500/40 text-emerald-200 text-xs flex items-start gap-3 animate-fade-in">
            <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold text-sm text-emerald-300">Login Successful</p>
              <p className="text-[11px] text-emerald-400/90 mt-0.5">{loginSuccess}</p>
            </div>
          </div>
        )}

        {/* API Error Alert */}
        {apiError && (
          <div className="mb-5 p-4 rounded-2xl bg-rose-950/60 border border-rose-500/40 text-rose-200 text-xs flex items-start gap-3 animate-fade-in">
            <AlertCircle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold text-sm text-rose-300">Authentication Failed</p>
              <p className="text-[11px] text-rose-300/90 mt-0.5">{apiError}</p>
            </div>
          </div>
        )}

        {/* Login Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Email */}
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300">
              Email Address <span className="text-rose-400">*</span>
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                <Mail className="w-4 h-4" />
              </div>
              <input
                type="email"
                name="email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (errors.email) setErrors((prev) => ({ ...prev, email: '' }));
                }}
                placeholder="kanishka@gmail.com"
                className={`w-full pl-10 pr-4 py-2.5 bg-slate-900/70 border rounded-xl text-slate-100 placeholder-slate-500 text-sm focus:outline-none transition-all ${
                  errors.email
                    ? 'border-rose-500/60 focus:ring-2 focus:ring-rose-500/30'
                    : 'border-slate-700/70 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20'
                }`}
              />
            </div>
            {errors.email && <p className="text-xs text-rose-400 font-medium">{errors.email}</p>}
          </div>

          {/* Password */}
          <PasswordInput
            id="login-password"
            name="password"
            label="Password"
            value={password}
            onChange={(e) => {
              setPassword(e.target.value);
              if (errors.password) setErrors((prev) => ({ ...prev, password: '' }));
            }}
            placeholder="Enter your password"
            error={errors.password}
            required
          />

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full mt-2 glow-btn text-white font-bold py-3 px-4 rounded-xl text-sm flex items-center justify-center gap-2 cursor-pointer shadow-lg disabled:opacity-50"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Verifying Credentials & Generating JWT...</span>
              </>
            ) : (
              <>
                <span>Sign In to Dashboard</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        {/* Quick Demo credentials */}
        <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between">
          <button
            type="button"
            onClick={handleFillDemo}
            className="text-[11px] text-indigo-400 hover:text-indigo-300 font-medium transition-colors"
          >
            Fill Demo (kanishka@gmail.com)
          </button>
          <div className="flex items-center gap-1 text-[11px] text-slate-500">
            <ShieldCheck className="w-3.5 h-3.5 text-indigo-400" />
            <span>JWT Session Auth</span>
          </div>
        </div>

        {/* Switch to Register */}
        <div className="mt-4 text-center">
          <p className="text-xs text-slate-400">
            Don't have an account yet?{' '}
            <button
              onClick={() => onSwitchToRegister(email)}
              className="text-indigo-400 hover:text-indigo-300 font-bold transition-colors underline-offset-2 hover:underline"
            >
              Create Account
            </button>
          </p>
        </div>
      </div>
    </div>
  );
};
