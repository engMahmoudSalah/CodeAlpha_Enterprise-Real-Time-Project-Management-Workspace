import React, { useState, useEffect, useCallback } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { WebSocketProvider, useWebSocket } from './context/WebSocketContext';
import { Project, Task, ProjectInvitation, MemberRole } from './types';
import { Header } from './components/Header';
import { BoardView } from './components/BoardView';
import { ListView } from './components/ListView';
import { TaskModal } from './components/TaskModal';
import { CreateTaskModal } from './components/CreateTaskModal';
import { CreateProjectModal } from './components/CreateProjectModal';
import { ProjectMembersModal } from './components/ProjectMembersModal';
import { PendingInvitationsModal } from './components/PendingInvitationsModal';
import { PendingInvitesBanner } from './components/PendingInvitesBanner';
import { ActivityDrawer } from './components/ActivityDrawer';
import { UserSwitcherModal } from './components/UserSwitcherModal';
import { AuthModal } from './components/AuthModal';
import { ConfirmModal } from './components/ConfirmModal';
import { LandingPage } from './components/LandingPage';
import { MobileBottomNav } from './components/MobileBottomNav';
import { WorkspaceNavBar } from './components/WorkspaceNavBar';
import {
  subscribeProjects,
  subscribeTasks,
  getTaskFromFirestore,
  createTaskInFirestore,
  updateTaskInFirestore,
  deleteTaskInFirestore,
  createProjectInFirestore,
  updateProjectInFirestore,
  deleteProjectInFirestore,
  subscribeUserInvitations,
  acceptInvitationInFirestore,
  declineInvitationInFirestore,
  getInvitationByTokenInFirestore,
} from './services/firestoreService';
import {
  AlertCircle,
  CheckCircle2,
  X,
  Plus,
  SlidersHorizontal,
  Users,
  History,
  PanelLeftClose,
  PanelLeftOpen,
  Mail,
  Folder,
  Crown,
  Shield,
  CheckSquare,
  Lock,
  Globe,
  Trash2,
} from 'lucide-react';
import { Avatar } from './designSystem';

