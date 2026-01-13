import { useEffect, useCallback } from 'react';
import {
  ChevronUp,
  ChevronRight,
  Folder,
  FolderOpen,
  File,
  FileCode,
  FileText,
  FileJson,
  FileImage,
  FileVideo,
  FileAudio,
  FileArchive,
  Home,
  RefreshCw,
  ExternalLink,
  HardDrive,
  Monitor,
} from 'lucide-react';
import { useAppStore, type FileEntry } from '../../stores/appStore';

// Get appropriate icon for file type
function getFileIcon(entry: FileEntry) {
  if (entry.isDirectory) {
    return null; // Handled separately
  }

  const ext = entry.extension.toLowerCase();

  // Code files
  if (['.js', '.jsx', '.ts', '.tsx', '.py', '.java', '.c', '.cpp', '.h', '.go', '.rs', '.rb', '.php', '.swift', '.kt'].includes(ext)) {
    return <FileCode size={16} className="text-blue-400" />;
  }

  // Text/Doc files
  if (['.txt', '.md', '.mdx', '.rst', '.doc', '.docx', '.rtf'].includes(ext)) {
    return <FileText size={16} className="text-gray-400" />;
  }

  // Config/Data files
  if (['.json', '.jsonc', '.yaml', '.yml', '.toml', '.xml', '.csv'].includes(ext)) {
    return <FileJson size={16} className="text-yellow-400" />;
  }

  // Image files
  if (['.png', '.jpg', '.jpeg', '.gif', '.svg', '.ico', '.webp', '.bmp'].includes(ext)) {
    return <FileImage size={16} className="text-green-400" />;
  }

  // Video files
  if (['.mp4', '.avi', '.mov', '.mkv', '.webm', '.flv'].includes(ext)) {
    return <FileVideo size={16} className="text-purple-400" />;
  }

  // Audio files
  if (['.mp3', '.wav', '.ogg', '.flac', '.aac', '.m4a'].includes(ext)) {
    return <FileAudio size={16} className="text-pink-400" />;
  }

  // Archive files
  if (['.zip', '.tar', '.gz', '.rar', '.7z', '.bz2'].includes(ext)) {
    return <FileArchive size={16} className="text-orange-400" />;
  }

  return <File size={16} className="text-claude-text-secondary" />;
}

// Format file size
function formatSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

// Check if entry is a drive (e.g., "C:", "D:")
function isDriveEntry(entry: FileEntry): boolean {
  return /^[A-Za-z]:$/.test(entry.name);
}

// File item component
function FileItem({ entry }: { entry: FileEntry }) {
  const { openFile, loadDirectory, expandedFolders } = useAppStore();

  const isExpanded = expandedFolders.has(entry.path);
  const isDrive = isDriveEntry(entry);

  const handleClick = useCallback(async () => {
    if (entry.isDirectory) {
      // Navigate into directory
      await loadDirectory(entry.path);
    } else {
      // Open file
      await openFile(entry.path);
    }
  }, [entry, loadDirectory, openFile]);

  const handleContextMenu = useCallback(async (e: React.MouseEvent) => {
    e.preventDefault();
    // Show in folder
    if (window.electronAPI?.files) {
      await window.electronAPI.files.showInFolder(entry.path);
    }
  }, [entry.path]);

  const handleDragStart = useCallback((e: React.DragEvent) => {
    // Set the file path in dataTransfer
    e.dataTransfer.setData('text/plain', entry.path);
    e.dataTransfer.setData('application/x-file-path', entry.path);
    e.dataTransfer.effectAllowed = 'copy';
  }, [entry.path]);

  return (
    <button
      className="w-full flex items-center gap-2 px-3 py-1.5 hover:bg-claude-surface rounded text-left group transition-colors cursor-grab active:cursor-grabbing"
      onClick={handleClick}
      onContextMenu={handleContextMenu}
      onDragStart={handleDragStart}
      draggable
      title={entry.path}
    >
      {/* Icon */}
      <span className="flex-shrink-0">
        {isDrive ? (
          <HardDrive size={16} className="text-blue-400" />
        ) : entry.isDirectory ? (
          isExpanded ? (
            <FolderOpen size={16} className="text-claude-accent" />
          ) : (
            <Folder size={16} className="text-claude-accent" />
          )
        ) : (
          getFileIcon(entry)
        )}
      </span>

      {/* Name */}
      <span className="flex-1 truncate text-sm text-claude-text">
        {isDrive ? `Local Disk (${entry.name})` : entry.name}
      </span>

      {/* Size (for files) */}
      {entry.isFile && (
        <span className="text-xs text-claude-text-secondary opacity-0 group-hover:opacity-100 transition-opacity">
          {formatSize(entry.size)}
        </span>
      )}

      {/* External link indicator on hover */}
      {entry.isFile && (
        <ExternalLink
          size={12}
          className="text-claude-text-secondary opacity-0 group-hover:opacity-100 transition-opacity"
        />
      )}
    </button>
  );
}

