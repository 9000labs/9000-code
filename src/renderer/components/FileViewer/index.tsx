import { useCallback, useMemo } from 'react';
import {
  X,
  Copy,
  ExternalLink,
  FolderOpen,
  FileCode,
  Loader2,
  AlertCircle,
} from 'lucide-react';
import { useAppStore } from '../../stores/appStore';

// Get language from file extension for display
function getLanguageFromPath(filePath: string): string {
  const ext = filePath.split('.').pop()?.toLowerCase() || '';

  const langMap: Record<string, string> = {
    js: 'JavaScript',
    jsx: 'JavaScript (React)',
    ts: 'TypeScript',
    tsx: 'TypeScript (React)',
    py: 'Python',
    java: 'Java',
    c: 'C',
    cpp: 'C++',
    h: 'C Header',
    hpp: 'C++ Header',
    cs: 'C#',
    go: 'Go',
    rs: 'Rust',
    rb: 'Ruby',
    php: 'PHP',
    swift: 'Swift',
    kt: 'Kotlin',
    scala: 'Scala',
    lua: 'Lua',
    sh: 'Shell',
    bash: 'Bash',
    ps1: 'PowerShell',
    bat: 'Batch',
    cmd: 'Command',
    sql: 'SQL',
    html: 'HTML',
    htm: 'HTML',
    css: 'CSS',
    scss: 'SCSS',
    sass: 'Sass',
    less: 'Less',
    json: 'JSON',
    jsonc: 'JSON with Comments',
    yaml: 'YAML',
    yml: 'YAML',
    xml: 'XML',
    toml: 'TOML',
    ini: 'INI',
    md: 'Markdown',
    mdx: 'MDX',
    txt: 'Plain Text',
    log: 'Log',
    env: 'Environment',
    vue: 'Vue',
    svelte: 'Svelte',
    astro: 'Astro',
  };

  return langMap[ext] || ext.toUpperCase() || 'Text';
}

// Get filename from path
function getFileName(filePath: string): string {
  return filePath.split(/[/\\]/).pop() || filePath;
}

// Line numbers component
function LineNumbers({ content }: { content: string }) {
  const lines = content.split('\n').length;

  return (
    <div className="flex-shrink-0 text-right pr-4 select-none text-claude-text-secondary text-xs font-mono">
      {Array.from({ length: lines }, (_, i) => (
        <div key={i + 1} className="leading-5">
          {i + 1}
        </div>
      ))}
    </div>
  );
}

export function FileViewer() {
  const { fileViewer, closeFileViewer, addNotification } = useAppStore();

  const { filePath, content, isLoading, error } = fileViewer;

  const language = useMemo(() => {
    if (!filePath) return '';
    return getLanguageFromPath(filePath);
  }, [filePath]);

  const fileName = useMemo(() => {
    if (!filePath) return '';
    return getFileName(filePath);
  }, [filePath]);

  const handleCopy = useCallback(async () => {
    if (content) {
      await navigator.clipboard.writeText(content);
      addNotification('Copied to clipboard', 'success');
    }
  }, [content, addNotification]);

  const handleOpenExternal = useCallback(async () => {
    if (filePath && window.electronAPI?.files) {
      await window.electronAPI.files.openExternal(filePath);
    }
  }, [filePath]);

  const handleShowInFolder = useCallback(async () => {
    if (filePath && window.electronAPI?.files) {
      await window.electronAPI.files.showInFolder(filePath);
    }
  }, [filePath]);

  if (!filePath) {
    return null;
  }

  return (
    <div className="h-full flex flex-col bg-claude-bg">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-claude-border">
        <div className="flex items-center gap-2 min-w-0">
          <FileCode size={16} className="text-claude-accent flex-shrink-0" />
          <span className="font-medium text-sm truncate" title={filePath}>
            {fileName}
          </span>
          <span className="text-xs text-claude-text-secondary px-1.5 py-0.5 bg-claude-surface rounded">
            {language}
          </span>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={handleCopy}
            className="p-1.5 hover:bg-claude-surface rounded transition-colors"
            title="Copy content"
            disabled={!content}
          >
            <Copy size={14} />
          </button>
          <button
            onClick={handleShowInFolder}
            className="p-1.5 hover:bg-claude-surface rounded transition-colors"
            title="Show in folder"
          >
            <FolderOpen size={14} />
          </button>
          <button
            onClick={handleOpenExternal}
            className="p-1.5 hover:bg-claude-surface rounded transition-colors"
            title="Open with external app"
          >
            <ExternalLink size={14} />
          </button>
          <button
            onClick={closeFileViewer}
            className="p-1.5 hover:bg-claude-surface rounded transition-colors ml-1"
            title="Close"
          >
            <X size={14} />
          </button>
        </div>
      </div>

      {/* Path display */}
      <div className="px-4 py-1.5 border-b border-claude-border bg-claude-surface/50">
        <div className="text-xs text-claude-text-secondary truncate font-mono" title={filePath}>
          {filePath}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto">
        {isLoading ? (
          <div className="flex items-center justify-center h-full">
            <Loader2 size={24} className="animate-spin text-claude-text-secondary" />
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center h-full gap-2 text-red-400">
            <AlertCircle size={32} />
            <span className="text-sm">{error}</span>
          </div>
        ) : content !== null ? (
          <div className="flex min-h-full">
            {/* Line numbers */}
            <LineNumbers content={content} />

            {/* Code content */}
            <pre className="flex-1 overflow-x-auto p-0 m-0 text-sm font-mono leading-5 text-claude-text">
              <code>{content}</code>
            </pre>
          </div>
        ) : (
          <div className="flex items-center justify-center h-full text-claude-text-secondary">
            No content
          </div>
        )}
      </div>

      {/* Footer status */}
      {content !== null && (
        <div className="px-4 py-1.5 border-t border-claude-border text-xs text-claude-text-secondary flex items-center gap-4">
          <span>{content.split('\n').length} lines</span>
          <span>{new Blob([content]).size.toLocaleString()} bytes</span>
          <span>{language}</span>
        </div>
      )}
    </div>
  );
}
