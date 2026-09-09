import React, { useEffect, useState, useMemo } from 'react';
import { ActivityLog, User } from '../types';
import { subscribeActivityLogs, clearProjectActivityLogsInFirestore } from '../services/firestoreService';
import {
  X,
  History,
  CheckCircle2,
  MessageSquare,
  ArrowRight,
  PlusCircle,
  Trash2,
  Search,
  Users,
  Shield,
  ArrowRightLeft,
  FolderPlus,
  Radio,
  SlidersHorizontal,
  Download,
  Calendar,
  Filter,
  FileSpreadsheet,
  FileJson,
  UserCheck,
  Sparkles,
  RefreshCw,
} from 'lucide-react';
import { Avatar } from '../designSystem';

interface ActivityDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  projectId: string;
  projectName: string;
  users: User[];
  currentUser?: User | null;
  onSelectTask?: (taskId: string) => void;
}

type ActivityCategory = 'all' | 'tasks' | 'comments' | 'team' | 'project';
type TimeFilter = 'all' | 'today' | 'week' | 'month';

export const ActivityDrawer: React.FC<ActivityDrawerProps> = ({
  isOpen,
  onClose,
  projectId,
  projectName,
  users,
  currentUser,
  onSelectTask,
}) => {
  const [activities, setActivities] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<ActivityCategory>('all');
  const [timeFilter, setTimeFilter] = useState<TimeFilter>('all');
  const [userFilter, setUserFilter] = useState<string>('all');
  const [showConfirmClear, setShowConfirmClear] = useState(false);
  const [isClearing, setIsClearing] = useState(false);
  const [exportMenuOpen, setExportMenuOpen] = useState(false);
  const [showFiltersBar, setShowFiltersBar] = useState(false);

  // Real-time Firestore subscription to project activity stream
  useEffect(() => {
    if (!isOpen || !projectId) {
      setActivities([]);
      return;
    }

    setLoading(true);
    const unsubscribe = subscribeActivityLogs(
      projectId,
      (liveLogs) => {
        setActivities(liveLogs);
        setLoading(false);
      },
      (err) => {
        console.warn('Activity live subscription notice:', err.message);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [isOpen, projectId]);

  // Handle clearing activity stream
  const handleClearHistory = async () => {
    if (!currentUser || !projectId) return;
    try {
      setIsClearing(true);
      await clearProjectActivityLogsInFirestore(projectId, currentUser);
      setShowConfirmClear(false);
    } catch (err) {
      console.error('Failed to clear activity stream:', err);
    } finally {
      setIsClearing(false);
    }
  };

  // Format friendly timestamp
  const formatTimeAgo = (isoString: string) => {
    try {
      const date = new Date(isoString);
      const now = new Date();
      const diffMs = now.getTime() - date.getTime();
      const diffSecs = Math.floor(diffMs / 1000);
      const diffMins = Math.floor(diffSecs / 60);
      const diffHours = Math.floor(diffMins / 60);
      const diffDays = Math.floor(diffHours / 24);

      if (diffSecs < 45) return 'Just now';
      if (diffMins < 60) return `${diffMins}m ago`;
      if (diffHours < 24) {
        return date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
      }
      if (diffDays === 1) {
        return `Yesterday at ${date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}`;
      }
      if (diffDays < 7) {
        return `${date.toLocaleDateString([], { weekday: 'short' })} at ${date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}`;
      }
      return date.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' });
    } catch {
      return '';
    }
  };

  // Categorize activities for smart filtering
  const categorizeActivity = (action: string): ActivityCategory => {
    const act = action.toLowerCase();
    if (act.includes('comment')) return 'comments';
    if (act.includes('member') || act.includes('role') || act.includes('invit') || act.includes('joined')) return 'team';
    if (act.includes('project') && !act.includes('task')) return 'project';
    return 'tasks';
  };

  // Filtered activities based on category, time, user, and search query
  const filteredActivities = useMemo(() => {
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const sevenDaysAgo = now.getTime() - 7 * 24 * 60 * 60 * 1000;
    const thirtyDaysAgo = now.getTime() - 30 * 24 * 60 * 60 * 1000;

    return activities.filter((act) => {
      // 1. Category match
      if (selectedCategory !== 'all') {
        const cat = categorizeActivity(act.action);
        if (cat !== selectedCategory) return false;
      }

      // 2. User filter match
      if (userFilter !== 'all') {
        if (userFilter === 'me' && currentUser) {
          if (act.userId !== currentUser.id) return false;
        } else if (act.userId !== userFilter) {
          return false;
        }
      }

      // 3. Time filter match
      if (timeFilter !== 'all') {
        const actTime = new Date(act.createdAt).getTime();
        if (timeFilter === 'today' && actTime < startOfToday) return false;
        if (timeFilter === 'week' && actTime < sevenDaysAgo) return false;
        if (timeFilter === 'month' && actTime < thirtyDaysAgo) return false;
      }

      // 4. Search match
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase().trim();
        const user = users.find((u) => u.id === act.userId);
        const matchText = (act.details || '').toLowerCase();
        const matchAction = (act.action || '').toLowerCase();
        const matchTitle = (act.taskTitle || '').toLowerCase();
        const matchUser = (user?.name || '').toLowerCase();

        return (
          matchText.includes(query) ||
          matchAction.includes(query) ||
          matchTitle.includes(query) ||
          matchUser.includes(query)
        );
      }

      return true;
    });
  }, [activities, selectedCategory, timeFilter, userFilter, searchQuery, users, currentUser]);

  // Category counts
  const categoryCounts = useMemo(() => {
    const counts = { all: activities.length, tasks: 0, comments: 0, team: 0, project: 0 };
    activities.forEach((act) => {
      const cat = categorizeActivity(act.action);
      counts[cat] = (counts[cat] || 0) + 1;
    });
    return counts;
  }, [activities]);

  // Activity stream insights
  const insights = useMemo(() => {
    if (activities.length === 0) return null;
    const userCountMap: Record<string, number> = {};
    activities.forEach((act) => {
      userCountMap[act.userId] = (userCountMap[act.userId] || 0) + 1;
    });

    let topUserId = '';
    let topCount = 0;
    Object.entries(userCountMap).forEach(([uid, count]) => {
      if (count > topCount) {
        topCount = count;
        topUserId = uid;
      }
    });

    const topUser = users.find((u) => u.id === topUserId);

    return {
      topUser: topUser ? topUser.name : 'Team Member',
      topCount,
      totalCount: activities.length,
    };
  }, [activities, users]);

  // Export to CSV
  const handleExportCSV = () => {
    if (activities.length === 0) return;
    const headers = ['ID', 'Timestamp', 'User Name', 'Action', 'Task Title', 'Details', 'Project Name'];
    const rows = activities.map((act) => {
      const user = users.find((u) => u.id === act.userId);
      return [
        act.id,
        new Date(act.createdAt).toISOString(),
        user ? user.name : act.userId,
        act.action,
        act.taskTitle || '',
        `"${(act.details || '').replace(/"/g, '""')}"`,
        `"${projectName.replace(/"/g, '""')}"`,
      ];
    });

    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `activity-stream-${projectName.toLowerCase().replace(/[^a-z0-9]/g, '-')}-${Date.now()}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    setExportMenuOpen(false);
  };

  // Export to JSON
  const handleExportJSON = () => {
    if (activities.length === 0) return;
    const exportData = {
      projectId,
      projectName,
      exportedAt: new Date().toISOString(),
      totalActivities: activities.length,
      activities: activities.map((act) => {
        const user = users.find((u) => u.id === act.userId);
        return {
          ...act,
          userName: user ? user.name : 'Unknown User',
          userEmail: user ? user.email : '',
        };
      }),
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `activity-stream-${projectName.toLowerCase().replace(/[^a-z0-9]/g, '-')}-${Date.now()}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    setExportMenuOpen(false);
  };

  const getActionBadge = (action: string) => {
    const act = action.toLowerCase();
    if (act.includes('completed') || act.includes('done')) {
      return {
        icon: <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />,
        bg: 'bg-emerald-50 border-emerald-200 text-emerald-700',
      };
    }
    if (act.includes('comment')) {
      return {
        icon: <MessageSquare className="w-3.5 h-3.5 text-sky-600" />,
        bg: 'bg-sky-50 border-sky-200 text-sky-700',
      };
    }
    if (act.includes('created') && act.includes('task')) {
      return {
        icon: <PlusCircle className="w-3.5 h-3.5 text-blue-600" />,
        bg: 'bg-blue-50 border-blue-200 text-blue-700',
      };
    }
    if (act.includes('moved') || act.includes('changed priority')) {
      return {
        icon: <ArrowRightLeft className="w-3.5 h-3.5 text-amber-600" />,
        bg: 'bg-amber-50 border-amber-200 text-amber-700',
      };
    }
    if (act.includes('deleted') || act.includes('removed')) {
      return {
        icon: <Trash2 className="w-3.5 h-3.5 text-rose-600" />,
        bg: 'bg-rose-50 border-rose-200 text-rose-700',
      };
    }
    if (act.includes('joined') || act.includes('invit')) {
      return {
        icon: <Users className="w-3.5 h-3.5 text-teal-600" />,
        bg: 'bg-teal-50 border-teal-200 text-teal-700',
      };
    }
    if (act.includes('role')) {
      return {
        icon: <Shield className="w-3.5 h-3.5 text-violet-600" />,
        bg: 'bg-violet-50 border-violet-200 text-violet-700',
      };
    }
    if (act.includes('project')) {
      return {
        icon: <FolderPlus className="w-3.5 h-3.5 text-blue-600" />,
        bg: 'bg-blue-50 border-blue-200 text-blue-700',
      };
    }
    return {
      icon: <History className="w-3.5 h-3.5 text-zinc-600" />,
      bg: 'bg-zinc-50 border-zinc-200 text-zinc-700',
    };
  };

  if (!isOpen) return null;

  const hasActiveFilters = selectedCategory !== 'all' || timeFilter !== 'all' || userFilter !== 'all' || searchQuery.trim() !== '';

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-zinc-900/40 backdrop-blur-xs select-none">
      <div
        id="activity-drawer-panel"
        className="bg-white w-full max-w-lg h-full flex flex-col border-l border-zinc-200 shadow-sm animate-in slide-in-from-right duration-200"
      >
        {/* Header Bar */}
        <div className="px-5 py-4 border-b border-zinc-100 bg-zinc-50/80 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-sm bg-blue-50 border border-blue-200/80 flex items-center justify-center text-blue-600 shadow-2xs">
              <History className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-bold text-zinc-900">Project Activity Stream</h2>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200/80">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  Live Sync
                </span>
              </div>
              <p className="text-xs text-zinc-500 font-medium truncate max-w-[220px] sm:max-w-xs">{projectName}</p>
            </div>
          </div>

          <div className="flex items-center gap-1 relative">
            {/* Export Menu */}
            <div className="relative">
              <button
                type="button"
                id="export-activity-btn"
                onClick={() => setExportMenuOpen(!exportMenuOpen)}
                className="p-1.5 rounded-sm text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100 transition-colors cursor-pointer"
                title="Export Activity Audit Trail"
              >
                <Download className="w-4 h-4" />
              </button>

              {exportMenuOpen && (
                <div className="absolute right-0 top-full mt-1 w-44 bg-white border border-zinc-200 rounded-sm shadow-sm py-1 z-50 animate-in fade-in zoom-in-95 duration-100">
                  <button
                    type="button"
                    onClick={handleExportCSV}
                    className="w-full px-3 py-2 text-left text-xs text-zinc-700 hover:bg-zinc-50 flex items-center gap-2 font-medium cursor-pointer"
                  >
                    <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Export as CSV</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleExportJSON}
                    className="w-full px-3 py-2 text-left text-xs text-zinc-700 hover:bg-zinc-50 flex items-center gap-2 font-medium cursor-pointer"
                  >
                    <FileJson className="w-3.5 h-3.5 text-blue-600" />
                    <span>Export as JSON</span>
                  </button>
                </div>
              )}
            </div>

            {/* Clear Button */}
            {activities.length > 0 && (
              <button
                type="button"
                onClick={() => setShowConfirmClear(!showConfirmClear)}
                className="text-xs font-semibold text-zinc-400 hover:text-rose-600 px-2 py-1.5 rounded-sm hover:bg-zinc-100 transition-colors cursor-pointer"
                title="Clear activity log"
              >
                Clear
              </button>
            )}

            {/* Close Button */}
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-sm text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100 transition-colors cursor-pointer"
              aria-label="Close activity stream"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Clear Confirmation Prompt */}
        {showConfirmClear && (
          <div className="px-5 py-3 bg-rose-50/90 border-b border-rose-200 flex items-center justify-between text-xs animate-in fade-in duration-150">
            <span className="text-rose-800 font-medium">Clear entire project activity log?</span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setShowConfirmClear(false)}
                className="px-2.5 py-1 text-zinc-600 hover:text-zinc-900 font-medium cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleClearHistory}
                disabled={isClearing}
                className="px-3 py-1 bg-rose-600 hover:bg-rose-700 text-white rounded-sm font-bold shadow-xs cursor-pointer disabled:opacity-50"
              >
                {isClearing ? 'Clearing...' : 'Yes, Clear'}
              </button>
            </div>
          </div>
        )}

        {/* Insights Bar */}
        {insights && (
          <div className="px-5 py-2 bg-blue-50/60 border-b border-blue-100/80 flex items-center justify-between text-[11px] text-blue-900 shrink-0">
            <div className="flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-blue-600" />
              <span>Top Contributor: <strong className="font-bold">{insights.topUser}</strong> ({insights.topCount} actions)</span>
            </div>
            <button
              type="button"
              onClick={() => setShowFiltersBar(!showFiltersBar)}
              className="flex items-center gap-1 font-bold text-blue-600 hover:text-blue-800 cursor-pointer"
            >
              <Filter className="w-3 h-3" />
              <span>{showFiltersBar ? 'Hide Filters' : 'Advanced Filters'}</span>
            </button>
          </div>
        )}

        {/* Search & Category Filter Controls */}
        <div className="p-4 border-b border-zinc-100 space-y-3 bg-white shrink-0">
          {/* Search Input */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-zinc-400 absolute left-3 top-2.5 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by action, task, or team member..."
              className="w-full bg-zinc-50 hover:bg-zinc-100/80 focus:bg-white border border-zinc-200 rounded-sm py-2 pl-8.5 pr-8 text-xs text-zinc-800 focus:outline-hidden focus:border-blue-400 focus:ring-2 focus:ring-blue-50 transition-all placeholder:text-zinc-400"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-2.5 text-zinc-400 hover:text-zinc-600 cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Category Filter Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto sleek-scrollbar pb-1 text-xs">
            <button
              type="button"
              onClick={() => setSelectedCategory('all')}
              className={`px-3 py-1 rounded-sm font-semibold transition-all whitespace-nowrap cursor-pointer ${
                selectedCategory === 'all'
                  ? 'bg-zinc-900 text-white shadow-2xs'
                  : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200/80'
              }`}
            >
              All ({categoryCounts.all})
            </button>
            <button
              type="button"
              onClick={() => setSelectedCategory('tasks')}
              className={`px-3 py-1 rounded-sm font-semibold transition-all whitespace-nowrap cursor-pointer ${
                selectedCategory === 'tasks'
                  ? 'bg-blue-600 text-white shadow-2xs'
                  : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200/80'
              }`}
            >
              Tasks ({categoryCounts.tasks})
            </button>
            <button
              type="button"
              onClick={() => setSelectedCategory('comments')}
              className={`px-3 py-1 rounded-sm font-semibold transition-all whitespace-nowrap cursor-pointer ${
                selectedCategory === 'comments'
                  ? 'bg-sky-600 text-white shadow-2xs'
                  : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200/80'
              }`}
            >
              Comments ({categoryCounts.comments})
            </button>
            <button
              type="button"
              onClick={() => setSelectedCategory('team')}
              className={`px-3 py-1 rounded-sm font-semibold transition-all whitespace-nowrap cursor-pointer ${
                selectedCategory === 'team'
                  ? 'bg-teal-600 text-white shadow-2xs'
                  : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200/80'
              }`}
            >
              Team ({categoryCounts.team})
            </button>
            <button
              type="button"
              onClick={() => setSelectedCategory('project')}
              className={`px-3 py-1 rounded-sm font-semibold transition-all whitespace-nowrap cursor-pointer ${
                selectedCategory === 'project'
                  ? 'bg-blue-600 text-white shadow-2xs'
                  : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200/80'
              }`}
            >
              Project ({categoryCounts.project})
            </button>
          </div>

          {/* Secondary Filter Controls (Time Range & Member) */}
          {showFiltersBar && (
            <div className="grid grid-cols-2 gap-2 pt-2 border-t border-zinc-100 animate-in fade-in duration-150">
              {/* Time Range Filter */}
              <div>
                <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-1">
                  Time Range
                </label>
                <select
                  value={timeFilter}
                  onChange={(e) => setTimeFilter(e.target.value as TimeFilter)}
                  className="w-full px-2.5 py-1.5 text-xs bg-zinc-50 border border-zinc-200 rounded-sm text-zinc-700 outline-hidden font-medium"
                >
                  <option value="all">All Time</option>
                  <option value="today">Today Only</option>
                  <option value="week">Past 7 Days</option>
                  <option value="month">Past 30 Days</option>
                </select>
              </div>

              {/* User / Member Filter */}
              <div>
                <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-1">
                  Team Member
                </label>
                <select
                  value={userFilter}
                  onChange={(e) => setUserFilter(e.target.value)}
                  className="w-full px-2.5 py-1.5 text-xs bg-zinc-50 border border-zinc-200 rounded-sm text-zinc-700 outline-hidden font-medium"
                >
                  <option value="all">All Members</option>
                  {currentUser && <option value="me">Only My Activity</option>}
                  {users.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}

          {hasActiveFilters && (
            <div className="flex items-center justify-between text-[11px] text-zinc-500 pt-1">
              <span>Filtered: <strong>{filteredActivities.length}</strong> results</span>
              <button
                type="button"
                onClick={() => {
                  setSelectedCategory('all');
                  setTimeFilter('all');
                  setUserFilter('all');
                  setSearchQuery('');
                }}
                className="text-blue-600 hover:text-blue-800 font-bold cursor-pointer"
              >
                Reset Filters
              </button>
            </div>
          )}
        </div>

        {/* Activity Timeline List */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4 sleek-scrollbar bg-zinc-50/40">
          {loading ? (
            <div className="py-16 text-center text-xs text-zinc-400 flex flex-col items-center gap-2">
              <div className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
              <span>Streaming activity feed from Firestore...</span>
            </div>
          ) : filteredActivities.length === 0 ? (
            <div className="py-16 text-center text-zinc-400">
              <div className="w-12 h-12 rounded-sm bg-white border border-zinc-200/80 flex items-center justify-center mx-auto mb-3 shadow-2xs">
                <History className="w-6 h-6 text-zinc-300" />
              </div>
              <p className="text-sm font-bold text-zinc-700">No activity recorded</p>
              <p className="text-xs text-zinc-400 mt-1 max-w-xs mx-auto">
                {hasActiveFilters
                  ? 'No activity matches your active search and filter criteria.'
                  : 'Actions like creating tasks, posting comments, moving cards, and team updates will be logged here live.'}
              </p>
            </div>
          ) : (
            <div className="relative pl-6 space-y-4 before:absolute before:left-3 before:top-2 before:bottom-2 before:w-px before:bg-zinc-200">
              {filteredActivities.map((act) => {
                const user = users.find((u) => u.id === act.userId);
                const badge = getActionBadge(act.action);

                return (
                  <div key={act.id} className="relative group">
                    {/* Floating Marker Badge */}
                    <span
                      className={`absolute -left-6 top-1 flex items-center justify-center w-6 h-6 rounded-full border shadow-2xs bg-white ${badge.bg}`}
                    >
                      {badge.icon}
                    </span>

                    {/* Activity Card */}
                    <div className="bg-white hover:bg-zinc-50/80 p-3.5 rounded-sm border border-zinc-200/80 shadow-2xs transition-all hover:border-zinc-300">
                      <div className="flex items-center justify-between gap-2 mb-1.5">
                        <div className="flex items-center gap-2 min-w-0">
                          <Avatar
                            src={user?.avatar}
                            name={user?.name || 'Teammate'}
                            size="sm"
                            className="w-5 h-5 rounded-full"
                          />
                          <button
                            type="button"
                            onClick={() => setUserFilter(act.userId)}
                            className="text-xs font-bold text-zinc-900 hover:text-blue-600 truncate cursor-pointer text-left"
                            title={`Filter by ${user?.name || 'this member'}`}
                          >
                            {user?.name || 'Team Member'}
                          </button>
                          <span
                            className={`text-[10px] font-bold px-1.5 py-0.2 rounded-sm border ${badge.bg}`}
                          >
                            {act.action}
                          </span>
                        </div>

                        <span
                          className="text-[10px] font-semibold text-zinc-400 shrink-0"
                          title={new Date(act.createdAt).toLocaleString()}
                        >
                          {formatTimeAgo(act.createdAt)}
                        </span>
                      </div>

                      {/* Detail Text */}
                      <p className="text-xs text-zinc-700 leading-relaxed font-normal">
                        {act.details}
                      </p>

                      {/* Interactive Task Link Button */}
                      {act.taskId && (
                        <div className="mt-2.5 pt-2 border-t border-zinc-100 flex items-center justify-between">
                          <button
                            type="button"
                            onClick={() => {
                              if (onSelectTask && act.taskId) {
                                onSelectTask(act.taskId);
                                onClose();
                              }
                            }}
                            className="text-[11px] font-bold text-blue-600 hover:text-blue-800 flex items-center gap-1.5 transition-colors cursor-pointer"
                          >
                            <span>Open Task: {act.taskTitle || 'View details'}</span>
                            <ArrowRight className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer Summary */}
        <div className="px-5 py-3.5 border-t border-zinc-100 bg-zinc-50/80 flex items-center justify-between text-xs shrink-0">
          <span className="text-zinc-500 font-medium">
            Showing <strong className="text-zinc-800">{filteredActivities.length}</strong> of{' '}
            <strong className="text-zinc-800">{activities.length}</strong> activities
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 bg-zinc-900 hover:bg-zinc-800 text-white rounded-sm font-bold transition-colors cursor-pointer shadow-2xs"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
