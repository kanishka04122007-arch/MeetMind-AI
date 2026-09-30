import React, { useState } from 'react';
import { Eye, EyeOff, Lock } from 'lucide-react';

export const PasswordInput = ({
  id,
  name,
  value,
  onChange,
  placeholder = '••••••••',
  label = 'Password',
  required = true,
  showStrength = false,
  error = '',
  className = '',
}) => {
  const [showPassword, setShowPassword] = useState(false);

  // Calculate password strength (0-4 score)
  const getStrength = (pwd) => {
    if (!pwd) return { score: 0, label: '', color: 'bg-slate-700' };
    let score = 0;
    if (pwd.length >= 8) score++;
    if (/[A-Z]/.test(pwd)) score++;
    if (/[0-9]/.test(pwd)) score++;
    if (/[^A-Za-z0-9]/.test(pwd)) score++;

    switch (score) {
      case 1:
        return { score: 25, label: 'Weak', color: 'bg-rose-500', text: 'text-rose-400' };
      case 2:
        return { score: 50, label: 'Fair', color: 'bg-amber-500', text: 'text-amber-400' };
      case 3:
        return { score: 75, label: 'Good', color: 'bg-blue-500', text: 'text-blue-400' };
      case 4:
        return { score: 100, label: 'Strong', color: 'bg-emerald-500', text: 'text-emerald-400' };
      default:
        return { score: 15, label: 'Very Weak', color: 'bg-rose-600', text: 'text-rose-500' };
    }
  };

  const strength = showStrength ? getStrength(value) : null;

  return (
    <div className={`space-y-1.5 ${className}`}>
      {label && (
        <label htmlFor={id} className="block text-xs font-semibold uppercase tracking-wider text-slate-300">
          {label} {required && <span className="text-rose-400">*</span>}
        </label>
      )}

      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
          <Lock className="w-4 h-4" />
        </div>

        <input
          id={id}
          name={name}
          type={showPassword ? 'text' : 'password'}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          required={required}
          className={`w-full pl-10 pr-11 py-2.5 bg-slate-900/70 border rounded-xl text-slate-100 placeholder-slate-500 focus:outline-none transition-all duration-200 text-sm ${
            error
              ? 'border-rose-500/60 focus:ring-2 focus:ring-rose-500/30'
              : 'border-slate-700/70 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20'
          }`}
        />

        <button
          type="button"
          onClick={() => setShowPassword(!showPassword)}
          className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-200 transition-colors focus:outline-none"
          tabIndex={-1}
          aria-label={showPassword ? 'Hide password' : 'Show password'}
        >
          {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
        </button>
      </div>

      {error && <p className="text-xs text-rose-400 font-medium">{error}</p>}

      {showStrength && value && (
        <div className="pt-1.5 space-y-1">
          <div className="flex justify-between items-center text-[11px]">
            <span className="text-slate-400">Security Strength:</span>
            <span className={`font-semibold ${strength.text}`}>{strength.label}</span>
          </div>
          <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
            <div
              className={`h-full transition-all duration-300 ${strength.color}`}
              style={{ width: `${strength.score}%` }}
            />
          </div>
        </div>
      )}
    </div>
  );
};
