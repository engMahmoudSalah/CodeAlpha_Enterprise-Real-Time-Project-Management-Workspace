import React, { useState, useEffect } from 'react';
import { ProjectInvitation, User } from '../types';
import { useAuth } from '../context/AuthContext';
import {
  X,
  Mail,
  Check,
  Clock,
  Shield,
  FolderPlus,
  KeyRound,
  ArrowRight,
  Sparkles,
  AlertCircle,
  Copy,
  CheckCheck,
} from 'lucide-react';
import {
  acceptInvitationInFirestore,
  declineInvitationInFirestore,
  getInvitationByTokenInFirestore,
} from '../services/firestoreService';
import { soundManager } from '../utils/soundEffects';

interface PendingInvitationsModalProps {
  isOpen: boolean;
  onClose: () => void;
  invitations?: ProjectInvitation[];
  currentUser?: User;
  initialToken?: string | null;
  onInvitationAccepted?: (projectId: string) => void;
  onSelectProject?: (projectId: string) => void;
}

export const PendingInvitationsModal: React.FC<PendingInvitationsModalProps> = ({
  isOpen,
  onClose,
  invitations = [],
  currentUser: propCurrentUser,
  initialToken,
  onInvitationAccepted,
  onSelectProject,
}) => {
  const { currentUser: authCurrentUser } = useAuth();
  const currentUser = propCurrentUser || authCurrentUser;

  const [activeTab, setActiveTab] = useState<'pending' | 'code'>('pending');
  const [tokenInput, setTokenInput] = useState('');
  const [previewInvitation, setPreviewInvitation] = useState<ProjectInvitation | null>(null);
  const [isVerifyingToken, setIsVerifyingToken] = useState(false);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // If initialToken is provided, switch to code tab and preview it immediately
  useEffect(() => {
    if (initialToken && isOpen) {
      setActiveTab('code');
      setTokenInput(initialToken);
      fetchTokenPreview(initialToken);
    }
  }, [initialToken, isOpen]);

  if (!isOpen) return null;

  const fetchTokenPreview = async (rawToken: string) => {
    let token = rawToken.trim();
    if (token.includes('invite=')) {
      try {
        const url = new URL(token);
        token = url.searchParams.get('invite') || token;
      } catch {
        const parts = token.split('invite=');
        if (parts[1]) token = parts[1].split('&')[0];
      }
    }
    if (!token) return;

    setIsVerifyingToken(true);
    setErrorMessage(null);
    try {
      const inv = await getInvitationByTokenInFirestore(token);
      if (inv) {
        setPreviewInvitation(inv);
      } else {
        setPreviewInvitation(null);
        setErrorMessage('Invite code is invalid or expired');
      }
    } catch (err: any) {
      setErrorMessage(err?.message || 'Could not verify invite code');
    } finally {
      setIsVerifyingToken(false);
    }
  };

  const handleAccept = async (invitation: ProjectInvitation) => {
    if (!invitation?.id || !currentUser) return;
    setProcessingId(invitation.id);
    setErrorMessage(null);
    try {
      await acceptInvitationInFirestore(invitation, currentUser);
      soundManager.playSuccessPop();
      setSuccessMessage(`Successfully joined project "${invitation.projectName}"!`);
      if (onInvitationAccepted) {
        onInvitationAccepted(invitation.projectId);
      }
      if (onSelectProject) {
        onSelectProject(invitation.projectId);
      }
      setTimeout(() => {
        setSuccessMessage(null);
        if (invitations.length <= 1) {
          onClose();
        }
      }, 1200);
    } catch (err: any) {
      console.error('Accept invitation error:', err);
      setErrorMessage(err.message || 'Failed to accept invitation');
    } finally {
      setProcessingId(null);
    }
  };

  const handleDecline = async (invitation: ProjectInvitation) => {
    if (!invitation?.id || !currentUser) return;
    if (!confirm(`Are you sure you want to decline the invitation to project "${invitation.projectName}"?`)) return;
    setProcessingId(invitation.id);
    setErrorMessage(null);
    try {
      await declineInvitationInFirestore(invitation.id, invitation, currentUser);
    } catch (err: any) {
      console.error('Decline invitation error:', err);
      setErrorMessage(err.message || 'Failed to decline invitation');
    } finally {
      setProcessingId(null);
    }
  };

  const handleJoinWithCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tokenInput.trim() || !currentUser) return;

    if (previewInvitation) {
      await handleAccept(previewInvitation);
      return;
    }

    let token = tokenInput.trim();
    if (token.includes('invite=')) {
      try {
        const url = new URL(token);
        token = url.searchParams.get('invite') || token;
      } catch {
        const parts = token.split('invite=');
        if (parts[1]) token = parts[1].split('&')[0];
      }
    }

    setIsVerifyingToken(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const inv = await getInvitationByTokenInFirestore(token);
      if (!inv) {
        setErrorMessage('Invite code is invalid or has already been used.');
        return;
      }

      await acceptInvitationInFirestore(inv, currentUser);
      soundManager.playSuccessPop();
      setSuccessMessage(`Successfully joined project "${inv.projectName}"!`);
      setTokenInput('');
      setPreviewInvitation(null);
      if (onInvitationAccepted) {
        onInvitationAccepted(inv.projectId);
      }
      if (onSelectProject) {
        onSelectProject(inv.projectId);
      }
      setTimeout(() => {
        setSuccessMessage(null);
        onClose();
      }, 1200);
    } catch (err: any) {
      console.error('Token redemption error:', err);
      setErrorMessage(err.message || 'Failed to activate invite code');
    } finally {
      setIsVerifyingToken(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-900/60 backdrop-blur-xs p-4 select-none">
      <div
        id="pending-invitations-modal"
        className="bg-white rounded-sm border border-zinc-200 w-full max-w-md max-h-[85vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150 shadow-sm"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-100 bg-zinc-50/80 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-sm bg-blue-600 text-white flex items-center justify-center shadow-xs">
              <Mail className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-zinc-900">Project Invitations</h2>
              <p className="text-xs text-zinc-500 font-medium truncate max-w-[240px]">
                {currentUser?.email || 'Your account'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-sm text-zinc-400 hover:text-zinc-600 hover:bg-zinc-100 cursor-pointer transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Selection */}
        <div className="flex items-center gap-2 px-6 pt-3 border-b border-zinc-100 bg-white shrink-0">
          <button
            onClick={() => setActiveTab('pending')}
            className={`pb-3 px-2 text-xs font-bold border-b-2 transition-all flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'pending'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-zinc-500 hover:text-zinc-700'
            }`}
          >
            <Mail className="w-3.5 h-3.5" />
            <span>Direct Invitations ({invitations.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('code')}
            className={`pb-3 px-2 text-xs font-bold border-b-2 transition-all flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'code'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-zinc-500 hover:text-zinc-700'
            }`}
          >
            <KeyRound className="w-3.5 h-3.5" />
            <span>Join via Code or Link</span>
          </button>
        </div>

        {/* Feedback Messages */}
        {successMessage && (
          <div className="mx-6 mt-4 p-3 rounded-sm bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2 animate-in fade-in">
            <Check className="w-4 h-4 text-emerald-600 shrink-0" />
            <span className="font-bold">{successMessage}</span>
          </div>
        )}

        {errorMessage && (
          <div className="mx-6 mt-4 p-3 rounded-sm bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2 animate-in fade-in">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span className="font-semibold">{errorMessage}</span>
          </div>
        )}

        {/* Body Content */}
        <div className="p-6 overflow-y-auto flex-1 space-y-3 sleek-scrollbar">
          {activeTab === 'pending' ? (
            invitations.length === 0 ? (
              <div className="text-center py-10">
                <div className="w-12 h-12 rounded-sm bg-zinc-100 flex items-center justify-center mx-auto mb-3 text-zinc-400">
                  <Clock className="w-6 h-6" />
                </div>
                <p className="text-sm font-bold text-zinc-800">No pending invitations</p>
                <p className="text-xs text-zinc-400 mt-1 max-w-xs mx-auto">
                  When a colleague invites you to join their project, it will appear here instantly.
                </p>
              </div>
            ) : (
              invitations.map((inv) => (
                <div
                  key={inv.id}
                  className="p-4 rounded-sm border border-zinc-200 bg-white hover:border-blue-200 transition-all shadow-2xs space-y-3"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2.5">
                      <div
                        className="w-8 h-8 rounded-sm flex items-center justify-center text-white text-xs font-bold shrink-0 shadow-xs"
                        style={{ backgroundColor: inv.projectColor || '#6366f1' }}
                      >
                        <FolderPlus className="w-4 h-4" />
                      </div>
                      <div>
                        <h4 className="text-xs font-bold text-zinc-900">{inv.projectName}</h4>
                        <p className="text-[11px] text-zinc-500 font-medium">
                          Invitation from <span className="font-bold text-zinc-700">{inv.inviterName}</span>
                        </p>
                      </div>
                    </div>

                    <span className="text-[10px] bg-blue-50 text-blue-700 border border-blue-200/80 px-2 py-0.5 rounded-full font-bold uppercase tracking-wider">
                      {inv.role}
                    </span>
                  </div>

                  {inv.note && (
                    <p className="text-xs text-zinc-600 bg-zinc-50 p-2.5 rounded-sm italic border border-zinc-100">
                      "{inv.note}"
                    </p>
                  )}

                  <div className="flex items-center justify-between pt-2 border-t border-zinc-100">
                    <span className="text-[10px] text-zinc-400 font-medium">
                      Invitation Date: {new Date(inv.createdAt).toLocaleDateString()}
                    </span>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleDecline(inv)}
                        disabled={processingId === inv.id}
                        className="px-3 py-1.5 text-xs font-semibold text-zinc-600 hover:text-rose-600 hover:bg-rose-50 rounded-sm transition-colors cursor-pointer"
                      >
                        Decline
                      </button>
                      <button
                        onClick={() => handleAccept(inv)}
                        disabled={processingId === inv.id}
                        className="px-3.5 py-1.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-sm shadow-xs transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                      >
                        <Check className="w-3.5 h-3.5" />
                        <span>{processingId === inv.id ? 'Joining...' : 'Accept and Join'}</span>
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )
          ) : (
            /* Join with Code Tab */
            <div className="space-y-4 py-1">
              <form onSubmit={handleJoinWithCode} className="space-y-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-zinc-700 block">
                    Invite Code or Link
                  </label>
                  <p className="text-xs text-zinc-400">
                    Paste the 8-character invite code or the full URL sent by the project owner.
                  </p>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={tokenInput}
                      onChange={(e) => {
                        setTokenInput(e.target.value);
                        if (e.target.value.trim().length >= 6) {
                          fetchTokenPreview(e.target.value);
                        } else {
                          setPreviewInvitation(null);
                        }
                      }}
                      placeholder="Example: 8K9F2A1B or https://.../?invite=..."
                      className="flex-1 bg-zinc-50 focus:bg-white border border-zinc-200 rounded-sm px-3.5 py-2.5 text-xs font-mono text-zinc-900 focus:outline-hidden focus:border-blue-500 focus:ring-2 focus:ring-blue-50 transition-all placeholder:text-zinc-400"
                    />
                    <button
                      type="button"
                      onClick={() => fetchTokenPreview(tokenInput)}
                      disabled={isVerifyingToken || !tokenInput.trim()}
                      className="px-3.5 py-2.5 bg-zinc-100 hover:bg-zinc-200 text-zinc-700 rounded-sm text-xs font-bold transition-all cursor-pointer disabled:opacity-50"
                    >
                      {isVerifyingToken ? 'Verifying...' : 'Verify Code'}
                    </button>
                  </div>
                </div>

                {/* Preview Box when found */}
                {previewInvitation && (
                  <div className="p-3.5 rounded-sm border border-blue-200 bg-blue-50/50 space-y-2 animate-in fade-in duration-150">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div
                          className="w-6 h-6 rounded-sm text-white flex items-center justify-center text-xs font-bold"
                          style={{ backgroundColor: previewInvitation.projectColor || '#6366f1' }}
                        >
                          <FolderPlus className="w-3.5 h-3.5" />
                        </div>
                        <span className="text-xs font-bold text-zinc-900">
                          {previewInvitation.projectName}
                        </span>
                      </div>
                      <span className="text-[10px] bg-blue-100 text-blue-700 px-2 py-0.5 rounded-sm font-bold uppercase">
                        {previewInvitation.role}
                      </span>
                    </div>
                    <p className="text-[11px] text-zinc-600">
                      Inviter: <strong>{previewInvitation.inviterName}</strong> ({previewInvitation.inviterEmail})
                    </p>
                    {previewInvitation.note && (
                      <p className="text-[11px] text-zinc-500 italic bg-white/70 p-2 rounded-sm border border-blue-100">
                        "{previewInvitation.note}"
                      </p>
                    )}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={isVerifyingToken || !tokenInput.trim()}
                  className="w-full py-2.5 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-sm text-xs font-bold shadow-xs transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {isVerifyingToken ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Verifying and joining...</span>
                    </>
                  ) : (
                    <>
                      <span>Confirm Code and Join Project</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </>
                  )}
                </button>
              </form>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end px-6 py-3.5 border-t border-zinc-100 bg-zinc-50/80 shrink-0">
          <button
            onClick={onClose}
            className="px-4 py-1.5 text-xs font-bold bg-zinc-900 text-white hover:bg-zinc-800 rounded-sm cursor-pointer transition-colors shadow-2xs"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
