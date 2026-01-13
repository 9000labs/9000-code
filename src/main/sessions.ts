import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { ipcMain, BrowserWindow } from 'electron';

// Types
export interface ClaudeSession {
  id: string;
  slug: string;
  project: string;
  projectPath: string;
  firstMessage: string;
  lastMessage: string;
  timestamp: string;
  lastTimestamp: string;
  messageCount: number;
  isActive: boolean;
}

interface SessionMessage {
  type?: string;
  uuid?: string;
  parentUuid?: string;
  sessionId?: string;
  slug?: string;
  cwd?: string;
  timestamp?: string;
  message?: {
    role?: string;
    content?: string | Array<{ type: string; text?: string }>;
  };
}

// Get Claude config directory
function getClaudeDir(): string {
  return path.join(os.homedir(), '.claude');
}

// Get projects directory
function getProjectsDir(): string {
  return path.join(getClaudeDir(), 'projects');
}

// Parse project path from encoded directory name
function decodeProjectPath(encoded: string): string {
  // C--coding-claudecode-extention -> C:\coding\claudecode_extention
  return encoded
    .replace(/^([A-Z])--/, '$1:\\')
    .replace(/--/g, '\\')
    .replace(/-/g, '\\');
}

// Extract display name from project path
function getProjectName(projectPath: string): string {
  const parts = projectPath.split(/[\\\/]/);
  return parts[parts.length - 1] || projectPath;
}

// Extract first user message content (truncated)
function extractMessageContent(content: string | Array<{ type: string; text?: string }> | undefined): string {
  if (!content) return 'No message';

  if (typeof content === 'string') {
    return content.slice(0, 100) + (content.length > 100 ? '...' : '');
  }

  if (Array.isArray(content)) {
    const textBlock = content.find(block => block.type === 'text' && block.text);
    if (textBlock && textBlock.text) {
      return textBlock.text.slice(0, 100) + (textBlock.text.length > 100 ? '...' : '');
    }
  }

  return 'No message';
}

// Format timestamp to relative time
function formatRelativeTime(timestamp: string): string {
  const date = new Date(timestamp);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;

  return date.toLocaleDateString();
}

// Read session from JSONL file
async function readSessionFile(filePath: string): Promise<ClaudeSession | null> {
  try {
    const content = await fs.promises.readFile(filePath, 'utf-8');
    const lines = content.trim().split('\n').filter(line => line.trim());

    if (lines.length === 0) return null;

    let sessionId = '';
    let slug = '';
    let cwd = '';
    let firstTimestamp = '';
    let lastTimestamp = '';
    let firstUserMessage = '';
    let lastUserMessage = '';
    let messageCount = 0;

    for (const line of lines) {
      try {
        const data: SessionMessage = JSON.parse(line);

        // Skip non-message entries
        if (data.type === 'file-history-snapshot') continue;

        // Extract session info from first valid message
        if (!sessionId && data.sessionId) {
          sessionId = data.sessionId;
          slug = data.slug || '';
          cwd = data.cwd || '';
        }

        // Track timestamps
        if (data.timestamp) {
          if (!firstTimestamp) firstTimestamp = data.timestamp;
          lastTimestamp = data.timestamp;
        }

        // Count user messages and extract content
        if (data.message?.role === 'user') {
          messageCount++;
          const content = extractMessageContent(data.message.content);
          if (!firstUserMessage) firstUserMessage = content;
          lastUserMessage = content;
        }
      } catch (e) {
        // Skip invalid JSON lines
        continue;
      }
    }

    if (!sessionId) return null;

    return {
      id: sessionId,
      slug: slug || sessionId.slice(0, 8),
      project: getProjectName(cwd),
      projectPath: cwd,
      firstMessage: firstUserMessage || 'Empty session',
      lastMessage: lastUserMessage || firstUserMessage || 'Empty session',
      timestamp: formatRelativeTime(firstTimestamp || new Date().toISOString()),
      lastTimestamp: formatRelativeTime(lastTimestamp || new Date().toISOString()),
      messageCount,
      isActive: false,
    };
  } catch (error) {
    console.error('Error reading session file:', filePath, error);
    return null;
  }
}

