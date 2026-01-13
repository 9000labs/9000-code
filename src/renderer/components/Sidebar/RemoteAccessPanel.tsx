import { useState, useEffect, useCallback } from 'react';
import { Globe, Copy, RefreshCw, Check, Wifi, WifiOff, ExternalLink } from 'lucide-react';

interface WebServerInfo {
  running: boolean;
  port: number | null;
  token: string | null;
  urls: string[];
  connections: number;
}

export function RemoteAccessPanel() {
  const [serverInfo, setServerInfo] = useState<WebServerInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [copiedToken, setCopiedToken] = useState(false);
  const [copiedUrl, setCopiedUrl] = useState<string | null>(null);
  const [isRegenerating, setIsRegenerating] = useState(false);

  const loadServerInfo = useCallback(async () => {
    if (!window.electronAPI?.webserver) {
      setIsLoading(false);
      return;
    }

    try {
      const info = await window.electronAPI.webserver.getInfo();
      setServerInfo(info);
    } catch (error) {
      console.error('Failed to load server info:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadServerInfo();

    // Listen for server started event
    const unsubscribe = window.electronAPI?.webserver?.onStarted?.((info) => {
      setServerInfo((prev) => ({
        ...prev!,
        running: true,
        port: info.port,
        token: info.token,
        urls: info.urls,
      }));
    });

    // Refresh every 5 seconds
    const interval = setInterval(loadServerInfo, 5000);

    return () => {
      unsubscribe?.();
      clearInterval(interval);
    };
  }, [loadServerInfo]);

  const copyToClipboard = async (text: string, type: 'token' | 'url') => {
    try {
      await navigator.clipboard.writeText(text);
      if (type === 'token') {
        setCopiedToken(true);
        setTimeout(() => setCopiedToken(false), 2000);
      } else {
        setCopiedUrl(text);
        setTimeout(() => setCopiedUrl(null), 2000);
      }
    } catch (error) {
      console.error('Failed to copy:', error);
    }
  };

  const regenerateToken = async () => {
    if (!window.electronAPI?.webserver) return;

    setIsRegenerating(true);
    try {
      const result = await window.electronAPI.webserver.regenerateToken();
      if (result.success && result.token) {
        setServerInfo((prev) => prev ? { ...prev, token: result.token! } : null);
      }
    } catch (error) {
      console.error('Failed to regenerate token:', error);
    } finally {
      setIsRegenerating(false);
    }
  };

  if (isLoading) {
    return (
      <div className="p-4 flex items-center justify-center">
        <div className="animate-spin w-5 h-5 border-2 border-claude-accent border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!serverInfo) {
    return (
      <div className="p-4 text-claude-text-secondary text-sm">
        Remote access not available
      </div>
    );
  }

  return (
    <div className="p-4 space-y-4">
      {/* Status */}
      <div className="flex items-center gap-2">
        {serverInfo.running ? (
          <>
            <Wifi size={16} className="text-green-500" />
            <span className="text-sm text-green-500 font-medium">Server Running</span>
          </>
        ) : (
          <>
            <WifiOff size={16} className="text-red-500" />
            <span className="text-sm text-red-500 font-medium">Server Stopped</span>
          </>
        )}
        {serverInfo.connections > 0 && (
          <span className="text-xs text-claude-text-secondary ml-auto">
            {serverInfo.connections} connected
          </span>
        )}
      </div>

      {serverInfo.running && (
        <>
          {/* Access URLs */}
          <div className="space-y-2">
            <label className="text-xs text-claude-text-secondary font-medium block">
              Access URLs
            </label>
            <div className="space-y-1">
              {serverInfo.urls.map((url) => (
                <div
                  key={url}
                  className="flex items-center gap-2 bg-claude-surface rounded px-2 py-1.5 group"
                >
                  <Globe size={14} className="text-claude-text-secondary flex-shrink-0" />
                  <span className="text-sm text-claude-text truncate flex-1 font-mono">
                    {url}
                  </span>
                  <button
                    onClick={() => copyToClipboard(url, 'url')}
                    className="p-1 text-claude-text-secondary hover:text-claude-text opacity-0 group-hover:opacity-100 transition-opacity"
                    title="Copy URL"
                  >
                    {copiedUrl === url ? (
                      <Check size={14} className="text-green-500" />
                    ) : (
                      <Copy size={14} />
                    )}
                  </button>
                  <a
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-1 text-claude-text-secondary hover:text-claude-text opacity-0 group-hover:opacity-100 transition-opacity"
                    title="Open in browser"
                  >
                    <ExternalLink size={14} />
                  </a>
                </div>
              ))}
            </div>
          </div>

          {/* Access Token */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs text-claude-text-secondary font-medium">
                Access Token
              </label>
              <button
                onClick={regenerateToken}
                disabled={isRegenerating}
                className="text-xs text-claude-accent hover:text-claude-accent-hover flex items-center gap-1"
                title="Generate new token"
              >
                <RefreshCw size={12} className={isRegenerating ? 'animate-spin' : ''} />
                Regenerate
              </button>
            </div>
            <div className="flex items-center gap-2 bg-claude-surface rounded px-3 py-2">
              <code className="text-sm text-claude-text flex-1 font-mono break-all select-all">
                {serverInfo.token}
              </code>
              <button
                onClick={() => serverInfo.token && copyToClipboard(serverInfo.token, 'token')}
                className="p-1 text-claude-text-secondary hover:text-claude-text flex-shrink-0"
                title="Copy token"
              >
                {copiedToken ? (
                  <Check size={16} className="text-green-500" />
                ) : (
                  <Copy size={16} />
                )}
              </button>
            </div>
          </div>

          {/* Instructions */}
          <div className="text-xs text-claude-text-secondary space-y-1 pt-2 border-t border-claude-border">
            <p>1. Open the URL in a web browser</p>
            <p>2. Enter the access token to connect</p>
            <p className="pt-1 text-[10px] opacity-75">
              External network access will be available in a future update.
            </p>
          </div>
        </>
      )}
    </div>
  );
}
