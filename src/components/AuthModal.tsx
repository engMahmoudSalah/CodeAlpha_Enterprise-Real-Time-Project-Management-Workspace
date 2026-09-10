import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { X, Mail, Lock, User as UserIcon, Briefcase, Shield, AlertCircle, Sparkles, Check } from 'lucide-react';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultTab?: 'signin' | 'signup';
}

export const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose, defaultTab = 'signin' }) => {
  const {
    signInWithEmail,
    signUpWithEmail,
    signInWithGoogle,
    signInGuest,
    authError,
    clearAuthError,
  } = useAuth();

  const [tab, setTab] = useState<'signin' | 'signup'>(defaultTab);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [title, setTitle] = useState('');
  const [role, setRole] = useState<'admin' | 'manager' | 'member'>('member');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleClose = () => {
    clearAuthError();
    setLocalError(null);
    onClose();
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) {
      setLocalError('Please enter both email and password.');
      return;
    }
    setLocalError(null);
    setIsSubmitting(true);
    try {
      await signInWithEmail(email.trim(), password);
      handleClose();
    } catch (err: any) {
      setLocalError(err.message || 'Authentication failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim() || !password.trim()) {
      setLocalError('Please fill in all required fields.');
      return;
    }
    if (password.length < 6) {
      setLocalError('Password must be at least 6 characters long.');
      return;
    }
    setLocalError(null);
    setIsSubmitting(true);
    try {
      await signUpWithEmail(
        email.trim(),
        password,
        name.trim(),
        title.trim() || 'Software Engineer',
        role
      );
      handleClose();
    } catch (err: any) {
      setLocalError(err.message || 'Registration failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGoogleAuth = async () => {
    setLocalError(null);
    setIsSubmitting(true);
    try {
      await signInWithGoogle();
      handleClose();
    } catch (err: any) {
      setLocalError(err.message || 'Google sign in failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGuestAuth = async () => {
    setLocalError(null);
    setIsSubmitting(true);
    try {
      await signInGuest();
      handleClose();
    } catch (err: any) {
      setLocalError(err.message || 'Guest sign in failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  const currentError = localError || authError;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-zinc-900/60 backdrop-blur-xs p-0 sm:p-4">
      <div
        id="firebase-auth-modal"
        className="bg-white rounded-t-2xl sm:rounded-sm border-t sm:border border-zinc-200 w-full max-w-md max-h-[92vh] sm:max-h-[90vh] flex flex-col overflow-hidden animate-in slide-in-from-bottom-6 sm:slide-in-from-bottom-0 sm:zoom-in-95 duration-200"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-zinc-100 bg-zinc-50/70 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-sm bg-blue-600 text-white font-extrabold flex items-center justify-center text-lg">
              V
            </div>
            <div>
              <h2 className="text-base font-bold text-zinc-900">
                {tab === 'signin' ? 'Sign in to Velocity' : 'Create an Account'}
              </h2>
              <p className="text-xs text-zinc-500">
                Cloud Firestore & Firebase Authentication
              </p>
            </div>
          </div>
          <button
            id="close-auth-modal-btn"
            onClick={handleClose}
            className="p-1.5 rounded-sm text-zinc-400 hover:text-zinc-600 hover:bg-zinc-100 transition-colors cursor-pointer"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Switcher */}
        <div className="flex border-b border-zinc-100 bg-zinc-50/40 px-6 pt-2">
          <button
            id="auth-tab-signin"
            onClick={() => {
              setTab('signin');
              setLocalError(null);
            }}
            className={`flex-1 py-2.5 text-xs font-bold transition-all border-b-2 cursor-pointer ${
              tab === 'signin'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-zinc-500 hover:text-zinc-800'
            }`}
          >
            Sign In
          </button>
          <button
            id="auth-tab-signup"
            onClick={() => {
              setTab('signup');
              setLocalError(null);
            }}
            className={`flex-1 py-2.5 text-xs font-bold transition-all border-b-2 cursor-pointer ${
              tab === 'signup'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-zinc-500 hover:text-zinc-800'
            }`}
          >
            Sign Up
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-4 overflow-y-auto flex-1 sleek-scrollbar">
          {/* Error Banner */}
          {currentError && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-sm flex items-start gap-2.5 text-rose-700 text-xs">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <div className="flex-1">{currentError}</div>
              <button
                onClick={() => {
                  setLocalError(null);
                  clearAuthError();
                }}
                className="text-rose-500 hover:text-rose-800"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* Quick OAuth & Guest options */}
          <div className="space-y-2">
            <button
              id="google-signin-btn"
              type="button"
              onClick={handleGoogleAuth}
              disabled={isSubmitting}
              className="w-full py-2.5 px-4 rounded-sm border border-zinc-200 hover:border-zinc-300 hover:bg-zinc-50 flex items-center justify-center gap-3 text-xs font-bold text-zinc-700 transition-all shadow-2xs cursor-pointer active:scale-98 disabled:opacity-50"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                />
              </svg>
              <span>Continue with Google</span>
            </button>

            <button
              id="guest-signin-btn"
              type="button"
              onClick={handleGuestAuth}
              disabled={isSubmitting}
              className="w-full py-2 px-4 rounded-sm bg-zinc-100 hover:bg-zinc-200/80 flex items-center justify-center gap-2 text-xs font-semibold text-zinc-600 transition-all cursor-pointer disabled:opacity-50"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
              <span>Instant Guest Mode (No password required)</span>
            </button>
          </div>

          <div className="relative flex py-1 items-center">
            <div className="flex-grow border-t border-zinc-200"></div>
            <span className="flex-shrink mx-3 text-[11px] font-semibold text-zinc-400 uppercase tracking-wider">
              Or with email
            </span>
            <div className="flex-grow border-t border-zinc-200"></div>
          </div>

          {tab === 'signin' ? (
            <form onSubmit={handleSignIn} className="space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-zinc-700 mb-1">Email Address</label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-zinc-400 absolute left-3 top-3" />
                  <input
                    id="signin-email-input"
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@example.com"
                    className="w-full pl-9 pr-3 py-2 text-xs border border-zinc-200 rounded-sm focus:outline-hidden focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-zinc-700 mb-1">Password</label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-zinc-400 absolute left-3 top-3" />
                  <input
                    id="signin-password-input"
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-9 pr-3 py-2 text-xs border border-zinc-200 rounded-sm focus:outline-hidden focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>

              <button
                id="submit-signin-btn"
                type="submit"
                disabled={isSubmitting}
                className="w-full py-2.5 bg-blue-600 text-white rounded-sm text-xs font-bold uppercase tracking-wider hover:bg-blue-700 shadow-sm shadow-blue-200 transition-all cursor-pointer active:scale-98 disabled:opacity-50 mt-2"
              >
                {isSubmitting ? 'Signing in...' : 'Sign In'}
              </button>
            </form>
          ) : (
            <form onSubmit={handleSignUp} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-zinc-700 mb-1">Full Name</label>
                <div className="relative">
                  <UserIcon className="w-4 h-4 text-zinc-400 absolute left-3 top-3" />
                  <input
                    id="signup-name-input"
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Jordan Lee"
                    className="w-full pl-9 pr-3 py-2 text-xs border border-zinc-200 rounded-sm focus:outline-hidden focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-zinc-700 mb-1">Email Address</label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-zinc-400 absolute left-3 top-3" />
                  <input
                    id="signup-email-input"
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="colleague@company.com"
                    className="w-full pl-9 pr-3 py-2 text-xs border border-zinc-200 rounded-sm focus:outline-hidden focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-zinc-700 mb-1">Password</label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-zinc-400 absolute left-3 top-3" />
                  <input
                    id="signup-password-input"
                    type="password"
                    required
                    minLength={6}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Min 6 characters"
                    className="w-full pl-9 pr-3 py-2 text-xs border border-zinc-200 rounded-sm focus:outline-hidden focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-zinc-700 mb-1">Job Title</label>
                <div className="relative">
                  <Briefcase className="w-4 h-4 text-zinc-400 absolute left-3 top-3" />
                  <input
                    id="signup-title-input"
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="e.g. Senior Frontend Architect"
                    className="w-full pl-9 pr-3 py-2 text-xs border border-zinc-200 rounded-sm focus:outline-hidden focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-zinc-700 mb-1">Role / Permissions</label>
                <div className="grid grid-cols-3 gap-2">
                  {(['admin', 'manager', 'member'] as const).map((r) => (
                    <button
                      key={r}
                      type="button"
                      onClick={() => setRole(r)}
                      className={`py-2 px-2 rounded-sm text-xs font-bold capitalize border transition-all cursor-pointer ${
                        role === r
                          ? 'border-blue-600 bg-blue-50 text-blue-700 shadow-2xs'
                          : 'border-zinc-200 text-zinc-600 hover:bg-zinc-50'
                      }`}
                    >
                      {r}
                    </button>
                  ))}
                </div>
              </div>

              <button
                id="submit-signup-btn"
                type="submit"
                disabled={isSubmitting}
                className="w-full py-2.5 bg-blue-600 text-white rounded-sm text-xs font-bold uppercase tracking-wider hover:bg-blue-700 shadow-sm shadow-blue-200 transition-all cursor-pointer active:scale-98 disabled:opacity-50 mt-3"
              >
                {isSubmitting ? 'Creating account...' : 'Create Account & Join'}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
