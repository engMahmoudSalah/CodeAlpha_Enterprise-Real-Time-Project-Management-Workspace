import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import { useWebSocket } from '../context/WebSocketContext';
import { Notification } from '../types';
import {
  subscribeNotifications,
  markNotificationReadInFirestore,
  markAllNotificationsReadInFirestore,
  deleteNotificationInFirestore,
  clearAllNotificationsInFirestore,
  createNotificationInFirestore,
  checkAndNotifyDueTasksInFirestore,
} from '../services/firestoreService';
import {
  Bell,
  CheckCheck,
  Check,
  MessageSquare,
  ArrowRight,
  UserPlus,
  CheckCircle2,
  Trash2,
  Shield,
  X,
  Mail,
  Volume2,
  VolumeX,
  AtSign,
  Clock,
  Sparkles,
  Smartphone,
  ExternalLink,
} from 'lucide-react';
import { Avatar } from '../designSystem';
import { soundManager } from '../utils/soundEffects';

interface NotificationsPopoverProps {
  onSelectTask?: (taskId: string, projectId: string) => void;
  onOpenPendingInvitations?: () => void;
}

type NotifFilter = 'all' | 'unread' | 'mentions' | 'tasks' | 'comments' | 'team';

export const NotificationsPopover: React.FC<NotificationsPopoverProps> = ({
  onSelectTask,
  onOpenPendingInvitations,
}) => {
  const { currentUser, users } = useAuth();
  const { subscribe } = useWebSocket();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [activeFilter, setActiveFilter] = useState<NotifFilter>('all');
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [isClearing, setIsClearing] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(() => soundManager.isEnabled());
  const [desktopNotifPermission, setDesktopNotifPermission] = useState<NotificationPermission>(() => {
    return typeof window !== 'undefined' && 'Notification' in window
      ? window.Notification.permission
      : 'default';
  });
  const containerRef = useRef<HTMLDivElement>(null);
  const prevCountRef = useRef<number>(0);
  const initialLoadRef = useRef<boolean>(true);

  // Toggle sound
  const handleToggleSound = (e: React.MouseEvent) => {
    e.stopPropagation();
    const nextState = !soundEnabled;
    soundManager.setEnabled(nextState);
    setSoundEnabled(nextState);
    if (nextState) {
      soundManager.playNotificationChime();
    }
  };

  // Request browser desktop notification permissions
  const handleRequestDesktopPermission = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (typeof window === 'undefined' || !('Notification' in window)) return;
    try {
      const permission = await window.Notification.requestPermission();
      setDesktopNotifPermission(permission);
      if (permission === 'granted') {
        new window.Notification('Notifications Enabled', {
          body: 'You will now receive desktop alerts for task assignments and mentions.',
          icon: '/favicon.ico',
        });
      }
    } catch (err) {
      console.warn('Desktop notification permission request notice:', err);
    }
  };

  // Check upcoming due tasks on mount & every 15 mins
  useEffect(() => {
    if (!currentUser?.id) return;

    checkAndNotifyDueTasksInFirestore(currentUser.id).catch(() => {});
    const interval = setInterval(() => {
      checkAndNotifyDueTasksInFirestore(currentUser.id).catch(() => {});
    }, 15 * 60 * 1000);

    return () => clearInterval(interval);
  }, [currentUser?.id]);

  // Firestore real-time listener for notifications
  useEffect(() => {
    if (!currentUser?.id) {
      setNotifications([]);
      return;
    }
    setLoading(true);
    const unsubscribe = subscribeNotifications(
      currentUser.id,
      (liveNotifications) => {
        // Detect new unread notifications and trigger chime/desktop alert
        if (!initialLoadRef.current) {
          const newUnreads = liveNotifications.filter((n) => !n.read);
          if (newUnreads.length > prevCountRef.current) {
            soundManager.playNotificationChime();

            // Desktop notification alert if tab in background
            if (
              typeof window !== 'undefined' &&
              'Notification' in window &&
              window.Notification.permission === 'granted' &&
              document.visibilityState === 'hidden'
            ) {
              const latest = newUnreads[0];
              if (latest) {
                new window.Notification(latest.projectName || 'Project Notification', {
                  body: latest.message,
                  icon: '/favicon.ico',
                });
              }
            }
          }
        }
        initialLoadRef.current = false;
        prevCountRef.current = liveNotifications.filter((n) => !n.read).length;

        setNotifications(liveNotifications);
        setLoading(false);
      },
      (err) => {
        console.warn('Notifications live subscription notice:', err.message);
        setLoading(false);
      }
    );
    return () => unsubscribe();
  }, [currentUser?.id]);

  // WebSocket instant notification broadcast fallback
  useEffect(() => {
    const unsubscribe = subscribe('notification:new', (newNotif: Notification) => {
      if (newNotif.userId === currentUser?.id) {
        soundManager.playNotificationChime();
        setNotifications((prev) => {
          if (prev.some((n) => n.id === newNotif.id)) return prev;
          return [newNotif, ...prev];
        });
      }
    });
    return unsubscribe;
  }, [subscribe, currentUser?.id]);

  // Close when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
        setShowClearConfirm(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const unreadCount = notifications.filter((n) => !n.read).length;

  const markAsRead = async (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    try {
      await markNotificationReadInFirestore(id);
      setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
    } catch (err) {
      console.error('Failed to mark notification read in Firestore:', err);
    }
  };

  const markAllAsRead = async () => {
    if (!currentUser?.id) return;
    try {
      await markAllNotificationsReadInFirestore(currentUser.id);
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    } catch (err) {
      console.error('Failed to mark all as read in Firestore:', err);
    }
  };

  const handleDeleteNotification = async (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    try {
      await deleteNotificationInFirestore(id);
      setNotifications((prev) => prev.filter((n) => n.id !== id));
    } catch (err) {
      console.error('Failed to delete notification:', err);
    }
  };

  const handleClearAll = async () => {
    if (!currentUser?.id) return;
    try {
      setIsClearing(true);
      await clearAllNotificationsInFirestore(currentUser.id);
      setNotifications([]);
      setShowClearConfirm(false);
    } catch (err) {
      console.error('Failed to clear notifications:', err);
    } finally {
      setIsClearing(false);
    }
  };

  const handleNotificationClick = (n: Notification) => {
    markAsRead(n.id);
    if (n.taskId && n.projectId && onSelectTask) {
      onSelectTask(n.taskId, n.projectId);
      setIsOpen(false);
    } else if ((n.type === 'project_invite' || n.type === 'project_invite_accepted') && onOpenPendingInvitations) {
      onOpenPendingInvitations();
      setIsOpen(false);
    }
  };

  // Trigger a test notification
  const handleSendTestNotification = async () => {
    if (!currentUser) return;
    try {
      await createNotificationInFirestore({
        userId: currentUser.id,
        actorId: currentUser.id,
        type: 'mention',
        projectId: 'test-project',
        projectName: 'System Alert',
        message: 'Notification system is fully active and synchronized in real-time!',
      });
      soundManager.playNotificationChime();
    } catch (e) {
      console.error('Test notification trigger error:', e);
    }
  };

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
      if (diffHours < 24) return `${diffHours}h ago`;
      if (diffDays === 1) return 'Yesterday';
      if (diffDays < 7) return `${diffDays}d ago`;
      return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
    } catch {
      return '';
    }
  };

  const getActor = (actorId: string) => {
    if (actorId === 'system') {
      return { id: 'system', name: 'System Reminder', avatar: '' };
    }
    return users.find((u) => u.id === actorId);
  };

  const getIcon = (type: Notification['type']) => {
    switch (type) {
      case 'assigned':
        return <UserPlus className="w-3.5 h-3.5 text-blue-600" />;
      case 'comment':
        return <MessageSquare className="w-3.5 h-3.5 text-sky-600" />;
      case 'mention':
        return <AtSign className="w-3.5 h-3.5 text-violet-600" />;
      case 'task_due_soon':
        return <Clock className="w-3.5 h-3.5 text-amber-600" />;
      case 'task_moved':
        return <ArrowRight className="w-3.5 h-3.5 text-amber-600" />;
      case 'task_completed':
        return <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />;
      case 'project_invite':
        return <Mail className="w-3.5 h-3.5 text-blue-600" />;
      case 'project_invite_accepted':
        return <CheckCircle2 className="w-3.5 h-3.5 text-teal-600" />;
      case 'role_changed':
        return <Shield className="w-3.5 h-3.5 text-violet-600" />;
      case 'member_removed':
        return <Trash2 className="w-3.5 h-3.5 text-rose-600" />;
      default:
        return <Bell className="w-3.5 h-3.5 text-zinc-600" />;
    }
  };

  // Filtered notifications
  const filteredNotifications = useMemo(() => {
    return notifications.filter((n) => {
      if (activeFilter === 'unread') return !n.read;
      if (activeFilter === 'mentions') return n.type === 'mention';
      if (activeFilter === 'tasks') return n.type === 'assigned' || n.type === 'task_moved' || n.type === 'task_completed' || n.type === 'task_due_soon';
      if (activeFilter === 'comments') return n.type === 'comment';
      if (activeFilter === 'team') return n.type === 'project_invite' || n.type === 'project_invite_accepted' || n.type === 'role_changed' || n.type === 'member_removed';
      return true;
    });
  }, [notifications, activeFilter]);

  const counts = useMemo(() => {
    return {
      all: notifications.length,
      unread: notifications.filter((n) => !n.read).length,
      mentions: notifications.filter((n) => n.type === 'mention').length,
      tasks: notifications.filter((n) => n.type === 'assigned' || n.type === 'task_moved' || n.type === 'task_completed' || n.type === 'task_due_soon').length,
      comments: notifications.filter((n) => n.type === 'comment').length,
      team: notifications.filter((n) => n.type.includes('invite') || n.type.includes('role') || n.type.includes('member')).length,
    };
  }, [notifications]);

  return (
    <div id="notifications-menu" className={`relative ${isOpen ? 'z-[60]' : ''}`} ref={containerRef}>
      <button
        id="notifications-trigger-btn"
        onClick={() => {
          setIsOpen(!isOpen);
          setShowClearConfirm(false);
        }}
        className={`relative flex items-center justify-center w-9 h-9 sm:w-10 sm:h-10 rounded-sm transition-all cursor-pointer ${
          isOpen
            ? 'bg-blue-50 text-blue-600'
            : 'text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100'
        }`}
        title="Notifications"
        aria-label="View notifications"
      >
        <Bell className="w-4 h-4 sm:w-4.5 sm:h-4.5" />
        {unreadCount > 0 && (
          <span
            id="unread-notifications-badge"
            className="absolute top-1 right-1 flex items-center justify-center min-w-[17px] h-[17px] px-1 text-[9px] font-extrabold text-white bg-blue-600 rounded-full border-2 border-white shadow-xs animate-pulse"
          >
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div
          id="notifications-dropdown"
          className="absolute right-[-10px] sm:right-0 mt-2 w-[calc(100vw-24px)] max-w-sm sm:w-[420px] bg-white rounded-sm shadow-2xl border border-zinc-200/90 z-[60] overflow-hidden animate-in fade-in zoom-in-95 duration-100 select-none"
        >
          {/* Header Bar */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-100 bg-zinc-50/80">
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-sm text-zinc-900">Notifications</h3>
              {unreadCount > 0 && (
                <span className="text-[11px] bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-bold">
                  {unreadCount} new
                </span>
              )}
            </div>

            <div className="flex items-center gap-1.5">
              {/* Sound Toggle Button */}
              <button
                type="button"
                onClick={handleToggleSound}
                className={`p-1.5 rounded-sm transition-colors cursor-pointer ${
                  soundEnabled
                    ? 'text-blue-600 bg-blue-50 hover:bg-blue-100/70'
                    : 'text-zinc-400 hover:text-zinc-600 hover:bg-zinc-100'
                }`}
                title={soundEnabled ? 'Mute notification sound' : 'Unmute notification sound'}
              >
                {soundEnabled ? <Volume2 className="w-3.5 h-3.5" /> : <VolumeX className="w-3.5 h-3.5" />}
              </button>

              {/* Desktop Push Alert Request */}
              {desktopNotifPermission === 'default' && (
                <button
                  type="button"
                  onClick={handleRequestDesktopPermission}
                  className="text-[11px] font-bold text-zinc-600 hover:text-blue-600 px-2 py-1 rounded-sm hover:bg-zinc-100 flex items-center gap-1 transition-colors cursor-pointer"
                  title="Enable Desktop Alerts"
                >
                  <Smartphone className="w-3 h-3 text-blue-600" />
                  <span>Desktop Alerts</span>
                </button>
              )}

              {/* Mark All Read */}
              {unreadCount > 0 && (
                <button
                  id="mark-all-read-btn"
                  onClick={markAllAsRead}
                  className="text-xs text-blue-600 hover:text-blue-800 font-semibold px-2 py-1 rounded-sm hover:bg-blue-50/60 flex items-center gap-1 transition-colors cursor-pointer"
                >
                  <CheckCheck className="w-3.5 h-3.5" />
                  <span>Mark all read</span>
                </button>
              )}

              {/* Clear History */}
              {notifications.length > 0 && (
                <button
                  onClick={() => setShowClearConfirm(!showClearConfirm)}
                  className="text-xs text-zinc-400 hover:text-rose-600 px-2 py-1 rounded-sm hover:bg-zinc-100 font-medium transition-colors cursor-pointer"
                  title="Clear all notifications"
                >
                  Clear
                </button>
              )}
            </div>
          </div>

          {/* Clear All Confirmation Prompt */}
          {showClearConfirm && (
            <div className="px-4 py-2.5 bg-rose-50 border-b border-rose-200 flex items-center justify-between text-xs animate-in fade-in duration-100">
              <span className="text-rose-800 font-semibold">Delete all notifications?</span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowClearConfirm(false)}
                  className="text-zinc-600 hover:text-zinc-900 font-medium px-2 py-0.5 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  onClick={handleClearAll}
                  disabled={isClearing}
                  className="px-2.5 py-1 bg-rose-600 hover:bg-rose-700 text-white rounded-sm font-bold cursor-pointer disabled:opacity-50"
                >
                  {isClearing ? 'Clearing...' : 'Clear All'}
                </button>
              </div>
            </div>
          )}

          {/* Filter Tabs */}
          <div className="flex items-center gap-1 px-3 py-2 border-b border-zinc-100 bg-white overflow-x-auto sleek-scrollbar text-xs">
            <button
              onClick={() => setActiveFilter('all')}
              className={`px-2.5 py-1 rounded-sm font-bold transition-all whitespace-nowrap cursor-pointer ${
                activeFilter === 'all'
                  ? 'bg-zinc-900 text-white shadow-2xs'
                  : 'text-zinc-600 hover:bg-zinc-100'
              }`}
            >
              All ({counts.all})
            </button>
            <button
              onClick={() => setActiveFilter('unread')}
              className={`px-2.5 py-1 rounded-sm font-bold transition-all whitespace-nowrap cursor-pointer ${
                activeFilter === 'unread'
                  ? 'bg-blue-600 text-white shadow-2xs'
                  : 'text-zinc-600 hover:bg-zinc-100'
              }`}
            >
              Unread ({counts.unread})
            </button>
            {counts.mentions > 0 && (
              <button
                onClick={() => setActiveFilter('mentions')}
                className={`px-2.5 py-1 rounded-sm font-bold transition-all whitespace-nowrap cursor-pointer ${
                  activeFilter === 'mentions'
                    ? 'bg-violet-600 text-white shadow-2xs'
                    : 'text-zinc-600 hover:bg-zinc-100'
                }`}
              >
                Mentions ({counts.mentions})
              </button>
            )}
            <button
              onClick={() => setActiveFilter('tasks')}
              className={`px-2.5 py-1 rounded-sm font-bold transition-all whitespace-nowrap cursor-pointer ${
                activeFilter === 'tasks'
                  ? 'bg-blue-600 text-white shadow-2xs'
                  : 'text-zinc-600 hover:bg-zinc-100'
              }`}
            >
              Tasks ({counts.tasks})
            </button>
            <button
              onClick={() => setActiveFilter('comments')}
              className={`px-2.5 py-1 rounded-sm font-bold transition-all whitespace-nowrap cursor-pointer ${
                activeFilter === 'comments'
                  ? 'bg-sky-600 text-white shadow-2xs'
                  : 'text-zinc-600 hover:bg-zinc-100'
              }`}
            >
              Comments ({counts.comments})
            </button>
            <button
              onClick={() => setActiveFilter('team')}
              className={`px-2.5 py-1 rounded-sm font-bold transition-all whitespace-nowrap cursor-pointer ${
                activeFilter === 'team'
                  ? 'bg-teal-600 text-white shadow-2xs'
                  : 'text-zinc-600 hover:bg-zinc-100'
              }`}
            >
              Team ({counts.team})
            </button>
          </div>

          {/* Notifications List */}
          <div className="max-h-[380px] overflow-y-auto divide-y divide-slate-100 sleek-scrollbar bg-zinc-50/30">
            {loading && notifications.length === 0 ? (
              <div className="py-12 text-center text-xs text-zinc-400 flex flex-col items-center gap-2">
                <div className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                <span>Loading real-time notifications...</span>
              </div>
            ) : filteredNotifications.length === 0 ? (
              <div className="py-12 text-center text-zinc-400 px-6">
                <div className="w-10 h-10 rounded-sm bg-zinc-100 flex items-center justify-center mx-auto mb-2 text-zinc-400">
                  <Bell className="w-5 h-5" />
                </div>
                <p className="text-sm font-bold text-zinc-700">No notifications</p>
                <p className="text-xs text-zinc-400 mt-0.5">
                  {activeFilter === 'unread'
                    ? "You're all caught up! No unread messages."
                    : 'Updates on task assignments, mentions, and team activities will appear here live.'}
                </p>
                <button
                  type="button"
                  onClick={handleSendTestNotification}
                  className="mt-3 text-[11px] font-bold text-blue-600 hover:text-blue-800 bg-blue-50 hover:bg-blue-100/70 px-3 py-1.5 rounded-sm inline-flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Send Test Notification</span>
                </button>
              </div>
            ) : (
              filteredNotifications.map((n) => {
                const actor = getActor(n.actorId);
                const isMention = n.type === 'mention';
                const isDue = n.type === 'task_due_soon';

                return (
                  <div
                    key={n.id}
                    id={`notification-item-${n.id}`}
                    onClick={() => handleNotificationClick(n)}
                    className={`p-3.5 flex items-start gap-3 hover:bg-zinc-100/70 cursor-pointer transition-colors group relative ${
                      !n.read
                        ? isMention
                          ? 'bg-violet-50/50'
                          : isDue
                          ? 'bg-amber-50/50'
                          : 'bg-blue-50/35'
                        : 'bg-white'
                    }`}
                  >
                    {/* Actor Avatar with Action Icon Badge */}
                    <div className="relative shrink-0 mt-0.5">
                      <Avatar
                        src={actor?.avatar}
                        name={actor?.name || 'Teammate'}
                        size="md"
                        className="w-8 h-8 rounded-full border border-zinc-200"
                      />
                      <span className="absolute -bottom-1 -right-1 p-0.5 bg-white rounded-full shadow-2xs border border-zinc-100">
                        {getIcon(n.type)}
                      </span>
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0 pr-6">
                      <p className="text-xs text-zinc-800 leading-snug font-normal">
                        <strong className="font-bold text-zinc-900">{actor?.name || 'Teammate'} </strong>
                        {n.message}
                      </p>

                      {n.taskTitle && (
                        <p className="text-[11px] text-blue-600 font-semibold truncate mt-1 flex items-center gap-1">
                          <span>Task: {n.taskTitle}</span>
                          <ArrowRight className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                        </p>
                      )}

                      {n.projectName && !n.taskTitle && (
                        <p className="text-[11px] text-teal-600 font-semibold truncate mt-1">
                          Project: {n.projectName}
                        </p>
                      )}

                      <span className="text-[10px] font-medium text-zinc-400 block mt-1">
                        {formatTimeAgo(n.createdAt)}
                      </span>
                    </div>

                    {/* Right Hover Actions */}
                    <div className="absolute right-3 top-3 flex items-center gap-1">
                      {!n.read ? (
                        <button
                          type="button"
                          onClick={(e) => markAsRead(n.id, e)}
                          className="p-1 text-zinc-400 hover:text-blue-600 hover:bg-white rounded-sm transition-colors cursor-pointer"
                          title="Mark as read"
                        >
                          <Check className="w-3.5 h-3.5" />
                        </button>
                      ) : null}
                      <button
                        type="button"
                        onClick={(e) => handleDeleteNotification(n.id, e)}
                        className="p-1 text-zinc-400 hover:text-rose-600 hover:bg-white rounded-sm opacity-0 group-hover:opacity-100 transition-all cursor-pointer"
                        title="Delete notification"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    {/* Unread Indicator Dot */}
                    {!n.read && (
                      <span
                        className={`w-2 h-2 rounded-full shrink-0 absolute right-3.5 top-4 group-hover:opacity-0 transition-opacity ${
                          isMention ? 'bg-violet-600' : isDue ? 'bg-amber-600' : 'bg-blue-600'
                        }`}
                        title="Unread"
                      />
                    )}
                  </div>
                );
              })
            )}
          </div>

          {/* Footer */}
          {notifications.length > 0 && (
            <div className="px-4 py-2.5 border-t border-zinc-100 bg-zinc-50/80 flex items-center justify-between text-[11px] text-zinc-500 font-medium">
              <span>
                {counts.unread > 0 ? `${counts.unread} unread notifications` : 'All caught up'}
              </span>
              <button
                onClick={() => setIsOpen(false)}
                className="text-zinc-700 hover:text-zinc-900 font-bold cursor-pointer"
              >
                Close
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
