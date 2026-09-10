import React, { useState, useEffect, useRef } from 'react';
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
  MoreHorizontal,
  LogIn,
  UserCheck,
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
  pendingInvitationsCount = 0,
  onOpenPendingInvitations,
}) => {
  const { currentUser, firebaseUser } = useAuth();
  const [projectDropdownOpen, setProjectDropdownOpen] = useState(false);
  const [showMobileSearch, setShowMobileSearch] = useState(false);
  const [toolsDropdownOpen, setToolsDropdownOpen] = useState(false);

  const projectDropdownRef = useRef<HTMLDivElement>(null);
  const toolsDropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        projectDropdownRef.current &&
        !projectDropdownRef.current.contains(event.target as Node)
      ) {
        setProjectDropdownOpen(false);
      }
      if (
        toolsDropdownRef.current &&
        !toolsDropdownRef.current.contains(event.target as Node)
      ) {
        setToolsDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Global Cmd+K / Ctrl+K listener for Command Palette Search
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        const searchInput = document.getElementById('search-tasks-input') as HTMLInputElement;
        if (searchInput) {
          searchInput.focus();
          searchInput.select();
        } else {
          setShowMobileSearch(true);
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <header
      id="main-header"
      className="h-14 sm:h-16 bg-white/98 backdrop-blur-md border-b border-zinc-200/90 flex items-center justify-between px-2.5 sm:px-4 lg:px-6 shrink-0 z-40 sticky top-0 select-none w-full max-w-[1920px] mx-auto overflow-visible"
    >
      {/* Group 1: Brand & Project Selector */}
      <div className="flex items-center gap-1.5 sm:gap-3 shrink-0 min-w-0">
        {/* Mobile Hamburger Toggle */}
        <button
          id="mobile-nav-toggle-btn"
          onClick={onToggleMobileMenu}
          aria-label="Open mobile navigation"
          className="md:hidden flex items-center justify-center w-8 h-8 sm:w-9 sm:h-9 text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100 rounded-sm transition-colors cursor-pointer shrink-0"
        >
          <Menu className="w-5 h-5" />
        </button>

        {/* Brand Logo */}
        <div className="flex items-center gap-2 shrink-0">
          <div className="w-8 h-8 bg-blue-600 rounded-sm flex items-center justify-center text-white font-black text-base tracking-wider shrink-0 shadow-xs">
            V
          </div>
          <div className="flex flex-col">
            <span className="font-extrabold text-sm sm:text-base tracking-tight text-zinc-900 leading-none">
              Velocity
            </span>
            <span className="text-[10px] font-semibold text-zinc-400 hidden xl:inline leading-tight mt-0.5">
              Work Management
            </span>
          </div>
        </div>

        {/* Compact Project Switcher Pill */}
        <div className={`relative shrink min-w-0 ${projectDropdownOpen ? 'z-[60]' : ''}`} ref={projectDropdownRef}>
          <button
            id="mobile-project-dropdown-btn"
            onClick={() => setProjectDropdownOpen(!projectDropdownOpen)}
            className="flex items-center gap-1.5 px-2 py-1 h-8 rounded-sm border border-zinc-200 bg-zinc-50/80 text-xs font-semibold text-zinc-700 hover:bg-zinc-100 transition-colors cursor-pointer max-w-[90px] xs:max-w-[120px] sm:max-w-[160px] truncate"
          >
            <span
              className="w-2 h-2 rounded-full shrink-0"
              style={{ backgroundColor: activeProject?.color || '#6366F1' }}
            />
            <span className="truncate text-xs font-semibold text-zinc-800">
              {activeProject ? activeProject.name : 'Project'}
            </span>
            <ChevronDown className="w-3 h-3 text-zinc-400 shrink-0 ml-auto" />
          </button>

          {projectDropdownOpen && (
            <div className="absolute left-0 mt-2 w-56 bg-white rounded-lg border border-zinc-200 shadow-2xl z-[60] p-1 space-y-0.5 animate-in fade-in duration-100">
              <div className="px-2.5 py-1.5 text-[10px] font-bold text-zinc-400 uppercase tracking-wider">
                Switch Project
              </div>
              <div className="max-h-52 overflow-y-auto space-y-0.5">
                {Array.from(new Map<string, Project>(projects.map((p) => [p.id, p])).values()).map((p) => (
                  <button
                    key={p.id}
                    onClick={() => {
                      onSelectProject(p.id);
                      setProjectDropdownOpen(false);
                    }}
                    className={`w-full flex items-center justify-between px-2.5 py-1.5 text-xs rounded-md text-left transition-colors cursor-pointer ${
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
                  className="w-full flex items-center gap-2 px-2.5 py-1.5 text-xs text-blue-600 font-bold hover:bg-blue-50 rounded-md transition-colors cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>Create Project</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Group 2: Center Search Command Bar */}
      <div className="flex-1 max-w-md mx-2 sm:mx-4 hidden sm:flex items-center justify-center">
        <div className="relative group w-full max-w-sm">
          <span className="absolute left-2.5 top-2.5 text-zinc-400 pointer-events-none">
            <Search className="h-3.5 w-3.5" />
          </span>
          <input
            id="search-tasks-input"
            type="text"
            value={searchQuery}
            onChange={(e) => onChangeSearchQuery(e.target.value)}
            placeholder="Search tasks, tags..."
            className="w-full bg-zinc-100/90 hover:bg-zinc-100 focus:bg-white border border-zinc-200/80 rounded-sm py-1.5 pl-8 pr-12 text-xs focus:border-blue-500 focus:ring-2 focus:ring-blue-100 focus:outline-hidden transition-all text-zinc-800 font-medium"
          />
          <div className="absolute right-2 top-2 flex items-center gap-1">
            {searchQuery ? (
              <button
                onClick={() => onChangeSearchQuery('')}
                className="text-zinc-400 hover:text-zinc-600 p-0.5 cursor-pointer rounded"
                title="Clear search"
              >
                <X className="w-3 h-3" />
              </button>
            ) : (
              <kbd className="hidden lg:inline-flex items-center px-1.5 py-0.5 text-[9px] font-mono font-semibold text-zinc-400 bg-zinc-200/60 border border-zinc-300/50 rounded pointer-events-none">
                ⌘K
              </kbd>
            )}
          </div>
        </div>
      </div>

      {/* Group 3: Right Action Dock & Profile Center */}
      <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
        {/* Mobile Search Button (< sm) */}
        <button
          onClick={() => setShowMobileSearch(!showMobileSearch)}
          className="sm:hidden flex items-center justify-center w-8 h-8 text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100 rounded-sm transition-colors cursor-pointer"
          aria-label="Toggle search"
        >
          <Search className="w-4 h-4" />
        </button>

        {/* Live Presence indicator (Desktop lg+) */}
        <div className="hidden lg:block">
          <LivePresenceBar />
        </div>

        {/* Desktop Quick Tools Dock (lg+) */}
        <div className="hidden lg:flex items-center gap-1 bg-zinc-100/80 p-0.5 rounded-sm border border-zinc-200/80">
          {onOpenPendingInvitations && (
            <button
              id="header-invitations-btn"
              onClick={onOpenPendingInvitations}
              title="Project Invitations"
              className="relative flex items-center justify-center w-8 h-8 rounded-sm text-zinc-600 hover:text-zinc-900 hover:bg-white transition-colors cursor-pointer"
            >
              <Mail className="w-4 h-4" />
              {pendingInvitationsCount > 0 && (
                <span className="absolute top-1 right-1 w-3.5 h-3.5 bg-blue-600 text-white text-[9px] font-bold rounded-full flex items-center justify-center ring-2 ring-white">
                  {pendingInvitationsCount}
                </span>
              )}
            </button>
          )}

          <button
            id="header-team-btn"
            onClick={onOpenMembersModal}
            title="Team Members Directory"
            className="flex items-center justify-center w-8 h-8 rounded-sm text-zinc-600 hover:text-zinc-900 hover:bg-white transition-colors cursor-pointer"
          >
            <Users className="w-4 h-4" />
          </button>

          <button
            id="activity-stream-btn"
            onClick={onOpenActivityDrawer}
            title="Activity Stream Log"
            className="flex items-center justify-center w-8 h-8 rounded-sm text-zinc-600 hover:text-zinc-900 hover:bg-white transition-colors cursor-pointer"
          >
            <History className="w-4 h-4" />
          </button>
        </div>

        {/* Real-time Notifications Popover (Always Visible) */}
        <NotificationsPopover
          onSelectTask={onSelectTaskFromNotif}
          onOpenPendingInvitations={onOpenPendingInvitations}
        />

        {/* Consolidated Workspace Utilities & Profile Dropdown for Small / Medium Screens (< lg) */}
        <div className={`relative lg:hidden ${toolsDropdownOpen ? 'z-[60]' : ''}`} ref={toolsDropdownRef}>
          <button
            onClick={() => setToolsDropdownOpen(!toolsDropdownOpen)}
            className="flex items-center gap-1.5 p-1 bg-zinc-100 hover:bg-zinc-200/80 border border-zinc-200/90 rounded-sm cursor-pointer transition-all"
            title="Workspace Utilities & Profile"
            aria-label="Workspace Tools Menu"
          >
            {currentUser ? (
              <div className="relative">
                <Avatar src={currentUser.avatar} name={currentUser.name} size="sm" className="w-6 h-6" />
                <span
                  className="absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full ring-1 ring-white"
                  style={{ backgroundColor: currentUser.color || '#10B981' }}
                />
              </div>
            ) : (
              <MoreHorizontal className="w-4 h-4 text-zinc-600" />
            )}
            <MoreHorizontal className="w-3.5 h-3.5 text-zinc-500" />
          </button>

          {toolsDropdownOpen && (
            <div className="absolute right-0 mt-2 w-56 bg-white rounded-lg border border-zinc-200 shadow-2xl z-[60] p-1 space-y-0.5 animate-in fade-in duration-100">
              {currentUser && (
                <div
                  onClick={() => {
                    setToolsDropdownOpen(false);
                    onOpenUserSwitcher();
                  }}
                  className="p-2 bg-zinc-50 rounded-md border border-zinc-100 cursor-pointer hover:bg-blue-50 transition-colors"
                >
                  <p className="text-xs font-bold text-zinc-900 truncate">{currentUser.name}</p>
                  <p className="text-[10px] text-zinc-500 font-medium truncate">
                    {currentUser.role.toUpperCase()} • {currentUser.title || 'Member'}
                  </p>
                </div>
              )}

              <div className="pt-1 border-t border-zinc-100 space-y-0.5">
                {onOpenPendingInvitations && (
                  <button
                    onClick={() => {
                      setToolsDropdownOpen(false);
                      onOpenPendingInvitations();
                    }}
                    className="w-full flex items-center justify-between px-2.5 py-2 text-xs font-semibold text-zinc-700 hover:bg-zinc-100 rounded-md transition-colors cursor-pointer"
                  >
                    <span className="flex items-center gap-2">
                      <Mail className="w-4 h-4 text-zinc-500" />
                      <span>Invitations</span>
                    </span>
                    {pendingInvitationsCount > 0 && (
                      <span className="px-1.5 py-0.2 bg-blue-600 text-white text-[10px] font-bold rounded-full">
                        {pendingInvitationsCount}
                      </span>
                    )}
                  </button>
                )}

                <button
                  onClick={() => {
                    setToolsDropdownOpen(false);
                    onOpenMembersModal();
                  }}
                  className="w-full flex items-center gap-2 px-2.5 py-2 text-xs font-semibold text-zinc-700 hover:bg-zinc-100 rounded-md transition-colors cursor-pointer"
                >
                  <Users className="w-4 h-4 text-zinc-500" />
                  <span>Team Directory</span>
                </button>

                <button
                  onClick={() => {
                    setToolsDropdownOpen(false);
                    onOpenActivityDrawer();
                  }}
                  className="w-full flex items-center gap-2 px-2.5 py-2 text-xs font-semibold text-zinc-700 hover:bg-zinc-100 rounded-md transition-colors cursor-pointer"
                >
                  <History className="w-4 h-4 text-zinc-500" />
                  <span>Activity Stream</span>
                </button>

                {currentUser && (
                  <button
                    onClick={() => {
                      setToolsDropdownOpen(false);
                      onOpenUserSwitcher();
                    }}
                    className="w-full flex items-center gap-2 px-2.5 py-2 text-xs font-bold text-blue-600 hover:bg-blue-50 rounded-md transition-colors cursor-pointer"
                  >
                    <UserCheck className="w-4 h-4 text-blue-600" />
                    <span>Switch Profile</span>
                  </button>
                )}

                {(!firebaseUser || firebaseUser.isAnonymous) && onOpenAuthModal && (
                  <button
                    onClick={() => {
                      setToolsDropdownOpen(false);
                      onOpenAuthModal();
                    }}
                    className="w-full flex items-center gap-2 px-2.5 py-2 text-xs font-bold text-blue-600 hover:bg-blue-50 rounded-md transition-colors cursor-pointer"
                  >
                    <LogIn className="w-4 h-4 text-blue-600" />
                    <span>Sign In</span>
                  </button>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Full Desktop Profile Switcher Pill (lg+) */}
        {currentUser && (
          <div
            id="user-profile-switcher-btn"
            onClick={onOpenUserSwitcher}
            tabIndex={0}
            role="button"
            aria-label={`User profile for ${currentUser.name}`}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                onOpenUserSwitcher();
              }
            }}
            className="hidden lg:flex items-center gap-2 pl-2 border-l border-zinc-200 cursor-pointer group select-none shrink-0 min-h-[36px] focus:outline-hidden focus-visible:ring-2 focus-visible:ring-blue-500 rounded-sm"
            title={`Account & Team Profile: ${currentUser.name} (${currentUser.statusText || 'Active'})`}
          >
            <div className="text-right hidden xl:block">
              <div className="flex items-center justify-end gap-1.5">
                <p className="text-xs font-extrabold leading-none text-zinc-900 group-hover:text-blue-600 transition-colors">
                  {currentUser.name}
                </p>
                <span className="text-[9px] px-1.5 py-0.2 bg-blue-50 text-blue-700 border border-blue-200/60 rounded-xs font-bold uppercase tracking-wider">
                  {currentUser.role}
                </span>
              </div>
              <p className="text-[10px] text-zinc-400 mt-1 font-semibold truncate max-w-[120px]">
                {currentUser.statusText ? `${currentUser.statusText} • ` : ''}
                {currentUser.title || currentUser.department || 'Team Member'}
              </p>
            </div>
            <div className="relative shrink-0">
              <Avatar
                src={currentUser.avatar}
                name={currentUser.name}
                size="sm"
                className="ring-1 ring-zinc-200 group-hover:ring-blue-500 transition-all shadow-2xs"
              />
              <span
                className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full ring-2 ring-white shadow-2xs"
                style={{ backgroundColor: currentUser.color || '#10B981' }}
                title={currentUser.statusText || 'Active'}
              />
            </div>
          </div>
        )}
      </div>

      {/* Expandable Mobile Search Overlay */}
      {showMobileSearch && (
        <div className="sm:hidden absolute inset-0 bg-white z-[60] flex items-center px-3 animate-in fade-in duration-150 border-b border-zinc-200 shadow-sm">
          <div className="relative flex-1 flex items-center">
            <span className="absolute left-3 text-zinc-400 pointer-events-none">
              <Search className="h-4 w-4" />
            </span>
            <input
              type="text"
              autoFocus
              value={searchQuery}
              onChange={(e) => onChangeSearchQuery(e.target.value)}
              placeholder="Search tasks, tags..."
              className="w-full bg-zinc-100 rounded-full py-2 pl-9 pr-9 text-xs text-zinc-900 focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-100 border border-transparent outline-hidden transition-all font-medium"
            />
            {searchQuery && (
              <button
                onClick={() => onChangeSearchQuery('')}
                className="absolute right-2.5 text-zinc-400 hover:text-zinc-600 p-1 rounded-full cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
          <button
            onClick={() => setShowMobileSearch(false)}
            className="ml-2.5 text-xs font-bold text-blue-600 hover:text-blue-800 cursor-pointer whitespace-nowrap"
          >
            Cancel
          </button>
        </div>
      )}
    </header>
  );
};
