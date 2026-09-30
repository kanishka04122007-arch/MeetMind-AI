import React, { useState } from 'react';
import { User, Mail, Sparkles, ArrowRight, ShieldCheck, CheckCircle2, Loader2, AlertCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { PasswordInput } from '../components/PasswordInput';

export const RegisterPage = ({ onSwitchToLogin }) => {
  const { register } = useAuth();

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirm_password: '',
  });

  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [apiError, setApiError] = useState('');
  const [successInfo, setSuccessInfo] = useState(null);

  const validate = () => {
    const errs = {};
    if (!formData.name.trim()) {
      errs.name = 'Full Name is required.';
    } else if (formData.name.trim().length < 2) {
      errs.name = 'Full Name must be at least 2 characters.';
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!formData.email.trim()) {
      errs.email = 'Email address is required.';
    } else if (!emailRegex.test(formData.email.trim())) {
      errs.email = 'Please provide a valid email address.';
    }

    if (!formData.password) {
      errs.password = 'Password is required.';
    } else if (formData.password.length < 6) {
      errs.password = 'Password must be at least 6 characters.';
    }

    if (!formData.confirm_password) {
      errs.confirm_password = 'Confirm Password is required.';
    } else if (formData.password !== formData.confirm_password) {
      errs.confirm_password = 'Passwords do not match.';
    }

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    // Clear field-specific error as user types
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: '' }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setApiError('');
    setSuccessInfo(null);

    if (!validate()) return;

    setLoading(true);
    try {
      const response = await register(
        formData.name.trim(),
        formData.email.trim(),
        formData.password,
        formData.confirm_password
      );
      setSuccessInfo(response.message || 'Account Created Successfully');
      // Transition to login after brief display
      setTimeout(() => {
        onSwitchToLogin(formData.email);
      }, 1600);
    } catch (err) {
      const detail = err.response?.data?.detail;
      if (Array.isArray(detail)) {
        setApiError(detail[0]?.msg || 'Validation failed.');
      } else {
        setApiError(detail || 'Registration failed. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleFillExample = () => {
    setFormData({
      name: 'Kanishka R',
      email: 'kanishka@gmail.com',
      password: 'Password@123',
      confirm_password: 'Password@123',
    });
    setErrors({});
  };

  return (
    <div className="w-full max-w-md mx-auto animate-fade-in">
      <div className="glass-panel rounded-3xl p-8 shadow-2xl relative overflow-hidden border border-slate-800">
        {/* Glow ambient background effect */}
        <div className="absolute -top-24 -left-24 w-48 h-48 bg-indigo-500/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -right-24 w-48 h-48 bg-purple-500/20 rounded-full blur-3xl pointer-events-none" />

        {/* Top Header */}
        <div className="text-center mb-6 relative">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-xs font-semibold mb-3">
            <Sparkles className="w-3.5 h-3.5" />
            <span>MeetMind AI Registration</span>
          </div>
          <h1 className="text-2xl font-extrabold text-white tracking-tight m-0">
            Create an Account
          </h1>
          <p className="text-xs text-slate-400 mt-1.5">
            Join MeetMind AI to securely upload audio & access summaries
          </p>
        </div>

        {/* Success Alert */}
        {successInfo && (
          <div className="mb-5 p-4 rounded-2xl bg-emerald-950/60 border border-emerald-500/40 text-emerald-200 text-xs flex items-start gap-3 animate-fade-in">
            <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold text-sm text-emerald-300">{successInfo}</p>
              <p className="text-[11px] text-emerald-400/90 mt-0.5">
                Redirecting you to the login screen...
              </p>
            </div>
          </div>
        )}

        {/* API Error Alert */}
        {apiError && (
          <div className="mb-5 p-4 rounded-2xl bg-rose-950/60 border border-rose-500/40 text-rose-200 text-xs flex items-start gap-3 animate-fade-in">
            <AlertCircle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold text-sm text-rose-300">Registration Error</p>
              <p className="text-[11px] text-rose-300/90 mt-0.5">{apiError}</p>
            </div>
          </div>
        )}

        {/* Registration Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Full Name */}
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300">
              Full Name <span className="text-rose-400">*</span>
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                <User className="w-4 h-4" />
              </div>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                placeholder="e.g. Kanishka R"
                className={`w-full pl-10 pr-4 py-2.5 bg-slate-900/70 border rounded-xl text-slate-100 placeholder-slate-500 text-sm focus:outline-none transition-all ${
                  errors.name
                    ? 'border-rose-500/60 focus:ring-2 focus:ring-rose-500/30'
                    : 'border-slate-700/70 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20'
                }`}
              />
            </div>
            {errors.name && <p className="text-xs text-rose-400 font-medium">{errors.name}</p>}
          </div>

          {/* Email Address */}
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
                value={formData.email}
                onChange={handleChange}
                placeholder="e.g. kanishka@gmail.com"
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
            id="reg-password"
            name="password"
            label="Password"
            value={formData.password}
            onChange={handleChange}
            placeholder="At least 6 characters"
            showStrength={true}
            error={errors.password}
            required
          />

          {/* Confirm Password */}
          <PasswordInput
            id="reg-confirm-password"
            name="confirm_password"
            label="Confirm Password"
            value={formData.confirm_password}
            onChange={handleChange}
            placeholder="Re-enter password"
            error={errors.confirm_password}
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
                <span>Encrypting & Storing in MongoDB...</span>
              </>
            ) : (
              <>
                <span>Register Account</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        {/* Quick Example Button */}
        <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between">
          <button
            type="button"
            onClick={handleFillExample}
            className="text-[11px] text-indigo-400 hover:text-indigo-300 font-medium transition-colors"
          >
            Use Example (Kanishka R)
          </button>
          <div className="flex items-center gap-1 text-[11px] text-slate-500">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span>MongoDB Encrypted</span>
          </div>
        </div>

        {/* Switch to Login */}
        <div className="mt-4 text-center">
          <p className="text-xs text-slate-400">
            Already have an account?{' '}
            <button
              onClick={() => onSwitchToLogin(formData.email)}
              className="text-indigo-400 hover:text-indigo-300 font-bold transition-colors underline-offset-2 hover:underline"
            >
              Sign In here
            </button>
          </p>
        </div>
      </div>
    </div>
  );
};
