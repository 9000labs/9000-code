import React, { useEffect, useState } from 'react';
import { MessageSquare, Circle, Star, MoreHorizontal, Loader, RefreshCw, Hash } from 'lucide-react';
import { useAppStore, type ClaudeSession } from '../../stores/appStore';

interface SessionListProps {
  searchQuery: string;
}

export function SessionList({ searchQuery }: SessionListProps) {
  const {
    sessions,
    selectedSessionId,
    selectedSection,
    isLoadingSessions,
    setSelectedSession,
    setSelectedSection,
    toggleBookmark,
    loadSessions,
    addNotification
  } = useAppStore();

  const [hoveredSession, setHoveredSession] = useState<string | null>(null);

  // Load sessions on mount
  useEffect(() => {
    loadSessions();

    // Listen for session updates from Electron
    if (window.electronAPI?.sessions?.onUpdated) {
      const unsubscribe = window.electronAPI.sessions.onUpdated((updatedSessions: ClaudeSession[]) => {
        // Convert and update sessions
        const { sessions: currentSessions } = useAppStore.getState();
        const bookmarkedIds = new Set(
          currentSessions.filter(s => s.isBookmarked).map(s => s.id)
        );

        const newSessions = updatedSessions.map((cs: ClaudeSession) => ({
          id: cs.id,
          name: cs.slug || cs.id.slice(0, 8),
          slug: cs.slug,
          project: cs.project,
          projectPath: cs.projectPath,
          firstMessage: cs.firstMessage,
          lastMessage: cs.lastMessage,
          date: cs.timestamp,
          lastDate: cs.lastTimestamp,
          messageCount: cs.messageCount,
          isActive: cs.isActive,
          isBookmarked: bookmarkedIds.has(cs.id),
        }));

        useAppStore.setState({ sessions: newSessions });
      });

      return () => unsubscribe();
    }
  }, [loadSessions]);

  const filteredSessions = sessions.filter(
    (session) =>
      session.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      session.project.toLowerCase().includes(searchQuery.toLowerCase()) ||
      session.firstMessage?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleSessionClick = (sessionId: string) => {
    // 세션 섹션이 선택되어 있지 않으면 먼저 선택
    if (selectedSection !== 'sessions') {
      setSelectedSection('sessions');
    }
    setSelectedSession(sessionId);
  };

  const handleBookmarkClick = (e: React.MouseEvent, sessionId: string) => {
    e.stopPropagation();
    toggleBookmark(sessionId);
  };

  const handleRefresh = () => {
    loadSessions();
    addNotification('Refreshing sessions...', 'info');
  };

  if (isLoadingSessions) {
    return (
      <div className="px-3 py-8 flex flex-col items-center justify-center gap-2 text-claude-text-secondary">
        <Loader size={20} className="animate-spin" />
        <span className="text-sm">Loading sessions...</span>
      </div>
    );
  }

  if (filteredSessions.length === 0) {
    return (
      <div className="px-3 py-4 text-center">
        <p className="text-sm text-claude-text-secondary mb-2">
          {sessions.length === 0 ? 'No sessions found' : 'No matching sessions'}
        </p>
        {sessions.length === 0 && (
          <button
            onClick={handleRefresh}
            className="text-xs text-claude-accent hover:underline flex items-center gap-1 mx-auto"
          >
            <RefreshCw size={12} />
            <span>Refresh</span>
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-0.5 px-2">
      {/* Refresh button */}
      <div className="flex justify-end px-1 mb-1">
        <button
          onClick={handleRefresh}
          className="p-1 text-claude-text-secondary hover:text-claude-text rounded transition-colors"
          title="Refresh sessions"
        >
          <RefreshCw size={12} />
        </button>
      </div>

      {filteredSessions.map((session) => (
        <div
          key={session.id}
          className={`sidebar-item w-full group cursor-pointer ${
            session.id === selectedSessionId ? 'active bg-claude-surface' : ''
          }`}
          onClick={() => handleSessionClick(session.id)}
          onMouseEnter={() => setHoveredSession(session.id)}
          onMouseLeave={() => setHoveredSession(null)}
        >
          <div className="flex items-center gap-2 flex-1 min-w-0">
            {session.id === selectedSessionId ? (
              <Circle size={8} className="text-claude-accent fill-claude-accent flex-shrink-0" />
            ) : (
              <MessageSquare size={14} className="text-claude-text-secondary flex-shrink-0" />
            )}
            <div className="flex-1 min-w-0 text-left">
              <div className="flex items-center gap-1.5">
                <span className="text-sm truncate">{session.name}</span>
                {session.isBookmarked && (
                  <Star size={12} className="text-claude-accent fill-claude-accent flex-shrink-0" />
                )}
              </div>
              <div className="text-xs text-claude-text-secondary truncate">
                {session.project} · {session.lastDate || session.date}
              </div>
            </div>
          </div>

          {/* Action buttons - visible on hover */}
          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <button
              className={`p-1 rounded transition-colors ${
                session.isBookmarked
                  ? 'text-claude-accent hover:bg-claude-border'
                  : 'text-claude-text-secondary hover:bg-claude-border hover:text-claude-accent'
              }`}
              onClick={(e) => handleBookmarkClick(e, session.id)}
              title={session.isBookmarked ? 'Remove bookmark' : 'Add bookmark'}
            >
              <Star size={12} className={session.isBookmarked ? 'fill-current' : ''} />
            </button>
            <button
              className="p-1 text-claude-text-secondary hover:bg-claude-border hover:text-claude-text rounded"
              onClick={(e) => {
                e.stopPropagation();
              }}
              title="More options"
            >
              <MoreHorizontal size={12} />
            </button>
          </div>

          {/* Hover tooltip with session details */}
          {hoveredSession === session.id && (
            <div className="absolute left-full ml-2 top-0 z-50 w-72 p-3 bg-claude-surface border border-claude-border rounded-lg shadow-lg pointer-events-none">
              <div className="font-medium text-sm mb-1 truncate">{session.name}</div>
              <div className="text-xs text-claude-accent mb-2 font-mono truncate">
                {session.project}
              </div>
              <div className="text-xs text-claude-text-secondary mb-2 line-clamp-3">
                {session.firstMessage || 'No message preview'}
              </div>
              <div className="flex items-center gap-3 text-xs text-claude-text-secondary/50">
                <span className="flex items-center gap-1">
                  <Hash size={10} />
                  {session.messageCount || 0} messages
                </span>
                <span>{session.date}</span>
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
