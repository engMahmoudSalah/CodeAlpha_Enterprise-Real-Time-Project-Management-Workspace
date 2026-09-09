import React, { useState } from 'react';
import { Project } from '../types';
import { useAuth } from '../context/AuthContext';
import { LivePresenceBar } from './LivePresenceBar';
import { NotificationsPopover } from './NotificationsPopover';
import {
  Search,
  ChevronDown,
  Plus,
  History,
  Users,
  X,
  Menu,
  Mail,
  
} from 'lucide-react';
import { Avatar } from '../designSystem';

interface HeaderProps {
  projects: Project[];
  activeProject: Project | null;
  onSelectProject: (projectId: string) => void;
  viewMode?: 'board' | 'list';
  onChangeViewMode?: (mode: 'board' | 'list') => void;
  searchQuery: string;
  onChangeSearchQuery: (query: string) => void;
  onOpenCreateProject: () => void;
  onOpenMembersModal: () => void;
  onOpenActivityDrawer: () => void;
  onOpenUserSwitcher: () => void;
  onSelectTaskFromNotif: (taskId: string, projectId: string) => void;
  onToggleMobileMenu?: () => void;
  sidebarCollapsed?: boolean;
  onToggleSidebar?: () => void;
  onOpenAuthModal?: () => void;
  onOpenLandingPage?: () => void;
  pendingInvitationsCount?: number;
  onOpenPendingInvitations?: () => void;
  isMyTasksOnly?: boolean;
  onToggleMyTasksOnly?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  projects,
  activeProject,
  onSelectProject,
  searchQuery,
  onChangeSearchQuery,
  onOpenCreateProject,
  onOpenMembersModal,
  onOpenActivityDrawer,
  onOpenUserSwitcher,
  onSelectTaskFromNotif,
  onToggleMobileMenu,
  onOpenAuthModal,
  onOpenLandingPage,
  pendingInvitationsCount = 0,
  onOpenPendingInvitations,
}) => {
  const { currentUser, firebaseUser } = useAuth();
  const [projectDropdownOpen, setProjectDropdownOpen] = useState(false);
  const [showMobileSearch, setShowMobileSearch] = useState(false);

  return (
    <header
      id="main-header"
      className="h-16 bg-white border-b border-zinc-200/90 flex items-center justify-between px-3.5 sm:px-6 lg:px-8 shrink-0 z-30 relative select-none"
    >
      {/* Left Section: Mobile Menu Toggle + Brand Logo + Mobile Project Selector */}
      <div className="flex items-center gap-2.5 sm:gap-4 shrink-0">
        {/* Mobile Hamburger Toggle (Touch target 44px) */}
        <button
          id="mobile-nav-toggle-btn"
          onClick={onToggleMobileMenu}
          aria-label="Open mobile navigation"
          className="md:hidden flex items-center justify-center w-10 h-10 -ml-1 text-zinc-500 hover:text-zinc-800 hover:bg-zinc-100 rounded-sm transition-colors cursor-pointer shrink-0"
        >
          <Menu className="w-5 h-5" />
        </button>

        {/* Brand Logo - Flat, Modern & Elegant */}
        <div className="flex items-center gap-2.5 shrink-0">
          <div className="w-8 h-8 sm:w-9 sm:h-9 bg-blue-600 rounded-sm flex items-center justify-center text-white font-black text-base sm:text-lg tracking-wider shrink-0 shadow-xs">
            V
          </div>
          <div className="flex flex-col">
            <span className="font-extrabold text-base sm:text-lg tracking-tight text-zinc-900 leading-none">
              Velocity
            </span>
            <span className="text-[10px] font-semibold text-zinc-400 hidden sm:inline leading-tight mt-0.5">
              Work Management
            </span>
          </div>
        </div>

        {/* Mobile/Compact Project Selector Dropdown */}
        <div className="relative md:hidden ml-1">
          <button
            id="mobile-project-dropdown-btn"
            onClick={() => setProjectDropdownOpen(!projectDropdownOpen)}
            className="flex items-center gap-1.5 px-2.5 py-1.5 h-9 rounded-sm border border-zinc-200 bg-zinc-50/50 text-xs font-semibold text-zinc-700 hover:bg-zinc-100/80 transition-colors cursor-pointer"
          >
            <span
              className="w-2 h-2 rounded-full shrink-0"
              style={{ backgroundColor: activeProject?.color || '#6366F1' }}
            />
            <span className="max-w-[110px] truncate text-xs font-medium">
              {activeProject ? activeProject.name : 'Select Project'}
            </span>
            <ChevronDown className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
          </button>

          {projectDropdownOpen && (
            <div className="absolute left-0 mt-2 w-64 bg-white rounded-sm border border-zinc-200 shadow-sm z-50 p-1.5 space-y-1 animate-in fade-in duration-100">
              <div className="px-2.5 py-1.5 text-[10px] font-bold text-zinc-400 uppercase tracking-wider">
                Switch Project
              </div>
              <div className="max-h-60 overflow-y-auto space-y-1">
                {Array.from(new Map<string, Project>(projects.map((p) => [p.id, p])).values()).map((p) => (
                  <button
                    key={p.id}
                    onClick={() => {
                      onSelectProject(p.id);
                      setProjectDropdownOpen(false);
                    }}
                    className={`w-full flex items-center justify-between px-3 py-2 text-xs rounded-sm text-left transition-colors cursor-pointer ${
                      activeProject?.id === p.id
                        ? 'bg-blue-50 text-blue-700 font-bold'
                        : 'text-zinc-700 hover:bg-zinc-50'
                    }`}
                  >
                    <span className="truncate flex items-center gap-2">
                      <span
                        className="w-2 h-2 rounded-full shrink-0"
                        style={{ backgroundColor: p.color || '#6366F1' }}
                      />
                      <span className="truncate">{p.name}</span>
                    </span>
                  </button>
                ))}
              </div>
              <div className="pt-1.5 border-t border-zinc-100">
                <button
                  onClick={() => {
                    setProjectDropdownOpen(false);
                    onOpenCreateProject();
                  }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-xs text-blue-600 font-bold hover:bg-blue-50 rounded-sm transition-colors cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>Create Project</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Right Section: Search + Live Status + Utility Tools + User Profile */}
      <div className="flex items-center gap-1.5 sm:gap-2 lg:gap-3">
        {/* Search Bar - Desktop & Tablet */}
        <div className="relative group hidden sm:block">
          <span className="absolute left-3 top-2.5 text-zinc-400 pointer-events-none">
            <Search className="h-4 w-4" />
          </span>
          <input
            id="search-tasks-input"
            type="text"
            value={searchQuery}
            onChange={(e) => onChangeSearchQuery(e.target.value)}
            placeholder="Search tasks, tags..."
            className="bg-zinc-100/90 hover:bg-zinc-100 focus:bg-white border border-zinc-200/80 rounded-sm py-2 pl-9 pr-7 text-xs w-36 sm:w-48 md:w-60 lg:w-72 focus:border-blue-400 focus:ring-2 focus:ring-blue-100 focus:outline-hidden transition-all text-zinc-800"
          />
          {searchQuery && (
            <button
              onClick={() => onChangeSearchQuery('')}
              className="absolute right-2.5 top-2.5 text-zinc-400 hover:text-zinc-600 p-0.5 cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Mobile Search Toggle */}
        <button
          onClick={() => setShowMobileSearch(!showMobileSearch)}
          className="sm:hidden flex items-center justify-center w-10 h-10 text-zinc-500 hover:text-zinc-800 hover:bg-zinc-100 rounded-sm transition-colors cursor-pointer"
          aria-label="Toggle search"
        >
          <Search className="w-4 h-4" />
        </button>

        {/* Live Presence indicator */}
        <div className="hidden xl:block">
          <LivePresenceBar />
        </div>

        {/* Pending Invitations Inbox Icon */}
        {onOpenPendingInvitations && (
          <button
            id="header-invitations-btn"
            onClick={onOpenPendingInvitations}
            title="Project Invitations"
            className="relative flex items-center justify-center w-9 h-9 sm:w-10 sm:h-10 rounded-sm text-zinc-500 hover:text-zinc-800 hover:bg-zinc-100 transition-colors cursor-pointer"
          >
            <Mail className="w-4 h-4" />
            {pendingInvitationsCount > 0 && (
              <span className="absolute top-1.5 right-1.5 w-4 h-4 bg-blue-600 text-white text-[10px] font-bold rounded-full flex items-center justify-center ring-2 ring-white">
                {pendingInvitationsCount}
              </span>
            )}
          </button>
        )}

        {/* Team Members Button (Desktop/Tablet) */}
        <button
          id="header-team-btn"
          onClick={onOpenMembersModal}
          title="Team Members"
          aria-label="View team members"
          className="hidden md:flex items-center justify-center w-9 h-9 sm:w-10 sm:h-10 rounded-sm text-zinc-500 hover:text-zinc-800 hover:bg-zinc-100 transition-colors cursor-pointer"
        >
          <Users className="w-4 h-4" />
        </button>

        {/* Activity Stream Button (Desktop/Tablet) */}
        <button
          id="activity-stream-btn"
          onClick={onOpenActivityDrawer}
          title="Activity Log"
          aria-label="View activity log"
          className="hidden sm:flex items-center justify-center w-9 h-9 sm:w-10 sm:h-10 rounded-sm text-zinc-500 hover:text-zinc-800 hover:bg-zinc-100 transition-colors cursor-pointer"
        >
          <History className="w-4 h-4" />
        </button>

        {/* Real-time Notifications Popover */}
        <NotificationsPopover
          onSelectTask={onSelectTaskFromNotif}
          onOpenPendingInvitations={onOpenPendingInvitations}
        />

        {/* Landing Page Trigger Button */}

        {/* Firebase Auth Quick Trigger Button if not signed in with email/google */}
        {(!firebaseUser || firebaseUser.isAnonymous) && onOpenAuthModal && (
          <button
            id="header-signin-btn"
            onClick={onOpenAuthModal}
            className="hidden sm:flex items-center gap-1.5 py-1.5 px-3 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-sm text-xs font-bold transition-all border border-blue-200 cursor-pointer"
          >
            <span>Sign In</span>
          </button>
        )}

        {/* User Profile Block */}
        {currentUser && (
          <div
            id="user-profile-switcher-btn"
            onClick={onOpenUserSwitcher}
            className="flex items-center gap-2 sm:gap-2.5 pl-2 sm:pl-3 border-l border-zinc-200 cursor-pointer group select-none min-h-[40px]"
            title={`Account & Team Profile: ${currentUser.name} (${currentUser.statusText || 'Active'})`}
          >
            <div className="text-right hidden md:block">
              <div className="flex items-center justify-end gap-1.5">
                <p className="text-xs font-bold leading-none text-zinc-800 group-hover:text-blue-600 transition-colors">
                  {currentUser.name}
                </p>
                <span className="text-[9px] px-1.5 py-0.2 bg-zinc-100 text-zinc-600 rounded-sm font-bold uppercase">
                  {currentUser.role}
                </span>
              </div>
              <p className="text-[10px] text-zinc-400 mt-1 font-medium truncate max-w-[140px]">
                {currentUser.statusText ? `${currentUser.statusText} • ` : ''}
                {currentUser.title || currentUser.department || 'Team Member'}
              </p>
            </div>
            <div className="relative">
              <Avatar
                src={currentUser.avatar}
                name={currentUser.name}
                size="sm"
                className="ring-1 ring-zinc-200 group-hover:ring-blue-400 transition-all"
              />
              <span
                className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full ring-2 ring-white"
                style={{ backgroundColor: currentUser.color || '#10B981' }}
                title={currentUser.statusText || 'Active'}
              />
            </div>
          </div>
        )}
      </div>

      {/* Expandable Mobile Search Overlay */}
      {showMobileSearch && (
        <div className="sm:hidden absolute top-16 left-0 right-0 bg-white border-b border-zinc-200 p-3 z-40 flex items-center gap-2 animate-in slide-in-from-top-2 duration-150 shadow-sm">
          <div className="relative flex-1">
            <span className="absolute left-3 top-2.5 text-zinc-400">
              <Search className="h-4 w-4" />
            </span>
            <input
              type="text"
              autoFocus
              value={searchQuery}
              onChange={(e) => onChangeSearchQuery(e.target.value)}
              placeholder="Search tasks by title, tag, or description..."
              className="w-full bg-zinc-100 rounded-sm py-2.5 pl-9 pr-8 text-xs text-zinc-800 focus:bg-white focus:border-blue-500 border border-transparent outline-hidden"
            />
            {searchQuery && (
              <button
                onClick={() => onChangeSearchQuery('')}
                className="absolute right-2.5 top-2.5 text-zinc-400 hover:text-zinc-600 p-0.5"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
          <button
            onClick={() => setShowMobileSearch(false)}
            className="text-xs font-semibold text-zinc-600 hover:text-zinc-900 px-2 py-2 cursor-pointer"
          >
            Close
          </button>
        </div>
      )}
    </header>
  );
};
