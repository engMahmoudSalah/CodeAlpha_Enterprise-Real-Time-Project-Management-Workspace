import React from 'react';
import { useWebSocket } from '../context/WebSocketContext';
import { useAuth } from '../context/AuthContext';
import { Radio, Wifi, WifiOff } from 'lucide-react';

export const LivePresenceBar: React.FC = () => {
  const { connected, activeUsers } = useWebSocket();
  const { currentUser, users } = useAuth();

  return (
    <div id="live-presence-bar" className="flex items-center gap-3 text-xs">
      <div
        id="ws-status-badge"
        className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full font-medium transition-colors ${
          connected
            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
            : 'bg-amber-50 text-amber-700 border border-amber-200'
        }`}
        title={connected ? 'Connected to live collaboration server' : 'Connecting to live server...'}
      >
        {connected ? (
          <>
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <span className="font-semibold tracking-tight">Live Sync</span>
          </>
        ) : (
          <>
            <WifiOff className="w-3 h-3 text-amber-600 animate-pulse" />
            <span className="font-medium">Connecting...</span>
          </>
        )}
      </div>

      {activeUsers.length > 0 && (
        <div id="active-collaborators-list" className="flex items-center gap-2">
          <span className="text-zinc-500 hidden sm:inline">Viewing now:</span>
          <div className="flex -space-x-1.5 items-center">
            {activeUsers.map(({ userId }) => {
              const user = users.find(u => u.id === userId);
              if (!user) return null;
              
              const isCurrent = userId === currentUser?.id;
              
              return (
                <div
                  key={userId}
                  id={`presence-user-${userId}`}
                  className="relative group cursor-pointer"
                  title={`${user.name} (${user.title})${isCurrent ? ' - You' : ''}`}
                >
                  <img
                    src={user.avatar}
                    alt={user.name}
                    className="w-6 h-6 rounded-full border-2 border-white object-cover shadow-xs"
                  />
                  <span className="absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full bg-emerald-500 border border-white" />
                  
                  {/* Tooltip */}
                  <div className="absolute left-1/2 -translate-x-1/2 top-7 hidden group-hover:block z-50 whitespace-nowrap px-2 py-1 bg-zinc-900 text-white text-[11px] rounded shadow-sm pointer-events-none">
                    {user.name} {isCurrent && '(You)'}
                  </div>
                </div>
              );
            })}
          </div>
          <span className="text-zinc-600 font-medium text-[11px] bg-zinc-100 px-1.5 py-0.5 rounded">
            {activeUsers.length} online
          </span>
        </div>
      )}
    </div>
  );
};
