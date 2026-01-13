import { CheckCircle, XCircle, Info, X } from 'lucide-react';
import { useAppStore } from '../stores/appStore';

export function Notifications() {
  const { notifications, removeNotification } = useAppStore();

  if (notifications.length === 0) return null;

  const getIcon = (type: 'success' | 'error' | 'info') => {
    switch (type) {
      case 'success':
        return <CheckCircle size={16} className="text-green-400" />;
      case 'error':
        return <XCircle size={16} className="text-red-400" />;
      case 'info':
        return <Info size={16} className="text-blue-400" />;
    }
  };

  const getBgColor = (type: 'success' | 'error' | 'info') => {
    switch (type) {
      case 'success':
        return 'bg-green-500/10 border-green-500/30';
      case 'error':
        return 'bg-red-500/10 border-red-500/30';
      case 'info':
        return 'bg-blue-500/10 border-blue-500/30';
    }
  };

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 max-w-sm">
      {notifications.map((notification) => (
        <div
          key={notification.id}
          className={`flex items-center gap-3 px-4 py-3 rounded-lg border shadow-lg animate-slide-in ${getBgColor(
            notification.type
          )}`}
        >
          {getIcon(notification.type)}
          <span className="text-sm text-claude-text flex-1">{notification.message}</span>
          <button
            className="p-1 hover:bg-white/10 rounded transition-colors"
            onClick={() => removeNotification(notification.id)}
          >
            <X size={14} className="text-claude-text-secondary" />
          </button>
        </div>
      ))}
    </div>
  );
}
