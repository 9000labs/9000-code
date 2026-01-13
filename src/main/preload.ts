import { contextBridge, ipcRenderer } from 'electron';

// Session types (matching main/sessions.ts)
interface ClaudeSession {
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

// Skill types (matching main/skills.ts)
interface SkillFile {
  name: string;
  command: string;
  description: string;
  content: string;
  filePath: string;
  license?: string;
}

interface SkillMetadata {
  name: string;
  command: string;
  description: string;
  filePath: string;
}

// Agent types (matching main/agents.ts)
interface AgentFile {
  name: string;
  description: string;
  content: string;
  filePath: string;
  isGlobal: boolean;
}

interface AgentMetadata {
  name: string;
  description: string;
  filePath: string;
  isGlobal: boolean;
}

// Token stats types (matching main/stats.ts)
interface TokenStatsData {
  inputTokens: number;
  outputTokens: number;
  cacheRead: number;
  cacheWrite: number;
  totalTokens: number;
  cost: number;
}

interface TokenStats {
  currentSession: TokenStatsData;
  currentWeekAllModels: TokenStatsData;
  currentWeekSonnetOnly: TokenStatsData;
  lastUpdated: string;
  source: 'file' | 'none';
}

// Web server types (matching main/webServer.ts)
interface WebServerInfo {
  running: boolean;
  port: number | null;
  token: string | null;
  urls: string[];
  connections: number;
}

// File types (matching main/files.ts)
interface FileEntry {
  name: string;
  path: string;
  isDirectory: boolean;
  isFile: boolean;
  size: number;
  modifiedTime: string;
  extension: string;
}

// Expose protected methods for renderer process
contextBridge.exposeInMainWorld('electronAPI', {
  // Sessions operations
  sessions: {
    getAll: (): Promise<ClaudeSession[]> =>
      ipcRenderer.invoke('sessions:getAll'),

    getProject: (projectPath: string): Promise<ClaudeSession[]> =>
      ipcRenderer.invoke('sessions:getProject', projectPath),

    getMessages: (sessionId: string): Promise<unknown[]> =>
      ipcRenderer.invoke('sessions:getMessages', sessionId),

    onUpdated: (callback: (sessions: ClaudeSession[]) => void) => {
      const handler = (_: Electron.IpcRendererEvent, sessions: ClaudeSession[]) => callback(sessions);
      ipcRenderer.on('sessions:updated', handler);
      return () => ipcRenderer.removeListener('sessions:updated', handler);
    },
  },

  // Skills operations
  skills: {
    getAll: (): Promise<SkillMetadata[]> =>
      ipcRenderer.invoke('skills:getAll'),

    read: (skillName: string): Promise<SkillFile | null> =>
      ipcRenderer.invoke('skills:read', skillName),

    write: (skillName: string, content: string): Promise<{ success: boolean; error?: string }> =>
      ipcRenderer.invoke('skills:write', skillName, content),
  },

  // Agents operations
  agents: {
    getAll: (projectPath?: string): Promise<AgentMetadata[]> =>
      ipcRenderer.invoke('agents:getAll', projectPath),

    read: (filePath: string): Promise<AgentFile | null> =>
      ipcRenderer.invoke('agents:read', filePath),

    write: (filePath: string, content: string): Promise<{ success: boolean; error?: string }> =>
      ipcRenderer.invoke('agents:write', filePath, content),

    create: (name: string, isGlobal: boolean, projectPath?: string): Promise<{ success: boolean; filePath?: string; error?: string }> =>
      ipcRenderer.invoke('agents:create', name, isGlobal, projectPath),
  },

  // Stats operations (token usage)
  stats: {
    get: (): Promise<TokenStats | null> =>
      ipcRenderer.invoke('stats:get'),

    exists: (): Promise<boolean> =>
      ipcRenderer.invoke('stats:exists'),
  },

  // Web server operations (remote access)
  webserver: {
    getInfo: (): Promise<WebServerInfo> =>
      ipcRenderer.invoke('webserver:info'),

    start: (): Promise<{ success: boolean; port?: number; token?: string; urls?: string[]; error?: string }> =>
      ipcRenderer.invoke('webserver:start'),

    stop: (): Promise<{ success: boolean; error?: string }> =>
      ipcRenderer.invoke('webserver:stop'),

    regenerateToken: (): Promise<{ success: boolean; token?: string }> =>
      ipcRenderer.invoke('webserver:regenerateToken'),

    onStarted: (callback: (info: { port: number; token: string; urls: string[] }) => void) => {
      const handler = (_: Electron.IpcRendererEvent, info: { port: number; token: string; urls: string[] }) => callback(info);
      ipcRenderer.on('webserver:started', handler);
      return () => ipcRenderer.removeListener('webserver:started', handler);
    },
  },

  // Files operations
  files: {
    getInitialPath: (): Promise<string> =>
      ipcRenderer.invoke('files:getInitialPath'),

    readDirectory: (dirPath: string): Promise<{ success: boolean; entries?: FileEntry[]; error?: string }> =>
      ipcRenderer.invoke('files:readDirectory', dirPath),

    readFile: (filePath: string): Promise<{ success: boolean; content?: string; encoding?: string; error?: string }> =>
      ipcRenderer.invoke('files:readFile', filePath),

    canViewInternally: (filePath: string): Promise<boolean> =>
      ipcRenderer.invoke('files:canViewInternally', filePath),

    openExternal: (filePath: string): Promise<{ success: boolean; error?: string }> =>
      ipcRenderer.invoke('files:openExternal', filePath),

    showInFolder: (filePath: string): Promise<{ success: boolean; error?: string }> =>
      ipcRenderer.invoke('files:showInFolder', filePath),

    getParentPath: (currentPath: string): Promise<{ success: boolean; path: string; isRoot: boolean }> =>
      ipcRenderer.invoke('files:getParentPath', currentPath),

    getPathInfo: (targetPath: string): Promise<{ success: boolean; exists?: boolean; isDirectory?: boolean; isFile?: boolean; size?: number; modifiedTime?: string }> =>
      ipcRenderer.invoke('files:getPathInfo', targetPath),

    getDrives: (): Promise<{ success: boolean; drives?: FileEntry[]; error?: string }> =>
      ipcRenderer.invoke('files:getDrives'),
  },

  // Terminal operations
  terminal: {
    create: (options: { id: string; cwd?: string }) =>
      ipcRenderer.invoke('terminal:create', options),

    write: (options: { id: string; data: string }) =>
      ipcRenderer.invoke('terminal:write', options),

    resize: (options: { id: string; cols: number; rows: number }) =>
      ipcRenderer.invoke('terminal:resize', options),

    kill: (options: { id: string }) =>
      ipcRenderer.invoke('terminal:kill', options),

    runClaude: (options: { id: string; cwd: string }) =>
      ipcRenderer.invoke('terminal:runClaude', options),

    onData: (callback: (data: { id: string; data: string }) => void) => {
      const handler = (_: Electron.IpcRendererEvent, data: { id: string; data: string }) => callback(data);
      ipcRenderer.on('terminal:data', handler);
      return () => ipcRenderer.removeListener('terminal:data', handler);
    },

    onExit: (callback: (data: { id: string; exitCode: number }) => void) => {
      const handler = (_: Electron.IpcRendererEvent, data: { id: string; exitCode: number }) => callback(data);
      ipcRenderer.on('terminal:exit', handler);
      return () => ipcRenderer.removeListener('terminal:exit', handler);
    },
  },

  // Dialog operations
  dialog: {
    selectFolder: (): Promise<{ success: boolean; path?: string; canceled?: boolean; error?: string }> =>
      ipcRenderer.invoke('dialog:selectFolder'),
  },

  // Platform info
  platform: process.platform,

  // App version
  version: process.env.npm_package_version || '0.1.0',
});

// Type definitions for renderer
export interface ClaudeSessionType {
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

export interface SkillFileType {
  name: string;
  command: string;
  description: string;
  content: string;
  filePath: string;
  license?: string;
}

export interface SkillMetadataType {
  name: string;
  command: string;
  description: string;
  filePath: string;
}

// Agent types for renderer
export interface AgentFileType {
  name: string;
  description: string;
  content: string;
  filePath: string;
  isGlobal: boolean;
}

export interface AgentMetadataType {
  name: string;
  description: string;
  filePath: string;
  isGlobal: boolean;
}

// Token stats types for renderer
export interface TokenStatsDataType {
  inputTokens: number;
  outputTokens: number;
  cacheRead: number;
  cacheWrite: number;
  totalTokens: number;
  cost: number;
}

export interface TokenStatsType {
  currentSession: TokenStatsDataType;
  currentWeekAllModels: TokenStatsDataType;
  currentWeekSonnetOnly: TokenStatsDataType;
  lastUpdated: string;
  source: 'file' | 'none';
}

// Web server types for renderer
export interface WebServerInfoType {
  running: boolean;
  port: number | null;
  token: string | null;
  urls: string[];
  connections: number;
}

// File types for renderer
export interface FileEntryType {
  name: string;
  path: string;
  isDirectory: boolean;
  isFile: boolean;
  size: number;
  modifiedTime: string;
  extension: string;
}

export type ElectronAPI = {
  sessions: {
    getAll: () => Promise<ClaudeSessionType[]>;
    getProject: (projectPath: string) => Promise<ClaudeSessionType[]>;
    getMessages: (sessionId: string) => Promise<unknown[]>;
    onUpdated: (callback: (sessions: ClaudeSessionType[]) => void) => () => void;
  };
  skills: {
    getAll: () => Promise<SkillMetadataType[]>;
    read: (skillName: string) => Promise<SkillFileType | null>;
    write: (skillName: string, content: string) => Promise<{ success: boolean; error?: string }>;
  };
  agents: {
    getAll: (projectPath?: string) => Promise<AgentMetadataType[]>;
    read: (filePath: string) => Promise<AgentFileType | null>;
    write: (filePath: string, content: string) => Promise<{ success: boolean; error?: string }>;
    create: (name: string, isGlobal: boolean, projectPath?: string) => Promise<{ success: boolean; filePath?: string; error?: string }>;
  };
  stats: {
    get: () => Promise<TokenStatsType | null>;
    exists: () => Promise<boolean>;
  };
  webserver: {
    getInfo: () => Promise<WebServerInfoType>;
    start: () => Promise<{ success: boolean; port?: number; token?: string; urls?: string[]; error?: string }>;
    stop: () => Promise<{ success: boolean; error?: string }>;
    regenerateToken: () => Promise<{ success: boolean; token?: string }>;
    onStarted: (callback: (info: { port: number; token: string; urls: string[] }) => void) => () => void;
  };
  files: {
    getInitialPath: () => Promise<string>;
    readDirectory: (dirPath: string) => Promise<{ success: boolean; entries?: FileEntryType[]; error?: string }>;
    readFile: (filePath: string) => Promise<{ success: boolean; content?: string; encoding?: string; error?: string }>;
    canViewInternally: (filePath: string) => Promise<boolean>;
    openExternal: (filePath: string) => Promise<{ success: boolean; error?: string }>;
    showInFolder: (filePath: string) => Promise<{ success: boolean; error?: string }>;
    getParentPath: (currentPath: string) => Promise<{ success: boolean; path: string; isRoot: boolean; showDrives?: boolean }>;
    getPathInfo: (targetPath: string) => Promise<{ success: boolean; exists?: boolean; isDirectory?: boolean; isFile?: boolean; size?: number; modifiedTime?: string }>;
    getDrives: () => Promise<{ success: boolean; drives?: FileEntryType[]; error?: string }>;
  };
  terminal: {
    create: (options: { id: string; cwd?: string }) => Promise<{ success: boolean; error?: string }>;
    write: (options: { id: string; data: string }) => Promise<{ success: boolean; error?: string }>;
    resize: (options: { id: string; cols: number; rows: number }) => Promise<{ success: boolean; error?: string }>;
    kill: (options: { id: string }) => Promise<{ success: boolean; error?: string }>;
    runClaude: (options: { id: string; cwd: string }) => Promise<{ success: boolean; error?: string }>;
    onData: (callback: (data: { id: string; data: string }) => void) => () => void;
    onExit: (callback: (data: { id: string; exitCode: number }) => void) => () => void;
  };
  dialog: {
    selectFolder: () => Promise<{ success: boolean; path?: string; canceled?: boolean; error?: string }>;
  };
  platform: NodeJS.Platform;
  version: string;
};

declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}
