import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  X,
  Plus,
  Check,
  LogIn,
  LogOut,
  Shield,
  Sparkles,
  Trash2,
  AlertCircle,
  User as UserIcon,
  Users,
  KeyRound,
  Mail,
  Phone,
  Briefcase,
  Building,
  Activity,
  Palette,
  CheckCircle2,
  RefreshCw,
  Search,
  Lock,
  ExternalLink,
  Globe,
  Clock,
  BarChart3,
  Copy,
  CheckCheck,
  ArrowRight,
  Filter,
  Eye,
  UserCheck,
} from 'lucide-react';
import { purgeLegacyDemoData, getUserWorkspaceStats } from '../services/firestoreService';
import { Avatar } from '../designSystem';
import { soundManager } from '../utils/soundEffects';
import { User } from '../types';

interface UserSwitcherModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenAuthModal?: () => void;
}

type TabType = 'profile' | 'team' | 'analytics' | 'security';

const STATUS_PRESETS = [
  { label: 'Active', emoji: '🟢', text: 'Active & Available' },
  { label: 'In a meeting', emoji: '🟡', text: 'In a meeting' },
  { label: 'Focusing', emoji: '🟣', text: 'Deep focus / DND' },
  { label: 'Working remotely', emoji: '🔵', text: 'Working remotely' },
  { label: 'Out of office', emoji: '🏖️', text: 'Out of office' },
];

const DEPARTMENT_PRESETS = [
  'Engineering',
  'Product Management',
  'UI/UX Design',
  'Quality Assurance',
  'DevOps & Cloud',
  'Marketing',
  'Operations',
  'Sales & Growth',
  'Human Resources',
  'Leadership',
];

const TIMEZONE_PRESETS = [
  { label: 'UTC (Coordinated Universal Time)', value: 'UTC' },
  { label: 'Riyadh / Cairo / Istanbul (GMT+3)', value: 'Asia/Riyadh' },
  { label: 'Dubai / Muscat (GMT+4)', value: 'Asia/Dubai' },
  { label: 'London / Dublin (GMT+0 / GMT+1)', value: 'Europe/London' },
  { label: 'Berlin / Paris / Rome (GMT+1 / GMT+2)', value: 'Europe/Paris' },
  { label: 'New York / Eastern Time (EST/EDT)', value: 'America/New_York' },
  { label: 'Chicago / Central Time (CST/CDT)', value: 'America/Chicago' },
  { label: 'San Francisco / Pacific Time (PST/PDT)', value: 'America/Los_Angeles' },
  { label: 'Tokyo / Seoul (GMT+9)', value: 'Asia/Tokyo' },
  { label: 'Singapore / Hong Kong (GMT+8)', value: 'Asia/Singapore' },
  { label: 'Sydney / Melbourne (GMT+10 / GMT+11)', value: 'Australia/Sydney' },
];

const COLOR_PRESETS = [
  { name: 'Indigo', hex: '#6366F1' },
  { name: 'Emerald', hex: '#10B981' },
  { name: 'Violet', hex: '#8B5CF6' },
  { name: 'Amber', hex: '#F59E0B' },
  { name: 'Rose', hex: '#F43F5E' },
  { name: 'Sky', hex: '#0EA5E9' },
  { name: 'Slate', hex: '#475569' },
  { name: 'Teal', hex: '#14B8A6' },
];

const AVATAR_SEEDS = [
  'Alex', 'Jordan', 'Taylor', 'Sam', 'Morgan', 'Casey', 'Riley', 'Avery', 'Sarah', 'David', 'Omar', 'Nour'
];