// Get all sessions from all projects
export async function getAllSessions(): Promise<ClaudeSession[]> {
  const sessions: ClaudeSession[] = [];
  const projectsDir = getProjectsDir();

  try {
    if (!fs.existsSync(projectsDir)) {
      console.log('Projects directory does not exist:', projectsDir);
      return sessions;
    }

    const projectDirs = await fs.promises.readdir(projectsDir);

    for (const projectDir of projectDirs) {
      const projectPath = path.join(projectsDir, projectDir);
      const stat = await fs.promises.stat(projectPath);

      if (!stat.isDirectory()) continue;

      // Find all .jsonl files in project directory
      const files = await fs.promises.readdir(projectPath);
      const jsonlFiles = files.filter(f => f.endsWith('.jsonl'));

      for (const jsonlFile of jsonlFiles) {
        const filePath = path.join(projectPath, jsonlFile);
        const session = await readSessionFile(filePath);

        if (session) {
          sessions.push(session);
        }
      }
    }

    // Sort by timestamp (most recent first)
    sessions.sort((a, b) => {
      // Parse relative times for sorting (rough approximation)
      const getWeight = (time: string): number => {
        if (time.includes('Just now')) return 0;
        if (time.includes('m ago')) return parseInt(time) || 1;
        if (time.includes('h ago')) return (parseInt(time) || 1) * 60;
        if (time.includes('d ago')) return (parseInt(time) || 1) * 60 * 24;
        return 999999;
      };
      return getWeight(a.lastTimestamp) - getWeight(b.lastTimestamp);
    });

    return sessions;
  } catch (error) {
    console.error('Error getting sessions:', error);
    return sessions;
  }
}

// Get sessions for a specific project
export async function getProjectSessions(projectPath: string): Promise<ClaudeSession[]> {
  const sessions = await getAllSessions();
  return sessions.filter(s => s.projectPath === projectPath);
}

// Read specific session messages
export async function getSessionMessages(sessionId: string): Promise<SessionMessage[]> {
  const projectsDir = getProjectsDir();
  const messages: SessionMessage[] = [];

  try {
    const projectDirs = await fs.promises.readdir(projectsDir);

    for (const projectDir of projectDirs) {
      const filePath = path.join(projectsDir, projectDir, `${sessionId}.jsonl`);

      if (fs.existsSync(filePath)) {
        const content = await fs.promises.readFile(filePath, 'utf-8');
        const lines = content.trim().split('\n');

        for (const line of lines) {
          try {
            const data = JSON.parse(line);
            if (data.message) {
              messages.push(data);
            }
          } catch (e) {
            continue;
          }
        }
        break;
      }
    }

    return messages;
  } catch (error) {
    console.error('Error getting session messages:', error);
    return messages;
  }
}

// Watch for session file changes
let watcher: fs.FSWatcher | null = null;

export function watchSessions(mainWindow: BrowserWindow): void {
  const projectsDir = getProjectsDir();

  if (!fs.existsSync(projectsDir)) return;

  // Close existing watcher
  if (watcher) {
    watcher.close();
  }

  // Watch for changes in projects directory
  watcher = fs.watch(projectsDir, { recursive: true }, async (eventType, filename) => {
    if (filename?.endsWith('.jsonl')) {
      // Notify renderer about session updates
      const sessions = await getAllSessions();
      mainWindow.webContents.send('sessions:updated', sessions);
    }
  });
}

export function stopWatchingSessions(): void {
  if (watcher) {
    watcher.close();
    watcher = null;
  }
}

// Register IPC handlers
export function registerSessionHandlers(): void {
  ipcMain.handle('sessions:getAll', async () => {
    return await getAllSessions();
  });

  ipcMain.handle('sessions:getProject', async (_, projectPath: string) => {
    return await getProjectSessions(projectPath);
  });

  ipcMain.handle('sessions:getMessages', async (_, sessionId: string) => {
    return await getSessionMessages(sessionId);
  });
}