// Path breadcrumb component
function PathBreadcrumb() {
  const { currentPath, loadDirectory, loadDrives } = useAppStore();

  // Parse path into segments
  const segments = currentPath.split(/[/\\]/).filter(Boolean);

  const handleSegmentClick = useCallback((index: number) => {
    // Build path up to this segment
    const isWindows = currentPath.includes('\\') || currentPath.match(/^[A-Z]:/i);
    const separator = isWindows ? '\\' : '/';

    let targetPath: string;
    if (isWindows) {
      targetPath = segments.slice(0, index + 1).join(separator);
      // Add drive letter and backslash for drive roots
      if (index === 0 && segments[0].match(/^[A-Z]:?$/i)) {
        const driveLetter = segments[0].replace(':', '');
        targetPath = driveLetter + ':\\';
      }
    } else {
      targetPath = '/' + segments.slice(0, index + 1).join(separator);
    }

    loadDirectory(targetPath);
  }, [currentPath, segments, loadDirectory]);

  const handleThisPCClick = useCallback(() => {
    loadDrives();
  }, [loadDrives]);

  // Show "This PC" when at drives list
  if (!currentPath) {
    return (
      <div className="flex items-center gap-1 px-3 py-2 text-xs text-claude-text-secondary">
        <Monitor size={12} className="flex-shrink-0" />
        <span className="text-claude-text font-medium">This PC</span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-1 px-3 py-2 text-xs text-claude-text-secondary overflow-x-auto scrollbar-none">
      {/* This PC link */}
      <button
        onClick={handleThisPCClick}
        className="flex items-center gap-1 hover:text-claude-text hover:underline flex-shrink-0"
        title="This PC"
      >
        <Monitor size={12} />
        <span>This PC</span>
      </button>

      {segments.map((segment, index) => (
        <span key={index} className="flex items-center gap-1 flex-shrink-0">
          <ChevronRight size={12} className="flex-shrink-0" />
          <button
            onClick={() => handleSegmentClick(index)}
            className="hover:text-claude-text hover:underline truncate max-w-[100px]"
            title={segment}
          >
            {segment}
          </button>
        </span>
      ))}
    </div>
  );
}

export function FileTree() {
  const {
    currentPath,
    fileEntries,
    isLoadingFiles,
    loadDirectory,
    loadDrives,
    goToParentDirectory,
  } = useAppStore();

  // Load initial directory on mount
  useEffect(() => {
    async function loadInitial() {
      if (!currentPath && fileEntries.length === 0 && window.electronAPI?.files) {
        const initialPath = await window.electronAPI.files.getInitialPath();
        await loadDirectory(initialPath);
      }
    }
    loadInitial();
  }, [currentPath, fileEntries.length, loadDirectory]);

  const handleRefresh = useCallback(() => {
    if (currentPath) {
      loadDirectory(currentPath);
    } else {
      // Refresh drives list
      loadDrives();
    }
  }, [currentPath, loadDirectory, loadDrives]);

  const handleGoHome = useCallback(async () => {
    if (window.electronAPI?.files) {
      const homePath = await window.electronAPI.files.getInitialPath();
      await loadDirectory(homePath);
    }
  }, [loadDirectory]);

  const handleGoThisPC = useCallback(() => {
    loadDrives();
  }, [loadDrives]);

  return (
    <div className="h-full flex flex-col">
      {/* Toolbar */}
      <div className="flex items-center gap-1 px-2 py-2 border-b border-claude-border">
        <button
          onClick={goToParentDirectory}
          className="p-1.5 hover:bg-claude-surface rounded transition-colors"
          title="Go to parent directory"
          disabled={isLoadingFiles || !currentPath}
        >
          <ChevronUp size={16} />
        </button>
        <button
          onClick={handleGoThisPC}
          className="p-1.5 hover:bg-claude-surface rounded transition-colors"
          title="This PC (Show drives)"
          disabled={isLoadingFiles}
        >
          <Monitor size={16} />
        </button>
        <button
          onClick={handleGoHome}
          className="p-1.5 hover:bg-claude-surface rounded transition-colors"
          title="Go to home directory"
          disabled={isLoadingFiles}
        >
          <Home size={16} />
        </button>
        <button
          onClick={handleRefresh}
          className={`p-1.5 hover:bg-claude-surface rounded transition-colors ${isLoadingFiles ? 'animate-spin' : ''}`}
          title="Refresh"
          disabled={isLoadingFiles}
        >
          <RefreshCw size={16} />
        </button>
      </div>

      {/* Path breadcrumb */}
      <PathBreadcrumb />

      {/* File list */}
      <div className="flex-1 overflow-y-auto py-1">
        {isLoadingFiles ? (
          <div className="flex items-center justify-center py-8">
            <RefreshCw size={20} className="animate-spin text-claude-text-secondary" />
          </div>
        ) : fileEntries.length === 0 ? (
          <div className="text-center py-8 text-claude-text-secondary text-sm">
            Empty directory
          </div>
        ) : (
          fileEntries.map((entry) => (
            <FileItem key={entry.path} entry={entry} />
          ))
        )}
      </div>

      {/* Status bar */}
      <div className="px-3 py-1.5 border-t border-claude-border text-xs text-claude-text-secondary">
        {fileEntries.length} items
      </div>
    </div>
  );
}
