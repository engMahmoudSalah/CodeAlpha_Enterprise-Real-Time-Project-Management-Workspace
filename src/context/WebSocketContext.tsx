import React, { createContext, useContext, useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { useAuth } from './AuthContext';
import { User } from '../types';

type EventCallback = (payload: any) => void;

interface WebSocketContextType {
  connected: boolean;
  activeUsers: { userId: string; user: User }[];
  currentTypingUsers: { userId: string; userName: string; taskId: string }[];
  joinProject: (projectId: string) => void;
  leaveProject: (projectId: string) => void;
  sendTyping: (taskId: string, isTyping: boolean) => void;
  subscribe: (eventType: string, callback: EventCallback) => () => void;
  recentLiveToast: { message: string; id: string } | null;
  clearLiveToast: () => void;
}

const WebSocketContext = createContext<WebSocketContextType | undefined>(undefined);

export const WebSocketProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { currentUser } = useAuth();
  const [connected, setConnected] = useState(false);
  const [activeUsers, setActiveUsers] = useState<{ userId: string; user: User }[]>([]);
  const [currentTypingUsers, setCurrentTypingUsers] = useState<{ userId: string; userName: string; taskId: string }[]>([]);
  const [recentLiveToast, setRecentLiveToast] = useState<{ message: string; id: string } | null>(null);

  const currentUserRef = useRef<User | null>(currentUser);
  useEffect(() => {
    currentUserRef.current = currentUser;
  }, [currentUser]);

  const wsRef = useRef<WebSocket | null>(null);
  const currentProjectIdRef = useRef<string | null>(null);
  const listenersRef = useRef<Map<string, Set<EventCallback>>>(new Map());
  const reconnectTimeoutRef = useRef<any>(null);

  const clearLiveToast = useCallback(() => setRecentLiveToast(null), []);

  const subscribe = useCallback((eventType: string, callback: EventCallback) => {
    if (!listenersRef.current.has(eventType)) {
      listenersRef.current.set(eventType, new Set());
    }
    listenersRef.current.get(eventType)!.add(callback);

    return () => {
      const set = listenersRef.current.get(eventType);
      if (set) {
        set.delete(callback);
        if (set.size === 0) {
          listenersRef.current.delete(eventType);
        }
      }
    };
  }, []);

  const connect = useCallback(() => {
    if (wsRef.current && (wsRef.current.readyState === WebSocket.OPEN || wsRef.current.readyState === WebSocket.CONNECTING)) {
      return;
    }

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = window.location.host;
    const wsUrl = `${protocol}//${host}`;

    try {
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        setConnected(true);
        if (currentUserRef.current) {
          ws.send(JSON.stringify({ type: 'auth', userId: currentUserRef.current.id }));
        }
        if (currentProjectIdRef.current) {
          ws.send(JSON.stringify({
            type: 'join_project',
            projectId: currentProjectIdRef.current,
            userId: currentUserRef.current?.id,
          }));
        }
      };

      ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data);
          const { type, payload } = msg;

          if (type === 'presence:update') {
            if (payload?.activeUsers) {
              setActiveUsers(payload.activeUsers);
            }
          } else if (type === 'user:typing') {
            const { userId, userName, taskId, isTyping } = payload || {};
            if (isTyping) {
              setCurrentTypingUsers((prev) => {
                const filtered = prev.filter((p) => p.userId !== userId);
                return [...filtered, { userId, userName, taskId }];
              });
            } else {
              setCurrentTypingUsers((prev) => prev.filter((p) => p.userId !== userId));
            }
          } else if (type === 'task:moved') {
            const task = payload?.task;
            if (task) {
              setRecentLiveToast({
                id: `toast-${Date.now()}`,
                message: `Task "${task.title}" was moved in real-time.`,
              });
            }
          } else if (type === 'task:created') {
            const task = payload;
            if (task) {
              setRecentLiveToast({
                id: `toast-${Date.now()}`,
                message: `New task "${task.title}" added to board.`,
              });
            }
          } else if (type === 'comment:created') {
            const author = payload?.author;
            setRecentLiveToast({
              id: `toast-${Date.now()}`,
              message: `${author?.name || 'A team member'} posted a new comment.`,
            });
          }

          // Trigger all registered listeners
          const listeners = listenersRef.current.get(type);
          if (listeners) {
            listeners.forEach((cb) => {
              try {
                cb(payload);
              } catch (e) {
                console.error(`Error in listener for ${type}:`, e);
              }
            });
          }
        } catch (e) {
          console.error('Failed to parse incoming WS message:', e);
        }
      };

      ws.onclose = () => {
        setConnected(false);
        wsRef.current = null;
        // Reconnect after 2.5 seconds
        if (!reconnectTimeoutRef.current) {
          reconnectTimeoutRef.current = setTimeout(() => {
            reconnectTimeoutRef.current = null;
            connect();
          }, 2500);
        }
      };

      ws.onerror = (err) => {
        console.warn('WebSocket connection event error:', err);
        ws.close();
      };
    } catch (e) {
      console.error('WebSocket connection initialization error:', e);
    }
  }, []);

  useEffect(() => {
    connect();
    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, [connect]);

  // When current user changes, send auth message
  useEffect(() => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN && currentUser) {
      wsRef.current.send(JSON.stringify({ type: 'auth', userId: currentUser.id }));
      if (currentProjectIdRef.current) {
        wsRef.current.send(JSON.stringify({
          type: 'join_project',
          projectId: currentProjectIdRef.current,
          userId: currentUser.id,
        }));
      }
    }
  }, [currentUser]);

  const joinProject = useCallback((projectId: string) => {
    currentProjectIdRef.current = projectId;
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: 'join_project',
        projectId,
        userId: currentUserRef.current?.id,
      }));
    }
  }, []);

  const leaveProject = useCallback((projectId: string) => {
    if (currentProjectIdRef.current === projectId) {
      currentProjectIdRef.current = null;
    }
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: 'leave_project',
        projectId,
        userId: currentUserRef.current?.id,
      }));
    }
  }, []);

  const sendTyping = useCallback((taskId: string, isTyping: boolean) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN && currentUserRef.current) {
      wsRef.current.send(JSON.stringify({
        type: 'user:typing',
        payload: {
          taskId,
          isTyping,
          userId: currentUserRef.current.id,
          userName: currentUserRef.current.name,
        },
      }));
    }
  }, []);

  const value = useMemo(
    () => ({
      connected,
      activeUsers,
      currentTypingUsers,
      joinProject,
      leaveProject,
      sendTyping,
      subscribe,
      recentLiveToast,
      clearLiveToast,
    }),
    [
      connected,
      activeUsers,
      currentTypingUsers,
      joinProject,
      leaveProject,
      sendTyping,
      subscribe,
      recentLiveToast,
      clearLiveToast,
    ]
  );

  return (
    <WebSocketContext.Provider value={value}>
      {children}
    </WebSocketContext.Provider>
  );
};

export const useWebSocket = () => {
  const ctx = useContext(WebSocketContext);
  if (!ctx) throw new Error('useWebSocket must be used within a WebSocketProvider');
  return ctx;
};
