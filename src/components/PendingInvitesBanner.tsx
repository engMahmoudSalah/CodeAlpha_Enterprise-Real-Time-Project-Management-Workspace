import React from 'react';
import { ProjectInvitation, User } from '../types';
import { Mail, Check, X, ArrowRight, FolderPlus } from 'lucide-react';

interface PendingInvitesBannerProps {
  invitations?: ProjectInvitation[];
  currentUser?: User;
  onOpenInvitesModal: () => void;
  onAcceptInvite: (invitation: ProjectInvitation) => Promise<void>;
  onDeclineInvite: (invitation: ProjectInvitation) => Promise<void>;
}

export const PendingInvitesBanner: React.FC<PendingInvitesBannerProps> = ({
  invitations = [],
  currentUser,
  onOpenInvitesModal,
  onAcceptInvite,
  onDeclineInvite,
}) => {
  if (!invitations || invitations.length === 0 || !invitations[0]) return null;

  const first = invitations[0];
  const count = invitations.length;

  return (
    <div
      id="pending-invites-banner"
      className="bg-gradient-to-r from-indigo-900 via-indigo-800 to-zinc-900 text-white px-4 py-2.5 shadow-sm flex items-center justify-between flex-wrap gap-3 animate-in fade-in slide-in-from-top-2 duration-200"
    >
      <div className="flex items-center gap-3">
        <div className="w-7 h-7 rounded-sm bg-white/10 flex items-center justify-center shrink-0 border border-white/20">
          <Mail className="w-4 h-4 text-blue-200" />
        </div>
        <div className="text-xs">
          <span className="font-bold text-white">Project Invitation: </span>
          <span className="text-blue-100">
            {first.inviterName} invited you to join{' '}
            <span className="font-bold text-white underline decoration-indigo-400 underline-offset-2">
              {first.projectName}
            </span>{' '}
            as <span className="font-semibold uppercase text-blue-300">({first.role})</span>
          </span>
          {count > 1 && (
            <span className="ml-2 bg-blue-500/50 text-blue-100 px-2 py-0.5 rounded-full text-[10px] font-bold">
              +{count - 1} more
            </span>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        <button
          onClick={() => onDeclineInvite(first)}
          className="px-2.5 py-1 text-xs text-blue-200 hover:text-white hover:bg-white/10 rounded-sm transition-colors cursor-pointer"
        >
          Decline
        </button>
        <button
          onClick={() => onAcceptInvite(first)}
          className="px-3 py-1 text-xs font-bold bg-white text-blue-900 hover:bg-blue-50 rounded-sm shadow-xs transition-all flex items-center gap-1 cursor-pointer"
        >
          <Check className="w-3.5 h-3.5 text-blue-600" />
          <span>Accept Invitation</span>
        </button>
        {count > 1 && (
          <button
            onClick={onOpenInvitesModal}
            className="px-2.5 py-1 text-xs text-blue-200 hover:text-white flex items-center gap-1 cursor-pointer"
          >
            <span>View All ({count})</span>
            <ArrowRight className="w-3 h-3" />
          </button>
        )}
      </div>
    </div>
  );
};
