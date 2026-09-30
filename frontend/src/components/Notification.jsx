import React from 'react';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export const Notification = () => {
  const { toast, closeToast } = useAuth();

  if (!toast) return null;

  const icons = {
    success: <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />,
    error: <AlertCircle className="w-5 h-5 text-rose-400 shrink-0" />,
    info: <Info className="w-5 h-5 text-indigo-400 shrink-0" />,
  };

  const borderStyles = {
    success: 'border-emerald-500/30 bg-emerald-950/40 text-emerald-200',
    error: 'border-rose-500/30 bg-rose-950/40 text-rose-200',
    info: 'border-indigo-500/30 bg-indigo-950/40 text-indigo-200',
  };

  return (
    <div className="fixed top-5 right-5 z-50 animate-fade-in max-w-md w-full px-4 sm:px-0">
      <div
        className={`flex items-start gap-3 p-4 rounded-xl border backdrop-blur-md shadow-2xl transition-all ${
          borderStyles[toast.type] || borderStyles.info
        }`}
      >
        {icons[toast.type] || icons.info}
        <div className="flex-1 text-sm font-medium pt-0.5 leading-snug">
          {toast.message}
        </div>
        <button
          onClick={closeToast}
          className="text-slate-400 hover:text-white transition-colors p-1 rounded-lg hover:bg-white/10"
          aria-label="Close notification"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