export const UserSwitcherModal: React.FC<UserSwitcherModalProps> = ({
  isOpen,
  onClose,
  onOpenAuthModal,
}) => {
  const {
    users,
    currentUser,
    firebaseUser,
    switchUser,
    createUser,
    updateCurrentUserProfile,
    sendPasswordReset,
    sendVerificationEmail,
    changePassword,
    updateWorkspaceRole,
    deleteTeamMember,
    logout,
    setAuthModalOpen,
  } = useAuth();

  const [activeTab, setActiveTab] = useState<TabType>('profile');

  // Profile Form States
  const [profileName, setProfileName] = useState('');
  const [profileTitle, setProfileTitle] = useState('');
  const [profileDepartment, setProfileDepartment] = useState('Engineering');
  const [profileStatus, setProfileStatus] = useState('Active');
  const [profileBio, setProfileBio] = useState('');
  const [profilePhone, setProfilePhone] = useState('');
  const [profileTimezone, setProfileTimezone] = useState('UTC');
  const [profileColor, setProfileColor] = useState('#6366F1');
  const [profileAvatarSeed, setProfileAvatarSeed] = useState('');
  const [customAvatarUrl, setCustomAvatarUrl] = useState('');
  const [avatarMode, setAvatarMode] = useState<'dicebear' | 'custom'>('dicebear');
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [profileSuccessMsg, setProfileSuccessMsg] = useState<string | null>(null);
  const [profileErrorMsg, setProfileErrorMsg] = useState<string | null>(null);

  // Team Directory States
  const [teamSearchQuery, setTeamSearchQuery] = useState('');
  const [teamRoleFilter, setTeamRoleFilter] = useState<'all' | 'admin' | 'manager' | 'member'>('all');
  const [teamDeptFilter, setTeamDeptFilter] = useState<string>('all');
  const [showCreateMember, setShowCreateMember] = useState(false);
  const [newMemberName, setNewMemberName] = useState('');
  const [newMemberEmail, setNewMemberEmail] = useState('');
  const [newMemberTitle, setNewMemberTitle] = useState('');
  const [newMemberDept, setNewMemberDept] = useState('Engineering');
  const [newMemberRole, setNewMemberRole] = useState<'admin' | 'manager' | 'member'>('member');
  const [isCreatingMember, setIsCreatingMember] = useState(false);
  const [selectedMemberDetail, setSelectedMemberDetail] = useState<User | null>(null);
  const [selectedMemberStats, setSelectedMemberStats] = useState<{
    ownedProjectsCount: number;
    assignedTasksCount: number;
    completedTasksCount: number;
  } | null>(null);
  const [isLoadingMemberStats, setIsLoadingMemberStats] = useState(false);

  // Security & Password States
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);
  const [securitySuccessMsg, setSecuritySuccessMsg] = useState<string | null>(null);
  const [securityErrorMsg, setSecurityErrorMsg] = useState<string | null>(null);
  const [isSendingReset, setIsSendingReset] = useState(false);
  const [isSendingVerify, setIsSendingVerify] = useState(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  // Workspace Stats States
  const [userStats, setUserStats] = useState<{
    ownedProjectsCount: number;
    assignedTasksCount: number;
    completedTasksCount: number;
  }>({
    ownedProjectsCount: 0,
    assignedTasksCount: 0,
    completedTasksCount: 0,
  });
  const [isLoadingStats, setIsLoadingStats] = useState(false);

  // Demo Data Purge State
  const [isPurging, setIsPurging] = useState(false);
  const [purgeMsg, setPurgeMsg] = useState<string | null>(null);

  // Synchronize initial profile values from currentUser
  useEffect(() => {
    if (currentUser) {
      setProfileName(currentUser.name || '');
      setProfileTitle(currentUser.title || '');
      setProfileDepartment(currentUser.department || 'Engineering');
      setProfileStatus(currentUser.statusText || 'Active');
      setProfileBio(currentUser.bio || '');
      setProfilePhone(currentUser.phone || '');
      setProfileTimezone(
        currentUser.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'
      );
      setProfileColor(currentUser.color || '#6366F1');

      if (currentUser.avatar?.startsWith('https://api.dicebear.com')) {
        setAvatarMode('dicebear');
        try {
          const url = new URL(currentUser.avatar);
          const seed = url.searchParams.get('seed') || currentUser.name || currentUser.id;
          setProfileAvatarSeed(seed);
        } catch {
          setProfileAvatarSeed(currentUser.name || currentUser.id);
        }
      } else if (currentUser.avatar) {
        setAvatarMode('custom');
        setCustomAvatarUrl(currentUser.avatar);
        setProfileAvatarSeed(currentUser.name || currentUser.id);
      } else {
        setAvatarMode('dicebear');
        setProfileAvatarSeed(currentUser.name || currentUser.id);
      }

      // Load user stats
      setIsLoadingStats(true);
      getUserWorkspaceStats(currentUser.id)
        .then((stats) => {
          setUserStats(stats);
        })
        .finally(() => {
          setIsLoadingStats(false);
        });
    }
  }, [currentUser, isOpen]);

  // Load selected member stats when viewing details
  useEffect(() => {
    if (selectedMemberDetail) {
      setIsLoadingMemberStats(true);
      getUserWorkspaceStats(selectedMemberDetail.id)
        .then((stats) => {
          setSelectedMemberStats(stats);
        })
        .finally(() => {
          setIsLoadingMemberStats(false);
        });
    } else {
      setSelectedMemberStats(null);
    }
  }, [selectedMemberDetail]);

  const handleSelectUser = (userId: string) => {
    switchUser(userId);
    soundManager.playSuccessPop();
    onClose();
  };

  const handleOpenAuth = () => {
    onClose();
    if (onOpenAuthModal) {
      onOpenAuthModal();
    } else {
      setAuthModalOpen(true);
    }
  };

  const handleLogout = async () => {
    await logout();
    onClose();
  };

  const copyToClipboard = (text: string, fieldKey: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(fieldKey);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;
    setIsSavingProfile(true);
    setProfileSuccessMsg(null);
    setProfileErrorMsg(null);

    try {
      let finalAvatar = currentUser.avatar;
      if (avatarMode === 'dicebear') {
        finalAvatar = `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(
          profileAvatarSeed.trim() || profileName.trim()
        )}`;
      } else if (avatarMode === 'custom' && customAvatarUrl.trim()) {
        finalAvatar = customAvatarUrl.trim();
      }

      await updateCurrentUserProfile({
        name: profileName.trim(),
        title: profileTitle.trim(),
        department: profileDepartment,
        statusText: profileStatus,
        bio: profileBio.trim(),
        phone: profilePhone.trim(),
        timezone: profileTimezone,
        color: profileColor,
        avatar: finalAvatar,
      });

      soundManager.playSuccessPop();
      setProfileSuccessMsg('Profile data saved successfully!');
      setTimeout(() => setProfileSuccessMsg(null), 4000);
    } catch (err: any) {
      setProfileErrorMsg(err.message || 'An error occurred while saving profile');
    } finally {
      setIsSavingProfile(false);
    }
  };

  const handleCreateMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMemberName.trim() || !newMemberEmail.trim()) return;

    try {
      setIsCreatingMember(true);
      await createUser({
        name: newMemberName.trim(),
        email: newMemberEmail.trim(),
        title: newMemberTitle.trim() || 'Team Member',
        department: newMemberDept,
        role: newMemberRole,
        statusText: 'Active',
        timezone: profileTimezone || 'UTC',
        avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(
          newMemberName.trim()
        )}`,
      });
      soundManager.playSuccessPop();
      setShowCreateMember(false);
      setNewMemberName('');
      setNewMemberEmail('');
      setNewMemberTitle('');
      setProfileSuccessMsg('New team member successfully added to the database!');
      setTimeout(() => setProfileSuccessMsg(null), 3000);
    } catch (err: any) {
      setProfileErrorMsg(err.message || 'Failed to create member');
    } finally {
      setIsCreatingMember(false);
    }
  };

  const handleDeleteMember = async (userId: string, memberName: string) => {
    if (!window.confirm(`Are you sure you want to remove ${memberName} from the team?`)) {
      return;
    }
    try {
      await deleteTeamMember(userId);
      if (selectedMemberDetail?.id === userId) {
        setSelectedMemberDetail(null);
      }
    } catch (err: any) {
      alert(`Could not delete member: ${err.message}`);
    }
  };

  const handleSendResetEmail = async () => {
    setIsSendingReset(true);
    setSecuritySuccessMsg(null);
    setSecurityErrorMsg(null);
    try {
      await sendPasswordReset();
      setSecuritySuccessMsg(
        `Password reset link sent to your email: ${firebaseUser?.email || currentUser?.email}`
      );
    } catch (err: any) {
      setSecurityErrorMsg(err.message || 'Could not send reset email');
    } finally {
      setIsSendingReset(false);
    }
  };

  const handleSendVerifyEmail = async () => {
    setIsSendingVerify(true);
    setSecuritySuccessMsg(null);
    setSecurityErrorMsg(null);
    try {
      await sendVerificationEmail();
      setSecuritySuccessMsg('Verification email sent successfully!');
    } catch (err: any) {
      setSecurityErrorMsg(err.message || 'Could not send verification email');
    } finally {
      setIsSendingVerify(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      setSecurityErrorMsg('Passwords do not match!');
      return;
    }
    if (newPassword.length < 6) {
      setSecurityErrorMsg('Password must be at least 6 characters long');
      return;
    }

    setIsUpdatingPassword(true);
    setSecuritySuccessMsg(null);
    setSecurityErrorMsg(null);
    try {
      await changePassword(newPassword);
      soundManager.playSuccessPop();
      setSecuritySuccessMsg('Password changed successfully!');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      setSecurityErrorMsg(err.message || 'Could not change password');
    } finally {
      setIsUpdatingPassword(false);
    }
  };

  const handlePurgeDemoProjects = async () => {
    if (!currentUser) return;
    if (!window.confirm('Are you sure you want to permanently delete all legacy demo projects and data?')) {
      return;
    }
    setIsPurging(true);
    try {
      const count = await purgeLegacyDemoData(currentUser.id);
      setPurgeMsg(`Successfully deleted ${count} demo projects. Workspace is now clean.`);
      setTimeout(() => setPurgeMsg(null), 4000);
    } catch (err: any) {
      setPurgeMsg(`An error occurred during cleanup: ${err.message}`);
    } finally {
      setIsPurging(false);
    }
  };

  // Filtered users for directory
  const filteredUsers = useMemo(() => {
    return users.filter((u) => {
      const matchesQuery =
        u.name.toLowerCase().includes(teamSearchQuery.toLowerCase()) ||
        u.email.toLowerCase().includes(teamSearchQuery.toLowerCase()) ||
        (u.title && u.title.toLowerCase().includes(teamSearchQuery.toLowerCase())) ||
        (u.department && u.department.toLowerCase().includes(teamSearchQuery.toLowerCase()));
      const matchesRole = teamRoleFilter === 'all' || u.role === teamRoleFilter;
      const matchesDept = teamDeptFilter === 'all' || u.department === teamDeptFilter;
      return matchesQuery && matchesRole && matchesDept;
    });
  }, [users, teamSearchQuery, teamRoleFilter, teamDeptFilter]);

  const completionRate = useMemo(() => {
    if (userStats.assignedTasksCount === 0) return 100;
    return Math.round((userStats.completedTasksCount / userStats.assignedTasksCount) * 100);
  }, [userStats]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-900/60 backdrop-blur-xs p-3 sm:p-4 select-none">
      <div
        id="account-team-profile-dialog"
        className="bg-white rounded-sm border border-zinc-200/90 w-full max-w-2xl max-h-[92vh] flex flex-col overflow-hidden shadow-sm animate-in fade-in zoom-in-95 duration-150"
      >
        {/* Header Profile Identity Bar */}
        <div className="flex items-center justify-between px-5 sm:px-6 py-4 border-b border-zinc-100 bg-zinc-50/80 shrink-0">
          <div className="flex items-center gap-3">
            {currentUser && (
              <div className="relative">
                <Avatar
                  src={currentUser.avatar}
                  name={currentUser.name}
                  size="md"
                  className="ring-2 ring-blue-500/30"
                />
                <span
                  className="absolute bottom-0 right-0 w-3 h-3 rounded-full ring-2 ring-white"
                  style={{ backgroundColor: currentUser.color || '#10B981' }}
                  title={currentUser.statusText || 'Active'}
                />
              </div>
            )}
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-zinc-900">
                  {currentUser?.name || 'Account & Profile'}
                </h2>
                <span
                  className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-full ${
                    currentUser?.role === 'admin'
                      ? 'bg-rose-100 text-rose-700'
                      : currentUser?.role === 'manager'
                      ? 'bg-amber-100 text-amber-700'
                      : 'bg-blue-100 text-blue-700'
                  }`}
                >
                  {currentUser?.role || 'Member'}
                </span>
                {currentUser?.department && (
                  <span className="hidden sm:inline-block text-[10px] font-medium px-2 py-0.5 rounded-full bg-zinc-200 text-zinc-700">
                    {currentUser.department}
                  </span>
                )}
              </div>
              <p className="text-xs text-zinc-500 font-mono">
                {currentUser?.email || (firebaseUser?.isAnonymous ? 'Guest Account' : 'Workspace Profile')}
              </p>
            </div>
          </div>
          <button
            id="close-profile-modal-btn"
            onClick={onClose}
            className="p-1.5 rounded-sm text-zinc-400 hover:text-zinc-700 hover:bg-zinc-200/60 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation Bar */}
        <div className="flex items-center px-4 sm:px-6 border-b border-zinc-200 bg-white shrink-0 gap-1 sm:gap-2 overflow-x-auto no-scrollbar">
          <button
            id="tab-my-profile-btn"
            onClick={() => setActiveTab('profile')}
            className={`flex items-center gap-1.5 py-3 px-3 text-xs font-bold border-b-2 transition-all shrink-0 cursor-pointer ${
              activeTab === 'profile'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-zinc-500 hover:text-zinc-800'
            }`}
          >
            <UserIcon className="w-3.5 h-3.5" />
            <span>My Profile</span>
          </button>

          <button
            id="tab-team-directory-btn"
            onClick={() => setActiveTab('team')}
            className={`flex items-center gap-1.5 py-3 px-3 text-xs font-bold border-b-2 transition-all shrink-0 cursor-pointer ${
              activeTab === 'team'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-zinc-500 hover:text-zinc-800'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>Team Directory ({users.length})</span>
          </button>

          <button
            id="tab-analytics-btn"
            onClick={() => setActiveTab('analytics')}
            className={`flex items-center gap-1.5 py-3 px-3 text-xs font-bold border-b-2 transition-all shrink-0 cursor-pointer ${
              activeTab === 'analytics'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-zinc-500 hover:text-zinc-800'
            }`}
          >
            <BarChart3 className="w-3.5 h-3.5" />
            <span>Workspace Stats</span>
          </button>

          <button
            id="tab-security-btn"
            onClick={() => setActiveTab('security')}
            className={`flex items-center gap-1.5 py-3 px-3 text-xs font-bold border-b-2 transition-all shrink-0 cursor-pointer ${
              activeTab === 'security'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-zinc-500 hover:text-zinc-800'
            }`}
          >
            <Shield className="w-3.5 h-3.5" />
            <span>Security & Auth</span>
          </button>
        </div>

        {/* TAB 1: MY PROFILE */}
        {activeTab === 'profile' && (
          <form
            onSubmit={handleSaveProfile}
            className="p-5 sm:p-6 space-y-5 overflow-y-auto flex-1 sleek-scrollbar"
          >
            {profileSuccessMsg && (
              <div className="p-3.5 rounded-sm bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 flex items-center gap-2 animate-in fade-in">
                <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
                <span className="font-bold">{profileSuccessMsg}</span>
              </div>
            )}
            {profileErrorMsg && (
              <div className="p-3.5 rounded-sm bg-rose-50 border border-rose-200 text-xs text-rose-800 flex items-center gap-2 animate-in fade-in">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                <span className="font-semibold">{profileErrorMsg}</span>
              </div>
            )}

            {/* Avatar & Visual Identity Customizer */}
            <div className="p-4 rounded-sm bg-zinc-50 border border-zinc-200/80 space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-zinc-800 flex items-center gap-1.5">
                  <Palette className="w-3.5 h-3.5 text-blue-600" />
                  <span>Avatar & Visual Identity</span>
                </label>
                <div className="flex items-center gap-2 text-[11px] font-semibold">
                  <button
                    type="button"
                    onClick={() => setAvatarMode('dicebear')}
                    className={`px-2 py-0.5 rounded-sm cursor-pointer transition-colors ${
                      avatarMode === 'dicebear'
                        ? 'bg-blue-600 text-white'
                        : 'text-zinc-500 hover:text-zinc-800'
                    }`}
                  >
                    DiceBear Seed
                  </button>
                  <button
                    type="button"
                    onClick={() => setAvatarMode('custom')}
                    className={`px-2 py-0.5 rounded-sm cursor-pointer transition-colors ${
                      avatarMode === 'custom'
                        ? 'bg-blue-600 text-white'
                        : 'text-zinc-500 hover:text-zinc-800'
                    }`}
                  >
                    Custom URL
                  </button>
                </div>
              </div>

              <div className="flex items-center gap-4">
                <div className="relative shrink-0">
                  <img
                    src={
                      avatarMode === 'dicebear'
                        ? `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(
                            profileAvatarSeed || profileName || 'user'
                          )}`
                        : customAvatarUrl ||
                          `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(
                            profileName || 'user'
                          )}`
                    }
                    alt="Avatar Preview"
                    className="w-16 h-16 rounded-sm bg-white border border-zinc-200 p-1 shadow-xs object-cover"
                  />
                  <span
                    className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full ring-2 ring-white"
                    style={{ backgroundColor: profileColor }}
                  />
                </div>

                <div className="flex-1 space-y-2">
                  {avatarMode === 'dicebear' ? (
                    <>
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          value={profileAvatarSeed}
                          onChange={(e) => setProfileAvatarSeed(e.target.value)}
                          placeholder="Enter avatar seed or nickname..."
                          className="flex-1 px-3 py-1.5 text-xs bg-white border border-zinc-300 rounded-sm focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                        />
                        <button
                          type="button"
                          onClick={() =>
                            setProfileAvatarSeed(
                              AVATAR_SEEDS[Math.floor(Math.random() * AVATAR_SEEDS.length)] +
                                Math.floor(Math.random() * 100)
                            )
                          }
                          className="px-2.5 py-1.5 bg-white hover:bg-zinc-100 border border-zinc-300 rounded-sm text-xs font-semibold text-zinc-700 flex items-center gap-1 cursor-pointer shadow-2xs"
                          title="Generate Random Avatar"
                        >
                          <RefreshCw className="w-3.5 h-3.5" />
                          <span>Random</span>
                        </button>
                      </div>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {AVATAR_SEEDS.map((seed) => (
                          <button
                            key={seed}
                            type="button"
                            onClick={() => setProfileAvatarSeed(seed)}
                            className={`text-[10px] px-2 py-0.5 rounded-sm font-medium border cursor-pointer transition-all ${
                              profileAvatarSeed === seed
                                ? 'bg-blue-600 text-white border-blue-600 shadow-2xs'
                                : 'bg-white text-zinc-600 border-zinc-200 hover:bg-zinc-50'
                            }`}
                          >
                            {seed}
                          </button>
                        ))}
                      </div>
                    </>
                  ) : (
                    <div className="space-y-1">
                      <input
                        type="url"
                        value={customAvatarUrl}
                        onChange={(e) => setCustomAvatarUrl(e.target.value)}
                        placeholder="https://images.unsplash.com/... or GitHub avatar URL"
                        className="w-full px-3 py-1.5 text-xs bg-white border border-zinc-300 rounded-sm focus:ring-2 focus:ring-blue-500 focus:outline-hidden font-mono"
                      />
                      <p className="text-[10px] text-zinc-400">
                        Paste a direct image link (HTTPS) to use your own photo.
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Basic Info Fields: Full Name & Designation */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-zinc-700 mb-1.5">
                  Full Name *
                </label>
                <div className="relative">
                  <UserIcon className="w-4 h-4 text-zinc-400 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    required
                    value={profileName}
                    onChange={(e) => setProfileName(e.target.value)}
                    placeholder="e.g. Alex Morgan"
                    className="w-full pl-9 pr-3 py-2 text-xs border border-zinc-300 rounded-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-hidden"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-zinc-700 mb-1.5">
                  Job Title / Designation
                </label>
                <div className="relative">
                  <Briefcase className="w-4 h-4 text-zinc-400 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    value={profileTitle}
                    onChange={(e) => setProfileTitle(e.target.value)}
                    placeholder="e.g. Senior Full-Stack Architect"
                    className="w-full pl-9 pr-3 py-2 text-xs border border-zinc-300 rounded-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-hidden"
                  />
                </div>
              </div>
            </div>

            {/* Department & Presence Status */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-zinc-700 mb-1.5">
                  Department / Team
                </label>
                <div className="relative">
                  <Building className="w-4 h-4 text-zinc-400 absolute left-3 top-2.5" />
                  <select
                    value={profileDepartment}
                    onChange={(e) => setProfileDepartment(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 text-xs border border-zinc-300 rounded-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-hidden bg-white"
                  >
                    {DEPARTMENT_PRESETS.map((dept) => (
                      <option key={dept} value={dept}>
                        {dept}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-zinc-700 mb-1.5">
                  Presence Status
                </label>
                <div className="relative">
                  <Activity className="w-4 h-4 text-zinc-400 absolute left-3 top-2.5" />
                  <select
                    value={profileStatus}
                    onChange={(e) => setProfileStatus(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 text-xs border border-zinc-300 rounded-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-hidden bg-white"
                  >
                    {STATUS_PRESETS.map((st) => (
                      <option key={st.label} value={st.label}>
                        {st.emoji} {st.text}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Direct Contact & Timezone */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-zinc-700 mb-1.5">
                  Phone / Direct Contact
                </label>
                <div className="relative">
                  <Phone className="w-4 h-4 text-zinc-400 absolute left-3 top-2.5" />
                  <input
                    type="tel"
                    value={profilePhone}
                    onChange={(e) => setProfilePhone(e.target.value)}
                    placeholder="+966 50 123 4567 or +1 (555) 019"
                    className="w-full pl-9 pr-3 py-2 text-xs border border-zinc-300 rounded-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-hidden"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-zinc-700 mb-1.5">
                  Timezone
                </label>
                <div className="relative">
                  <Globe className="w-4 h-4 text-zinc-400 absolute left-3 top-2.5" />
                  <select
                    value={profileTimezone}
                    onChange={(e) => setProfileTimezone(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 text-xs border border-zinc-300 rounded-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-hidden bg-white"
                  >
                    {TIMEZONE_PRESETS.map((tz) => (
                      <option key={tz.value} value={tz.value}>
                        {tz.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Theme Accent Color */}
            <div>
              <label className="block text-xs font-bold text-zinc-700 mb-1.5">
                Personal Accent Color
              </label>
              <div className="flex items-center gap-2.5 pt-1">
                {COLOR_PRESETS.map((c) => (
                  <button
                    key={c.hex}
                    type="button"
                    onClick={() => setProfileColor(c.hex)}
                    style={{ backgroundColor: c.hex }}
                    className={`w-7 h-7 rounded-full transition-transform cursor-pointer ${
                      profileColor === c.hex
                        ? 'ring-2 ring-offset-2 ring-zinc-800 scale-110 shadow-sm'
                        : 'hover:scale-105 opacity-85 hover:opacity-100'
                    }`}
                    title={c.name}
                  />
                ))}
              </div>
            </div>

            {/* Bio / About */}
            <div>
              <label className="block text-xs font-bold text-zinc-700 mb-1.5">
                Bio & Focus Area
              </label>
              <textarea
                rows={2}
                value={profileBio}
                onChange={(e) => setProfileBio(e.target.value)}
                placeholder="Share your focus area, core hours, or collaboration style with the team..."
                className="w-full px-3 py-2 text-xs border border-zinc-300 rounded-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-hidden"
              />
            </div>

            {/* Submit Action */}
            <div className="flex items-center justify-end gap-3 pt-3 border-t border-zinc-100">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs font-semibold text-zinc-600 hover:text-zinc-800 hover:bg-zinc-100 rounded-sm cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSavingProfile}
                className="px-5 py-2.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-sm shadow-xs transition-colors cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
              >
                {isSavingProfile ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Saving to Firestore...</span>
                  </>
                ) : (
                  <>
                    <Check className="w-3.5 h-3.5" />
                    <span>Save Changes</span>
                  </>
                )}
              </button>
            </div>
          </form>
        )}

        {/* TAB 2: TEAM DIRECTORY */}
        {activeTab === 'team' && (
          <div className="p-5 sm:p-6 space-y-4 overflow-y-auto flex-1 sleek-scrollbar">
            {/* Top Bar: Search, Filters & Add Member Button */}
            <div className="flex flex-col sm:flex-row items-center gap-2.5">
              <div className="relative flex-1 w-full">
                <Search className="w-4 h-4 text-zinc-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  value={teamSearchQuery}
                  onChange={(e) => setTeamSearchQuery(e.target.value)}
                  placeholder="Search members by name, email, title, department..."
                  className="w-full pl-9 pr-3 py-2 text-xs border border-zinc-300 rounded-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-hidden"
                />
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto">
                <select
                  value={teamRoleFilter}
                  onChange={(e) => setTeamRoleFilter(e.target.value as any)}
                  className="px-2.5 py-2 text-xs border border-zinc-300 rounded-sm bg-white font-medium text-zinc-700 outline-hidden"
                >
                  <option value="all">All Roles</option>
                  <option value="admin">Admins</option>
                  <option value="manager">Managers</option>
                  <option value="member">Members</option>
                </select>

                <select
                  value={teamDeptFilter}
                  onChange={(e) => setTeamDeptFilter(e.target.value)}
                  className="px-2.5 py-2 text-xs border border-zinc-300 rounded-sm bg-white font-medium text-zinc-700 outline-hidden hidden sm:block"
                >
                  <option value="all">All Depts</option>
                  {DEPARTMENT_PRESETS.map((d) => (
                    <option key={d} value={d}>
                      {d}
                    </option>
                  ))}
                </select>

                <button
                  type="button"
                  onClick={() => setShowCreateMember(!showCreateMember)}
                  className="px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-sm text-xs font-bold flex items-center gap-1.5 transition-colors shrink-0 cursor-pointer shadow-xs"
                >
                  <Plus className="w-4 h-4" />
                  <span>Add Member</span>
                </button>
              </div>
            </div>

            {/* Create Member Inline Form */}
            {showCreateMember && (
              <form
                onSubmit={handleCreateMember}
                className="p-4 rounded-sm bg-blue-50/70 border border-blue-200 space-y-3 animate-in fade-in"
              >
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-blue-900 flex items-center gap-1.5">
                    <UserCheck className="w-4 h-4 text-blue-600" />
                    <span>Add New Workspace Colleague</span>
                  </h4>
                  <button
                    type="button"
                    onClick={() => setShowCreateMember(false)}
                    className="text-zinc-400 hover:text-zinc-600 cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <input
                    type="text"
                    required
                    value={newMemberName}
                    onChange={(e) => setNewMemberName(e.target.value)}
                    placeholder="Full Name (e.g. Maya Lin)"
                    className="px-3 py-1.5 text-xs bg-white border border-zinc-300 rounded-sm outline-hidden"
                  />
                  <input
                    type="email"
                    required
                    value={newMemberEmail}
                    onChange={(e) => setNewMemberEmail(e.target.value)}
                    placeholder="Email (e.g. maya@company.com)"
                    className="px-3 py-1.5 text-xs bg-white border border-zinc-300 rounded-sm outline-hidden"
                  />
                  <input
                    type="text"
                    value={newMemberTitle}
                    onChange={(e) => setNewMemberTitle(e.target.value)}
                    placeholder="Job Title (e.g. Product Designer)"
                    className="px-3 py-1.5 text-xs bg-white border border-zinc-300 rounded-sm outline-hidden"
                  />
                  <div className="grid grid-cols-2 gap-2">
                    <select
                      value={newMemberDept}
                      onChange={(e) => setNewMemberDept(e.target.value)}
                      className="px-2 py-1.5 text-xs bg-white border border-zinc-300 rounded-sm outline-hidden"
                    >
                      {DEPARTMENT_PRESETS.map((d) => (
                        <option key={d} value={d}>
                          {d}
                        </option>
                      ))}
                    </select>
                    <select
                      value={newMemberRole}
                      onChange={(e) => setNewMemberRole(e.target.value as any)}
                      className="px-2 py-1.5 text-xs bg-white border border-zinc-300 rounded-sm outline-hidden"
                    >
                      <option value="member">Member</option>
                      <option value="manager">Manager</option>
                      <option value="admin">Admin</option>
                    </select>
                  </div>
                </div>
                <div className="flex justify-end gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setShowCreateMember(false)}
                    className="px-3 py-1 text-xs text-zinc-600 hover:bg-zinc-200/60 rounded-sm cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isCreatingMember}
                    className="px-4 py-1.5 bg-blue-600 text-white rounded-sm text-xs font-bold hover:bg-blue-700 disabled:opacity-50 cursor-pointer shadow-xs"
                  >
                    {isCreatingMember ? 'Creating...' : 'Confirm & Save Member'}
                  </button>
                </div>
              </form>
            )}

            {/* Member Profile Quick Inspector Modal/Drawer */}
            {selectedMemberDetail && (
              <div className="p-4 rounded-sm border border-blue-200 bg-blue-50/50 space-y-3 animate-in fade-in">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <Avatar
                      src={selectedMemberDetail.avatar}
                      name={selectedMemberDetail.name}
                      size="lg"
                      className="ring-2 ring-blue-500/20"
                    />
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="text-sm font-bold text-zinc-900">{selectedMemberDetail.name}</h4>
                        <span
                          className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-full ${
                            selectedMemberDetail.role === 'admin'
                              ? 'bg-rose-100 text-rose-700'
                              : selectedMemberDetail.role === 'manager'
                              ? 'bg-amber-100 text-amber-700'
                              : 'bg-blue-100 text-blue-700'
                          }`}
                        >
                          {selectedMemberDetail.role}
                        </span>
                      </div>
                      <p className="text-xs text-zinc-600">
                        {selectedMemberDetail.title || 'Team Member'}{' '}
                        {selectedMemberDetail.department ? `• ${selectedMemberDetail.department}` : ''}
                      </p>
                      <div className="flex items-center gap-3 text-[11px] text-zinc-500 mt-1">
                        <span className="font-mono">{selectedMemberDetail.email}</span>
                        {selectedMemberDetail.phone && <span>📞 {selectedMemberDetail.phone}</span>}
                      </div>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSelectedMemberDetail(null)}
                    className="text-zinc-400 hover:text-zinc-600 p-1 rounded-sm cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {selectedMemberDetail.bio && (
                  <p className="text-xs text-zinc-600 bg-white/80 p-2.5 rounded-sm border border-blue-100 italic">
                    "{selectedMemberDetail.bio}"
                  </p>
                )}

                {/* Member Activity Stats */}
                <div className="grid grid-cols-3 gap-2 pt-1 text-center">
                  <div className="p-2 bg-white rounded-sm border border-zinc-200">
                    <div className="text-xs font-bold text-blue-600">
                      {isLoadingMemberStats ? '...' : selectedMemberStats?.ownedProjectsCount ?? 0}
                    </div>
                    <div className="text-[9px] text-zinc-400 font-bold uppercase">Projects</div>
                  </div>
                  <div className="p-2 bg-white rounded-sm border border-zinc-200">
                    <div className="text-xs font-bold text-amber-600">
                      {isLoadingMemberStats ? '...' : selectedMemberStats?.assignedTasksCount ?? 0}
                    </div>
                    <div className="text-[9px] text-zinc-400 font-bold uppercase">Assigned</div>
                  </div>
                  <div className="p-2 bg-white rounded-sm border border-zinc-200">
                    <div className="text-xs font-bold text-emerald-600">
                      {isLoadingMemberStats ? '...' : selectedMemberStats?.completedTasksCount ?? 0}
                    </div>
                    <div className="text-[9px] text-zinc-400 font-bold uppercase">Completed</div>
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2 pt-2 border-t border-blue-100">
                  <button
                    type="button"
                    onClick={() => handleSelectUser(selectedMemberDetail.id)}
                    className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-sm text-xs font-bold flex items-center gap-1 cursor-pointer transition-colors shadow-2xs"
                  >
                    <span>Switch to this user</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            )}

            {/* Team Members List */}
            <div className="space-y-2.5">
              {filteredUsers.length === 0 ? (
                <div className="text-center py-8 bg-zinc-50 rounded-sm border border-dashed border-zinc-200">
                  <p className="text-xs font-bold text-zinc-600">No members match your search criteria</p>
                  <p className="text-[11px] text-zinc-400 mt-0.5">
                    Try searching with another keyword or change role/department filter
                  </p>
                </div>
              ) : (
                filteredUsers.map((user) => {
                  const isCurrent = user.id === currentUser?.id;
                  return (
                    <div
                      key={user.id}
                      className={`p-3.5 rounded-sm border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                        isCurrent
                          ? 'border-blue-500 bg-blue-50/40 shadow-xs'
                          : 'border-zinc-200 bg-white hover:border-blue-200'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className="relative shrink-0">
                          <Avatar
                            src={user.avatar}
                            name={user.name}
                            size="md"
                            className="ring-1 ring-zinc-200"
                          />
                          <span
                            className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full ring-2 ring-white"
                            style={{ backgroundColor: user.color || '#10B981' }}
                            title={user.statusText || 'Active'}
                          />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-zinc-900">{user.name}</span>
                            {isCurrent && (
                              <span className="text-[9px] font-bold px-1.5 py-0.2 rounded-sm bg-blue-600 text-white">
                                You (Active)
                              </span>
                            )}
                            <span
                              className={`text-[10px] font-bold px-2 py-0.5 rounded-full capitalize ${
                                user.role === 'admin'
                                  ? 'bg-rose-100 text-rose-700'
                                  : user.role === 'manager'
                                  ? 'bg-amber-100 text-amber-700'
                                  : 'bg-zinc-100 text-zinc-700'
                              }`}
                            >
                              {user.role}
                            </span>
                          </div>
                          <p className="text-[11px] text-zinc-500">
                            {user.title || 'Team Member'} {user.department ? `• ${user.department}` : ''}
                          </p>
                          {user.email && (
                            <p className="text-[10px] text-zinc-400 font-mono">{user.email}</p>
                          )}
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-2 self-end sm:self-center">
                        <button
                          type="button"
                          onClick={() => setSelectedMemberDetail(user)}
                          className="p-1.5 text-zinc-400 hover:text-blue-600 hover:bg-blue-50 rounded-sm transition-colors cursor-pointer"
                          title="View Profile Details & Stats"
                        >
                          <Eye className="w-4 h-4" />
                        </button>

                        {/* Role dropdown for admins */}
                        {currentUser?.role === 'admin' && (
                          <select
                            value={user.role}
                            onChange={(e) => updateWorkspaceRole(user.id, e.target.value as any)}
                            className="px-2 py-1 text-[11px] border border-zinc-200 rounded-sm bg-zinc-50 text-zinc-700 outline-hidden font-medium cursor-pointer"
                          >
                            <option value="member">Member</option>
                            <option value="manager">Manager</option>
                            <option value="admin">Admin</option>
                          </select>
                        )}

                        {!isCurrent ? (
                          <>
                            <button
                              type="button"
                              onClick={() => handleSelectUser(user.id)}
                              className="px-2.5 py-1 text-xs font-bold text-blue-600 hover:bg-blue-50 rounded-sm border border-blue-200 transition-colors cursor-pointer"
                              title="Switch active user view"
                            >
                              Switch User
                            </button>
                            {currentUser?.role === 'admin' && (
                              <button
                                type="button"
                                onClick={() => handleDeleteMember(user.id, user.name)}
                                className="p-1.5 text-zinc-400 hover:text-rose-600 hover:bg-rose-50 rounded-sm transition-colors cursor-pointer"
                                title="Remove team member"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )}
                          </>
                        ) : (
                          <div className="flex items-center gap-1 text-blue-600 text-xs font-bold px-2 py-1">
                            <Check className="w-4 h-4" />
                            <span>Logged In</span>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}

        {/* TAB 3: WORKSPACE STATS & ANALYTICS */}
        {activeTab === 'analytics' && (
          <div className="p-5 sm:p-6 space-y-5 overflow-y-auto flex-1 sleek-scrollbar">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-zinc-900">Your Workspace Analytics</h3>
                <p className="text-xs text-zinc-500">
                  Real-time metrics of your contributions across projects and tasks
                </p>
              </div>
              <span className="text-xs font-mono font-bold text-blue-600 bg-blue-50 px-2.5 py-1 rounded-sm border border-blue-100">
                {completionRate}% Completion Rate
              </span>
            </div>

            {/* Metrics Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="p-4 bg-blue-50/50 rounded-sm border border-blue-100">
                <div className="text-2xl font-black text-blue-600">
                  {isLoadingStats ? '...' : userStats.ownedProjectsCount}
                </div>
                <div className="text-xs font-bold text-blue-950 mt-0.5">Created Projects</div>
                <p className="text-[10px] text-zinc-500 mt-1">Projects initiated and led by you</p>
              </div>

              <div className="p-4 bg-amber-50/50 rounded-sm border border-amber-100">
                <div className="text-2xl font-black text-amber-600">
                  {isLoadingStats ? '...' : userStats.assignedTasksCount}
                </div>
                <div className="text-xs font-bold text-amber-950 mt-0.5">Assigned Tasks</div>
                <p className="text-[10px] text-zinc-500 mt-1">Total active & completed tasks</p>
              </div>

              <div className="p-4 bg-emerald-50/50 rounded-sm border border-emerald-100">
                <div className="text-2xl font-black text-emerald-600">
                  {isLoadingStats ? '...' : userStats.completedTasksCount}
                </div>
                <div className="text-xs font-bold text-emerald-950 mt-0.5">Completed Tasks</div>
                <p className="text-[10px] text-zinc-500 mt-1">Tasks marked as Done</p>
              </div>
            </div>

            {/* Progress Bar */}
            <div className="p-4 rounded-sm bg-zinc-50 border border-zinc-200/80 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-zinc-700">Task Completion Progress</span>
                <span className="font-bold text-zinc-900">
                  {userStats.completedTasksCount} / {userStats.assignedTasksCount} tasks
                </span>
              </div>
              <div className="w-full h-2.5 bg-zinc-200 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-indigo-500 to-emerald-500 rounded-full transition-all duration-500"
                  style={{ width: `${completionRate}%` }}
                />
              </div>
            </div>

            {/* Account Details Box */}
            <div className="p-4 rounded-sm border border-zinc-200 space-y-2.5">
              <h4 className="text-xs font-bold text-zinc-800">Account Summary</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                <div className="flex items-center justify-between p-2 bg-zinc-50 rounded-sm">
                  <span className="text-zinc-500">Timezone:</span>
                  <span className="font-bold text-zinc-800">{currentUser?.timezone || 'UTC'}</span>
                </div>
                <div className="flex items-center justify-between p-2 bg-zinc-50 rounded-sm">
                  <span className="text-zinc-500">Department:</span>
                  <span className="font-bold text-zinc-800">{currentUser?.department || 'Engineering'}</span>
                </div>
                <div className="flex items-center justify-between p-2 bg-zinc-50 rounded-sm">
                  <span className="text-zinc-500">Workspace Role:</span>
                  <span className="font-bold text-blue-600 capitalize">{currentUser?.role || 'Member'}</span>
                </div>
                <div className="flex items-center justify-between p-2 bg-zinc-50 rounded-sm">
                  <span className="text-zinc-500">Live Status:</span>
                  <span className="font-bold text-emerald-600">{currentUser?.statusText || 'Active'}</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 4: SECURITY & ACCOUNT */}
        {activeTab === 'security' && (
          <div className="p-5 sm:p-6 space-y-5 overflow-y-auto flex-1 sleek-scrollbar">
            {securitySuccessMsg && (
              <div className="p-3.5 rounded-sm bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 flex items-center gap-2 animate-in fade-in">
                <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
                <span className="font-bold">{securitySuccessMsg}</span>
              </div>
            )}
            {securityErrorMsg && (
              <div className="p-3.5 rounded-sm bg-rose-50 border border-rose-200 text-xs text-rose-800 flex items-center gap-2 animate-in fade-in">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                <span className="font-semibold">{securityErrorMsg}</span>
              </div>
            )}

            {/* Auth Provider Summary */}
            <div className="p-4 rounded-sm bg-zinc-50 border border-zinc-200 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xs font-bold text-zinc-800">Authentication & Cloud Identity</h3>
                  <p className="text-[11px] text-zinc-500">
                    {firebaseUser
                      ? firebaseUser.isAnonymous
                        ? 'Connected as Anonymous Guest'
                        : `Signed in as ${firebaseUser.email || firebaseUser.displayName}`
                      : 'Not signed in'}
                  </p>
                </div>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                  Active
                </span>
              </div>

              <div className="flex items-center justify-between text-xs text-zinc-600 font-mono bg-white p-2.5 rounded-sm border border-zinc-200">
                <div className="truncate max-w-[280px]">
                  <span className="text-zinc-400">UID: </span>
                  <span className="text-zinc-800 font-bold">{firebaseUser?.uid || currentUser?.id}</span>
                </div>
                <button
                  type="button"
                  onClick={() => copyToClipboard(firebaseUser?.uid || currentUser?.id || '', 'uid')}
                  className="px-2 py-1 text-[10px] font-bold text-blue-600 hover:bg-blue-50 rounded-sm transition-colors flex items-center gap-1 cursor-pointer"
                >
                  {copiedField === 'uid' ? (
                    <>
                      <CheckCheck className="w-3 h-3 text-emerald-600" />
                      <span>Copied!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3 h-3" />
                      <span>Copy</span>
                    </>
                  )}
                </button>
              </div>

              {firebaseUser && !firebaseUser.isAnonymous && (
                <div className="flex items-center justify-between pt-2 border-t border-zinc-200 text-xs">
                  <span className="text-zinc-600">
                    Email Status: {firebaseUser.emailVerified ? '✅ Verified' : '⚠️ Not Verified'}
                  </span>
                  {!firebaseUser.emailVerified && (
                    <button
                      type="button"
                      disabled={isSendingVerify}
                      onClick={handleSendVerifyEmail}
                      className="px-2.5 py-1 text-xs font-bold text-blue-600 hover:bg-blue-50 rounded-sm cursor-pointer disabled:opacity-50"
                    >
                      {isSendingVerify ? 'Sending...' : 'Send Verification Email'}
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* Password Management */}
            {firebaseUser && !firebaseUser.isAnonymous && (
              <div className="p-4 rounded-sm border border-zinc-200 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <KeyRound className="w-4 h-4 text-zinc-600" />
                    <h3 className="text-xs font-bold text-zinc-800">Password Management</h3>
                  </div>
                  <button
                    type="button"
                    disabled={isSendingReset}
                    onClick={handleSendResetEmail}
                    className="text-xs font-bold text-blue-600 hover:text-blue-800 cursor-pointer disabled:opacity-50"
                  >
                    {isSendingReset ? 'Sending...' : 'Send Reset Link to Email'}
                  </button>
                </div>

                <form onSubmit={handleChangePassword} className="space-y-3 pt-1">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <input
                      type="password"
                      placeholder="New Password (min 6 chars)"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      className="px-3 py-2 text-xs border border-zinc-300 rounded-sm outline-hidden focus:ring-2 focus:ring-blue-500"
                    />
                    <input
                      type="password"
                      placeholder="Confirm New Password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="px-3 py-2 text-xs border border-zinc-300 rounded-sm outline-hidden focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div className="flex justify-end">
                    <button
                      type="submit"
                      disabled={isUpdatingPassword || !newPassword}
                      className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-sm text-xs font-bold transition-colors cursor-pointer disabled:opacity-50 shadow-xs"
                    >
                      {isUpdatingPassword ? 'Updating...' : 'Update Password Directly'}
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* Purge Demo Data & Danger Zone */}
            <div className="p-4 rounded-sm border border-rose-100 bg-rose-50/40 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-bold text-rose-900">Clean Workspace / Purge Demo Data</h4>
                  <p className="text-[11px] text-rose-700">
                    Permanently delete older demo project seeds to keep workspace clean.
                  </p>
                </div>
                <button
                  type="button"
                  disabled={isPurging}
                  onClick={handlePurgeDemoProjects}
                  className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-sm text-xs font-bold transition-colors cursor-pointer disabled:opacity-50 shadow-2xs"
                >
                  {isPurging ? 'Purging...' : 'Purge Demo Data'}
                </button>
              </div>
              {purgeMsg && <p className="text-xs text-rose-800 font-medium">{purgeMsg}</p>}
            </div>

            {/* Logout & Switch Account */}
            <div className="flex items-center justify-between pt-2 border-t border-zinc-200">
              <button
                type="button"
                onClick={handleOpenAuth}
                className="text-xs font-bold text-blue-600 hover:underline cursor-pointer flex items-center gap-1"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Switch to another account / Sign In</span>
              </button>

              <button
                type="button"
                onClick={handleLogout}
                className="px-4 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-sm text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Sign Out</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