const MainApplication: React.FC = () => {
  const { currentUser, firebaseUser, users, authModalOpen, setAuthModalOpen, isLoading } = useAuth();
  const { joinProject, leaveProject, subscribe, recentLiveToast, clearLiveToast } = useWebSocket();

  // Primary View Controller: 'workspace' | 'landing'
  const [activeView, setActiveView] = useState<'workspace' | 'landing'>(() => {
    if (typeof window !== 'undefined' && (window.location.hash === '#landing' || window.location.hash === '#home')) {
      return 'landing';
    }
    return 'workspace';
  });

  // Listen to hash changes for smooth navigation
  useEffect(() => {
    const handleHash = () => {
      if (window.location.hash === '#landing' || window.location.hash === '#home') {
        setActiveView('landing');
      } else if (window.location.hash === '#workspace' || window.location.hash === '#app') {
        setActiveView('workspace');
      }
    };
    window.addEventListener('hashchange', handleHash);
    return () => window.removeEventListener('hashchange', handleHash);
  }, []);

  const [initialRouteSet, setInitialRouteSet] = useState(false);

  // Logical routing: Auto-redirect based on authentication state
  useEffect(() => {
    if (!isLoading && !initialRouteSet) {
      // First load resolution
      if (!currentUser && window.location.hash !== '#workspace') {
        setActiveView('landing');
        window.location.hash = '#landing';
      } else if (currentUser && window.location.hash !== '#landing') {
        setActiveView('workspace');
        window.location.hash = '#workspace';
      }
      setInitialRouteSet(true);
    }
  }, [isLoading, initialRouteSet, currentUser]);

  // Handle logout redirect
  useEffect(() => {
    if (initialRouteSet && !isLoading && !currentUser && activeView === 'workspace') {
      setActiveView('landing');
      window.location.hash = '#landing';
    }
  }, [currentUser, isLoading, initialRouteSet, activeView]);


  const [projects, setProjects] = useState<Project[]>([]);
  const [activeProjectId, setActiveProjectId] = useState<string>('');
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loadingProjects, setLoadingProjects] = useState(true);
  const [loadingTasks, setLoadingTasks] = useState(false);

  // User-scoped Invitations & Personalized Workspace States
  const [pendingInvitations, setPendingInvitations] = useState<ProjectInvitation[]>([]);
  const [invitesModalOpen, setInvitesModalOpen] = useState(false);
  const [pendingInviteToken, setPendingInviteToken] = useState<string | null>(null);
  const [projectScopeTab, setProjectScopeTab] = useState<'my' | 'all'>('my');
  const [isMyTasksOnly, setIsMyTasksOnly] = useState(false);

  // View & Filter states
  const [viewMode, setViewMode] = useState<'board' | 'list'>('board');
  const [searchQuery, setSearchQuery] = useState('');
  const [assigneeFilter, setAssigneeFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [showFilters, setShowFilters] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Collapsible sidebar state (persisted to localStorage)
  const [sidebarCollapsed, setSidebarCollapsed] = useState<boolean>(() => {
    try {
      return localStorage.getItem('velocity_sidebar_collapsed') === 'true';
    } catch {
      return false;
    }
  });

  const toggleSidebar = useCallback(() => {
    setSidebarCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem('velocity_sidebar_collapsed', String(next));
      } catch {}
      return next;
    });
  }, []);

  // Keyboard shortcut: [ toggles the sidebar
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        e.key === '[' &&
        !(
          e.target instanceof HTMLInputElement ||
          e.target instanceof HTMLTextAreaElement ||
          (e.target as HTMLElement)?.isContentEditable
        )
      ) {
        toggleSidebar();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [toggleSidebar]);

  // Modals state
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [createTaskModalOpen, setCreateTaskModalOpen] = useState(false);
  const [createTaskDefaultCol, setCreateTaskDefaultCol] = useState<string | undefined>(undefined);
  const [createProjectModalOpen, setCreateProjectModalOpen] = useState(false);
  const [membersModalOpen, setMembersModalOpen] = useState(false);
  const [activityDrawerOpen, setActivityDrawerOpen] = useState(false);
  const [userSwitcherOpen, setUserSwitcherOpen] = useState(false);
  const [projectToDelete, setProjectToDelete] = useState<{ id: string; name: string } | null>(null);
  const [isDeletingProject, setIsDeletingProject] = useState(false);

  // Auto-dismiss live toast
  useEffect(() => {
    if (recentLiveToast) {
      const timer = setTimeout(() => {
        clearLiveToast();
      }, 4000);
      return () => clearTimeout(timer);
    }
  }, [recentLiveToast, clearLiveToast]);

  // Real-time Firestore Invitations Subscription for current user
  useEffect(() => {
    if (!currentUser?.id) return;
    const unsubscribe = subscribeUserInvitations(
      firebaseUser?.email || '',
      currentUser.id,
      (invs) => {
        setPendingInvitations(invs);
      },
      (err) => {
        console.warn('User invitations notice:', err.message);
      }
    );

    return () => unsubscribe();
  }, [currentUser?.email, currentUser?.id]);

  // Real-time Firestore Projects Subscription
  useEffect(() => {
    if (!currentUser?.id) {
      setProjects([]);
      setLoadingProjects(false);
      return;
    }
    setLoadingProjects(true);
    const unsubscribe = subscribeProjects(
      currentUser.id,
      (liveProjects) => {
        setProjects(liveProjects);
        if (liveProjects.length > 0) {
          setActiveProjectId((curr) => {
            if (curr && liveProjects.some((p) => p.id === curr)) return curr;
            return liveProjects[0].id;
          });
        }
        setLoadingProjects(false);
      },
      (err) => {
        console.warn('Projects live subscription notice:', err.message);
        setLoadingProjects(false);
      }
    );

    return () => unsubscribe();
  }, [currentUser?.id]);

  // Real-time Firestore Tasks Subscription for active project
  useEffect(() => {
    if (!activeProjectId || !currentUser?.id) return;

    setLoadingTasks(true);
    const unsubscribe = subscribeTasks(
      activeProjectId,
      (liveTasks) => {
        setTasks(liveTasks);
        setLoadingTasks(false);
      },
      (err) => {
        console.warn('Tasks live subscription notice:', err.message);
        setLoadingTasks(false);
      }
    );

    joinProject(activeProjectId);
    return () => {
      unsubscribe();
      leaveProject(activeProjectId);
    };
  }, [activeProjectId, currentUser?.id, joinProject, leaveProject]);

  // Real-time WebSocket subscriptions
  useEffect(() => {
    const unsubTaskCreate = subscribe('task:created', (payload: Task) => {
      if (payload && payload.projectId === activeProjectId) {
        setTasks((prev) => {
          if (prev.some((t) => t.id === payload.id)) {
            return prev.map((t) => (t.id === payload.id ? payload : t));
          }
          return [...prev, payload];
        });
      }
    });

    const unsubTaskUpdate = subscribe('task:updated', (payload: Task) => {
      if (payload && payload.projectId === activeProjectId) {
        setTasks((prev) => prev.map((t) => (t.id === payload.id ? payload : t)));
        setSelectedTask((curr) => (curr && curr.id === payload.id ? payload : curr));
      }
    });

    const unsubTaskMove = subscribe('task:moved', (payload: { task: Task }) => {
      if (payload?.task && payload.task.projectId === activeProjectId) {
        setTasks((prev) =>
          prev.map((t) => (t.id === payload.task.id ? payload.task : t))
        );
        setSelectedTask((curr) => (curr && curr.id === payload.task.id ? payload.task : curr));
      }
    });

    const unsubTaskDelete = subscribe('task:deleted', (payload: { taskId: string; projectId: string }) => {
      if (payload?.projectId === activeProjectId) {
        setTasks((prev) => prev.filter((t) => t.id !== payload.taskId));
        setSelectedTask((curr) => (curr && curr.id === payload.taskId ? null : curr));
      }
    });

    const unsubProjCreate = subscribe('project:created', (newProj: Project) => {
      setProjects((prev) => {
        if (prev.some((p) => p.id === newProj.id)) {
          return prev.map((p) => (p.id === newProj.id ? newProj : p));
        }
        return [...prev, newProj];
      });
    });

    const unsubProjUpdate = subscribe('project:updated', (updated: Project) => {
      setProjects((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
    });

    const unsubProjDelete = subscribe('project:deleted', (payload: { id: string }) => {
      setProjects((prev) => prev.filter((p) => p.id !== payload.id));
      setActiveProjectId((curr) => (curr === payload.id ? '' : curr));
    });

    return () => {
      unsubTaskCreate();
      unsubTaskUpdate();
      unsubTaskMove();
      unsubTaskDelete();
      unsubProjCreate();
      unsubProjUpdate();
      unsubProjDelete();
    };
  }, [activeProjectId, subscribe]);

  const activeProject = projects.find((p) => p.id === activeProjectId) || projects[0] || null;

  // Task Operations (Firestore Real-time Database)
  const handleMoveTask = async (taskId: string, targetColumnId: string) => {
    // Optimistic local update
    const previousTasks = [...tasks];
    setTasks((prev) =>
      prev.map((t) => (t.id === taskId ? { ...t, columnId: targetColumnId } : t))
    );

    try {
      await updateTaskInFirestore(
        taskId,
        { columnId: targetColumnId },
        currentUser,
        `Moved task column`
      );
    } catch (err) {
      console.error('Failed to move task in Firestore:', err);
      setTasks(previousTasks);
    }
  };

  const handleUpdateTask = async (changes: Partial<Task>) => {
    if (!selectedTask) return;
    const taskId = selectedTask.id;
    try {
      await updateTaskInFirestore(
        taskId,
        changes,
        currentUser,
        'Updated task details'
      );
      setSelectedTask((curr) => (curr ? { ...curr, ...changes } : null));
    } catch (err) {
      console.error('Failed to update task in Firestore:', err);
    }
  };

  const handleDeleteTask = async (taskId: string) => {
    const taskToDelete = tasks.find((t) => t.id === taskId);
    try {
      await deleteTaskInFirestore(
        taskId,
        activeProject?.id || '',
        taskToDelete?.title || 'Task',
        currentUser
      );
      setTasks((prev) => prev.filter((t) => t.id !== taskId));
      setSelectedTask(null);
    } catch (err) {
      console.error('Failed to delete task in Firestore:', err);
    }
  };

  const handleCreateTask = async (newTaskData: Partial<Task>) => {
    if (!activeProject || !currentUser) return;
    try {
      const created = await createTaskInFirestore(
        {
          ...newTaskData,
          projectId: activeProject.id,
        },
        currentUser
      );

      setTasks((prev) => {
        if (prev.some((t) => t.id === created.id)) return prev;
        return [...prev, created];
      });
    } catch (err) {
      console.error('Failed to create task in Firestore:', err);
    }
  };

  const handleCreateProject = async (projectData: Partial<Project>) => {
    if (!currentUser) return;
    try {
      const created = await createProjectInFirestore(projectData, currentUser);
      setProjects((prev) => {
        if (prev.some((p) => p.id === created.id)) return prev;
        return [...prev, created];
      });
      setActiveProjectId(created.id);
    } catch (err) {
      console.error('Failed to create project in Firestore:', err);
    }
  };

  const handleUpdateProjectMembers = async (newMemberIds: string[]) => {
    if (!activeProject) return;
    try {
      await updateProjectInFirestore(activeProject.id, { memberIds: newMemberIds });
      setProjects((prev) =>
        prev.map((p) => (p.id === activeProject.id ? { ...p, memberIds: newMemberIds } : p))
      );
    } catch (err) {
      console.error('Failed to update members in Firestore:', err);
    }
  };

  const handleDeleteProject = (projId: string, projName: string) => {
    if (!currentUser) return;
    setProjectToDelete({ id: projId, name: projName });
  };

  const confirmDeleteProject = async () => {
    if (!projectToDelete) return;
    const target = projectToDelete;
    setIsDeletingProject(true);
    try {
      await deleteProjectInFirestore(target.id);
      setProjects((prev) => prev.filter((p) => p.id !== target.id));
      if (activeProjectId === target.id) {
        const remaining = projects.filter((p) => p.id !== target.id);
        setActiveProjectId(remaining.length > 0 ? remaining[0].id : '');
      }
      setProjectToDelete(null);
    } catch (err: any) {
      console.error('Failed to delete project:', err);
      setProjectToDelete(null);
    } finally {
      setIsDeletingProject(false);
    }
  };

  const handleSelectTaskFromNotif = async (taskId: string, projectId: string) => {
    if (projectId !== activeProjectId) {
      setActiveProjectId(projectId);
    }
    let existing = tasks.find((t) => t.id === taskId);
    if (!existing) {
      existing = (await getTaskFromFirestore(taskId)) || undefined;
    }
    if (existing) {
      setSelectedTask(existing);
    }
  };

  // Handle URL invitation token (?invite=TOKEN)
  useEffect(() => {
    if (!currentUser) return;
    try {
      const urlParams = new URLSearchParams(window.location.search);
      const token = urlParams.get('invite');
      if (token) {
        setPendingInviteToken(token);
        getInvitationByTokenInFirestore(token)
          .then((inv) => {
            if (inv) {
              setInvitesModalOpen(true);
            }
          })
          .catch((err) => console.warn('URL token lookup notice:', err));
        window.history.replaceState({}, document.title, window.location.pathname);
      }
    } catch {}
  }, [currentUser]);

  // Invitation Handlers
  const handleAcceptInvitation = async (inv: ProjectInvitation) => {
    try {
      await acceptInvitationInFirestore(inv, currentUser);
      setActiveProjectId(inv.projectId);
      setInvitesModalOpen(false);
    } catch (err) {
      console.error('Failed to accept invitation:', err);
    }
  };

  const handleDeclineInvitation = async (inv: ProjectInvitation) => {
    try {
      await declineInvitationInFirestore(inv.id, inv, currentUser);
    } catch (err) {
      console.error('Failed to decline invitation:', err);
    }
  };

  // User-isolated & Scoped Projects calculation
  const myProjects = projects.filter(
    (p) =>
      (p.memberIds || []).includes(currentUser?.id) ||
      p.createdBy === currentUser?.id ||
      currentUser?.role === 'admin'
  );

  const displayedProjects =
    projectScopeTab === 'my' && myProjects.length > 0 ? myProjects : projects;

  // Active Project User Role calculation
  const userProjectRole: MemberRole = activeProject
    ? activeProject.createdBy === currentUser?.id
      ? 'owner'
      : (activeProject.members?.[currentUser?.id] as MemberRole) ||
        ((activeProject.memberIds || []).includes(currentUser?.id)
          ? currentUser?.role === 'admin'
            ? 'admin'
            : 'member'
          : 'viewer')
    : 'member';

  // Filter tasks based on search, assignee, priority, and "My Tasks" mode
  const filteredTasks = tasks.filter((task) => {
    if (isMyTasksOnly) {
      const isAssigned = (task.assigneeIds || []).includes(currentUser?.id);
      const isCreator = task.createdBy === currentUser?.id;
      if (!isAssigned && !isCreator) return false;
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchTitle = task.title.toLowerCase().includes(q);
      const matchDesc = task.description?.toLowerCase().includes(q);
      const matchTag = task.tags?.some((t) => t.toLowerCase().includes(q));
      if (!matchTitle && !matchDesc && !matchTag) return false;
    }

    if (assigneeFilter !== 'all') {
      if (!task.assigneeIds.includes(assigneeFilter)) return false;
    }

    if (priorityFilter !== 'all') {
      if (task.priority !== priorityFilter) return false;
    }

    return true;
  });

  if (activeView === 'landing') {
    return (
      <div className="min-h-screen bg-zinc-50 text-zinc-900 flex flex-col font-sans">
        <LandingPage
          onEnterWorkspace={() => {
            setActiveView('workspace');
            window.location.hash = '#workspace';
          }}
          onOpenAuthModal={() => setAuthModalOpen(true)}
          projectsCount={projects.length}
          tasksCount={tasks.length}
          usersCount={users.length}
        />

        {/* Global Auth Modal accessible from landing page */}
        <AuthModal
          isOpen={authModalOpen}
          onClose={() => setAuthModalOpen(false)}
          onSuccess={() => {
            setAuthModalOpen(false);
            setActiveView('workspace');
          }}
        />
      </div>
    );
  }

  return (
    <div className="h-screen bg-zinc-50 flex flex-col font-sans text-zinc-900 overflow-hidden">
      {/* Real-time Collaboration Toast Banner */}
      {recentLiveToast && (
        <div className="fixed bottom-5 right-5 z-50 animate-in slide-in-from-bottom-5 duration-200">
          <div className="bg-zinc-900 text-white px-4 py-3 rounded-sm shadow-sm flex items-center gap-3 border border-zinc-700 text-xs">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping shrink-0" />
            <span className="font-semibold">{recentLiveToast.message}</span>
            <button
              onClick={clearLiveToast}
              className="text-zinc-400 hover:text-white ml-2 p-0.5"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* Sleek Top Header */}
      <Header
        projects={projects}
        activeProject={activeProject}
        onSelectProject={(id) => setActiveProjectId(id)}
        searchQuery={searchQuery}
        onChangeSearchQuery={setSearchQuery}
        onOpenCreateProject={() => setCreateProjectModalOpen(true)}
        onOpenMembersModal={() => setMembersModalOpen(true)}
        onOpenActivityDrawer={() => setActivityDrawerOpen(true)}
        onOpenUserSwitcher={() => setUserSwitcherOpen(true)}
        onSelectTaskFromNotif={handleSelectTaskFromNotif}
        onToggleMobileMenu={() => setMobileMenuOpen(true)}
        onOpenAuthModal={() => setAuthModalOpen(true)}
        onOpenLandingPage={() => {
          setActiveView('landing');
          window.location.hash = '#landing';
        }}
        pendingInvitationsCount={pendingInvitations.length}
        onOpenPendingInvitations={() => setInvitesModalOpen(true)}
      />

      {/* Real-time Pending Invitations Alert Banner */}
      <PendingInvitesBanner
        invitations={pendingInvitations}
        currentUser={currentUser}
        onOpenInvitesModal={() => setInvitesModalOpen(true)}
        onAcceptInvite={handleAcceptInvitation}
        onDeclineInvite={handleDeclineInvitation}
      />

      {/* Main Container with Collapsible Sidebar + Content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Sleek Sidebar (Collapsible with smooth width transition) */}
        {!sidebarCollapsed ? (
          <aside
            id="desktop-sidebar-expanded"
            className="w-64 bg-white border-r border-zinc-200 flex-col shrink-0 hidden md:flex transition-all duration-300 ease-in-out select-none"
          >
            {/* Header inside sidebar */}
            <div className="px-5 py-3.5 border-b border-zinc-100 flex items-center justify-between">
              <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider">
                Workspace
              </span>
              <button
                onClick={toggleSidebar}
                title="Collapse sidebar"
                className="p-1.5 rounded-sm text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100 transition-colors cursor-pointer"
                aria-label="Collapse sidebar"
              >
                <PanelLeftClose className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 flex flex-col gap-5 flex-1 overflow-y-auto sleek-scrollbar">
              {/* Project Scope Segment Tabs: My Projects vs All Projects */}
              <div>
                <div className="flex items-center justify-between mb-2.5 px-1">
                  <div className="flex items-center gap-1 bg-zinc-100/80 p-1 rounded-sm w-full border border-zinc-200/60">
                    <button
                      onClick={() => setProjectScopeTab('my')}
                      className={`flex-1 py-1.5 text-[11px] font-bold rounded-sm transition-all cursor-pointer text-center ${
                        projectScopeTab === 'my'
                          ? 'bg-white text-blue-700 border border-zinc-200/80'
                          : 'text-zinc-500 hover:text-zinc-800'
                      }`}
                    >
                      My Projects ({myProjects.length})
                    </button>
                    <button
                      onClick={() => setProjectScopeTab('all')}
                      className={`flex-1 py-1.5 text-[11px] font-bold rounded-sm transition-all cursor-pointer text-center ${
                        projectScopeTab === 'all'
                          ? 'bg-white text-blue-700 border border-zinc-200/80'
                          : 'text-zinc-500 hover:text-zinc-800'
                      }`}
                    >
                      All ({projects.length})
                    </button>
                  </div>
                </div>

                <div className="flex items-center justify-between mb-2 px-1">
                  <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-[0.15em]">
                    {projectScopeTab === 'my' ? 'My Projects' : 'All Projects'}
                  </span>
                  <button
                    onClick={() => setCreateProjectModalOpen(true)}
                    className="text-blue-600 hover:text-blue-800 text-xs font-bold flex items-center gap-1 cursor-pointer"
                    title="Create new project"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>New</span>
                  </button>
                </div>

                {displayedProjects.length === 0 ? (
                  <div className="text-center py-6 px-3 bg-zinc-50/80 rounded-sm border border-dashed border-zinc-200">
                    <Folder className="w-6 h-6 text-zinc-300 mx-auto mb-1.5" />
                    <p className="text-xs text-zinc-500 font-semibold mb-0.5">No projects yet</p>
                    <p className="text-[11px] text-zinc-400 mb-3">Create your first project to get started</p>
                    <button
                      onClick={() => setCreateProjectModalOpen(true)}
                      className="text-xs text-blue-600 hover:text-blue-800 font-bold inline-flex items-center gap-1 cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Create Project</span>
                    </button>
                  </div>
                ) : (
                  <ul className="space-y-1">
                    {Array.from(new Map<string, Project>(displayedProjects.map((p) => [p.id, p])).values()).map((p) => {
                      const isActive = p.id === activeProjectId;
                      const isOwner = p.createdBy === currentUser?.id;
                      const canDelete = isOwner || currentUser?.role === 'admin';

                      return (
                        <li key={`expanded-${p.id}`} className="group relative flex items-center">
                          <button
                            onClick={() => setActiveProjectId(p.id)}
                            className={`w-full flex items-center justify-between px-3 py-2 rounded-sm text-xs sm:text-sm transition-all cursor-pointer border ${
                              isActive
                                ? 'bg-blue-50/80 text-blue-700 font-bold border-blue-200/80'
                                : 'text-zinc-700 hover:bg-zinc-50 font-medium border-transparent'
                            }`}
                          >
                            <span className="flex items-center gap-2.5 truncate">
                              <span
                                className="w-2.5 h-2.5 rounded-full shrink-0"
                                style={{ backgroundColor: p.color || '#6366F1' }}
                              />
                              <span className="truncate">{p.name}</span>
                            </span>
                            <div className="flex items-center gap-1.5">
                              {isOwner && (
                                <span
                                  title="Project Owner"
                                  className="text-[10px] text-amber-600 font-bold px-1 py-0.2 bg-amber-50 rounded"
                                >
                                  Owner
                                </span>
                              )}
                              <span
                                className={`text-[10px] px-1.5 py-0.5 rounded transition-opacity ${
                                  isActive
                                    ? 'bg-blue-200/70 text-blue-800 font-bold'
                                    : 'bg-zinc-100 text-zinc-500 opacity-0 group-hover:opacity-100'
                                }`}
                              >
                                {p.memberIds?.length || 1}
                              </span>
                            </div>
                          </button>
                          {canDelete && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteProject(p.id, p.name);
                              }}
                              className="absolute right-1 opacity-0 group-hover:opacity-100 p-1.5 text-zinc-400 hover:text-rose-600 hover:bg-rose-50 rounded-sm transition-all cursor-pointer"
                              title="Delete project"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>

              {/* Quick Invitations Link in Sidebar */}
              {pendingInvitations.length > 0 && (
                <div className="bg-blue-50 border border-blue-200 rounded-sm p-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-blue-900 font-bold text-xs">
                      <Mail className="w-4 h-4 text-blue-600" />
                      <span>Invitations</span>
                    </div>
                    <span className="bg-blue-600 text-white text-[10px] font-bold px-1.5 py-0.2 rounded-full">
                      {pendingInvitations.length}
                    </span>
                  </div>
                  <p className="text-[11px] text-blue-700 mt-1">
                    You have project invitations waiting.
                  </p>
                  <button
                    onClick={() => setInvitesModalOpen(true)}
                    className="mt-2 w-full py-1.5 bg-blue-600 text-white rounded-sm text-xs font-bold hover:bg-blue-700 transition-colors cursor-pointer"
                  >
                    View & Respond
                  </button>
                </div>
              )}

              {/* Quick Navigation / Workspace Tools */}
              <div>
                <h3 className="text-[10px] font-bold text-zinc-400 uppercase tracking-[0.15em] mb-2 px-1">
                  Quick Views
                </h3>
                <ul className="space-y-1 text-xs font-medium text-zinc-600">
                  <li
                    onClick={() => {
                      setPriorityFilter('all');
                      setAssigneeFilter('all');
                    }}
                    className="px-3 py-2 hover:bg-zinc-50 rounded-sm cursor-pointer flex items-center justify-between text-zinc-700 font-medium transition-colors"
                  >
                    <span className="flex items-center gap-2">
                      <Folder className="w-3.5 h-3.5 text-zinc-400" />
                      <span>All Project Tasks</span>
                    </span>
                  </li>
                  <li
                    onClick={() => {
                      if (currentUser) setAssigneeFilter(currentUser.id);
                    }}
                    className="px-3 py-2 hover:bg-zinc-50 rounded-sm cursor-pointer flex items-center justify-between text-zinc-700 font-medium transition-colors"
                  >
                    <span className="flex items-center gap-2">
                      <CheckSquare className="w-3.5 h-3.5 text-zinc-400" />
                      <span>Assigned to Me</span>
                    </span>
                  </li>
                  <li
                    onClick={() => {
                      setPriorityFilter('urgent');
                    }}
                    className="px-3 py-2 hover:bg-zinc-50 rounded-sm cursor-pointer flex items-center justify-between text-zinc-700 font-medium transition-colors"
                  >
                    <span className="flex items-center gap-2">
                      <AlertCircle className="w-3.5 h-3.5 text-rose-500" />
                      <span>Urgent Priority</span>
                    </span>
                  </li>
                  <li
                    onClick={() => setMembersModalOpen(true)}
                    className="px-3 py-2 hover:bg-zinc-50 rounded-sm cursor-pointer flex items-center justify-between text-zinc-700 font-medium transition-colors"
                  >
                    <span className="flex items-center gap-2">
                      <Users className="w-3.5 h-3.5 text-zinc-400" />
                      <span>Team Directory</span>
                    </span>
                  </li>
                </ul>
              </div>
            </div>

            {/* New Project Action Button */}
            <div className="mt-auto p-4 border-t border-zinc-100 bg-zinc-50/50">
              <button
                onClick={() => setCreateProjectModalOpen(true)}
                className="w-full py-2.5 bg-zinc-900 text-white rounded-sm text-xs font-bold uppercase tracking-wider hover:bg-zinc-800 transition-colors border border-zinc-900 flex items-center justify-center gap-2 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>New Project</span>
              </button>
            </div>
          </aside>
        ) : (
          <aside
            id="desktop-sidebar-collapsed"
            className="w-16 bg-white border-r border-zinc-200 flex-col shrink-0 hidden md:flex items-center transition-all duration-300 ease-in-out py-3 z-20 select-none"
          >
            {/* Expand toggle */}
            <button
              onClick={toggleSidebar}
              title="Expand sidebar"
              className="w-10 h-10 flex items-center justify-center rounded-sm text-zinc-400 hover:text-blue-600 hover:bg-blue-50 transition-colors cursor-pointer mb-3"
              aria-label="Expand sidebar"
            >
              <PanelLeftOpen className="w-5 h-5" />
            </button>

            <div className="w-8 h-px bg-zinc-100 mb-3" />

            {/* Project icons list with tooltip */}
            <div className="flex-1 overflow-y-auto sleek-scrollbar flex flex-col items-center gap-2 w-full px-2">
              {Array.from(new Map<string, Project>(displayedProjects.map((p) => [p.id, p])).values()).map((p) => {
                const isActive = p.id === activeProjectId;
                return (
                  <div key={`collapsed-${p.id}`} className="relative group flex items-center justify-center w-full">
                    <button
                      onClick={() => setActiveProjectId(p.id)}
                      className={`w-10 h-10 rounded-sm flex items-center justify-center text-xs font-bold transition-all cursor-pointer border ${
                        isActive
                          ? 'bg-blue-600 text-white border-blue-600'
                          : 'bg-zinc-100 text-zinc-700 hover:bg-zinc-200 border-zinc-200'
                      }`}
                      style={{
                        borderLeft: !isActive ? `3px solid ${p.color || '#6366F1'}` : undefined,
                      }}
                      aria-label={`Switch to ${p.name}`}
                    >
                      {p.name.charAt(0).toUpperCase()}
                    </button>

                    {/* Accessible Hover Tooltip */}
                    <div className="absolute left-full ml-3 px-2.5 py-1.5 bg-zinc-900 text-white text-xs font-semibold rounded-sm border border-zinc-800 whitespace-nowrap pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity z-50">
                      <span className="flex items-center gap-2">
                        <span
                          className="w-2 h-2 rounded-full"
                          style={{ backgroundColor: p.color || '#6366F1' }}
                        />
                        <span>{p.name}</span>
                        <span className="text-zinc-400 text-[11px]">({p.memberIds?.length || 1} members)</span>
                      </span>
                    </div>
                  </div>
                );
              })}

              {/* Quick New Project button */}
              <div className="relative group flex items-center justify-center mt-2 w-full">
                <button
                  onClick={() => setCreateProjectModalOpen(true)}
                  title="Create New Project"
                  className="w-10 h-10 rounded-sm border border-dashed border-zinc-300 text-zinc-500 hover:text-blue-600 hover:border-blue-400 hover:bg-blue-50/50 flex items-center justify-center transition-colors cursor-pointer"
                  aria-label="New Project"
                >
                  <Plus className="w-4 h-4" />
                </button>
                <div className="absolute left-full ml-3 px-2.5 py-1 bg-zinc-900 text-white text-xs font-semibold rounded-sm border border-zinc-800 whitespace-nowrap pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity z-50">
                  New Project
                </div>
              </div>
            </div>

            {/* Bottom Quick Tools */}
            <div className="w-8 h-px bg-zinc-100 my-2" />
            <div className="flex flex-col items-center gap-2">
              <div className="relative group flex items-center justify-center">
                <button
                  onClick={() => setMembersModalOpen(true)}
                  className="w-10 h-10 rounded-sm text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100 flex items-center justify-center transition-colors cursor-pointer"
                  aria-label="Manage Team Members"
                >
                  <Users className="w-4 h-4" />
                </button>
                <div className="absolute left-full ml-3 px-2.5 py-1 bg-zinc-900 text-white text-xs font-semibold rounded-sm border border-zinc-800 whitespace-nowrap pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity z-50">
                  Team Members
                </div>
              </div>

              <div className="relative group flex items-center justify-center">
                <button
                  onClick={() => setActivityDrawerOpen(true)}
                  className="w-10 h-10 rounded-sm text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100 flex items-center justify-center transition-colors cursor-pointer"
                  aria-label="View Activity Stream"
                >
                  <History className="w-4 h-4" />
                </button>
                <div className="absolute left-full ml-3 px-2.5 py-1 bg-zinc-900 text-white text-xs font-semibold rounded-sm border border-zinc-800 whitespace-nowrap pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity z-50">
                  Activity Stream
                </div>
              </div>
            </div>
          </aside>
        )}

        {/* Main Content Area */}
        <main className="flex-1 flex flex-col overflow-hidden bg-zinc-50">
          {activeProject ? (
            <>
              {/* Subheader matching Design HTML with full responsive support */}
              <WorkspaceNavBar
                activeProject={activeProject}
                userProjectRole={userProjectRole}
                currentUser={currentUser}
                users={users}
                viewMode={viewMode}
                onChangeViewMode={(mode) => setViewMode(mode)}
                isMyTasksOnly={isMyTasksOnly}
                onToggleMyTasksOnly={() => setIsMyTasksOnly(!isMyTasksOnly)}
                showFilters={showFilters}
                onToggleFilters={() => setShowFilters(!showFilters)}
                assigneeFilter={assigneeFilter}
                onChangeAssigneeFilter={(val) => setAssigneeFilter(val)}
                priorityFilter={priorityFilter}
                onChangePriorityFilter={(val) => setPriorityFilter(val)}
                onResetFilters={() => {
                  setAssigneeFilter('all');
                  setPriorityFilter('all');
                }}
                onOpenMembersModal={() => setMembersModalOpen(true)}
                onOpenCreateTask={() => {
                  setCreateTaskDefaultCol(undefined);
                  setCreateTaskModalOpen(true);
                }}
                onDeleteProject={(id, name) => handleDeleteProject(id, name)}
              />
            </>
          ) : (
            <div className="px-4 sm:px-8 py-5 border-b border-zinc-200 bg-white flex items-center justify-between">
              <div className="flex items-center gap-2 text-zinc-800 font-bold text-base">
                <Folder className="w-5 h-5 text-blue-600" />
                <span>Workspace Dashboard</span>
              </div>
              <button
                onClick={() => setCreateProjectModalOpen(true)}
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-sm text-xs font-bold flex items-center gap-1.5 cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>New Project</span>
              </button>
            </div>
          )}

          {/* View rendering */}
          {loadingProjects ? (
            <div className="flex-1 flex items-center justify-center py-20 text-zinc-400 text-xs">
              Loading group workspace...
            </div>
          ) : !activeProject ? (
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center max-w-lg mx-auto">
              <div className="w-16 h-16 rounded-sm bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600 mb-4 shadow-xs">
                <Folder className="w-8 h-8" />
              </div>
              <h3 className="text-lg font-extrabold text-zinc-800 mb-1.5">No Projects Yet</h3>
              <p className="text-xs text-zinc-500 mb-6 leading-relaxed">
                Create a project to start organizing tasks on the Kanban board, inviting teammates, and collaborating in real-time.
                <br />
                Start by creating your first project to organize tasks, invite team members, and collaborate in real-time.
              </p>
              <button
                onClick={() => setCreateProjectModalOpen(true)}
                className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-sm transition-all shadow-sm shadow-blue-100 flex items-center gap-2 cursor-pointer active:scale-98"
              >
                <Plus className="w-4 h-4" />
                <span>Create First Project</span>
              </button>
            </div>
          ) : viewMode === 'board' ? (
            <BoardView
              project={activeProject}
              tasks={filteredTasks}
              users={users}
              onOpenTask={(task) => setSelectedTask(task)}
              onMoveTask={handleMoveTask}
              onOpenCreateTask={(colId) => {
                setCreateTaskDefaultCol(colId);
                setCreateTaskModalOpen(true);
              }}
            />
          ) : (
            <ListView
              project={activeProject}
              tasks={filteredTasks}
              users={users}
              onOpenTask={(task) => setSelectedTask(task)}
              onMoveTask={handleMoveTask}
              onOpenCreateTask={(colId) => {
                setCreateTaskDefaultCol(colId);
                setCreateTaskModalOpen(true);
              }}
            />
          )}
        </main>
      </div>

      <MobileBottomNav
        viewMode={viewMode}
        onChangeViewMode={(mode) => setViewMode(mode)}
        onOpenCreateTask={() => {
          if (activeProject) {
            setCreateTaskDefaultCol(activeProject.columns[0]?.id);
            setCreateTaskModalOpen(true);
          }
        }}
        isMyTasksOnly={isMyTasksOnly}
        onToggleMyTasksOnly={() => setIsMyTasksOnly(!isMyTasksOnly)}
        onOpenMobileMenu={() => setMobileMenuOpen(true)}
        hasActiveProject={!!activeProject}
      />

      {/* Modals */}
      {selectedTask && activeProject && (
        <TaskModal
          task={selectedTask}
          columns={activeProject.columns}
          users={users}
          onClose={() => setSelectedTask(null)}
          onUpdateTask={handleUpdateTask}
          onDeleteTask={handleDeleteTask}
        />
      )}

      {activeProject && (
        <CreateTaskModal
          isOpen={createTaskModalOpen}
          onClose={() => setCreateTaskModalOpen(false)}
          project={activeProject}
          defaultColumnId={createTaskDefaultCol}
          users={users}
          onCreateTask={handleCreateTask}
        />
      )}

      <CreateProjectModal
        isOpen={createProjectModalOpen}
        onClose={() => setCreateProjectModalOpen(false)}
        users={users}
        onCreateProject={handleCreateProject}
      />

      {activeProject && (
        <ProjectMembersModal
          isOpen={membersModalOpen}
          onClose={() => setMembersModalOpen(false)}
          project={activeProject}
          currentUser={currentUser}
          users={users}
          onUpdateProjectMembers={handleUpdateProjectMembers}
        />
      )}

      {activeProject && (
        <ActivityDrawer
          isOpen={activityDrawerOpen}
          onClose={() => setActivityDrawerOpen(false)}
          projectId={activeProject.id}
          projectName={activeProject.name}
          users={users}
          currentUser={currentUser}
          onSelectTask={async (taskId) => {
            let t = tasks.find((item) => item.id === taskId);
            if (!t) {
              t = (await getTaskFromFirestore(taskId)) || undefined;
            }
            if (t) setSelectedTask(t);
          }}
        />
      )}

      <PendingInvitationsModal
        isOpen={invitesModalOpen}
        onClose={() => {
          setInvitesModalOpen(false);
          setPendingInviteToken(null);
        }}
        invitations={pendingInvitations}
        currentUser={currentUser}
        initialToken={pendingInviteToken}
        onSelectProject={(projectId) => setActiveProjectId(projectId)}
        onInvitationAccepted={(projectId) => setActiveProjectId(projectId)}
      />

      <UserSwitcherModal
        isOpen={userSwitcherOpen}
        onClose={() => setUserSwitcherOpen(false)}
        onOpenAuthModal={() => setAuthModalOpen(true)}
      />

      <AuthModal
        isOpen={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
      />

      {/* Confirmation Modal for Project Deletion */}
      <ConfirmModal
        isOpen={!!projectToDelete}
        title="Delete Project"
        message={`Are you sure you want to permanently delete "${projectToDelete?.name}"? All associated tasks, columns, and activity logs will be permanently removed.`}
        confirmLabel="Delete Project"
        isDestructive={true}
        isLoading={isDeletingProject}
        onConfirm={confirmDeleteProject}
        onClose={() => setProjectToDelete(null)}
      />

      {/* Mobile Navigation Drawer */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 flex md:hidden" role="dialog" aria-modal="true">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-zinc-900/40 backdrop-blur-xs transition-opacity animate-in fade-in duration-200"
            onClick={() => setMobileMenuOpen(false)}
          />

          {/* Drawer panel */}
          <div className="relative w-72 sm:w-80 max-w-[85vw] bg-white h-full border-r border-zinc-200 flex flex-col z-10 animate-in slide-in-from-left duration-200">
            {/* Drawer Header */}
            <div className="p-5 border-b border-zinc-100 flex items-center justify-between bg-white shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 bg-blue-600 rounded-sm flex items-center justify-center text-white font-extrabold text-base">
                  V
                </div>
                <div>
                  <h2 className="font-bold text-base text-zinc-800 leading-none">Velocity</h2>
                  <p className="text-[10px] text-zinc-400 font-semibold uppercase tracking-wider mt-0.5">Workspace</p>
                </div>
              </div>
              <button
                onClick={() => setMobileMenuOpen(false)}
                className="w-10 h-10 flex items-center justify-center rounded-sm text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100 cursor-pointer"
                aria-label="Close menu"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Drawer Content */}
            <div className="flex-1 overflow-y-auto p-4 space-y-6">
              {/* Invitations Pill if any */}
              {pendingInvitations.length > 0 && (
                <div
                  onClick={() => {
                    setMobileMenuOpen(false);
                    setInvitesModalOpen(true);
                  }}
                  className="bg-blue-50 border border-blue-200 p-3 rounded-sm flex items-center justify-between cursor-pointer"
                >
                  <div className="flex items-center gap-2 text-blue-950 font-bold text-xs">
                    <Mail className="w-4 h-4 text-blue-600" />
                    <span>Pending Invitations</span>
                  </div>
                  <span className="bg-blue-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
                    {pendingInvitations.length} new
                  </span>
                </div>
              )}

              {/* Navigation Mode */}
              <div>
                <h3 className="text-[10px] font-bold text-zinc-400 uppercase tracking-[0.15em] mb-2 px-1">
                  Views
                </h3>
                <div className="grid grid-cols-2 gap-1.5 p-1 bg-zinc-100 rounded-sm border border-zinc-200/60">
                  <button
                    onClick={() => {
                      setViewMode('board');
                      setMobileMenuOpen(false);
                    }}
                    className={`py-2 text-xs font-bold rounded-sm transition-all cursor-pointer ${
                      viewMode === 'board' ? 'bg-white text-blue-700 border border-zinc-200/80' : 'text-zinc-600'
                    }`}
                  >
                    Board
                  </button>
                  <button
                    onClick={() => {
                      setViewMode('list');
                      setMobileMenuOpen(false);
                    }}
                    className={`py-2 text-xs font-bold rounded-sm transition-all cursor-pointer ${
                      viewMode === 'list' ? 'bg-white text-blue-700 border border-zinc-200/80' : 'text-zinc-600'
                    }`}
                  >
                    List
                  </button>
                </div>
              </div>

              {/* Pinned Projects */}
              <div>
                <div className="flex items-center justify-between mb-2 px-1">
                  <h3 className="text-[10px] font-bold text-zinc-400 uppercase tracking-[0.15em]">
                    Projects
                  </h3>
                  <button
                    onClick={() => {
                      setMobileMenuOpen(false);
                      setCreateProjectModalOpen(true);
                    }}
                    className="text-blue-600 hover:text-blue-800 text-xs font-bold flex items-center gap-1 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>New</span>
                  </button>
                </div>
                <ul className="space-y-1">
                  {Array.from(new Map<string, Project>(displayedProjects.map((p) => [p.id, p])).values()).map((p) => {
                    const isActive = p.id === activeProjectId;
                    return (
                      <li key={`mobile-nav-${p.id}`}>
                        <button
                          onClick={() => {
                            setActiveProjectId(p.id);
                            setMobileMenuOpen(false);
                          }}
                          className={`w-full flex items-center justify-between px-3 py-2.5 rounded-sm text-xs transition-all cursor-pointer border ${
                            isActive
                              ? 'bg-blue-50/80 text-blue-700 font-bold border-blue-200/80'
                              : 'text-zinc-700 hover:bg-zinc-50 font-medium border-transparent'
                          }`}
                        >
                          <span className="flex items-center gap-2.5 truncate">
                            <span
                              className="w-2.5 h-2.5 rounded-full shrink-0"
                              style={{ backgroundColor: p.color || '#6366F1' }}
                            />
                            <span className="truncate">{p.name}</span>
                          </span>
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-zinc-100 text-zinc-500 font-semibold">
                            {p.memberIds?.length || 1}
                          </span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </div>

              {/* Quick Actions */}
              <div>
                <h3 className="text-[10px] font-bold text-zinc-400 uppercase tracking-[0.15em] mb-2 px-1">
                  Quick Actions
                </h3>
                <div className="space-y-1">
                  <button
                    onClick={() => {
                      setMobileMenuOpen(false);
                      setMembersModalOpen(true);
                    }}
                    className="w-full flex items-center gap-2.5 px-3 py-2.5 text-xs font-semibold text-zinc-700 hover:bg-zinc-50 rounded-sm cursor-pointer min-h-[44px]"
                  >
                    <Users className="w-4 h-4 text-zinc-400" />
                    <span>Manage Team Members</span>
                  </button>
                  <button
                    onClick={() => {
                      setMobileMenuOpen(false);
                      setActivityDrawerOpen(true);
                    }}
                    className="w-full flex items-center gap-2.5 px-3 py-2.5 text-xs font-semibold text-zinc-700 hover:bg-zinc-50 rounded-sm cursor-pointer min-h-[44px]"
                  >
                    <History className="w-4 h-4 text-zinc-400" />
                    <span>View Activity Log</span>
                  </button>
                  <button
                    onClick={() => {
                      setMobileMenuOpen(false);
                      setActiveView('landing');
                      window.location.hash = '#landing';
                    }}
                    className="w-full flex items-center gap-2.5 px-3 py-2.5 text-xs font-semibold text-blue-600 hover:bg-blue-50 rounded-sm cursor-pointer min-h-[44px]"
                  >
                    <Globe className="w-4 h-4 text-blue-500" />
                    <span>Product Landing Page</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Drawer Footer: Current User profile */}
            {currentUser && (
              <div className="p-4 border-t border-zinc-100 bg-zinc-50/75">
                <div
                  onClick={() => {
                    setMobileMenuOpen(false);
                    setUserSwitcherOpen(true);
                  }}
                  className="flex items-center justify-between p-2 rounded-sm hover:bg-white border border-transparent hover:border-zinc-200 transition-all cursor-pointer min-h-[44px]"
                >
                  <div className="flex items-center gap-2.5">
                    <Avatar src={currentUser.avatar} name={currentUser.name} size="sm" />
                    <div className="text-left">
                      <p className="text-xs font-bold text-zinc-800">{currentUser.name}</p>
                      <p className="text-[10px] text-zinc-400 uppercase font-semibold">{currentUser.role}</p>
                    </div>
                  </div>
                  <span className="text-xs font-bold text-blue-600">Switch</span>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default function App() {
  return (
    <AuthProvider>
      <WebSocketProvider>
        <MainApplication />
      </WebSocketProvider>
    </AuthProvider>
  );
}
