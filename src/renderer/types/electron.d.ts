// Type definitions for Electron API exposed via preload

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

export interface SkillFile {
  name: string;
  command: string;
  description: string;
  content: string;
  filePath: string;
  license?: string;
}

export interface SkillMetadata {
  name: string;
  command: string;
  description: string;
  filePath: string;
}

// Agent types
export interface AgentFile {
  name: string;
  description: string;
  content: string;
  filePath: string;
  isGlobal: boolean;
}

export interface AgentMetadata {
  name: string;
  description: string;
  filePath: string;
  isGlobal: boolean;
}

// Token stats types
export interface TokenStatsData {
  inputTokens: number;
  outputTokens: number;
  cacheRead: number;
  cacheWrite: number;
  totalTokens: number;
  cost: number;
}

export interface TokenStats {
  currentSession: TokenStatsData;
  currentWeekAllModels: TokenStatsData;
  currentWeekSonnetOnly: TokenStatsData;
  lastUpdated: string;
  source: 'file' | 'none';
}

// File types
export interface FileEntry {
  name: string;
  path: string;
  isDirectory: boolean;
  isFile: boolean;
  size: number;
  modifiedTime: string;
  extension: string;
}

export interface ElectronAPI {
  sessions: {
    getAll: () => Promise<ClaudeSession[]>;
    getProject: (projectPath: string) => Promise<ClaudeSession[]>;
    getMessages: (sessionId: string) => Promise<unknown[]>;
    onUpdated: (callback: (sessions: ClaudeSession[]) => void) => () => void;
  };
  skills: {
    getAll: () => Promise<SkillMetadata[]>;
    read: (skillName: string) => Promise<SkillFile | null>;
    write: (skillName: string, content: string) => Promise<{ success: boolean; error?: string }>;
  };
  agents: {
    getAll: (projectPath?: string) => Promise<AgentMetadata[]>;
    read: (filePath: string) => Promise<AgentFile | null>;
    write: (filePath: string, content: string) => Promise<{ success: boolean; error?: string }>;
    create: (name: string, isGlobal: boolean, projectPath?: string) => Promise<{ success: boolean; filePath?: string; error?: string }>;
  };
  stats: {
    get: () => Promise<TokenStats | null>;
    exists: () => Promise<boolean>;
  };
  webserver: {
    getInfo: () => Promise<{ running: boolean; port: number | null; token: string | null; urls: string[]; connections: number }>;
    start: () => Promise<{ success: boolean; port?: number; token?: string; urls?: string[]; error?: string }>;
    stop: () => Promise<{ success: boolean; error?: string }>;
    regenerateToken: () => Promise<{ success: boolean; token?: string }>;
    onStarted: (callback: (info: { port: number; token: string; urls: string[] }) => void) => () => void;
  };
  files: {
    getInitialPath: () => Promise<string>;
    readDirectory: (dirPath: string) => Promise<{ success: boolean; entries?: FileEntry[]; error?: string }>;
    readFile: (filePath: string) => Promise<{ success: boolean; content?: string; encoding?: string; error?: string }>;
    canViewInternally: (filePath: string) => Promise<boolean>;
    openExternal: (filePath: string) => Promise<{ success: boolean; error?: string }>;
    showInFolder: (filePath: string) => Promise<{ success: boolean; error?: string }>;
    getParentPath: (currentPath: string) => Promise<{ success: boolean; path: string; isRoot: boolean; showDrives?: boolean }>;
    getPathInfo: (targetPath: string) => Promise<{ success: boolean; exists?: boolean; isDirectory?: boolean; isFile?: boolean; size?: number; modifiedTime?: string }>;
    getDrives: () => Promise<{ success: boolean; drives?: FileEntry[]; error?: string }>;
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
}

declare global {
  interface Window {
    electronAPI?: ElectronAPI;
  }
}

export {};
