import React, { useState, useEffect } from 'react';
import { Project, User, MemberRole, ProjectInvitation } from '../types';
import { useAuth } from '../context/AuthContext';
import {
  X,
  UserPlus,
  Trash2,
  Shield,
  Check,
  Mail,
  Link,
  Copy,
  Clock,
  Send,
  AlertCircle,
  Users,
  ChevronDown,
} from 'lucide-react';
import {
  subscribeProjectInvitations,
  createInvitationInFirestore,
  revokeInvitationInFirestore,
  clearAllInvitationsInFirestore,
  updateMemberRoleInFirestore,
  removeMemberFromProjectInFirestore,
} from '../services/firestoreService';

interface ProjectMembersModalProps {
  isOpen: boolean;
  onClose: () => void;
  project?: Project | null;
  currentUser?: User;
  users: User[];
  onUpdateProjectMembers: (newMemberIds: string[]) => Promise<void>;
}

export const ProjectMembersModal: React.FC<ProjectMembersModalProps> = ({
  isOpen,
  onClose,
  project,
  currentUser: propCurrentUser,
  users,
  onUpdateProjectMembers,
}) => {
  const { currentUser: authCurrentUser } = useAuth();
  const currentUser = propCurrentUser || authCurrentUser;

  const [activeTab, setActiveTab] = useState<'members' | 'invite' | 'pending'>('members');
  const [invitations, setInvitations] = useState<ProjectInvitation[]>([]);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<MemberRole>('member');
  const [inviteNote, setInviteNote] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [copiedToken, setCopiedToken] = useState<string | null>(null);
  const [latestPreviewUrl, setLatestPreviewUrl] = useState<string | null>(null);
  const [resendingId, setResendingId] = useState<string | null>(null);

  // Determine user's role in this project
  const userProjectRole: MemberRole = project
    ? project.createdBy === currentUser?.id
      ? 'owner'
      : (project.members?.[currentUser?.id || ''] as MemberRole) ||
        (currentUser?.role === 'admin' ? 'admin' : 'member')
    : 'member';

  const canManage =
    userProjectRole === 'owner' || userProjectRole === 'admin' || currentUser?.role === 'admin';

  // Subscribe to real-time invitations for this project
  useEffect(() => {
    if (!isOpen || !project?.id) return;
    const unsubscribe = subscribeProjectInvitations(
      project.id,
      (invs) => setInvitations(invs),
      (err) => console.warn('Project invitations listener:', err)
    );
    return () => unsubscribe();
  }, [isOpen, project?.id]);

  if (!isOpen || !project) return null;

  const currentMemberIds = project.memberIds || [];
  const projectMembersList = users.filter((u) => currentMemberIds.includes(u.id));
  const nonMembersList = users.filter((u) => !currentMemberIds.includes(u.id));
  const pendingInvs = invitations.filter((inv) => inv.status === 'pending');

  const handleSendInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail.trim()) {
      setErrorMessage('Please enter an email address');
      return;
    }

    const email = inviteEmail.trim().toLowerCase();

    // Check if already a member
    const existingMember = users.find((u) => u.email.toLowerCase() === email && currentMemberIds.includes(u.id));
    if (existingMember) {
      setErrorMessage(`${existingMember.name} is already a member of this project.`);
      return;
    }

    // Check if already invited
    const existingPending = pendingInvs.find((inv) => inv.inviteeEmail.toLowerCase() === email);
    if (existingPending) {
      setErrorMessage(`An active invitation has already been sent to ${email}.`);
      return;
    }

    setIsSending(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    if (!currentUser) {
      setErrorMessage('Please sign in to send invitations.');
      setIsSending(false);
      return;
    }

    try {
      const targetUser = users.find((u) => u.email.toLowerCase() === email);

      const { previewUrl, emailError } = await createInvitationInFirestore(
        {
          projectId: project.id,
          projectName: project.name,
          projectColor: project.color,
          inviteeEmail: email,
          ...(targetUser?.id ? { inviteeId: targetUser.id } : {}),
          role: inviteRole,
          ...(inviteNote.trim() ? { note: inviteNote.trim() } : {}),
        },
        currentUser
      );

      if (previewUrl) {
        setLatestPreviewUrl(previewUrl);
      } else {
        setLatestPreviewUrl(null);
      }

      if (emailError) {
        setSuccessMessage(`Invitation created successfully for ${email}. Note: ${emailError}`);
      } else {
        setSuccessMessage(`Invitation and email sent successfully to ${email}`);
      }
      setInviteEmail('');
      setInviteNote('');
      setActiveTab('pending');
    } catch (err: any) {
      console.error('Send invite error:', err);
      setErrorMessage(err.message || 'Failed to send invitation');
    } finally {
      setIsSending(false);
    }
  };

  const handleQuickInviteUser = async (user: User) => {
    if (!currentUser) {
      setErrorMessage('Please sign in to invite members.');
      return;
    }
    setIsSending(true);
    setErrorMessage(null);
    try {
      const { previewUrl, emailError } = await createInvitationInFirestore(
        {
          projectId: project.id,
          projectName: project.name,
          projectColor: project.color,
          inviteeEmail: user.email,
          inviteeId: user.id,
          role: 'member',
          note: `Hey ${user.name}, you've been invited to collaborate on ${project.name}!`,
        },
        currentUser
      );
      if (previewUrl) {
        setLatestPreviewUrl(previewUrl);
      }
      if (emailError) {
        setSuccessMessage(`Added ${user.name}. Note: ${emailError}`);
      } else {
        setSuccessMessage(`${user.name} successfully invited to the project`);
      }
      setTimeout(() => setSuccessMessage(null), 5000);
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to invite user');
    } finally {
      setIsSending(false);
    }
  };

  const handleRoleChange = async (memberId: string, newRole: MemberRole) => {
    if (!canManage || !currentUser) return;
    try {
      await updateMemberRoleInFirestore(project.id, memberId, newRole, currentUser);
    } catch (err: any) {
      console.error('Role change error:', err);
      setErrorMessage(err.message || 'Failed to update member role');
    }
  };

  const handleRemoveMember = async (memberId: string) => {
    if (!canManage || !currentUser) return;
    if (memberId === project.createdBy) {
      alert('The project owner cannot be removed from their own project.');
      return;
    }
    if (currentMemberIds.length <= 1) {
      alert('A project must have at least one member.');
      return;
    }

    if (!confirm('Are you sure you want to remove this member from the project?')) {
      return;
    }

    try {
      await removeMemberFromProjectInFirestore(project.id, memberId, currentUser);
    } catch (err: any) {
      console.error('Remove member error:', err);
      setErrorMessage(err.message || 'Failed to remove member');
    }
  };

  const handleRevokeInvite = async (invitationId: string) => {
    if (!currentUser) return;
    try {
      await revokeInvitationInFirestore(invitationId, project.id, currentUser);
    } catch (err: any) {
      console.error('Revoke invite error:', err);
      setErrorMessage(err.message || 'Failed to cancel invitation');
    }
  };

  const handleClearAllInvitations = async () => {
    if (!project || !currentUser) return;
    if (!window.confirm('Are you sure you want to clear and cancel all pending invitations to start over?')) {
      return;
    }
    try {
      const deletedCount = await clearAllInvitationsInFirestore(project.id, currentUser);
      setSuccessMessage(`Successfully cleared and deleted ${deletedCount} invitations from memory to start over.`);
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err: any) {
      console.error('Clear all invitations error:', err);
      setErrorMessage(err.message || 'Failed to clear invitations');
    }
  };

  const handleCopyInviteLink = (token: string) => {
    const inviteUrl = `${window.location.origin}?invite=${token}`;
    navigator.clipboard.writeText(inviteUrl);
    setCopiedToken(token);
    setTimeout(() => setCopiedToken(null), 2500);
  };

  const handleResendInvite = async (inv: ProjectInvitation) => {
    setResendingId(inv.id);
    setErrorMessage(null);
    try {
      const res = await fetch('/api/send-invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: inv.inviteeEmail,
          projectName: inv.projectName,
          inviterName: inv.inviterName,
          role: inv.role,
          note: inv.note,
          token: inv.token,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setSuccessMessage(`Email successfully resent to ${inv.inviteeEmail}`);
      } else {
        setErrorMessage(data?.details || data?.error || 'Could not resend email');
      }
      setTimeout(() => setSuccessMessage(null), 4000);
    } catch (err: any) {
      setErrorMessage(err?.message || 'Error connecting to server');
    } finally {
      setResendingId(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-900/60 backdrop-blur-xs p-4">
      <div
        id="project-members-modal"
        className="bg-white rounded-sm border border-zinc-200 w-full max-w-lg max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-100 bg-zinc-50/70 shrink-0">
          <div className="flex items-center gap-2.5">
            <div
              className="w-8 h-8 rounded-sm flex items-center justify-center text-white font-bold text-sm"
              style={{ backgroundColor: project.color || '#6366f1' }}
            >
              <Users className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-zinc-900">Project Members & Access</h2>
              <p className="text-xs text-zinc-500">{project.name}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-sm text-zinc-400 hover:text-zinc-600 hover:bg-zinc-100 cursor-pointer transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-2 px-6 pt-3 border-b border-zinc-100 bg-white">
          <button
            onClick={() => setActiveTab('members')}
            className={`pb-3 px-2 text-xs font-semibold border-b-2 transition-all flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'members'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-zinc-500 hover:text-zinc-700'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>Active Members ({projectMembersList.length})</span>
          </button>

          {canManage && (
            <button
              onClick={() => setActiveTab('invite')}
              className={`pb-3 px-2 text-xs font-semibold border-b-2 transition-all flex items-center gap-1.5 cursor-pointer ${
                activeTab === 'invite'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-zinc-500 hover:text-zinc-700'
              }`}
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>Invite New Member</span>
            </button>
          )}

          <button
            onClick={() => setActiveTab('pending')}
            className={`pb-3 px-2 text-xs font-semibold border-b-2 transition-all flex items-center gap-1.5 cursor-pointer relative ${
              activeTab === 'pending'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-zinc-500 hover:text-zinc-700'
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            <span>Pending Invites</span>
            {pendingInvs.length > 0 && (
              <span className="w-4 h-4 rounded-full bg-amber-500 text-white text-[10px] font-bold flex items-center justify-center">
                {pendingInvs.length}
              </span>
            )}
          </button>
        </div>

        {/* Messages */}
        {successMessage && (
          <div className="mx-6 mt-4 p-3.5 rounded-sm bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs space-y-2">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                <span className="font-bold">{successMessage}</span>
              </div>
              <button
                onClick={() => setSuccessMessage(null)}
                className="text-emerald-700 hover:text-emerald-900 text-xs font-bold"
              >
                Dismiss
              </button>
            </div>

            {latestPreviewUrl && (
              <div className="pt-2 border-t border-emerald-200/80 flex items-center justify-between gap-2 flex-wrap">
                <span className="text-[11px] text-emerald-800">
                  Email dispatched via Nodemailer Sandbox. You can view the sent email inbox preview:
                </span>
                <a
                  href={latestPreviewUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-sm font-bold text-[11px] transition-colors shadow-2xs"
                >
                  <Mail className="w-3.5 h-3.5" />
                  <span>Open Email Sandbox Preview ↗</span>
                </a>
              </div>
            )}
          </div>
        )}
        {errorMessage && (
          <div className="mx-6 mt-4 p-3 rounded-sm bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Content Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-4">
          {/* TAB 1: MEMBERS */}
          {activeTab === 'members' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs text-zinc-500">
                <span>Manage member permissions & collaborative access</span>
                <span className="font-medium text-zinc-700">
                  Your Role:{' '}
                  <span className="capitalize font-bold text-blue-600">{userProjectRole}</span>
                </span>
              </div>

              <div className="divide-y divide-slate-100 border border-zinc-100 rounded-sm overflow-hidden shadow-2xs">
                {projectMembersList.map((member) => {
                  const isOwner = member.id === project.createdBy;
                  const currentRole: MemberRole = isOwner
                    ? 'owner'
                    : (project.members?.[member.id] as MemberRole) || 'member';

                  return (
                    <div
                      key={member.id}
                      className="p-3.5 flex items-center justify-between hover:bg-zinc-50/50 transition-colors gap-3"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <img
                          src={member.avatar}
                          alt={member.name}
                          className="w-10 h-10 rounded-full object-cover border border-zinc-200 shrink-0"
                        />
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="text-xs font-bold text-zinc-900 truncate">
                              {member.name}
                            </span>
                            {member.id === currentUser?.id && (
                              <span className="text-[10px] bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded font-medium">
                                You
                              </span>
                            )}
                            {isOwner ? (
                              <span className="text-[10px] bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full font-bold flex items-center gap-1">
                                <Shield className="w-2.5 h-2.5" /> Owner
                              </span>
                            ) : (
                              <span
                                className={`text-[10px] px-2 py-0.5 rounded-full font-medium capitalize ${
                                  currentRole === 'admin'
                                    ? 'bg-blue-100 text-blue-700'
                                    : currentRole === 'manager'
                                    ? 'bg-blue-100 text-blue-700'
                                    : currentRole === 'viewer'
                                    ? 'bg-zinc-100 text-zinc-600'
                                    : 'bg-emerald-100 text-emerald-700'
                                }`}
                              >
                                {currentRole}
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] text-zinc-500 truncate">{member.email}</p>
                        </div>
                      </div>

                      {/* Role Actions */}
                      <div className="flex items-center gap-2 shrink-0">
                        {!isOwner && canManage && (
                          <div className="relative">
                            <select
                              value={currentRole}
                              onChange={(e) =>
                                handleRoleChange(member.id, e.target.value as MemberRole)
                              }
                              className="text-xs bg-zinc-50 border border-zinc-200 rounded-sm px-2.5 py-1 text-zinc-700 font-medium cursor-pointer hover:border-zinc-300 focus:outline-hidden focus:ring-1 focus:ring-blue-500"
                            >
                              <option value="admin">Admin</option>
                              <option value="manager">Manager</option>
                              <option value="member">Member</option>
                              <option value="viewer">Viewer</option>
                            </select>
                          </div>
                        )}

                        {!isOwner && canManage && (
                          <button
                            onClick={() => handleRemoveMember(member.id)}
                            title="Remove from project"
                            className="p-1.5 text-zinc-400 hover:text-rose-600 hover:bg-rose-50 rounded-sm transition-colors cursor-pointer"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Quick Invite suggestions from workspace */}
              {canManage && nonMembersList.length > 0 && (
                <div className="pt-3">
                  <h4 className="text-xs font-bold text-zinc-700 mb-2">
                    Available Workspace Colleagues ({nonMembersList.length})
                  </h4>
                  <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                    {nonMembersList.map((user) => (
                      <div
                        key={user.id}
                        className="flex items-center justify-between p-2 rounded-sm bg-zinc-50 border border-zinc-100 hover:border-zinc-200"
                      >
                        <div className="flex items-center gap-2.5">
                          <img
                            src={user.avatar}
                            alt={user.name}
                            className="w-7 h-7 rounded-full object-cover"
                          />
                          <div>
                            <span className="text-xs font-semibold text-zinc-800">
                              {user.name}
                            </span>
                            <span className="text-[10px] text-zinc-400 ml-1.5">
                              ({user.email})
                            </span>
                          </div>
                        </div>
                        <button
                          onClick={() => handleQuickInviteUser(user)}
                          disabled={isSending}
                          className="px-2.5 py-1 text-[11px] font-bold text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-sm transition-colors cursor-pointer"
                        >
                          + Invite
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: SEND INVITATION */}
          {activeTab === 'invite' && canManage && (
            <form onSubmit={handleSendInvite} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-zinc-700 mb-1.5">
                  Invitee Email Address <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-zinc-400 absolute left-3 top-3" />
                  <input
                    type="email"
                    required
                    placeholder="colleague@company.com"
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 text-xs border border-zinc-200 rounded-sm focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-zinc-700 mb-1.5">
                  Assigned Project Role
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    {
                      id: 'admin',
                      label: 'Admin',
                      desc: 'Full project management & member controls',
                    },
                    {
                      id: 'manager',
                      label: 'Manager',
                      desc: 'Can create & assign tasks, manage sprints',
                    },
                    {
                      id: 'member',
                      label: 'Member',
                      desc: 'Can work on tasks, comment, update status',
                    },
                    {
                      id: 'viewer',
                      label: 'Viewer',
                      desc: 'Read-only access with commenting privileges',
                    },
                  ].map((r) => (
                    <button
                      key={r.id}
                      type="button"
                      onClick={() => setInviteRole(r.id as MemberRole)}
                      className={`p-2.5 rounded-sm border text-left transition-all cursor-pointer ${
                        inviteRole === r.id
                          ? 'border-blue-500 bg-blue-50/60 ring-1 ring-blue-500'
                          : 'border-zinc-200 hover:border-zinc-300 bg-white'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-0.5">
                        <span className="text-xs font-bold text-zinc-900">{r.label}</span>
                        {inviteRole === r.id && <Check className="w-3.5 h-3.5 text-blue-600" />}
                      </div>
                      <p className="text-[10px] text-zinc-500 leading-tight">{r.desc}</p>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-zinc-700 mb-1.5">
                  Personal Invitation Note (Optional)
                </label>
                <textarea
                  rows={2}
                  placeholder="Welcome to our project! Let's collaborate on the upcoming release..."
                  value={inviteNote}
                  onChange={(e) => setInviteNote(e.target.value)}
                  className="w-full p-2.5 text-xs border border-zinc-200 rounded-sm focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 resize-none"
                />
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={isSending || !inviteEmail.trim()}
                  className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-sm text-xs font-bold shadow-xs hover:shadow-sm transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  <Send className="w-3.5 h-3.5" />
                  {isSending ? 'Sending Invitation...' : 'Send Project Invitation'}
                </button>
              </div>

              <div className="p-3 bg-blue-50/50 border border-blue-100 rounded-sm text-[11px] text-blue-950 leading-relaxed">
                <span className="font-bold text-blue-900 block mb-0.5">✉ Email Delivery Note:</span>
                Invitations dispatch real HTML emails via Nodemailer backend. In sandbox mode, an instant test email preview link is generated. To route emails directly to real external Gmail/Outlook inboxes, set your SMTP environment variables (<code className="bg-white/80 px-1 py-0.5 rounded border border-blue-200 text-[10px]">SMTP_HOST</code>, <code className="bg-white/80 px-1 py-0.5 rounded border border-blue-200 text-[10px]">SMTP_USER</code>, <code className="bg-white/80 px-1 py-0.5 rounded border border-blue-200 text-[10px]">SMTP_PASS</code>).
              </div>
            </form>
          )}

          {/* TAB 3: PENDING INVITATIONS */}
          {activeTab === 'pending' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs text-zinc-500">
                <span>Active invitations sent to collaborators</span>
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-zinc-700">{pendingInvs.length} Pending</span>
                  {pendingInvs.length > 0 && canManage && (
                    <button
                      onClick={handleClearAllInvitations}
                      className="inline-flex items-center gap-1 text-[11px] font-bold text-rose-600 hover:text-rose-700 bg-rose-50 hover:bg-rose-100 px-2 py-0.5 rounded-sm transition-colors cursor-pointer"
                      title="Clear and delete all invitations to start sending again"
                    >
                      <Trash2 className="w-3 h-3" />
                      <span>Clear All</span>
                    </button>
                  )}
                </div>
              </div>

              {pendingInvs.length === 0 ? (
                <div className="p-8 text-center bg-zinc-50 rounded-sm border border-dashed border-zinc-200">
                  <Clock className="w-8 h-8 text-zinc-300 mx-auto mb-2" />
                  <p className="text-xs font-semibold text-zinc-600">No pending invitations</p>
                  <p className="text-[11px] text-zinc-400 mt-1">
                    Invite colleagues by email to join and collaborate on this project.
                  </p>
                  {canManage && (
                    <button
                      onClick={() => setActiveTab('invite')}
                      className="mt-3 px-3 py-1.5 text-xs font-bold bg-blue-600 text-white rounded-sm hover:bg-blue-700 cursor-pointer"
                    >
                      + Send an Invitation
                    </button>
                  )}
                </div>
              ) : (
                <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                  {pendingInvs.map((inv) => (
                    <div
                      key={inv.id}
                      className="p-3 bg-white border border-zinc-200 rounded-sm shadow-2xs space-y-2"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-zinc-900">
                              {inv.inviteeEmail}
                            </span>
                            <span className="text-[10px] bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full font-bold capitalize">
                              {inv.role}
                            </span>
                          </div>
                          <p className="text-[10px] text-zinc-400 mt-0.5">
                            Invited by {inv.inviterName} • {new Date(inv.createdAt).toLocaleDateString()}
                          </p>
                          {inv.note && (
                            <p className="text-[11px] text-zinc-600 bg-zinc-50 p-1.5 rounded-sm mt-1 italic">
                              "{inv.note}"
                            </p>
                          )}
                        </div>

                        {canManage && (
                          <button
                            onClick={() => handleRevokeInvite(inv.id)}
                            className="text-zinc-400 hover:text-rose-600 p-1 rounded hover:bg-rose-50 cursor-pointer transition-colors"
                            title="Cancel Invitation"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        )}
                      </div>

                      <div className="flex items-center justify-between pt-1 border-t border-zinc-100 text-[11px]">
                        <span className="text-zinc-400 font-mono text-[10px]">
                          Code: <strong className="text-zinc-700 font-bold">{inv.token}</strong>
                        </span>
                        <div className="flex items-center gap-2.5">
                          <button
                            type="button"
                            onClick={() => handleResendInvite(inv)}
                            disabled={resendingId === inv.id}
                            className="flex items-center gap-1 text-zinc-500 hover:text-blue-600 font-semibold cursor-pointer disabled:opacity-50"
                            title="Resend invitation email"
                          >
                            <Mail className="w-3 h-3" />
                            <span>{resendingId === inv.id ? 'Sending...' : 'Resend'}</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => handleCopyInviteLink(inv.token)}
                            className="flex items-center gap-1 text-blue-600 hover:text-blue-800 font-semibold cursor-pointer"
                          >
                            {copiedToken === inv.token ? (
                              <>
                                <Check className="w-3 h-3 text-emerald-600" />
                                <span className="text-emerald-600 font-bold">Copied!</span>
                              </>
                            ) : (
                              <>
                                <Copy className="w-3 h-3" />
                                <span>Copy Link</span>
                              </>
                            )}
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end px-6 py-3.5 border-t border-zinc-100 bg-zinc-50/80">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-bold bg-zinc-900 text-white hover:bg-zinc-800 rounded-sm transition-all cursor-pointer shadow-xs"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
