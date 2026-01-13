import { useEffect, useState } from 'react';
import { ArrowLeft, Play, User, Bot, Calendar, MessageSquare, FolderOpen, Loader } from 'lucide-react';
import { useAppStore } from '../../stores/appStore';

interface SessionMessage {
  message?: {
    role?: string;
    content?: string | Array<{ type: string; text?: string }>;
  };
  timestamp?: string;
}

export function SessionViewer() {
  const {
    sessions,
    selectedSessionId,
    setSelectedSession,
    requestNewTerminal,
    addNotification,
  } = useAppStore();

  const [messages, setMessages] = useState<SessionMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const session = sessions.find((s) => s.id === selectedSessionId);

  // Load messages when session is selected
  useEffect(() => {
    if (!selectedSessionId) return;

    const loadMessages = async () => {
      if (!window.electronAPI?.sessions?.getMessages) {
        console.log('Sessions API not available');
        return;
      }

      setIsLoading(true);
      try {
        const msgs = await window.electronAPI.sessions.getMessages(selectedSessionId);
        setMessages(msgs as SessionMessage[]);
      } catch (error) {
        console.error('Failed to load messages:', error);
        addNotification('Failed to load session messages', 'error');
      } finally {
        setIsLoading(false);
      }
    };

    loadMessages();
  }, [selectedSessionId, addNotification]);

  // Extract text content from message
  const getMessageText = (content: string | Array<{ type: string; text?: string }> | undefined): string => {
    if (!content) return '';
    if (typeof content === 'string') return content;
    if (Array.isArray(content)) {
      const textBlock = content.find((block) => block.type === 'text' && block.text);
      return textBlock?.text || '';
    }
    return '';
  };

  // Handle opening session in new terminal tab
  const handleOpenInTerminal = () => {
    if (!session) return;

    // Request new terminal with claude --resume command
    // Must run from the session's project directory for Claude to find the session
    const command = `claude --resume ${session.id}\r`;
    const tabName = session.name || `Session ${session.id.slice(0, 8)}`;
    requestNewTerminal(command, tabName, session.projectPath);
    addNotification(`Opening session in new terminal...`, 'success');
  };

  if (!session) {
    return (
      <div className="h-full flex items-center justify-center text-claude-text-secondary">
        <p className="text-sm">Session not found</p>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-claude-bg">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-claude-border">
        <button
          onClick={() => setSelectedSession(null)}
          className="p-1 text-claude-text-secondary hover:text-claude-text hover:bg-claude-surface rounded transition-colors"
          title="Back to list"
        >
          <ArrowLeft size={18} />
        </button>
        <div className="flex-1 min-w-0">
          <h2 className="font-semibold text-sm truncate">{session.name}</h2>
          <div className="text-xs text-claude-text-secondary truncate flex items-center gap-1">
            <FolderOpen size={10} />
            {session.project}
          </div>
        </div>
        <button
          onClick={handleOpenInTerminal}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-claude-accent text-white text-sm rounded hover:bg-claude-accent/90 transition-colors"
        >
          <Play size={14} />
          <span>Open</span>
        </button>
      </div>

      {/* Session Info */}
      <div className="px-4 py-3 border-b border-claude-border bg-claude-surface/30">
        <div className="flex items-center gap-4 text-xs text-claude-text-secondary">
          <span className="flex items-center gap-1">
            <Calendar size={12} />
            {session.lastDate || session.date}
          </span>
          <span className="flex items-center gap-1">
            <MessageSquare size={12} />
            {session.messageCount} messages
          </span>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-8 text-claude-text-secondary">
            <Loader size={24} className="animate-spin mb-2" />
            <span className="text-sm">Loading messages...</span>
          </div>
        ) : messages.length === 0 ? (
          <div className="text-center py-8 text-claude-text-secondary">
            <MessageSquare size={32} className="mx-auto mb-2 opacity-50" />
            <p className="text-sm">No messages in this session</p>
          </div>
        ) : (
          messages.map((msg, index) => {
            const role = msg.message?.role;
            const text = getMessageText(msg.message?.content);

            if (!role || !text) return null;

            const isUser = role === 'user';

            return (
              <div
                key={index}
                className={`flex gap-3 ${isUser ? '' : ''}`}
              >
                <div
                  className={`flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center ${
                    isUser
                      ? 'bg-claude-accent/20 text-claude-accent'
                      : 'bg-claude-surface text-claude-text-secondary'
                  }`}
                >
                  {isUser ? <User size={14} /> : <Bot size={14} />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-xs text-claude-text-secondary mb-1">
                    {isUser ? 'You' : 'Claude'}
                  </div>
                  <div
                    className={`text-sm p-3 rounded-lg ${
                      isUser
                        ? 'bg-claude-accent/10 text-claude-text'
                        : 'bg-claude-surface text-claude-text'
                    }`}
                  >
                    <pre className="whitespace-pre-wrap font-sans text-sm leading-relaxed">
                      {text.length > 500 ? text.slice(0, 500) + '...' : text}
                    </pre>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Footer */}
      <div className="px-4 py-3 border-t border-claude-border bg-claude-surface/30">
        <button
          onClick={handleOpenInTerminal}
          className="w-full flex items-center justify-center gap-2 py-2 bg-claude-accent text-white rounded hover:bg-claude-accent/90 transition-colors"
        >
          <Play size={16} />
          <span>Continue this session</span>
        </button>
      </div>
    </div>
  );
}
